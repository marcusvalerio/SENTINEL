"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { shouldPlayAmbient, type BrandMedia } from "@/lib/brand-media";
import { cn } from "@/lib/cn";

type NetworkInformation = { saveData?: boolean; effectiveType?: string };

/**
 * Decorative brand video layered over a static fallback.
 *
 * The fallback always renders (it is the server HTML and the reduced-motion
 * experience). The video is only created on the client when conditions allow,
 * when the slot is on screen, and it fades in once it can actually play.
 * It pauses when hidden. No media = just the fallback, zero requests.
 */
export function BrandLoop({ media, fallback, className }: { media: BrandMedia | null; fallback: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [mount, setMount] = useState(false);
  const [ready, setReady] = useState(false);

  // Decide once, and again if the motion preference changes.
  useEffect(() => {
    if (!media || !root.current) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    let observer: IntersectionObserver | null = null;

    const evaluate = () => {
      observer?.disconnect();
      const allowed = shouldPlayAmbient({
        reducedMotion: motion.matches,
        saveData: Boolean(connection?.saveData),
        effectiveType: connection?.effectiveType,
        viewportWidth: window.innerWidth,
      });
      if (!allowed) {
        setMount(false);
        setReady(false);
        return;
      }
      // Lazy: create the <video> only when the slot is near the viewport.
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            setMount(true);
            observer?.disconnect();
          }
        },
        { rootMargin: "200px" },
      );
      observer.observe(root.current!);
    };

    evaluate();
    motion.addEventListener("change", evaluate);
    return () => {
      observer?.disconnect();
      motion.removeEventListener("change", evaluate);
    };
  }, [media]);

  // Pause when the tab or the slot is not visible; resume when it is.
  useEffect(() => {
    const el = video.current;
    if (!mount || !el || !root.current) return;
    let onScreen = true;
    const sync = () => {
      if (document.hidden || !onScreen) el.pause();
      else void el.play().catch(() => undefined);
    };
    const observer = new IntersectionObserver((entries) => {
      onScreen = entries.some((e) => e.isIntersecting);
      sync();
    });
    observer.observe(root.current);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [mount]);

  return (
    <div ref={root} className={cn("pointer-events-none absolute inset-0", className)} aria-hidden>
      {fallback}
      {media && mount && (
        <video
          ref={video}
          className={cn("absolute inset-0 size-full object-cover transition-opacity duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)]", ready ? "opacity-100" : "opacity-0")}
          poster={media.poster}
          muted
          playsInline
          loop
          autoPlay
          preload="metadata"
          disablePictureInPicture
          disableRemotePlayback
          // Visible only once playable: a source that fails leaves the fallback untouched.
          onCanPlay={() => setReady(true)}
        >
          {media.webm && <source src={media.webm} type="video/webm" />}
          <source src={media.mp4} type="video/mp4" />
        </video>
      )}
    </div>
  );
}
