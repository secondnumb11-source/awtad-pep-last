import { render, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const queries = vi.hoisted(() => ({ from: vi.fn(), order: vi.fn() }));
vi.mock("@/awtad/lib/auth", () => ({ useAuth: () => ({ user: { orgId: "test-org" } }) }));
vi.mock("@/awtad/lib/supabase", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/awtad/lib/supabase")>();
  return { ...original, sb: { from: queries.from } };
});
import { DataProvider, TABLES } from "@/awtad/lib/data";

beforeEach(() => {
  vi.clearAllMocks();
  queries.from.mockImplementation((table: string) => ({
    select: () => ({
      order: (column: string) => {
        queries.order(table, column);
        const result = { data: [], error: table === "awtad_company_profile" && column === "id" ? { message: "column does not exist" } : null };
        return { ...Promise.resolve(result), then: Promise.resolve(result).then.bind(Promise.resolve(result)), gte: () => Promise.resolve(result) };
      },
      eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
    }),
  }));
});

it("loads the approved awtad tables only", async () => {
  render(<DataProvider><div /></DataProvider>);
  await waitFor(() => expect(queries.from).toHaveBeenCalledTimes(TABLES.length + 1));
  expect(queries.from.mock.calls.map(([table]) => table)).toEqual([
    ...TABLES.map((table) => `awtad_${table}`), "awtad_organizations",
  ]);
});

it("orders company profile by its existing org_id key instead of missing id", async () => {
  render(<DataProvider><div /></DataProvider>);
  await waitFor(() => expect(queries.order).toHaveBeenCalledWith("awtad_company_profile", "org_id"));
  expect(queries.order).not.toHaveBeenCalledWith("awtad_company_profile", "id");
  expect(queries.order).toHaveBeenCalledWith("awtad_employees", "id");
});