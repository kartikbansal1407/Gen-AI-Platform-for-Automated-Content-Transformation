"""Graph execution and API response assembly."""

import uuid
from typing import Any

from app.config import get_settings
from app.graph.build import build_graph
from app.outputs import OUTPUT_SPECS
from app.schemas import Artifact, TransformRequest, TransformResponse


def _dedupe(values: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        ordered.append(value)
    return ordered


async def run_transformation(
    request: TransformRequest, graph: Any | None = None
) -> TransformResponse:
    graph = graph or build_graph()
    final_state = await graph.ainvoke(
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
    artifacts: list[Artifact] = []
    for output in request.output_types:
        text = results.get(output.value)
        if text is None:
            continue
        spec = OUTPUT_SPECS[output]
        artifacts.append(
            Artifact(
                output_type=output,
                label=spec.label,
                format=spec.output_format,
                text=text,
                compiler=spec.compiler,
            )
        )

    status = final_state.get("status") or ("completed" if artifacts else "failed")
    if status not in {"completed", "partial", "failed"}:
        status = "completed" if artifacts else "failed"

    settings = get_settings()
    return TransformResponse(
        job_id=str(uuid.uuid4()),
        status=status,
        provider=settings.llm_provider,
        model=settings.active_model,
        warnings=_dedupe(list(final_state.get("warnings") or [])),
        errors=dict(final_state.get("errors") or {}),
        artifacts=artifacts,
    )
