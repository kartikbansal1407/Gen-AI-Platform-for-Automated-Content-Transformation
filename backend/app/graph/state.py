"""Shared LangGraph state for the OmniForm AI workflow.

Formatter nodes run in parallel via ``Send`` fan-out, so keys written by more
than one branch carry reducers that merge branch output instead of overwriting
it.
"""

from typing import Annotated, Any, TypedDict

from app.outputs import OutputType


def merge_dicts(left: dict[str, str], right: dict[str, str]) -> dict[str, str]:
    return {**left, **right}


def concat_lists(left: list[str], right: list[str]) -> list[str]:
    return [*left, *right]


class OmniFormState(TypedDict, total=False):
    source_text: str
    controls: dict[str, Any]
    output_types: list[OutputType]
    pending: list[OutputType]
    results: Annotated[dict[str, str], merge_dicts]
    warnings: Annotated[list[str], concat_lists]
    errors: Annotated[dict[str, str], merge_dicts]
    status: str
