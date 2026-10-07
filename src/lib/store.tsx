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
import type { Incident } from "./incidents";
import type { Risk } from "./risks";
import type { Supplier } from "./suppliers";
import type { TrainingRecord } from "./training";
import {
  createWorkspace,
  normalizeWorkspace,
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
  addRisk: (r: Omit<Risk, "id" | "createdAt" | "updatedAt">) => void;
  updateRisk: (id: string, patch: Partial<Omit<Risk, "id">>) => void;
  removeRisk: (id: string) => void;
  addIncident: (i: Omit<Incident, "id" | "createdAt">) => string;
  updateIncident: (id: string, patch: Partial<Omit<Incident, "id">>) => void;
  removeIncident: (id: string) => void;
  addSupplier: (s: Omit<Supplier, "id" | "createdAt">) => void;
  updateSupplier: (id: string, patch: Partial<Omit<Supplier, "id">>) => void;
  removeSupplier: (id: string) => void;
  addTraining: (t: Omit<TrainingRecord, "id">) => void;
  removeTraining: (id: string) => void;
}

const WorkspaceContext = createContext<Ctx | null>(null);

function load(): Workspace | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? normalizeWorkspace(JSON.parse(raw) as Workspace) : null;
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
      addRisk: (r) =>
        commit((ws) => {
          const now = new Date().toISOString();
          const risk: Risk = { ...r, id: uid(), createdAt: now, updatedAt: now };
          return log({ ...ws, risks: [risk, ...ws.risks] }, `Risque ajouté : ${r.threat}`);
        }),
      updateRisk: (id, patch) =>
        commit((ws) => ({
          ...ws,
          risks: ws.risks.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r)),
        })),
      removeRisk: (id) =>
        commit((ws) => {
          const r = ws.risks.find((x) => x.id === id);
          const next = { ...ws, risks: ws.risks.filter((x) => x.id !== id) };
          return r ? log(next, `Risque supprimé : ${r.threat}`) : next;
        }),
      addIncident: (i) => {
        const id = uid();
        commit((ws) => {
          const inc: Incident = { ...i, id, createdAt: new Date().toISOString() };
          return log({ ...ws, incidents: [inc, ...ws.incidents] }, `Incident déclaré : ${i.title}`);
        });
        return id;
      },
      updateIncident: (id, patch) =>
        commit((ws) => {
          const prev = ws.incidents.find((x) => x.id === id);
          let next: Workspace = {
            ...ws,
            incidents: ws.incidents.map((x) => (x.id === id ? { ...x, ...patch } : x)),
          };
          if (prev && patch.status && patch.status !== prev.status && patch.status === "clos") {
            next = log(next, `Incident clos : ${prev.title}`);
          }
          return next;
        }),
      removeIncident: (id) =>
        commit((ws) => ({ ...ws, incidents: ws.incidents.filter((x) => x.id !== id) })),
      addSupplier: (sup) =>
        commit((ws) =>
          log(
            { ...ws, suppliers: [{ ...sup, id: uid(), createdAt: new Date().toISOString() }, ...ws.suppliers] },
            `Fournisseur ajouté : ${sup.name}`,
          ),
        ),
      updateSupplier: (id, patch) =>
        commit((ws) => {
          const prev = ws.suppliers.find((x) => x.id === id);
          let next: Workspace = { ...ws, suppliers: ws.suppliers.map((x) => (x.id === id ? { ...x, ...patch } : x)) };
          if (prev && patch.questionnaireSentAt && !prev.questionnaireSentAt) next = log(next, `Questionnaire envoyé à ${prev.name}`);
          if (prev && patch.answeredAt && !prev.answeredAt) next = log(next, `Réponses au questionnaire reçues de ${prev.name}`);
          return next;
        }),
      addTraining: (tr) =>
        commit((ws) => {
          const record: TrainingRecord = { ...tr, id: uid() };
          // La formation devient une preuve sur les contrôles concernés.
          const targets = ["A.6.3", "SMSI.7.3", ...(tr.audience === "dirigeant" ? ["NIS2.20"] : [])].filter(
            (id) => ws.controls[id]?.applicable,
          );
          const now = new Date().toISOString();
          const evidences = [
            ...targets.map((controlId) => ({
              id: uid(),
              controlId,
              title: `Attestation de sensibilisation — ${tr.person}`,
              kind: "document" as const,
              fileName: null,
              url: null,
              validUntil: tr.validUntil,
              addedAt: now,
              addedBy: ACTOR,
            })),
            ...ws.evidences,
          ];
          return log(
            { ...ws, trainings: [record, ...ws.trainings], evidences },
            `Sensibilisation enregistrée : ${tr.person}${tr.score !== null ? ` (${tr.score}/10)` : ""}`,
          );
        }),
      removeTraining: (id) =>
        commit((ws) => {
          const tr = ws.trainings.find((x) => x.id === id);
          if (!tr) return ws;
          // Retire aussi les preuves créées avec cette formation.
          const title = `Attestation de sensibilisation — ${tr.person}`;
          const evidences = ws.evidences.filter((e) => !(e.title === title && e.validUntil === tr.validUntil));
          return log(
            { ...ws, trainings: ws.trainings.filter((x) => x.id !== id), evidences },
            `Sensibilisation retirée du registre : ${tr.person}`,
          );
        }),
      removeSupplier: (id) =>
        commit((ws) => {
          const prev = ws.suppliers.find((x) => x.id === id);
          const next = { ...ws, suppliers: ws.suppliers.filter((x) => x.id !== id) };
          return prev ? log(next, `Fournisseur supprimé : ${prev.name}`) : next;
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
