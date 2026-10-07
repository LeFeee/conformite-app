import { describe, expect, it } from "vitest";
import { createWorkspace, type Workspace } from "../domain";
import { DEFAULT_ANSWERS, type ScopingAnswers } from "../scoping";
import {
  activityToRow,
  controlToRow,
  evidenceToRow,
  incidentToRow,
  iso,
  riskToRow,
  rowToActivity,
  supplierToRow,
  trainingToRow,
  workspaceFromRows,
  type OrgRow,
} from "./mapping";
import { describeOps, diffWorkspace, withUuids } from "./sync";

const NOW = new Date("2026-10-07T10:00:00Z");
const ORG = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const answers: ScopingAnswers = {
  ...DEFAULT_ANSWERS,
  organizationName: "Equo Expense",
  activity: "SaaS de notes de frais",
  headcount: "1",
  supplierOfNis2Entity: true,
  hasDevelopment: true,
  usesCloud: true,
  handlesPersonalData: true,
};

function fullWorkspace(): Workspace {
  const ws = createWorkspace(answers, NOW);
  ws.activity[0].id = id(99);
  ws.controls["A.5.1"] = { ...ws.controls["A.5.1"], status: "conforme", owner: "Fabien", dueDate: "2026-12-31", lastReviewedAt: NOW.toISOString(), notes: "Signée" };
  return {
    ...ws,
    evidences: [
      { id: id(1), controlId: "A.5.1", title: "Politique signée", kind: "document", fileName: "politique.pdf", url: null, validUntil: "2027-10-07", addedAt: NOW.toISOString(), addedBy: "Fabien" },
    ],
    risks: [
      { id: id(2), asset: "Base clients", threat: "Rançongiciel", likelihood: 3, impact: 4, treatment: "reduire", owner: "Fabien", controlIds: ["A.8.13"], notes: "", createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() },
    ],
    incidents: [
      { id: id(3), title: "Phishing", description: "Clic", detectedAt: NOW.toISOString(), significant: true, earlyWarningAt: NOW.toISOString(), notificationAt: null, finalReportAt: null, status: "en_traitement", lessons: "", createdAt: NOW.toISOString() },
    ],
    suppliers: [
      { id: id(4), name: "Scaleway", service: "Hébergement", contact: "", criticality: "critique", dataAccess: "personnelles", hasSecurityClauses: true, hasDpa: true, certifications: "ISO 27001", questionnaireSentAt: NOW.toISOString(), answers: { mfa: "oui", sauvegardes: "partiel" }, answeredAt: NOW.toISOString(), lastReviewAt: null, notes: "", createdAt: NOW.toISOString() },
    ],
    trainings: [
      { id: id(5), person: "Fabien", audience: "dirigeant", method: "quiz", date: "2026-10-07", score: 9, validUntil: "2027-10-07", notes: "" },
    ],
  };
}

/** Simule ce que renverrait Supabase pour cet espace (horodatages au format Postgres). */
function asRows(ws: Workspace) {
  const pg = (v: string) => v.replace("T", " ").replace(".000Z", "+00");
  const org: OrgRow = {
    id: ORG,
    name: ws.answers.organizationName,
    activity: ws.answers.activity,
    scoping: ws.answers,
    nis2_status: ws.nis2.status,
    target_iso27001: ws.answers.targetIso27001,
    target_nis2: ws.answers.targetNis2,
    created_at: pg(ws.createdAt),
  };
  return {
    org,
    controls: Object.values(ws.controls).map((c) => ({ ...controlToRow(c, ORG), exclusion_reason: c.exclusionReason, updated_at: pg(c.updatedAt) })),
    evidences: ws.evidences.map((e) => ({ ...evidenceToRow(e, ORG), added_at: pg(e.addedAt) })),
    risks: ws.risks.map((r) => riskToRow(r, ORG)),
    incidents: ws.incidents.map((i) => ({ ...incidentToRow(i, ORG), detected_at: pg(i.detectedAt) })),
    suppliers: ws.suppliers.map((s) => supplierToRow(s, ORG)),
    trainings: ws.trainings.map((t) => trainingToRow(t, ORG)),
    activity: ws.activity.map((a, n) => ({ ...activityToRow(a, ORG, USER), id: n + 1 })),
  };
}

describe("conversion Supabase ↔ application", () => {
  it("reconstruit un espace identique à partir des lignes de la base", () => {
    const ws = fullWorkspace();
    expect(workspaceFromRows(asRows(ws))).toEqual(ws);
  });

  it("normalise les horodatages Postgres en ISO", () => {
    expect(iso("2026-10-07 10:00:00+00")).toBe("2026-10-07T10:00:00.000Z");
    expect(iso("2026-10-07T12:00:00+02:00")).toBe("2026-10-07T10:00:00.000Z");
    expect(iso(null)).toBeNull();
  });

  it("justifie toujours une exclusion, comme l'exige la contrainte SQL", () => {
    const ws = fullWorkspace();
    const row = controlToRow({ ...ws.controls["A.5.1"], applicable: false, exclusionReason: null }, ORG);
    expect(row.exclusion_reason).toBeTruthy();
  });

  it("lit les entrées de journal créées par la base (création d'organisation)", () => {
    const a = rowToActivity({ id: 7, client_id: null, org_id: ORG, actor_name: null, action: "create", entity: "organization", entity_id: ORG, message: null, at: "2026-10-07 10:00:00+00" });
    expect(a).toMatchObject({ id: "7", message: "Espace créé.", actor: "—" });
  });
});

describe("synchronisation", () => {
  const base = fullWorkspace();

  it("n'écrit rien quand rien ne change", () => {
    expect(diffWorkspace(base, { ...base }, ORG, USER)).toEqual([]);
  });

  it("n'envoie que le contrôle modifié et l'entrée de journal", () => {
    const next: Workspace = {
      ...base,
      controls: { ...base.controls, "A.8.13": { ...base.controls["A.8.13"], status: "en_cours" } },
      activity: [{ id: id(50), at: NOW.toISOString(), actor: "Fabien", message: "Statut modifié", controlId: "A.8.13" }, ...base.activity],
    };
    const ops = diffWorkspace(base, next, ORG, USER);
    expect(describeOps(ops)).toEqual(["contrôle A.8.13", "journal +1"]);
    const log = ops[1];
    expect(log.kind === "log" && log.rows[0]).toMatchObject({ client_id: id(50), actor_id: USER, entity: "control", entity_id: "A.8.13" });
  });

  it("insère, modifie et supprime dans les registres", () => {
    const next: Workspace = {
      ...base,
      risks: [{ ...base.risks[0], likelihood: 2 }],
      suppliers: [],
      trainings: [...base.trainings, { ...base.trainings[0], id: id(6), person: "Camille", audience: "salarie" }],
    };
    expect(describeOps(diffWorkspace(base, next, ORG, USER))).toEqual(["risks +1", "suppliers -1", "trainings +1"]);
  });

  it("met à jour l'organisation quand le cadrage change", () => {
    const next = { ...base, answers: { ...base.answers, headcount: "10-49" as const } };
    const ops = diffWorkspace(base, next, ORG, USER);
    expect(ops[0]).toMatchObject({ kind: "org", row: { name: "Equo Expense", nis2_status: "cascade" } });
  });

  it("importe tout un espace de démo dans une organisation vide", () => {
    const summary = describeOps(diffWorkspace(null, base, ORG, USER));
    expect(summary[0]).toBe("organisation");
    expect(summary.filter((s) => s.startsWith("contrôle")).length).toBe(Object.keys(base.controls).length);
    expect(summary).toEqual(expect.arrayContaining(["evidences +1", "risks +1", "incidents +1", "suppliers +1", "trainings +1", "journal +1"]));
  });

  it("remplace les identifiants non UUID avant l'import", () => {
    let n = 100;
    const ws = withUuids({ ...base, risks: [{ ...base.risks[0], id: "abc123" }] }, () => id(n++));
    expect(ws.risks[0].id).toBe(id(100));
    expect(ws.evidences[0].id).toBe(id(1));
  });
});
