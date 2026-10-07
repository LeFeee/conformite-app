// Conversion entre les lignes Supabase (snake_case) et le modèle de l'application.
// Logique pure, sans appel réseau : testée sans base.

import type { ControlStatus } from "../catalog/types";
import type {
  ActivityEntry,
  Evidence,
  EvidenceKind,
  OrgControl,
  Workspace,
} from "../domain";
import type { Incident, IncidentStatus } from "../incidents";
import type { Risk, RiskTreatment } from "../risks";
import { assessNis2, DEFAULT_ANSWERS, type ScopingAnswers } from "../scoping";
import type { Answer, DataAccess, Supplier, SupplierCriticality } from "../suppliers";
import type { TrainingAudience, TrainingMethod, TrainingRecord } from "../training";

// ---------------------------------------------------------------------------
// Types des lignes (colonnes réellement lues ou écrites)
// ---------------------------------------------------------------------------
export interface OrgRow {
  id: string;
  name: string;
  activity: string | null;
  scoping: Partial<ScopingAnswers>;
  nis2_status: Workspace["nis2"]["status"] | null;
  target_iso27001: boolean;
  target_nis2: boolean;
  created_at: string;
}

export interface OrgControlRow {
  org_id: string;
  control_id: string;
  status: ControlStatus;
  applicable: boolean;
  exclusion_reason: string | null;
  owner_name: string | null;
  due_date: string | null;
  notes: string;
  last_reviewed_at: string | null;
  updated_at: string;
}

export interface EvidenceRow {
  id: string;
  org_id: string;
  control_id: string;
  title: string;
  kind: EvidenceKind;
  /** absent à l'écriture : le chemin n'est posé qu'après l'envoi du fichier */
  storage_path?: string | null;
  file_name: string | null;
  external_url: string | null;
  valid_until: string | null;
  added_by_name: string | null;
  added_at: string;
}

export interface RiskRow {
  id: string;
  org_id: string;
  asset: string;
  threat: string;
  likelihood: number;
  impact: number;
  treatment: RiskTreatment;
  owner_name: string | null;
  control_ids: string[];
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface IncidentRow {
  id: string;
  org_id: string;
  title: string;
  description: string;
  detected_at: string;
  significant: boolean;
  early_warning_at: string | null;
  notification_at: string | null;
  final_report_at: string | null;
  status: IncidentStatus;
  lessons_learned: string | null;
  created_at: string;
}

export interface SupplierRow {
  id: string;
  org_id: string;
  name: string;
  service: string;
  contact: string;
  criticality: SupplierCriticality;
  data_access: DataAccess;
  has_security_clauses: boolean;
  has_dpa: boolean;
  certifications: string;
  questionnaire_sent_at: string | null;
  answers: Record<string, Answer>;
  answered_at: string | null;
  last_review_at: string | null;
  notes: string;
  created_at: string;
}

export interface TrainingRow {
  id: string;
  org_id: string;
  person: string;
  audience: TrainingAudience;
  method: TrainingMethod;
  date: string;
  score: number | null;
  valid_until: string;
  notes: string;
}

export interface ActivityRow {
  id?: number;
  client_id: string | null;
  org_id: string;
  actor_id?: string | null;
  actor_name: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  message: string | null;
  at: string;
}

// ---------------------------------------------------------------------------
// Aides
// ---------------------------------------------------------------------------
/** Horodatage Postgres ("…+00:00") vers ISO ("…Z"), pour des comparaisons stables. */
export function iso(value: string): string;
export function iso(value: string | null): string | null;
export function iso(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toISOString();
}

/** Date seule "AAAA-MM-JJ". */
const day = (value: string | null) => (value ? value.slice(0, 10) : null);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string) => UUID.test(v);

const clampLevel = (n: number) => Math.min(4, Math.max(1, Math.round(n))) as 1 | 2 | 3 | 4;

// ---------------------------------------------------------------------------
// Organisation
// ---------------------------------------------------------------------------
export function orgToRow(answers: ScopingAnswers): Omit<OrgRow, "id" | "created_at"> {
  return {
    name: answers.organizationName,
    activity: answers.activity || null,
    scoping: answers,
    nis2_status: assessNis2(answers).status,
    target_iso27001: answers.targetIso27001,
    target_nis2: answers.targetNis2,
  };
}

export function rowToAnswers(row: OrgRow): ScopingAnswers {
  return {
    ...DEFAULT_ANSWERS,
    ...row.scoping,
    organizationName: row.name,
    activity: row.activity ?? row.scoping.activity ?? "",
    targetIso27001: row.target_iso27001,
    targetNis2: row.target_nis2,
  };
}

// ---------------------------------------------------------------------------
// Contrôles
// ---------------------------------------------------------------------------
export function controlToRow(c: OrgControl, orgId: string): Omit<OrgControlRow, "updated_at"> {
  return {
    org_id: orgId,
    control_id: c.controlId,
    status: c.status,
    applicable: c.applicable,
    // contrainte SQL : une exclusion doit toujours être justifiée
    exclusion_reason: c.applicable ? c.exclusionReason : c.exclusionReason || "Exclu par l'organisation",
    owner_name: c.owner,
    due_date: day(c.dueDate),
    notes: c.notes,
    last_reviewed_at: c.lastReviewedAt,
  };
}

export function rowToControl(r: OrgControlRow): OrgControl {
  return {
    controlId: r.control_id,
    status: r.status,
    applicable: r.applicable,
    exclusionReason: r.exclusion_reason,
    owner: r.owner_name,
    dueDate: day(r.due_date),
    notes: r.notes ?? "",
    lastReviewedAt: iso(r.last_reviewed_at),
    updatedAt: iso(r.updated_at),
  };
}

// ---------------------------------------------------------------------------
// Preuves
// ---------------------------------------------------------------------------
export function evidenceToRow(e: Evidence, orgId: string): EvidenceRow {
  return {
    id: e.id,
    org_id: orgId,
    control_id: e.controlId,
    title: e.title,
    kind: e.kind,
    file_name: e.fileName,
    external_url: e.url,
    valid_until: day(e.validUntil),
    added_by_name: e.addedBy,
    added_at: e.addedAt,
  };
}

export function rowToEvidence(r: EvidenceRow): Evidence {
  return {
    id: r.id,
    controlId: r.control_id,
    title: r.title,
    kind: r.kind,
    fileName: r.file_name ?? (r.storage_path ? r.storage_path.split("/").pop()! : null),
    url: r.external_url,
    validUntil: day(r.valid_until),
    addedAt: iso(r.added_at),
    addedBy: r.added_by_name ?? "—",
  };
}

// ---------------------------------------------------------------------------
// Risques, incidents, fournisseurs, sensibilisation
// ---------------------------------------------------------------------------
export function riskToRow(r: Risk, orgId: string): RiskRow {
  return {
    id: r.id,
    org_id: orgId,
    asset: r.asset,
    threat: r.threat,
    likelihood: r.likelihood,
    impact: r.impact,
    treatment: r.treatment,
    owner_name: r.owner,
    control_ids: r.controlIds,
    notes: r.notes,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

export function rowToRisk(r: RiskRow): Risk {
  return {
    id: r.id,
    asset: r.asset,
    threat: r.threat,
    likelihood: clampLevel(r.likelihood),
    impact: clampLevel(r.impact),
    treatment: r.treatment,
    owner: r.owner_name,
    controlIds: r.control_ids ?? [],
    notes: r.notes ?? "",
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

export function incidentToRow(i: Incident, orgId: string): IncidentRow {
  return {
    id: i.id,
    org_id: orgId,
    title: i.title,
    description: i.description,
    detected_at: i.detectedAt,
    significant: i.significant,
    early_warning_at: i.earlyWarningAt,
    notification_at: i.notificationAt,
    final_report_at: i.finalReportAt,
    status: i.status,
    lessons_learned: i.lessons || null,
    created_at: i.createdAt,
  };
}

export function rowToIncident(r: IncidentRow): Incident {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? "",
    detectedAt: iso(r.detected_at),
    significant: r.significant,
    earlyWarningAt: iso(r.early_warning_at),
    notificationAt: iso(r.notification_at),
    finalReportAt: iso(r.final_report_at),
    status: r.status,
    lessons: r.lessons_learned ?? "",
    createdAt: iso(r.created_at),
  };
}

export function supplierToRow(s: Supplier, orgId: string): SupplierRow {
  return {
    id: s.id,
    org_id: orgId,
    name: s.name,
    service: s.service,
    contact: s.contact,
    criticality: s.criticality,
    data_access: s.dataAccess,
    has_security_clauses: s.hasSecurityClauses,
    has_dpa: s.hasDpa,
    certifications: s.certifications,
    questionnaire_sent_at: s.questionnaireSentAt,
    answers: s.answers,
    answered_at: s.answeredAt,
    last_review_at: s.lastReviewAt,
    notes: s.notes,
    created_at: s.createdAt,
  };
}

export function rowToSupplier(r: SupplierRow): Supplier {
  return {
    id: r.id,
    name: r.name,
    service: r.service ?? "",
    contact: r.contact ?? "",
    criticality: r.criticality,
    dataAccess: r.data_access,
    hasSecurityClauses: r.has_security_clauses,
    hasDpa: r.has_dpa,
    certifications: r.certifications ?? "",
    questionnaireSentAt: iso(r.questionnaire_sent_at),
    answers: r.answers ?? {},
    answeredAt: iso(r.answered_at),
    lastReviewAt: iso(r.last_review_at),
    notes: r.notes ?? "",
    createdAt: iso(r.created_at),
  };
}

export function trainingToRow(t: TrainingRecord, orgId: string): TrainingRow {
  return {
    id: t.id,
    org_id: orgId,
    person: t.person,
    audience: t.audience,
    method: t.method,
    date: day(t.date)!,
    score: t.score,
    valid_until: day(t.validUntil)!,
    notes: t.notes,
  };
}

export function rowToTraining(r: TrainingRow): TrainingRecord {
  return {
    id: r.id,
    person: r.person,
    audience: r.audience,
    method: r.method,
    date: day(r.date)!,
    score: r.score,
    validUntil: day(r.valid_until)!,
    notes: r.notes ?? "",
  };
}

// ---------------------------------------------------------------------------
// Journal
// ---------------------------------------------------------------------------
export function activityToRow(a: ActivityEntry, orgId: string, actorId: string | null): ActivityRow {
  return {
    client_id: isUuid(a.id) ? a.id : null,
    org_id: orgId,
    actor_id: actorId,
    actor_name: a.actor,
    action: "log",
    entity: a.controlId ? "control" : "workspace",
    entity_id: a.controlId ?? null,
    message: a.message,
    at: a.at,
  };
}

const ACTION_LABELS: Record<string, string> = {
  create: "Création",
  update: "Modification",
  delete: "Suppression",
};

export function rowToActivity(r: ActivityRow): ActivityEntry {
  return {
    id: r.client_id ?? String(r.id),
    at: iso(r.at),
    actor: r.actor_name ?? "—",
    message:
      r.message ??
      (r.entity === "organization" && r.action === "create"
        ? "Espace créé."
        : `${ACTION_LABELS[r.action] ?? r.action} : ${r.entity}${r.entity_id ? ` ${r.entity_id}` : ""}`),
    controlId: r.entity === "control" && r.entity_id ? r.entity_id : undefined,
  };
}

// ---------------------------------------------------------------------------
// Assemblage d'un espace complet
// ---------------------------------------------------------------------------
export interface WorkspaceRows {
  org: OrgRow;
  controls: OrgControlRow[];
  evidences: EvidenceRow[];
  risks: RiskRow[];
  incidents: IncidentRow[];
  suppliers: SupplierRow[];
  trainings: TrainingRow[];
  activity: ActivityRow[];
}

const newestFirst = <T,>(get: (x: T) => string) => (a: T, b: T) => get(b).localeCompare(get(a));

export function workspaceFromRows(rows: WorkspaceRows): Workspace {
  const answers = rowToAnswers(rows.org);
  return {
    version: 1,
    answers,
    nis2: assessNis2(answers),
    createdAt: iso(rows.org.created_at),
    controls: Object.fromEntries(rows.controls.map((r) => [r.control_id, rowToControl(r)])),
    evidences: rows.evidences.map(rowToEvidence).sort(newestFirst((e) => e.addedAt)),
    risks: rows.risks.map(rowToRisk).sort(newestFirst((r) => r.createdAt)),
    incidents: rows.incidents.map(rowToIncident).sort(newestFirst((i) => i.detectedAt)),
    suppliers: rows.suppliers.map(rowToSupplier).sort(newestFirst((s) => s.createdAt)),
    trainings: rows.trainings.map(rowToTraining).sort(newestFirst((t) => t.date)),
    activity: rows.activity.map(rowToActivity).sort(newestFirst((a) => a.at)),
  };
}
