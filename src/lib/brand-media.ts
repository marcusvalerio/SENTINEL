/**
 * Brand media — audiovisual assets produced outside the app (Higgsfield),
 * encoded and committed under `public/brand/`. See docs/brand/visual-storytelling.md.
 *
 * A slot set to null renders only its static fallback: no request, no cost.
 * Point it at real files once they exist and pass the budget below.
 */
export type BrandMedia = {
  /** Preferred source (AV1 or VP9 in WebM). */
  webm?: string;
  /** Universal fallback (H.264 in MP4). Required. */
  mp4: string;
  /** First frame, used while loading and whenever motion is not appropriate. */
  poster: string;
};

/** Budget per ambient loop: short, silent, small. Enforced by review, documented here. */
export const BRAND_LOOP_BUDGET = { maxSeconds: 10, maxKilobytes: 1500 } as const;

/** Ambient loop behind the login aperture. */
export const LOGIN_LOOP: BrandMedia | null = null;

export type AmbientConditions = {
  reducedMotion: boolean;
  saveData: boolean;
  /** navigator.connection.effectiveType when available. */
  effectiveType?: string;
  /** Narrow screens get the static fallback: the loop is atmosphere, not content. */
  viewportWidth: number;
};

/** Whether an ambient (decorative) video may play. Any doubt means no. */
export function shouldPlayAmbient(c: AmbientConditions): boolean {
  if (c.reducedMotion || c.saveData) return false;
  if (c.effectiveType && ["slow-2g", "2g", "3g"].includes(c.effectiveType)) return false;
  return c.viewportWidth >= 768;
}
