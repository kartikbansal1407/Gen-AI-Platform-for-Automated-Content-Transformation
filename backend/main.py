"""OmniForm AI — FastAPI generation and compilation service.

Run from the ``backend`` directory:

    uvicorn main:app --reload --port 8000
"""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from io import BytesIO
from pathlib import Path
from typing import Annotated

import uvicorn
from app.config import get_settings
from app.graph.build import build_graph
from app.outputs import OUTPUT_ORDER, OUTPUT_SPECS
from app.pipeline import run_transformation
from app.schemas import TransformRequest, TransformResponse
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pypdf import PdfReader

logger = logging.getLogger("omniform")
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.graph = build_graph()
    logger.info(
        "%s graph ready (%s backend, model %s).",
        settings.app_name,
        settings.llm_provider,
        settings.active_model,
    )
    yield


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _safe_output(job_id: str, filename: str) -> Path:
    if (
        not job_id
        or not filename
        or any(part in {"", ".", ".."} for part in (job_id, filename))
    ):
        raise HTTPException(status_code=404, detail="Artifact not found.")
    root = settings.output_dir.resolve()
    target = (root / job_id / filename).resolve()
    if root not in target.parents or not target.is_file():
        raise HTTPException(status_code=404, detail="Artifact not found.")
    return target


@app.get(f"{settings.api_prefix}/health")
async def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": settings.app_name,
        "provider": settings.llm_provider,
        "model": settings.active_model,
    }


@app.get(f"{settings.api_prefix}/output-types")
async def list_output_types() -> list[dict[str, str | None]]:
    catalog: list[dict[str, str | None]] = []
    for output in OUTPUT_ORDER:
        spec = OUTPUT_SPECS[output]
        catalog.append(
            {
                "id": output.value,
                "label": spec.label,
                "format": spec.output_format,
                "compiler": spec.compiler,
                "extension": spec.extension,
            }
        )
    return catalog


@app.post(f"{settings.api_prefix}/transform", response_model=TransformResponse)
async def transform(payload: TransformRequest, request: Request) -> TransformResponse:
    try:
        return await run_transformation(
            payload, getattr(request.app.state, "graph", None)
        )
    except Exception:
        logger.exception("Transformation failed.")
        raise HTTPException(status_code=500, detail="Transformation failed.")


@app.post(f"{settings.api_prefix}/transform-file", response_model=TransformResponse)
async def transform_file(
    request: Request,
    file: Annotated[UploadFile, File()],
    output_types: Annotated[str, Form()],
    audience: Annotated[str, Form()] = "",
    tone: Annotated[str, Form()] = "",
) -> TransformResponse:
    if file.content_type != "application/pdf" and not (
        file.filename or ""
    ).lower().endswith(".pdf"):
        raise HTTPException(status_code=415, detail="Only PDF uploads are supported.")
    data = await file.read(settings.max_upload_mb * 1024 * 1024 + 1)
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail="PDF exceeds the upload limit.")
    try:
        text = "\n".join(
            page.extract_text() or "" for page in PdfReader(BytesIO(data)).pages
        )
        payload = TransformRequest(
            text=text,
            output_types=[
                part.strip() for part in output_types.split(",") if part.strip()
            ],
            controls={"audience": audience or None, "tone": tone or None},
        )
    except Exception as error:  # noqa: BLE001 - normalize parser/validation failures
        raise HTTPException(status_code=422, detail=f"Unable to read PDF: {error}")
    return await run_transformation(payload, request.app.state.graph)


@app.get(f"{settings.api_prefix}/files/{{job_id}}/{{filename}}")
async def download_artifact(job_id: str, filename: str) -> FileResponse:
    target = _safe_output(job_id, filename)
    return FileResponse(target, filename=target.name)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
