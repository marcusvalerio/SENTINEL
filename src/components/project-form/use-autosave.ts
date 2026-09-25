"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProjectFormValues } from "@/domain/project-form";
import { saveDraft } from "@/server/projects/actions";

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "local" | "error";
export type SaveState = { status: SaveStatus; at: string | null };

const DEBOUNCE_MS = 900;
export const LOCAL_KEY_NEW = "sentinel:project-draft:new";
const localKey = (draftId: string | null) => (draftId ? `sentinel:project-draft:${draftId}` : LOCAL_KEY_NEW);

export type LocalBackup = { values: ProjectFormValues; step: number; at: string; synced: boolean };

export function readLocalBackup(key: string): LocalBackup | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as LocalBackup) : null;
  } catch {
    return null;
  }
}

function writeLocal(key: string, backup: LocalBackup) {
  try {
    window.localStorage.setItem(key, JSON.stringify(backup));
  } catch {
    /* storage full or blocked — the server copy remains the source of truth */
  }
}

export function clearLocalBackups(draftId: string | null) {
  try {
    window.localStorage.removeItem(LOCAL_KEY_NEW);
    if (draftId) window.localStorage.removeItem(localKey(draftId));
  } catch {
    /* ignore */
  }
}

export function hasMeaningfulContent(values: ProjectFormValues) {
  return Object.entries(values).some(([key, value]) => {
    if (key === "status") return false;
    if (Array.isArray(value)) return value.length > 0;
    return typeof value === "string" && value.trim() !== "";
  });
}

/**
 * Debounced server autosave with a local mirror.
 *
 * Every change is mirrored to localStorage immediately; the server draft is
 * written after a short pause. Saves never overlap: a change that arrives
 * while a save is in flight is written right after it completes.
 */
export function useAutosave({
  enabled,
  values,
  step,
  initialDraftId,
  initialSavedAt,
  dirty,
}: {
  enabled: boolean;
  values: ProjectFormValues;
  step: number;
  initialDraftId: string | null;
  initialSavedAt: string | null;
  dirty: boolean;
}) {
  const [state, setState] = useState<SaveState>({ status: initialSavedAt ? "saved" : "idle", at: initialSavedAt });
  const draftIdRef = useRef<string | null>(initialDraftId);
  const latest = useRef({ values, step });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const queued = useRef(false);

  useEffect(() => {
    latest.current = { values, step };
  }, [values, step]);

  const saveOnce = useCallback(async (): Promise<boolean> => {
    setState((s) => ({ ...s, status: "saving" }));
    const snapshot = latest.current;
    try {
      const result = await saveDraft({ draftId: draftIdRef.current, values: snapshot.values, step: snapshot.step });
      if (!result.ok) throw new Error(result.error);
      const firstSave = !draftIdRef.current;
      draftIdRef.current = result.draftId;
      if (firstSave) {
        const url = new URL(window.location.href);
        url.searchParams.set("draft", result.draftId);
        window.history.replaceState(window.history.state, "", url);
        try {
          window.localStorage.removeItem(LOCAL_KEY_NEW);
        } catch {
          /* ignore */
        }
      }
      writeLocal(localKey(result.draftId), { ...snapshot, at: result.savedAt, synced: true });
      setState({ status: "saved", at: result.savedAt });
      return true;
    } catch {
      setState({ status: "local", at: new Date().toISOString() });
      return false;
    }
  }, []);

  const persist = useCallback(async (): Promise<boolean> => {
    if (inFlight.current) {
      queued.current = true;
      return inFlight.current;
    }
    const run = (async () => {
      let ok = await saveOnce();
      // Changes that arrived during the save are written right after it.
      while (queued.current) {
        queued.current = false;
        ok = await saveOnce();
      }
      return ok;
    })();
    inFlight.current = run;
    try {
      return await run;
    } finally {
      inFlight.current = null;
    }
  }, [saveOnce]);

  useEffect(() => {
    if (!enabled || !dirty || !hasMeaningfulContent(values)) return;
    writeLocal(localKey(draftIdRef.current), { values, step, at: new Date().toISOString(), synced: false });
    const frame = requestAnimationFrame(() => setState((s) => (s.status === "saving" ? s : { ...s, status: "pending" })));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist(), DEBOUNCE_MS);
    return () => cancelAnimationFrame(frame);
  }, [enabled, dirty, values, step, persist]);

  useEffect(() => () => clearTimeout(timer.current), []);

  /** Writes immediately (used by "Salvar e continuar depois"). */
  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (!hasMeaningfulContent(latest.current.values)) return true;
    return persist();
  }, [persist]);

  /** Drops any pending write (used right before the draft becomes a project). */
  const cancel = useCallback(() => {
    clearTimeout(timer.current);
    queued.current = false;
  }, []);

  return { state, flush, cancel, draftId: draftIdRef };
}
