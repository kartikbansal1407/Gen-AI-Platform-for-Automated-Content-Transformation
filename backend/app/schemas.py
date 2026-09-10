"""Request and response contracts for the OmniForm AI output API."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.outputs import OutputType


class OperatorControls(BaseModel):
    audience: str | None = Field(default=None, max_length=180)
    tone: str | None = Field(default=None, max_length=80)
    language: str = Field(default="English", max_length=80)
    detail_level: Literal["brief", "standard", "detailed"] = "standard"


class TransformRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    text: str = Field(min_length=20, max_length=100_000)
    output_types: list[OutputType] = Field(min_length=1)
    controls: OperatorControls = Field(default_factory=OperatorControls)

    @field_validator("text")
    @classmethod
    def _require_meaningful_text(cls, value: str) -> str:
        stripped = value.strip()
        if len(stripped) < 20:
            raise ValueError("Source text must contain at least 20 characters.")
        return stripped

    @field_validator("output_types")
    @classmethod
    def _reject_duplicates(cls, value: list[OutputType]) -> list[OutputType]:
        if len(set(value)) != len(value):
            raise ValueError("Duplicate output types are not allowed.")
        return value


class Artifact(BaseModel):
    output_type: OutputType
    label: str
    format: str
    text: str
    compiler: str | None = None
    filename: str | None = None
    download_url: str | None = None
    compiled: bool = False
    media_type: str = "text/plain"


class TransformResponse(BaseModel):
    job_id: str
    status: Literal["completed", "partial", "failed"]
    provider: str
    model: str
    warnings: list[str] = Field(default_factory=list)
    errors: dict[str, str] = Field(default_factory=dict)
    artifacts: list[Artifact] = Field(default_factory=list)
