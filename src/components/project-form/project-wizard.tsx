"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, CloudOff, History, ScanEye, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { LogoMark } from "@/components/brand/logo";
import { Code, Kbd } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { StatusDot } from "@/components/ui/status";
import { Stepper, StepperBar, stepCounter } from "@/components/ui/stepper";
import { useToast } from "@/components/ui/toast";
import { PROJECT_STATUS_LABELS, PROJECT_TYPE_LABELS } from "@/domain/project";
import {
  FORM_STEPS,
  REVIEW_STEP,
  collectErrors,
  errorsForStep,
  stepOfError,
  type FormErrors,
  type ProjectFormValues,
} from "@/domain/project-form";
import { cn } from "@/lib/cn";
import { formatRelative, formatTime } from "@/lib/format";
import { useIsMac } from "@/lib/use-platform";
import { createProject, deleteDraft, updateProject } from "@/server/projects/actions";
import { BusinessStep } from "./steps/business-step";
import { ContextStep } from "./steps/context-step";
import { DesignStep } from "./steps/design-step";
import { IdentityStep } from "./steps/identity-step";
import { NotesStep } from "./steps/notes-step";
import { ReviewStep } from "./steps/review-step";
import { ScopeStep } from "./steps/scope-step";
import type { SetField } from "./types";
import { LOCAL_KEY_NEW, clearLocalBackups, hasMeaningfulContent, readLocalBackup, useAutosave, type LocalBackup, type SaveState } from "./use-autosave";

type WizardProps =
  | { mode: "create"; initialValues: ProjectFormValues; draftId: string | null; initialStep: number; savedAt: string | null }
  | { mode: "edit"; initialValues: ProjectFormValues; projectId: string; initialStep?: number };

const TOTAL = FORM_STEPS.length;
const STEPS = [...FORM_STEPS, { key: "review", label: "Revisão", description: "Conferir antes de salvar", icon: <ScanEye className="size-3" /> }];

export function ProjectWizard(props: WizardProps) {
  const { mode, initialValues } = props;
  const router = useRouter();
  const toast = useToast();

  const [values, setValues] = useState(initialValues);
  const [step, setStep] = useState(() => Math.min(props.initialStep ?? 0, REVIEW_STEP));
  const [direction, setDirection] = useState(1);
  const [maxVisited, setMaxVisited] = useState(() => (mode === "edit" ? REVIEW_STEP : Math.min(props.initialStep ?? 0, REVIEW_STEP)));
  const [errors, setErrors] = useState<FormErrors>({});
  const [dirty, setDirty] = useState(false);
  const [submitting, startSubmit] = useTransition();
  const [created, setCreated] = useState<string | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [recovery, setRecovery] = useState<LocalBackup | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isMac = useIsMac();

  const autosave = useAutosave({
    enabled: mode === "create" && !created && !submitting,
    values,
    step,
    initialDraftId: mode === "create" ? props.draftId : null,
    initialSavedAt: mode === "create" ? props.savedAt : null,
    dirty,
  });

  // Offer to restore a local copy that never reached the server (e.g. offline).
  useEffect(() => {
    if (mode !== "create" || props.draftId) return;
    const backup = readLocalBackup(LOCAL_KEY_NEW);
    if (!backup || backup.synced || !hasMeaningfulContent(backup.values)) return;
    const frame = requestAnimationFrame(() => setRecovery(backup));
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set: SetField = useCallback((key, value) => {
    setDirty(true);
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = Object.fromEntries(Object.entries(prev).filter(([path]) => path !== key && !path.startsWith(`${String(key)}.`)));
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, []);

  const liveErrors = useMemo(() => collectErrors(values), [values]);

  const goTo = useCallback(
    (next: number) => {
      const target = Math.max(0, Math.min(REVIEW_STEP, next));
      setDirection(target >= step ? 1 : -1);
      setStep(target);
      setMaxVisited((m) => Math.max(m, target));
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    },
    [step],
  );

  const focusFirstInvalid = () =>
    requestAnimationFrame(() => {
      contentRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus({ preventScroll: false });
    });

  const next = () => {
    if (step >= REVIEW_STEP) return;
    const stepErrors = errorsForStep(liveErrors, step);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      focusFirstInvalid();
      return;
    }
    setErrors({});
    goTo(step + 1);
  };

  const back = () => {
    setErrors({});
    goTo(step - 1);
  };

  const submit = () => {
    if (Object.keys(liveErrors).length > 0) {
      setErrors(liveErrors);
      const first = Math.min(...Object.keys(liveErrors).map(stepOfError));
      toast.show({ tone: "error", title: "Faltam algumas informações", description: "Levamos você até o primeiro campo pendente." });
      goTo(first);
      setTimeout(focusFirstInvalid, 350);
      return;
    }
    startSubmit(async () => {
      if (mode === "create") {
        autosave.cancel();
        const result = await createProject({ values, draftId: autosave.draftId.current });
        if (result.ok) {
          clearLocalBackups(autosave.draftId.current);
          setCreated(values.name.trim());
          router.push(`/projects/${result.projectId}`);
          return;
        }
        handleServerError(result);
      } else {
        const result = await updateProject({ projectId: props.projectId, values });
        if (result.ok) {
          setDirty(false);
          toast.show({ title: "Alterações salvas", description: "O histórico do projeto foi atualizado." });
          router.push(`/projects/${props.projectId}`);
          router.refresh();
          return;
        }
        handleServerError(result);
      }
    });
  };

  const handleServerError = (result: { error: string; fieldErrors?: Record<string, string> }) => {
    if (result.fieldErrors && Object.keys(result.fieldErrors).length > 0) {
      setErrors(result.fieldErrors);
      goTo(Math.min(...Object.keys(result.fieldErrors).map(stepOfError)));
    }
    toast.show({ tone: "error", title: "Não foi possível salvar", description: result.error });
  };

  const saveAndExit = async () => {
    setLeaving(true);
    if (!hasMeaningfulContent(values)) {
      router.push("/");
      return;
    }
    const ok = await autosave.flush();
    toast.show(
      ok
        ? { title: "Rascunho salvo", description: "Continue de onde parou quando quiser." }
        : { tone: "info", title: "Rascunho salvo neste dispositivo", description: "Não conseguimos sincronizar agora. Ele será recuperado ao voltar." },
    );
    router.push("/");
  };

  const discardAndExit = async () => {
    setLeaving(true);
    if (autosave.draftId.current) await deleteDraft(autosave.draftId.current);
    clearLocalBackups(autosave.draftId.current);
    router.push("/");
  };

  const requestClose = () => {
    if (mode === "edit") {
      if (dirty) setLeaveOpen(true);
      else router.push(`/projects/${props.projectId}`);
      return;
    }
    if (dirty && hasMeaningfulContent(values)) setLeaveOpen(true);
    else router.push("/");
  };

  // Keyboard: ⌘/Ctrl + Enter advances (or submits on review).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        document.querySelector<HTMLButtonElement>("[data-wizard-primary]")?.click();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Never lose a discovery to an accidental tab close.
  useEffect(() => {
    const unsaved = mode === "edit" ? dirty && !submitting : autosave.state.status === "pending" || autosave.state.status === "saving";
    if (!unsaved || created) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [mode, dirty, submitting, autosave.state.status, created]);

  const counter = step === REVIEW_STEP ? "Revisão" : stepCounter(step, TOTAL);
  const stepProps = { values, set, errors, counter };
  const isReview = step === REVIEW_STEP;
  const hasErrorsIn = (index: number) => Object.keys(errors).some((path) => stepOfError(path) === index);

  let content: ReactNode;
  switch (step) {
    case 0: content = <IdentityStep {...stepProps} />; break;
    case 1: content = <ContextStep {...stepProps} />; break;
    case 2: content = <ScopeStep {...stepProps} />; break;
    case 3: content = <DesignStep {...stepProps} />; break;
    case 4: content = <BusinessStep {...stepProps} />; break;
    case 5: content = <NotesStep {...stepProps} />; break;
    default: content = <ReviewStep values={values} errors={liveErrors} counter={counter} onEdit={goTo} mode={mode} />;
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-[var(--z-header)] border-b border-line bg-canvas/85 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <LogoMark className="size-5 text-fg-strong" />
          <span className="h-4 w-px bg-line-2" aria-hidden />
          <p className="truncate text-body-sm text-fg-muted">
            {mode === "create" ? "Registro de novo projeto" : <>Editando <span className="text-fg-strong">{initialValues.name}</span></>}
          </p>
          <div className="ml-auto flex items-center gap-2">
            {mode === "create" && <SaveIndicator state={autosave.state} />}
            <IconButton label={mode === "create" ? "Fechar registro" : "Fechar edição"} onClick={requestClose}>
              <X />
            </IconButton>
          </div>
        </div>
        {/* Mobile progress */}
        <div className="flex flex-col gap-2 px-4 pb-3 lg:hidden">
          <StepperBar total={REVIEW_STEP + 1} current={step} />
          <div className="flex items-center justify-between">
            <span className="font-mono text-[0.6875rem] text-fg-muted">{isReview ? "REVISÃO" : stepCounter(step, TOTAL)}</span>
            <span className="text-caption tracking-normal text-fg-subtle">{STEPS[step]!.label}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Rail */}
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-[300px] shrink-0 flex-col gap-8 overflow-y-auto border-r border-line px-7 py-8 lg:flex">
          <IdentityPreview values={values} />
          <Stepper
            steps={STEPS}
            current={step}
            reachable={(i) => mode === "edit" || i <= maxVisited}
            complete={(i) => i < maxVisited && !Object.keys(liveErrors).some((p) => stepOfError(p) === i)}
            hasError={hasErrorsIn}
            onSelect={(i) => {
              setErrors({});
              goTo(i);
            }}
          />
          <div className="mt-auto flex flex-col gap-2 border-t border-line pt-5 text-caption tracking-normal text-fg-subtle">
            {mode === "create" ? (
              <p>Cada alteração é salva como rascunho. Você pode sair e continuar depois.</p>
            ) : (
              <p>Alterações entram no histórico do projeto ao salvar.</p>
            )}
            <p className="flex items-center gap-1.5">
              <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
              <Kbd>↵</Kbd>
              <span className="ml-1">{isReview ? "salvar" : "próxima etapa"}</span>
            </p>
          </div>
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <AnimatePresence>
            {recovery && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="mx-auto mt-6 flex max-w-[760px] flex-col gap-3 px-4 sm:px-8">
                  <div className="flex flex-col gap-3 rounded-md bg-identity/60 px-4 py-3 shadow-[inset_0_0_0_1px_rgb(147_166_216/0.16)] sm:flex-row sm:items-center">
                    <History className="size-4 shrink-0 text-info" aria-hidden />
                    <p className="flex-1 text-body-sm text-fg">
                      Encontramos um registro não sincronizado de <span suppressHydrationWarning>{formatRelative(recovery.at)}</span>
                      {recovery.values.name && <> — <span className="text-fg-strong">{recovery.values.name}</span></>}.
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => { clearLocalBackups(null); setRecovery(null); }}>
                        Descartar
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setValues(recovery.values);
                          setDirty(true);
                          setMaxVisited(recovery.step);
                          goTo(recovery.step);
                          setRecovery(null);
                        }}
                      >
                        Restaurar
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={contentRef} className="mx-auto w-full max-w-[760px] px-4 pt-8 pb-40 sm:px-8 sm:pt-12 lg:pt-16">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={step}
                custom={direction}
                variants={{
                  enter: (d: number) => ({ opacity: 0, x: d * 28, filter: "blur(2px)" }),
                  center: { opacity: 1, x: 0, filter: "blur(0px)" },
                  exit: (d: number) => ({ opacity: 0, x: d * -20, filter: "blur(2px)" }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.26, ease: [0.25, 1, 0.5, 1] }}
              >
                {content}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <footer className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] border-t border-line bg-canvas/90 backdrop-blur-xl lg:left-[300px]">
        <div className="mx-auto flex max-w-[760px] items-center gap-2 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-8">
          {step > 0 ? (
            <Button variant="ghost" onClick={back} leading={<ArrowLeft />} className="max-sm:px-2.5" aria-label="Voltar para a etapa anterior">
              <span className="max-sm:sr-only">Voltar</span>
            </Button>
          ) : (
            <Button variant="ghost" onClick={requestClose} className="max-sm:px-2.5">
              Cancelar
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            {mode === "create" && (
              <Button variant="ghost" onClick={saveAndExit} loading={leaving && !leaveOpen} className="hidden sm:inline-flex">
                Salvar e continuar depois
              </Button>
            )}
            {mode === "edit" && !isReview && (
              <Button variant="secondary" onClick={submit} loading={submitting} className="hidden sm:inline-flex">
                Salvar alterações
              </Button>
            )}
            {isReview ? (
              <Button data-wizard-primary variant="primary" onClick={submit} loading={submitting} leading={!submitting && <Check className="stroke-[2.5]" />} className="min-w-40">
                {mode === "create" ? (submitting ? "Registrando…" : "Criar projeto") : submitting ? "Salvando…" : "Salvar alterações"}
              </Button>
            ) : (
              <Button
                data-wizard-primary
                variant="primary"
                onClick={next}
                trailing={<ArrowRight className="transition-transform duration-200 group-hover/button:translate-x-0.5" />}
                className="min-w-36"
              >
                {step === TOTAL - 1 ? "Revisar" : "Continuar"}
              </Button>
            )}
          </div>
        </div>
      </footer>

      <Modal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        size="sm"
        title={mode === "create" ? "Sair do registro?" : "Descartar alterações?"}
        description={
          mode === "create"
            ? "O que já foi preenchido pode ficar salvo como rascunho para você continuar depois."
            : "As alterações feitas nesta edição ainda não foram salvas."
        }
        footer={
          mode === "create" ? (
            <>
              <Button variant="danger" onClick={discardAndExit} disabled={leaving}>
                Descartar
              </Button>
              <Button variant="primary" onClick={saveAndExit} loading={leaving} data-autofocus>
                Manter rascunho
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setLeaveOpen(false)} data-autofocus>
                Continuar editando
              </Button>
              <Button variant="danger" onClick={() => router.push(`/projects/${props.projectId}`)}>
                Descartar alterações
              </Button>
            </>
          )
        }
      />

      <AnimatePresence>{created !== null && <CreatedOverlay name={created} />}</AnimatePresence>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function SaveIndicator({ state }: { state: SaveState }) {
  const content: Record<SaveState["status"], ReactNode> = {
    idle: <span className="text-fg-subtle">Rascunho</span>,
    pending: <span className="text-fg-subtle">Alterações não salvas</span>,
    saving: (
      <>
        <Spinner className="size-3" />
        <span>Salvando…</span>
      </>
    ),
    saved: (
      <>
        <Check className="size-3.5 text-success" aria-hidden />
        <span>
          Salvo{state.at ? <span suppressHydrationWarning> às {formatTime(state.at)}</span> : null}
        </span>
      </>
    ),
    local: (
      <>
        <CloudOff className="size-3.5 text-warning" aria-hidden />
        <span>Salvo neste dispositivo</span>
      </>
    ),
    error: <span className="text-danger">Falha ao salvar</span>,
  };
  return (
    <div role="status" aria-live="polite" className="hidden h-8 items-center overflow-hidden rounded-sm px-2 text-caption tracking-normal text-fg-muted sm:flex">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={state.status}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.16 }}
          className="flex items-center gap-1.5"
        >
          {content[state.status]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

/** Live "birth certificate" that fills in as the form is answered. */
function IdentityPreview({ values }: { values: ProjectFormValues }) {
  const name = values.name.trim();
  return (
    <div className="relative overflow-hidden rounded-lg bg-identity p-4 shadow-[inset_0_0_0_1px_rgb(147_166_216/0.14)]">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-70 [mask-image:linear-gradient(to_bottom_left,black,transparent_75%)]" aria-hidden />
      <div className="relative flex flex-col gap-2">
        <span className="eyebrow text-[#9fb0de]">{values.type ? PROJECT_TYPE_LABELS[values.type] : "Novo projeto"}</span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={name ? "named" : "unnamed"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={cn("font-display text-h3 leading-tight font-medium break-words", name ? "text-fg-strong" : "text-fg-subtle")}
          >
            {name || "Sem nome ainda"}
          </motion.p>
        </AnimatePresence>
        <div className="flex flex-wrap items-center gap-2">
          {values.codename.trim() && <Code className="bg-canvas/40">{values.codename.trim()}</Code>}
          <span className="flex items-center gap-1.5 text-caption tracking-normal text-fg-muted">
            <StatusDot status={values.status} />
            {PROJECT_STATUS_LABELS[values.status]}
          </span>
        </div>
      </div>
    </div>
  );
}

/** The moment a project is born: the aperture draws itself, then we move on. */
function CreatedOverlay({ name }: { name: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[var(--z-modal)] flex flex-col items-center justify-center gap-6 bg-canvas/95 backdrop-blur-sm"
      role="status"
      aria-live="assertive"
    >
      <svg viewBox="0 0 96 96" className="size-24" fill="none" aria-hidden>
        <motion.circle cx="48" cy="48" r="44" stroke="rgb(212 207 214 / 0.2)" strokeWidth="1.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} />
        <motion.circle cx="48" cy="48" r="22" stroke="var(--color-fg-strong)" strokeWidth="1.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }} />
        <motion.path d="M48 4A44 44 0 0 1 92 48" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 0.5, delay: 0.35 }} />
        <motion.circle cx="48" cy="48" r="6" fill="var(--color-wine)" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.45 }} />
      </svg>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.3 }} className="flex flex-col items-center gap-1.5 px-6 text-center">
        <span className="eyebrow text-accent">Projeto registrado</span>
        <p className="font-display text-h2 text-fg-strong">{name}</p>
      </motion.div>
    </motion.div>
  );
}
