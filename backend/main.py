"""OmniForm AI — FastAPI entry point (Milestone 1).

Run from the ``backend`` directory:

    uvicorn main:app --reload --port 8000
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.graph.build import build_graph
from app.outputs import OUTPUT_ORDER, OUTPUT_SPECS
from app.pipeline import run_transformation
from app.schemas import TransformRequest, TransformResponse

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


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
