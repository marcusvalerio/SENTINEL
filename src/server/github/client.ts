import "server-only";
import type { RepositoryRef } from "@/domain/github";

export type RepositoryMetadata = {
  id: number;
  owner: string;
  name: string;
  url: string;
  defaultBranch: string;
  isPrivate: boolean;
};

export type LookupResult =
  | { status: "found"; repository: RepositoryMetadata }
  | { status: "not_found" }
  | { status: "unavailable" };

/**
 * Read-only repository lookup. Uses GITHUB_TOKEN when configured (needed for
 * private repositories). This is the seam where the future sync will live.
 */
export async function lookupRepository(ref: RepositoryRef): Promise<LookupResult> {
  const token = process.env.GITHUB_TOKEN;
  try {
    const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.name)}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "sentinel-app",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (response.status === 404) return { status: "not_found" };
    if (!response.ok) return { status: "unavailable" };
    const data = (await response.json()) as {
      id: number;
      name: string;
      owner: { login: string };
      html_url: string;
      default_branch: string;
      private: boolean;
    };
    return {
      status: "found",
      repository: {
        id: data.id,
        owner: data.owner.login,
        name: data.name,
        url: data.html_url,
        defaultBranch: data.default_branch,
        isPrivate: data.private,
      },
    };
  } catch {
    return { status: "unavailable" };
  }
}
