"""Graph assembly for the OmniForm AI workflow.

    START -> router -> (Send fan-out) -> format_<output> -> collect -> END
"""

from typing import Any

from langgraph.graph import END, START, StateGraph

from app.graph.nodes import collect_node, make_formatter_node
from app.graph.router import route_to_formatters, router_node
from app.graph.state import OmniFormState
from app.outputs import (
    COLLECT_NODE,
    OUTPUT_ORDER,
    ROUTER_NODE,
    formatter_node_name,
)


def build_graph() -> Any:
    builder = StateGraph(OmniFormState)
    builder.add_node(ROUTER_NODE, router_node)
    for output in OUTPUT_ORDER:
        builder.add_node(formatter_node_name(output), make_formatter_node(output))
    builder.add_node(COLLECT_NODE, collect_node)

    builder.add_edge(START, ROUTER_NODE)
    builder.add_conditional_edges(
        ROUTER_NODE,
        route_to_formatters,
        [formatter_node_name(output) for output in OUTPUT_ORDER] + [COLLECT_NODE],
    )
    for output in OUTPUT_ORDER:
        builder.add_edge(formatter_node_name(output), COLLECT_NODE)
    builder.add_edge(COLLECT_NODE, END)
    return builder.compile()
