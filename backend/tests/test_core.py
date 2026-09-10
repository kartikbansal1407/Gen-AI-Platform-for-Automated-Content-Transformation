import asyncio
from types import SimpleNamespace

from app.graph import nodes
from app.graph.build import build_graph
from app.graph.llm import strip_code_fence
from app.graph.prompts import PROMPTS, build_user_prompt
from app.outputs import OUTPUT_ORDER, OutputType
from app.schemas import TransformRequest

from app import pipeline


def test_every_output_has_a_compiler_prompt():
    assert set(PROMPTS) == set(OUTPUT_ORDER)


def test_code_fence_is_removed_without_changing_plain_text():
    assert strip_code_fence("```typst\n#set text()\n```") == "#set text()"
    assert strip_code_fence("flowchart TD\nA --> B") == "flowchart TD\nA --> B"


def test_request_and_prompt_preserve_operator_controls():
    request = TransformRequest(
        text="A sufficiently long source statement for validation.",
        output_types=[OutputType.PRESENTATION],
        controls={"audience": "Cabinet officials", "tone": "Urgent"},
    )
    prompt = build_user_prompt(request.text, request.controls.model_dump())
    assert "Cabinet officials" in prompt
    assert "Urgent" in prompt
    assert request.text in prompt


def test_pipeline_returns_downloadable_source_when_compilation_is_disabled(
    monkeypatch, tmp_path
):
    class FakeGraph:
        async def ainvoke(self, state):
            return {
                **state,
                "results": {
                    "presentation": "---\nmarp: true\n---\n# Test",
                    "twitter": "1/2 Test\n\n2/2 Done",
                },
                "status": "completed",
            }

    monkeypatch.setattr(
        pipeline,
        "get_settings",
        lambda: SimpleNamespace(
            output_dir=tmp_path,
            compile_outputs=False,
            llm_provider="groq",
            active_model="test-model",
        ),
    )
    response = asyncio.run(
        pipeline.run_transformation(
            TransformRequest(
                text="A sufficiently long source statement for pipeline validation.",
                output_types=[OutputType.PRESENTATION, OutputType.TWITTER],
            ),
            FakeGraph(),
        )
    )
    assert response.status == "completed"
    assert all(artifact.download_url for artifact in response.artifacts)
    assert all(not artifact.compiled for artifact in response.artifacts)


def test_langgraph_fans_out_and_joins_requested_agents(monkeypatch):
    async def fake_generate(output, source, controls):
        return f"{output.value}:{source[:6]}"

    monkeypatch.setattr(nodes, "generate_output", fake_generate)
    state = asyncio.run(
        build_graph().ainvoke(
            {
                "source_text": "A sufficiently long source statement.",
                "controls": {},
                "output_types": ["presentation", "twitter"],
                "results": {},
                "warnings": [],
                "errors": {},
            }
        )
    )
    assert state["status"] == "completed"
    assert set(state["results"]) == {"presentation", "twitter"}
