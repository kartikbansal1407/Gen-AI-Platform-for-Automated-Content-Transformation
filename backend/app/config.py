"""Runtime configuration for the OmniForm AI backend.

Environment variables use the ``OMNIFORM_`` prefix (for example
``OMNIFORM_GROQ_API_KEY``). ``GROQ_API_KEY`` is accepted as a fallback so the
standard Groq variable works without extra wiring.
"""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="OMNIFORM_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "OmniForm AI"
    api_prefix: str = "/api"
    cors_origins: list[str] = ["http://localhost:3000"]

    llm_provider: Literal["groq", "ollama"] = "groq"
    groq_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("OMNIFORM_GROQ_API_KEY", "GROQ_API_KEY"),
    )
    groq_model: str = "llama-3.3-70b-versatile"
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "llama3.1"

    output_dir: Path = Path("outputs")
    compile_outputs: bool = True
    compiler_timeout_seconds: int = Field(default=180, ge=10, le=600)
    max_upload_mb: int = Field(default=10, ge=1, le=50)
    edge_tts_voice: str = "en-US-AriaNeural"

    @property
    def active_model(self) -> str:
        return self.groq_model if self.llm_provider == "groq" else self.ollama_model


@lru_cache
def get_settings() -> Settings:
    return Settings()
