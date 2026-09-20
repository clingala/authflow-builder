"use client";

import { useCallback, useEffect, useState } from "react";

import { authFlowConfigSchema, type AuthFlowConfig } from "@/modules/auth-config";

import { readBuilderDraft, removeBuilderDraft, type StoredBuilderDraft, writeBuilderDraft } from "./draft-storage";
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
  const [recovery, setRecovery] = useState<StoredBuilderDraft | null>(null);
  const [conflictVersion, setConflictVersion] = useState<number | null>(null);
  const [storageReady, setStorageReady] = useState(false);

  const update: UpdateAuthConfig = useCallback((mutate) => {
    setDraft((current) => {
      const next = structuredClone(current);
      mutate(next);
      return next;
    });
    setDirty(true);
    setSaveState("idle");
    setErrors([]);
    setConflictVersion(null);
  }, []);

  const reset = useCallback(() => {
    setDraft(structuredClone(savedConfig));
    setDirty(false);
    setSaveState("idle");
    setErrors([]);
    setConflictVersion(null);
    removeBuilderDraft(project.id);
  }, [project.id, savedConfig]);

  const restoreRecovery = useCallback(() => {
    if (!recovery || recovery.baseVersion !== version) return;
    setDraft(structuredClone(recovery.config));
    setDirty(true);
    setSaveState("idle");
    setErrors([]);
    setConflictVersion(null);
    setRecovery(null);
  }, [recovery, version]);

  const discardRecovery = useCallback(() => {
    removeBuilderDraft(project.id);
    setRecovery(null);
  }, [project.id]);

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
        setConflictVersion(payload.error?.code === "REVISION_CONFLICT" ? payload.error.currentVersion ?? null : null);
        if (payload.error?.code === "REVISION_CONFLICT") writeBuilderDraft(project.id, version, draft);
        setSaveState("error");
        return false;
      }

      const normalized = authFlowConfigSchema.parse(payload.data.config);
      setDraft(normalized);
      setSavedConfig(normalized);
      setVersion(payload.data.currentVersion);
      setDirty(false);
      setSaveState("saved");
      setConflictVersion(null);
      removeBuilderDraft(project.id);
      return true;
    } catch {
      setErrors(["The configuration could not be saved. Check your connection and try again."]);
      setSaveState("error");
      return false;
    }
  }, [draft, project.id, version]);

  const loadLatest = useCallback(async () => {
    setSaveState("saving");
    setErrors([]);
    try {
      const response = await fetch(`/api/v1/projects/${project.id}/config`, { method: "GET" });
      const payload = (await response.json()) as {
        data: { version: number; config: AuthFlowConfig } | null;
        error: ApiError | null;
      };
      if (!response.ok || !payload.data) {
        setErrors([payload.error?.message ?? "Unable to load the latest configuration"]);
        setSaveState("error");
        return false;
      }

      const normalized = authFlowConfigSchema.parse(payload.data.config);
      setDraft(normalized);
      setSavedConfig(normalized);
      setVersion(payload.data.version);
      setDirty(false);
      setSaveState("idle");
      setConflictVersion(null);
      setRecovery(null);
      removeBuilderDraft(project.id);
      return true;
    } catch {
      setErrors(["The latest configuration could not be loaded. Check your connection and try again."]);
      setSaveState("error");
      return false;
    }
  }, [project.id]);

  useEffect(() => {
    const hydrateStorage = window.setTimeout(() => {
      const stored = readBuilderDraft(project.id);
      if (stored && JSON.stringify(stored.config) !== JSON.stringify(project.config)) setRecovery(stored);
      else if (stored) removeBuilderDraft(project.id);
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(hydrateStorage);
  }, [project.config, project.id]);

  useEffect(() => {
    if (!storageReady || recovery) return;
    if (!dirty) {
      removeBuilderDraft(project.id);
      return;
    }
    const checkpoint = window.setTimeout(() => writeBuilderDraft(project.id, version, draft), 250);
    return () => window.clearTimeout(checkpoint);
  }, [dirty, draft, project.id, recovery, storageReady, version]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return {
    draft,
    version,
    dirty,
    saveState,
    errors,
    recovery,
    conflictVersion,
    update,
    reset,
    save,
    restoreRecovery,
    discardRecovery,
    loadLatest,
  };
}
