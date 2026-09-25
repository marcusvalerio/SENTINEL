/**
 * Parses what a person pastes when connecting a repository:
 *   "marcusvalerio/lunar-wms"
 *   "https://github.com/marcusvalerio/lunar-wms"
 *   "git@github.com:marcusvalerio/lunar-wms.git"
 *   "github.com/marcusvalerio/lunar-wms/tree/main"
 */
export type RepositoryRef = { owner: string; name: string };

const OWNER = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const NAME = /^[\w.-]{1,100}$/;

export function parseRepositoryRef(input: string): RepositoryRef | null {
  let value = input.trim();
  if (!value) return null;
  value = value
    .replace(/^git@github\.com:/i, "")
    .replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/[?#].*$/, "");
  const [owner, name] = value.split("/").filter(Boolean);
  if (!owner || !name || !OWNER.test(owner) || !NAME.test(name) || name === "." || name === "..") return null;
  return { owner, name };
}

export function repositoryUrl(ref: RepositoryRef) {
  return `https://github.com/${ref.owner}/${ref.name}`;
}
