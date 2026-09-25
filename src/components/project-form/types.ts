import type { FormErrors, ProjectFormValues } from "@/domain/project-form";

export type SetField = <K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) => void;

export type StepProps = {
  values: ProjectFormValues;
  set: SetField;
  errors: FormErrors;
};

export function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}
