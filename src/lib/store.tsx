"use client";

// Stockage de l'espace de travail.
// Mode démo : tout est gardé dans le navigateur (localStorage).
// Quand Supabase sera branché, ce module gardera la même interface
// et déléguera les lectures/écritures à la base.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CONTROLS_BY_ID } from "./catalog/controls";
import type { ControlStatus } from "./catalog/types";
import { STATUS_LABELS } from "./catalog/types";
import {
  createWorkspace,
  uid,
  type Evidence,
  type OrgControl,
  type Workspace,
} from "./domain";
import type { ScopingAnswers } from "./scoping";

const KEY = "conformite:workspace:v1";
const ACTOR = "Vous";

interface Ctx {
  ready: boolean;
  workspace: Workspace | null;
  create: (answers: ScopingAnswers) => void;
  reset: () => void;
  updateControl: (id: string, patch: Partial<Omit<OrgControl, "controlId">>) => void;
  markReviewed: (id: string) => void;
  addEvidence: (e: Omit<Evidence, "id" | "addedAt" | "addedBy">) => void;
  removeEvidence: (id: string) => void;
}

const WorkspaceContext = createContext<Ctx | null>(null);

function load(): Workspace | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Workspace) : null;
  } catch {
    return null;
  }
}

function save(ws: Workspace | null) {
  try {
    if (ws) window.localStorage.setItem(KEY, JSON.stringify(ws));
    else window.localStorage.removeItem(KEY);
  } catch {
    // stockage indisponible (navigation privée) : on continue en mémoire
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Lecture différée après le montage pour éviter tout écart d'hydratation.
    const id = requestAnimationFrame(() => {
      setWorkspace(load());
      setReady(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const commit = useCallback((fn: (ws: Workspace) => Workspace) => {
    setWorkspace((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      save(next);
      return next;
    });
  }, []);

  const log = (ws: Workspace, message: string, controlId?: string): Workspace => ({
    ...ws,
    activity: [
      { id: uid(), at: new Date().toISOString(), actor: ACTOR, message, controlId },
      ...ws.activity,
    ].slice(0, 500),
  });

  const value = useMemo<Ctx>(
    () => ({
      ready,
      workspace,
      create: (answers) => {
        const ws = createWorkspace(answers);
        save(ws);
        setWorkspace(ws);
      },
      reset: () => {
        save(null);
        setWorkspace(null);
      },
      updateControl: (id, patch) =>
        commit((ws) => {
          const prev = ws.controls[id];
          const nextControl: OrgControl = {
            ...prev,
            ...patch,
            updatedAt: new Date().toISOString(),
          };
          if (patch.status === "conforme") nextControl.lastReviewedAt = nextControl.updatedAt;
          let next: Workspace = { ...ws, controls: { ...ws.controls, [id]: nextControl } };
          const title = CONTROLS_BY_ID.get(id)?.title ?? id;
          if (patch.status && patch.status !== prev.status) {
            next = log(next, `${title} : statut « ${STATUS_LABELS[patch.status as ControlStatus]} »`, id);
          }
          if (patch.owner !== undefined && patch.owner !== prev.owner && patch.owner) {
            next = log(next, `${title} : responsable ${patch.owner}`, id);
          }
          return next;
        }),
      markReviewed: (id) =>
        commit((ws) => {
          const now = new Date().toISOString();
          const next = {
            ...ws,
            controls: { ...ws.controls, [id]: { ...ws.controls[id], lastReviewedAt: now, updatedAt: now } },
          };
          return log(next, `${CONTROLS_BY_ID.get(id)?.title ?? id} : revue effectuée`, id);
        }),
      addEvidence: (e) =>
        commit((ws) => {
          const ev: Evidence = { ...e, id: uid(), addedAt: new Date().toISOString(), addedBy: ACTOR };
          return log({ ...ws, evidences: [ev, ...ws.evidences] }, `Preuve ajoutée : ${e.title}`, e.controlId);
        }),
      removeEvidence: (id) =>
        commit((ws) => {
          const ev = ws.evidences.find((x) => x.id === id);
          const next = { ...ws, evidences: ws.evidences.filter((x) => x.id !== id) };
          return ev ? log(next, `Preuve supprimée : ${ev.title}`, ev.controlId) : next;
        }),
    }),
    [ready, workspace, commit],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace doit être utilisé dans WorkspaceProvider");
  return ctx;
}
