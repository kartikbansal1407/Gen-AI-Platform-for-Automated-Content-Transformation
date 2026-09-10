// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ query: vi.fn(), release: vi.fn() }));
vi.mock("./db", () => ({
  ensureDefaultUser: async () => "operator-id",
  getPool: () => ({ connect: async () => db }),
}));
import { updateArtefactReview } from "./jobs";
beforeEach(() => {
  db.query.mockReset().mockResolvedValue({ rowCount: 1 });
});
it("scopes review writes to the job owner and commits an audit record", async () => {
  expect(
    await updateArtefactReview("job-id", "advisory", {
      status: "approved",
      note: "Checked",
      updatedAt: "2026-09-10T08:00:00Z",
    }),
  ).toBe(true);
  const [sql, values] = db.query.mock.calls[1];
  expect(sql).toContain("j.user_id=$3");
  expect(sql).toContain("a.output_type=$4");
  expect(values.slice(1)).toEqual(["job-id", "operator-id", "advisory"]);
  expect(db.query.mock.calls[2][0]).toContain("artefact_reviewed");
  expect(db.query).toHaveBeenLastCalledWith("commit");
  expect(db.release).toHaveBeenCalled();
});
it("rolls back missing artefacts without recording a successful review", async () => {
  db.query.mockResolvedValueOnce({}).mockResolvedValueOnce({ rowCount: 0 });
  expect(
    await updateArtefactReview("missing", "advisory", {
      status: "pending",
      note: "",
      updatedAt: "now",
    }),
  ).toBe(false);
  expect(db.query).toHaveBeenLastCalledWith("rollback");
});
it("rolls back an audit failure so a review is never partially saved", async () => {
  db.query
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({ rowCount: 1 })
    .mockRejectedValueOnce(new Error("storage error"));
  await expect(
    updateArtefactReview("job", "advisory", {
      status: "approved",
      note: "",
      updatedAt: "now",
    }),
  ).rejects.toThrow("storage error");
  expect(db.query).toHaveBeenLastCalledWith("rollback");
});
