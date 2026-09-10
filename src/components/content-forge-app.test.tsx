import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContentForgeApp } from "./content-forge-app";

function stubBrowserState() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ json: async () => ({ mode: "browser", state: null }) }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ContentForgeApp", () => {
  it("renders the shell with no login gate", async () => {
    stubBrowserState();
    render(<ContentForgeApp />);
    expect(await screen.findByText("Content Forge")).toBeInTheDocument();
    expect(await screen.findByText("What do you want to accomplish today?")).toBeInTheDocument();
  });

  it("exposes all eight sections in navigation", async () => {
    stubBrowserState();
    render(<ContentForgeApp />);
    for (const name of ["Home", "Create", "Campaigns", "Discover", "Network", "Analytics", "Memory", "Settings"]) {
      const matches = await screen.findAllByRole("button", { name });
      expect(matches.length).toBeGreaterThanOrEqual(1);
    }
  });
});
