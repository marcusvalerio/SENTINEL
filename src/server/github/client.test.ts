import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { createGithubClient, GithubError } = await import("./client");

const respond = (status: number, body: unknown = {}, headers: Record<string, string> = {}) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status, headers })) as unknown as typeof fetch;

describe("GitHub client", () => {
  it("sends the token only as an Authorization header", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ id: 1, name: "r", owner: { login: "o" }, html_url: "u", default_branch: "main", private: true }), { status: 200 }));
    const client = createGithubClient({ fetchImpl: fetchImpl as unknown as typeof fetch, token: "secret-token" });
    const repo = await client.getRepository({ owner: "o", name: "r" });
    expect(repo).toMatchObject({ id: 1, isPrivate: true });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).not.toContain("secret-token");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer secret-token");
  });

  it.each([
    [404, {}, "not_found"],
    [401, {}, "unauthorized"],
    [403, { "x-ratelimit-remaining": "0" }, "rate_limited"],
    [429, {}, "rate_limited"],
    [500, {}, "unavailable"],
  ])("classifies HTTP %s", async (status, headers, code) => {
    const client = createGithubClient({ fetchImpl: respond(status, {}, headers as Record<string, string>), token: "" });
    await expect(client.getRepository({ owner: "o", name: "r" })).rejects.toMatchObject({ code });
  });

  it("classifies network failures", async () => {
    const client = createGithubClient({ fetchImpl: vi.fn(async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch, token: "" });
    await expect(client.getRepository({ owner: "o", name: "r" })).rejects.toBeInstanceOf(GithubError);
  });

  it("treats an empty repository's missing lists as empty activity", async () => {
    const client = createGithubClient({ fetchImpl: respond(404), token: "" });
    const activity = await client.fetchActivity({ owner: "o", name: "r" });
    expect(activity.commits).toEqual([]);
  });
});
