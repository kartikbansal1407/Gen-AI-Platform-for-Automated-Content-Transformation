"""Graph execution, compiler fan-out, and API response assembly."""

import asyncio
import uuid
from pathlib import Path
from typing import Any

from app.compiler import compile_output
from app.config import get_settings
from app.graph.build import build_graph
from app.outputs import OUTPUT_SPECS, OutputType
from app.schemas import Artifact, TransformRequest, TransformResponse


async def _artifact(
    job_id: str, output: OutputType, text: str
) -> tuple[Artifact, str | None]:
    settings = get_settings()
    spec = OUTPUT_SPECS[output]
    artifact = Artifact(
        output_type=output,
        label=spec.label,
        format=spec.output_format,
        text=text,
        compiler=spec.compiler,
    )
    directory = Path(settings.output_dir).resolve() / job_id
    directory.mkdir(parents=True, exist_ok=True)
    source_extensions = {
        OutputType.PRESENTATION: ("presentation.md", "text/markdown"),
        OutputType.ADVISORY: ("advisory.typ", "text/plain"),
        OutputType.VIDEO: ("video.json", "application/json"),
        OutputType.INFOGRAPHIC: ("infographic.mmd", "text/plain"),
        OutputType.TWITTER: ("twitter.txt", "text/plain"),
    }
    source_name, source_media_type = source_extensions[output]
    (directory / source_name).write_text(text, encoding="utf-8")
    artifact.filename = source_name
    artifact.download_url = f"/api/files/{job_id}/{source_name}"
    artifact.media_type = source_media_type
    if not settings.compile_outputs:
        return artifact, "Compilation is disabled; generated source is still available."
    try:
        compiled = await compile_output(output, text, directory)
        artifact.filename = compiled.path.name
        artifact.download_url = f"/api/files/{job_id}/{compiled.path.name}"
        artifact.compiled = True
        artifact.media_type = compiled.media_type
        return artifact, None
    except Exception as error:  # noqa: BLE001 - preserve source on compiler failure
        return (
            artifact,
            f"{spec.label} source generated, but compilation failed: {error}",
        )


async def run_transformation(
    request: TransformRequest, graph: Any | None = None
) -> TransformResponse:
    job_id = str(uuid.uuid4())
    final_state = await (graph or build_graph()).ainvoke(
        {
            "source_text": request.text,
            "controls": request.controls.model_dump(),
            "output_types": [output.value for output in request.output_types],
            "results": {},
            "warnings": [],
            "errors": {},
        }
    )
    results: dict[str, str] = final_state.get("results") or {}
    built = await asyncio.gather(
        *[
            _artifact(job_id, output, results[output.value])
            for output in request.output_types
            if output.value in results
        ]
    )
    artifacts = [item[0] for item in built]
    warnings = list(
        dict.fromkeys(
            [
                *(final_state.get("warnings") or []),
                *[warning for _, warning in built if warning],
            ]
        )
    )
    status = (
        "failed"
        if not artifacts
        else "partial"
        if len(artifacts) < len(request.output_types)
        else "completed"
    )
    settings = get_settings()
    return TransformResponse(
        job_id=job_id,
        status=status,
        provider=settings.llm_provider,
        model=settings.active_model,
        warnings=warnings,
        errors=dict(final_state.get("errors") or {}),
        artifacts=artifacts,
    )
