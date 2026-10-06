// Modèle de données côté application + calcul du score et des alertes.
// Logique pure : identique en mode démo (stockage local) et avec Supabase.

import { CONTROLS, CONTROLS_BY_ID } from "./catalog/controls";
import { FRAMEWORKS } from "./catalog/frameworks";
import type { Control, ControlStatus, FrameworkId } from "./catalog/types";
import {
  assessNis2,
  computeApplicability,
  type Nis2Assessment,
  type ScopingAnswers,
} from "./scoping";

export type EvidenceKind =
  | "document"
  | "photo"
  | "capture"
  | "registre"
  | "lien"
  | "autre";

export const EVIDENCE_KIND_LABELS: Record<EvidenceKind, string> = {
  document: "Document",
  photo: "Photo",
  capture: "Capture d'écran",
  registre: "Registre / papier scanné",
  lien: "Lien",
  autre: "Autre",
};

export interface OrgControl {
  controlId: string;
  status: ControlStatus;
  applicable: boolean;
  exclusionReason: string | null;
  owner: string | null;
  dueDate: string | null; // AAAA-MM-JJ
  notes: string;
  lastReviewedAt: string | null; // ISO
  updatedAt: string; // ISO
}

export interface Evidence {
  id: string;
  controlId: string;
  title: string;
  kind: EvidenceKind;
  fileName: string | null;
  url: string | null;
  validUntil: string | null; // AAAA-MM-JJ
  addedAt: string; // ISO
  addedBy: string;
}

export interface ActivityEntry {
  id: string;
  at: string;
  actor: string;
  message: string;
  controlId?: string;
}

export interface Workspace {
  version: 1;
  answers: ScopingAnswers;
  nis2: Nis2Assessment;
  createdAt: string;
  controls: Record<string, OrgControl>;
  evidences: Evidence[];
  activity: ActivityEntry[];
}

// ---------------------------------------------------------------------------
// Création d'un espace à partir du questionnaire de cadrage
// ---------------------------------------------------------------------------
export function createWorkspace(answers: ScopingAnswers, now = new Date()): Workspace {
  const applicability = computeApplicability(answers);
  const iso = now.toISOString();
  const controls: Record<string, OrgControl> = {};
  for (const c of CONTROLS) {
    const app = applicability.get(c.id)!;
    controls[c.id] = {
      controlId: c.id,
      status: app.applicable ? "a_faire" : "non_applicable",
      applicable: app.applicable,
      exclusionReason: app.exclusionReason,
      owner: null,
      dueDate: null,
      notes: "",
      lastReviewedAt: null,
      updatedAt: iso,
    };
  }
  return {
    version: 1,
    answers,
    nis2: assessNis2(answers),
    createdAt: iso,
    controls,
    evidences: [],
    activity: [
      {
        id: uid(),
        at: iso,
        actor: "Vous",
        message: `Espace créé pour ${answers.organizationName || "votre organisation"}.`,
      },
    ],
  };
}

export function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------
export const today = (now = new Date()) => now.toISOString().slice(0, 10);

export function daysBetween(fromIsoDate: string, toIsoDate: string): number {
  const a = Date.parse(fromIsoDate.slice(0, 10));
  const b = Date.parse(toIsoDate.slice(0, 10));
  return Math.round((b - a) / 86_400_000);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate.slice(0, 10));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso.length === 10 ? iso + "T00:00:00" : iso).toLocaleDateString(
    "fr-FR",
    { day: "numeric", month: "short", year: "numeric" },
  );
}

// ---------------------------------------------------------------------------
// Preuves
// ---------------------------------------------------------------------------
export function evidenceFor(ws: Workspace, controlId: string): Evidence[] {
  return ws.evidences.filter((e) => e.controlId === controlId);
}

export function isEvidenceValid(e: Evidence, now = new Date()): boolean {
  return !e.validUntil || e.validUntil >= today(now);
}

export function hasValidEvidence(ws: Workspace, controlId: string, now = new Date()) {
  return evidenceFor(ws, controlId).some((e) => isEvidenceValid(e, now));
}

// ---------------------------------------------------------------------------
// Score de conformité
// Règle volontairement exigeante : un contrôle ne compte à 100 % que s'il est
// « conforme » ET appuyé par au moins une preuve valide. Sinon 50 %.
// ---------------------------------------------------------------------------
export interface Score {
  percent: number;
  applicable: number;
  conformes: number;
  enCours: number;
  aFaire: number;
  sansPreuve: number;
}

export function controlCredit(ws: Workspace, oc: OrgControl, now = new Date()): number {
  if (oc.status === "conforme") return hasValidEvidence(ws, oc.controlId, now) ? 1 : 0.5;
  if (oc.status === "en_cours") return 0.25;
  return 0;
}

export function scoreOf(ws: Workspace, controls: Control[], now = new Date()): Score {
  let applicable = 0, credit = 0, conformes = 0, enCours = 0, aFaire = 0, sansPreuve = 0;
  for (const c of controls) {
    const oc = ws.controls[c.id];
    if (!oc || !oc.applicable || oc.status === "non_applicable") continue;
    applicable++;
    credit += controlCredit(ws, oc, now);
    if (oc.status === "conforme") {
      conformes++;
      if (!hasValidEvidence(ws, c.id, now)) sansPreuve++;
    } else if (oc.status === "en_cours") enCours++;
    else aFaire++;
  }
  return {
    percent: applicable ? Math.round((credit / applicable) * 100) : 0,
    applicable,
    conformes,
    enCours,
    aFaire,
    sansPreuve,
  };
}

export function controlsForFramework(fw: FrameworkId): Control[] {
  return CONTROLS.filter((c) => c.covers.some((r) => r.startsWith(fw + ":")));
}

export function frameworkScores(ws: Workspace, now = new Date()) {
  return FRAMEWORKS.filter((f) =>
    f.id === "iso27001" ? ws.answers.targetIso27001 : ws.answers.targetNis2,
  ).map((f) => ({ framework: f, score: scoreOf(ws, controlsForFramework(f.id), now) }));
}

// ---------------------------------------------------------------------------
// Alertes
// ---------------------------------------------------------------------------
export type AlertSeverity = "critique" | "attention" | "info";

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  controlId?: string;
}

export function computeAlerts(ws: Workspace, now = new Date()): Alert[] {
  const t = today(now);
  const alerts: Alert[] = [];

  for (const e of ws.evidences) {
    const oc = ws.controls[e.controlId];
    if (!oc?.applicable || !e.validUntil) continue;
    const left = daysBetween(t, e.validUntil);
    if (left < 0) {
      alerts.push({
        id: `exp-${e.id}`,
        severity: "critique",
        title: `Preuve expirée : ${e.title}`,
        detail: `Expirée depuis ${-left} jour${-left > 1 ? "s" : ""}. Le contrôle ${e.controlId} n'est plus démontré.`,
        controlId: e.controlId,
      });
    } else if (left <= 30) {
      alerts.push({
        id: `soon-${e.id}`,
        severity: "attention",
        title: `Preuve à renouveler : ${e.title}`,
        detail: `Expire dans ${left} jour${left > 1 ? "s" : ""}.`,
        controlId: e.controlId,
      });
    }
  }

  for (const oc of Object.values(ws.controls)) {
    if (!oc.applicable || oc.status === "non_applicable") continue;
    const c = CONTROLS_BY_ID.get(oc.controlId)!;

    if (oc.dueDate && oc.dueDate < t && oc.status !== "conforme") {
      alerts.push({
        id: `due-${oc.controlId}`,
        severity: "critique",
        title: `Échéance dépassée : ${c.title}`,
        detail: `Prévu pour le ${formatDate(oc.dueDate)}${oc.owner ? ` (responsable : ${oc.owner})` : ""}.`,
        controlId: oc.controlId,
      });
    }

    if (oc.status === "conforme") {
      if (!hasValidEvidence(ws, oc.controlId, now)) {
        alerts.push({
          id: `nop-${oc.controlId}`,
          severity: "attention",
          title: `Conforme sans preuve valide : ${c.title}`,
          detail: "Un auditeur demandera une preuve. Ajoutez-en une pour que le contrôle compte à 100 %.",
          controlId: oc.controlId,
        });
      }
      const ref = oc.lastReviewedAt ?? oc.updatedAt;
      if (daysBetween(ref, t) > c.reviewDays) {
        alerts.push({
          id: `rev-${oc.controlId}`,
          severity: "info",
          title: `Revue à faire : ${c.title}`,
          detail: `Dernière revue le ${formatDate(ref)} (fréquence recommandée : ${c.reviewDays} jours).`,
          controlId: oc.controlId,
        });
      }
    }
  }

  const socleSansResponsable = CONTROLS.filter((c) => {
    const oc = ws.controls[c.id];
    return c.priority === "socle" && oc?.applicable && oc.status === "a_faire" && !oc.owner;
  });
  if (socleSansResponsable.length) {
    alerts.push({
      id: "socle-owner",
      severity: "info",
      title: `${socleSansResponsable.length} contrôle${socleSansResponsable.length > 1 ? "s" : ""} essentiel${socleSansResponsable.length > 1 ? "s" : ""} sans responsable`,
      detail: "Attribuez un responsable et une échéance pour lancer la démarche.",
    });
  }

  const order: Record<AlertSeverity, number> = { critique: 0, attention: 1, info: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}

// ---------------------------------------------------------------------------
// Prochaines actions : contrôles essentiels d'abord, puis le reste.
// ---------------------------------------------------------------------------
export function nextActions(ws: Workspace, limit = 6): Control[] {
  const rank = (c: Control) => {
    const oc = ws.controls[c.id];
    return (c.priority === "socle" ? 0 : 10) + (oc.status === "en_cours" ? 0 : 1);
  };
  return CONTROLS.filter((c) => {
    const oc = ws.controls[c.id];
    return oc?.applicable && (oc.status === "a_faire" || oc.status === "en_cours");
  })
    .sort((a, b) => rank(a) - rank(b) || a.sort - b.sort)
    .slice(0, limit);
}
