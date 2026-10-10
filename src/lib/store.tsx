"use client";

// Stockage de l'espace de travail.
// Mode démo : tout est gardé dans le navigateur (localStorage).
// Mode Supabase (variables d'environnement présentes) : même interface ; chaque
// changement d'état est comparé au précédent et seules les lignes modifiées
// sont envoyées à la base (voir lib/supabase/sync.ts).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CONTROLS_BY_ID } from "./catalog/controls";
import type { ControlStatus } from "./catalog/types";
import { STATUS_LABELS } from "./catalog/types";
import type { Asset, AssetDraft } from "./assets";
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
import { SUPABASE_ENABLED } from "./config";
import * as remote from "./supabase/repository";
import { withUuids } from "./supabase/sync";

const KEY = "conformite:workspace:v1";
export type SyncState = { state: "idle" | "saving" } | { state: "error"; message: string };

interface Ctx {
  ready: boolean;
  workspace: Workspace | null;
  /** "demo" : stockage local ; "supabase" : base partagée */
  mode: "demo" | "supabase";
  /** mode Supabase : personne n'est connecté */
  needsLogin: boolean;
  user: remote.Session | null;
  sync: SyncState;
  /** espace de démo trouvé dans ce navigateur, importable dans Supabase */
  localDemo: Workspace | null;
  create: (answers: ScopingAnswers) => Promise<void>;
  importDemo: () => Promise<void>;
  signOut: () => Promise<void>;
  reset: () => void;
  updateControl: (id: string, patch: Partial<Omit<OrgControl, "controlId">>) => void;
  markReviewed: (id: string) => void;
  /** `file` : en mode Supabase, le fichier est envoyé dans le stockage privé après l'enregistrement de la preuve. */
  addEvidence: (e: Omit<Evidence, "id" | "addedAt" | "addedBy">, file?: File | null) => void;
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
  addAssets: (drafts: AssetDraft[]) => void;
  updateAsset: (id: string, patch: Partial<Omit<Asset, "id" | "createdAt">>) => void;
  /** confirme que la fiche est à jour (revue annuelle) */
  reviewAsset: (id: string) => void;
  removeAsset: (id: string) => void;
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
  const [user, setUser] = useState<remote.Session | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [sync, setSync] = useState<SyncState>({ state: "idle" });
  const [localDemo, setLocalDemo] = useState<Workspace | null>(null);
  // Dernier état connu comme enregistré : la synchronisation envoie la différence.
  const synced = useRef<Workspace | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pendingUploads = useRef(new Map<string, File>());
  const ACTOR = user ? remote.displayName(user) : "Vous";

  useEffect(() => {
    let cancelled = false;
    // Lecture différée après le montage pour éviter tout écart d'hydratation.
    const id = requestAnimationFrame(async () => {
      let ws: Workspace | null = null;
      if (!SUPABASE_ENABLED) {
        ws = load();
      } else {
        try {
          const session = await remote.currentSession();
          if (session) {
            const org = await remote.currentOrgId();
            if (org) ws = await remote.loadWorkspace(org);
            if (!cancelled) {
              setUser(session);
              setOrgId(org);
              setLocalDemo(org ? null : load());
            }
          }
        } catch (e) {
          if (!cancelled) setSync({ state: "error", message: e instanceof Error ? e.message : String(e) });
        }
      }
      if (cancelled) return;
      synced.current = ws;
      setWorkspace(ws);
      setReady(true);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, []);

  // Enregistrement après chaque changement, dans l'ordre, hors du rendu.
  useEffect(() => {
    const prev = synced.current;
    if (!ready || !workspace || prev === workspace) return;
    synced.current = workspace;
    if (!SUPABASE_ENABLED) {
      save(workspace);
      return;
    }
    if (!orgId || !user) return;
    queue.current = queue.current
      .then(() => {
        setSync({ state: "saving" });
        return remote.syncWorkspace(prev, workspace, orgId, user.userId);
      })
      .then(async () => {
        for (const [evId, file] of pendingUploads.current) {
          if (!workspace.evidences.some((e) => e.id === evId)) continue;
          pendingUploads.current.delete(evId);
          await remote.uploadEvidenceFile(orgId, evId, file);
        }
      })
      .then(() => setSync({ state: "idle" }))
      .catch(async (e) => {
        setSync({ state: "error", message: e instanceof Error ? e.message : String(e) });
        // On repart de l'état réel de la base pour ne pas diverger.
        try {
          const fresh = await remote.loadWorkspace(orgId);
          synced.current = fresh;
          setWorkspace(fresh);
        } catch {}
      });
  }, [workspace, ready, orgId, user]);

  const commit = useCallback((fn: (ws: Workspace) => Workspace) => {
    setWorkspace((prev) => (prev ? fn(prev) : prev));
  }, []);

  const log = (ws: Workspace, message: string, controlId?: string): Workspace => ({
    ...ws,
    activity: [
      { id: uid(), at: new Date().toISOString(), actor: ACTOR, message, controlId },
      ...ws.activity,
    ].slice(0, 500),
  });

  const openOrg = async (org: string) => {
    const ws = await remote.loadWorkspace(org);
    synced.current = ws;
    setOrgId(org);
    setWorkspace(ws);
  };

  const value = useMemo<Ctx>(
    () => ({
      ready,
      workspace,
      mode: SUPABASE_ENABLED ? "supabase" : "demo",
      needsLogin: SUPABASE_ENABLED && ready && !user,
      user,
      sync,
      localDemo,
      create: async (answers) => {
        if (!SUPABASE_ENABLED) {
          const ws = createWorkspace(answers);
          save(ws);
          synced.current = ws;
          setWorkspace(ws);
          return;
        }
        await openOrg(await remote.createOrganization(answers));
      },
      importDemo: async () => {
        if (!SUPABASE_ENABLED || !localDemo || !user) return;
        const demo = withUuids(localDemo);
        const org = await remote.createOrganization(demo.answers);
        // L'organisation vient d'être créée : on envoie tout le contenu de la démo.
        const created = await remote.loadWorkspace(org);
        const merged: Workspace = { ...demo, createdAt: created.createdAt, activity: [...demo.activity, ...created.activity] };
        await remote.syncWorkspace(created, merged, org, user.userId);
        setLocalDemo(null);
        await openOrg(org);
      },
      signOut: async () => {
        if (SUPABASE_ENABLED) await remote.signOut();
        synced.current = null;
        setUser(null);
        setOrgId(null);
        setWorkspace(null);
      },
      reset: () => {
        if (SUPABASE_ENABLED) return; // en mode partagé, on ne supprime pas une organisation depuis l'interface
        save(null);
        synced.current = null;
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
      addEvidence: (e, file) => {
        const evId = uid();
        if (SUPABASE_ENABLED && file) pendingUploads.current.set(evId, file);
        commit((ws) => {
          const ev: Evidence = { ...e, id: evId, addedAt: new Date().toISOString(), addedBy: ACTOR };
          return log({ ...ws, evidences: [ev, ...ws.evidences] }, `Preuve ajoutée : ${e.title}`, e.controlId);
        });
      },
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
      addAssets: (drafts) =>
        commit((ws) => {
          if (!drafts.length) return ws;
          const now = new Date().toISOString();
          const added: Asset[] = drafts.map((d) => ({ ...d, id: uid(), createdAt: now, reviewedAt: now }));
          return log(
            { ...ws, assets: [...ws.assets, ...added] },
            added.length === 1 ? `Actif ajouté à l'inventaire : ${added[0].name}` : `${added.length} actifs ajoutés à l'inventaire`,
            "A.5.9",
          );
        }),
      updateAsset: (id, patch) =>
        commit((ws) => ({ ...ws, assets: ws.assets.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      reviewAsset: (id) =>
        commit((ws) => {
          const prev = ws.assets.find((x) => x.id === id);
          if (!prev) return ws;
          const next = { ...ws, assets: ws.assets.map((x) => (x.id === id ? { ...x, reviewedAt: new Date().toISOString() } : x)) };
          return log(next, `Actif revu : ${prev.name}`, "A.5.9");
        }),
      removeAsset: (id) =>
        commit((ws) => {
          const prev = ws.assets.find((x) => x.id === id);
          const next = { ...ws, assets: ws.assets.filter((x) => x.id !== id) };
          return prev ? log(next, `Actif retiré de l'inventaire : ${prev.name}`, "A.5.9") : next;
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
          const next = {
            ...ws,
            suppliers: ws.suppliers.filter((x) => x.id !== id),
            assets: ws.assets.map((x) => (x.supplierId === id ? { ...x, supplierId: null } : x)),
          };
          return prev ? log(next, `Fournisseur supprimé : ${prev.name}`) : next;
        }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, workspace, commit, user, sync, localDemo],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace doit être utilisé dans WorkspaceProvider");
  return ctx;
}
