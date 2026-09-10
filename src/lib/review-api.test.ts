// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const store = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock("@/backend/db", () => ({ hasDatabase: () => true }));
vi.mock("@/backend/jobs", () => ({
  getJob: vi.fn(),
  deleteJob: vi.fn(),
  updateArtefactReview: store.update,
}));
import { PATCH } from "@/app/api/jobs/[id]/route";
import { isAuthenticated } from "@/backend/auth";
const context = {
  params: Promise.resolve({ id: "479a8896-3b79-4b4c-b99b-bb8a01953fbe" }),
};
const decision = {
  outputType: "advisory",
  review: { status: "approved", note: "Checked" },
};
function request(body: string, origin?: string) {
  return new Request(
    "http://localhost/api/jobs/479a8896-3b79-4b4c-b99b-bb8a01953fbe",
    {
      method: "PATCH",
      body,
      headers: {
        "Content-Type": "application/json",
        ...(origin ? { origin } : {}),
      },
    },
  );
}
beforeEach(() => {
  store.update.mockReset().mockResolvedValue(true);
  vi.mocked(isAuthenticated).mockResolvedValue(true);
});
it("rejects unauthenticated and cross-origin review mutations", async () => {
  vi.mocked(isAuthenticated).mockResolvedValue(false);
  expect((await PATCH(request(JSON.stringify(decision)), context)).status).toBe(
    401,
  );
  vi.mocked(isAuthenticated).mockResolvedValue(true);
  expect(
    (
      await PATCH(
        request(JSON.stringify(decision), "https://other.example"),
        context,
      )
    ).status,
  ).toBe(403);
  expect(store.update).not.toHaveBeenCalled();
});
it("rejects invalid JSON, status, output and oversized notes without database writes", async () => {
  for (const body of [
    "{",
    JSON.stringify({ ...decision, outputType: "campaign" }),
    JSON.stringify({ ...decision, review: { status: "published" } }),
    JSON.stringify({
      ...decision,
      review: { status: "approved", note: "x".repeat(2001) },
    }),
  ]) {
    expect((await PATCH(request(body), context)).status).toBe(400);
  }
  expect((await PATCH(request("x".repeat(10001)), context)).status).toBe(413);
  expect(store.update).not.toHaveBeenCalled();
});
it("adds a server timestamp, trims notes and reports missing artefacts", async () => {
  const response = await PATCH(
    request(
      JSON.stringify({
        ...decision,
        review: {
          status: "approved",
          note: "  Checked  ",
          updatedAt: "forged",
        },
      }),
    ),
    context,
  );
  expect(response.status).toBe(200);
  const { review } = await response.json();
  expect(review.note).toBe("Checked");
  expect(Number.isFinite(Date.parse(review.updatedAt))).toBe(true);
  expect(store.update).toHaveBeenCalledWith(
    (await context.params).id,
    "advisory",
    review,
  );
  store.update.mockResolvedValue(false);
  expect((await PATCH(request(JSON.stringify(decision)), context)).status).toBe(
    404,
  );
});
