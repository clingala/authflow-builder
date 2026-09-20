"use client";

import { useCallback, useEffect, useState } from "react";

import { authFlowConfigSchema, type AuthFlowConfig } from "@/modules/auth-config";

import type { BuilderProject, UpdateAuthConfig } from "./types";

type SaveState = "idle" | "saving" | "saved" | "error";
type ApiError = { code: string; message: string; currentVersion?: number; issues?: Array<{ path: string; message: string }> };

export function useAuthBuilder(project: BuilderProject) {
  const [draft, setDraft] = useState(project.config);
  const [savedConfig, setSavedConfig] = useState(project.config);
  const [version, setVersion] = useState(project.version);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errors, setErrors] = useState<string[]>([]);

  const update: UpdateAuthConfig = useCallback((mutate) => {
    setDraft((current) => {
      const next = structuredClone(current);
      mutate(next);
      return next;
    });
    setDirty(true);
    setSaveState("idle");
    setErrors([]);
  }, []);

  const reset = useCallback(() => {
    setDraft(structuredClone(savedConfig));
    setDirty(false);
    setSaveState("idle");
    setErrors([]);
  }, [savedConfig]);

  const save = useCallback(async () => {
    const parsed = authFlowConfigSchema.safeParse(draft);
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((issue) => `${issue.path.join(".") || "configuration"}: ${issue.message}`));
      setSaveState("error");
      return false;
    }

    setSaveState("saving");
    setErrors([]);
    try {
      const response = await fetch(`/api/v1/projects/${project.id}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedVersion: version, config: parsed.data }),
      });
      const payload = (await response.json()) as {
        data: { currentVersion: number; config: AuthFlowConfig } | null;
        error: ApiError | null;
      };

      if (!response.ok || !payload.data) {
        const issueMessages = payload.error?.issues?.map((issue) => `${issue.path}: ${issue.message}`) ?? [];
        const conflict = payload.error?.code === "REVISION_CONFLICT" && payload.error.currentVersion
          ? `A newer version (${payload.error.currentVersion}) exists. Reload before saving again.`
          : null;
        setErrors([conflict ?? payload.error?.message ?? "Unable to save configuration", ...issueMessages]);
        setSaveState("error");
        return false;
      }

      const normalized = authFlowConfigSchema.parse(payload.data.config);
      setDraft(normalized);
      setSavedConfig(normalized);
      setVersion(payload.data.currentVersion);
      setDirty(false);
      setSaveState("saved");
      return true;
    } catch {
      setErrors(["The configuration could not be saved. Check your connection and try again."]);
      setSaveState("error");
      return false;
    }
  }, [draft, project.id, version]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return { draft, version, dirty, saveState, errors, update, reset, save };
}
