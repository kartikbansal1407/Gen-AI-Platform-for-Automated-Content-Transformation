"""LLM provider factory and response normalization."""

import re
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI

from app.config import get_settings
from app.graph.prompts import PROMPTS, build_user_prompt
from app.outputs import OutputType


def strip_code_fence(value: str) -> str:
    text = value.strip()
    match = re.fullmatch(r"```(?:[\w+-]+)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    return match.group(1).strip() if match else text


def create_chat_model() -> Any:
    settings = get_settings()
    if settings.llm_provider == "groq":
        if not settings.groq_api_key:
            raise RuntimeError("GROQ_API_KEY is not configured.")
        return ChatGroq(
            api_key=settings.groq_api_key,
            model=settings.groq_model,
            temperature=0.2,
            max_retries=2,
        )
    return ChatOpenAI(
        api_key="ollama",
        base_url=f"{settings.ollama_base_url.rstrip('/')}/v1",
        model=settings.ollama_model,
        temperature=0.2,
        max_retries=2,
    )


async def generate_output(
    output: OutputType, source: str, controls: dict[str, object]
) -> str:
    response = await create_chat_model().ainvoke(
        [
            SystemMessage(content=PROMPTS[output]),
            HumanMessage(content=build_user_prompt(source, controls)),
        ]
    )
    content = response.content
    if isinstance(content, list):
        content = "".join(
            item.get("text", "") if isinstance(item, dict) else str(item)
            for item in content
        )
    text = strip_code_fence(str(content))
    if not text:
        raise RuntimeError("The model returned an empty artifact.")
    return text
