import { describe, expect, it } from "vitest";
import { parseRepositoryRef } from "./github";

describe("parseRepositoryRef", () => {
  it.each([
    ["marcusvalerio/lunar-wms", "marcusvalerio", "lunar-wms"],
    ["https://github.com/marcusvalerio/lunar-wms", "marcusvalerio", "lunar-wms"],
    ["github.com/marcusvalerio/lunar-wms/tree/main", "marcusvalerio", "lunar-wms"],
    ["git@github.com:marcusvalerio/lunar-wms.git", "marcusvalerio", "lunar-wms"],
    ["https://github.com/vercel/next.js?tab=readme", "vercel", "next.js"],
  ])("parses %s", (input, owner, name) => {
    expect(parseRepositoryRef(input)).toEqual({ owner, name });
  });

  it.each(["", "lunar-wms", "https://gitlab.com/a", "-bad/name", "owner/..", "a b/c"])("rejects %s", (input) => {
    expect(parseRepositoryRef(input)).toBeNull();
  });
});
