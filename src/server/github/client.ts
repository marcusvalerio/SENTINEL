import "server-only";
import type { RepositoryRef } from "@/domain/github";

export type RepositoryMetadata = {
  id: number;
  owner: string;
  name: string;
  url: string;
  defaultBranch: string;
  isPrivate: boolean;
  description: string | null;
  pushedAt: string | null;
};

export type LookupResult =
  | { status: "found"; repository: RepositoryMetadata }
  | { status: "not_found" }
  | { status: "unavailable" };

export type GithubErrorCode = "not_found" | "unauthorized" | "rate_limited" | "unavailable";

export class GithubError extends Error {
  constructor(
    public code: GithubErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/** Human, actionable messages — never raw API payloads or tokens. */
export const GITHUB_ERROR_MESSAGES: Record<GithubErrorCode, string> = {
  not_found: "Repositório não encontrado. Ele pode ter sido renomeado, removido ou ser privado sem um token com acesso.",
  unauthorized: "O GitHub recusou a autorização. Verifique o GITHUB_TOKEN configurado no servidor.",
  rate_limited: "Limite de requisições do GitHub atingido. Tente novamente em alguns minutos (ou configure GITHUB_TOKEN para um limite maior).",
  unavailable: "Não foi possível falar com o GitHub agora. Tente novamente em instantes.",
};

type Fetch = typeof fetch;

/**
 * Minimal read-only GitHub REST client. The token (optional, needed for
 * private repositories and higher rate limits) stays on the server and is
 * never returned, logged or stored.
 */
export function createGithubClient({ fetchImpl = fetch, token = process.env.GITHUB_TOKEN }: { fetchImpl?: Fetch; token?: string } = {}) {
  async function request<T>(path: string): Promise<T> {
    let response: Response;
    try {
      response = await fetchImpl(`https://api.github.com${path}`, {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "sentinel-app",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });
    } catch {
      throw new GithubError("unavailable", GITHUB_ERROR_MESSAGES.unavailable);
    }
    if (response.ok) return (await response.json()) as T;
    if (response.status === 404) throw new GithubError("not_found", GITHUB_ERROR_MESSAGES.not_found);
    if (response.status === 401) throw new GithubError("unauthorized", GITHUB_ERROR_MESSAGES.unauthorized);
    if (response.status === 429 || (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0")) {
      throw new GithubError("rate_limited", GITHUB_ERROR_MESSAGES.rate_limited);
    }
    if (response.status === 403) throw new GithubError("unauthorized", GITHUB_ERROR_MESSAGES.unauthorized);
    throw new GithubError("unavailable", GITHUB_ERROR_MESSAGES.unavailable);
  }

  /** Same as request, but an empty repository (409) or missing list is just "nothing". */
  async function list(path: string): Promise<Record<string, unknown>[]> {
    try {
      const data = await request<unknown>(path);
      return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
    } catch (error) {
      if (error instanceof GithubError && error.code === "not_found") return [];
      throw error;
    }
  }

  const repo = (ref: RepositoryRef) => `/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.name)}`;

  return {
    hasToken: Boolean(token),

    async getRepository(ref: RepositoryRef): Promise<RepositoryMetadata> {
      const data = await request<Record<string, unknown>>(repo(ref));
      return toMetadata(data);
    },

    /** Repositories to pick from: the token owner's (when configured) or an owner's public ones. */
    async listRepositories(owner: string | null): Promise<RepositoryMetadata[]> {
      const path = owner
        ? `/users/${encodeURIComponent(owner)}/repos?per_page=100&sort=pushed&type=owner`
        : `/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator,organization_member`;
      const data = await request<unknown>(path);
      return Array.isArray(data) ? data.map((r) => toMetadata(r as Record<string, unknown>)) : [];
    },

    async fetchActivity(ref: RepositoryRef) {
      const base = repo(ref);
      const [commits, pulls, issues, releases, branches, contributors] = await Promise.all([
        list(`${base}/commits?per_page=100`),
        list(`${base}/pulls?state=all&sort=updated&direction=desc&per_page=50`),
        list(`${base}/issues?state=all&sort=updated&direction=desc&per_page=50`),
        list(`${base}/releases?per_page=30`),
        list(`${base}/branches?per_page=100`),
        list(`${base}/contributors?per_page=30`),
      ]);
      return { commits, pulls, issues, releases, branches, contributors };
    },
  };
}

function toMetadata(data: Record<string, unknown>): RepositoryMetadata {
  const owner = (data.owner ?? {}) as Record<string, unknown>;
  return {
    id: Number(data.id),
    owner: String(owner.login ?? ""),
    name: String(data.name ?? ""),
    url: String(data.html_url ?? ""),
    defaultBranch: String(data.default_branch ?? "main"),
    isPrivate: Boolean(data.private),
    description: typeof data.description === "string" ? data.description : null,
    pushedAt: typeof data.pushed_at === "string" ? data.pushed_at : null,
  };
}

/** Back-compat wrapper used when connecting: classifies instead of throwing. */
export async function lookupRepository(ref: RepositoryRef, client = createGithubClient()): Promise<LookupResult> {
  try {
    return { status: "found", repository: await client.getRepository(ref) };
  } catch (error) {
    if (error instanceof GithubError && error.code === "not_found") return { status: "not_found" };
    return { status: "unavailable" };
  }
}
