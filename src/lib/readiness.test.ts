import { describe, expect, it } from "vitest";
import { CONTROLS } from "./catalog/controls";
import { createWorkspace, type Evidence, type Workspace } from "./domain";
import { mockAudit, readiness, REQUIRED_DOCS } from "./readiness";
import type { Risk } from "./risks";
import { DEFAULT_ANSWERS, type ScopingAnswers } from "./scoping";
import { SUPPLIER_QUESTIONNAIRE } from "./suppliers";

const NOW = new Date("2026-10-07T10:00:00Z");
const answers: ScopingAnswers = { ...DEFAULT_ANSWERS, organizationName: "Test", headcount: "10-49", hasDevelopment: true };

const proof = (controlId: string): Evidence => ({
  id: `p-${controlId}`,
  controlId,
  title: "Preuve",
  kind: "document",
  fileName: null,
  url: null,
  validUntil: "2027-10-01",
  addedAt: NOW.toISOString(),
  addedBy: "t",
});

const risk = (i: number): Risk => ({
  id: `r${i}`,
  asset: "Actif",
  threat: `Menace ${i}`,
  likelihood: 2,
  impact: 2,
  treatment: "reduire",
  owner: "Alice",
  controlIds: ["A.8.13"],
  notes: "",
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
});

/** Espace où tout ce qui est applicable est conforme et prouvé. */
function complete(): Workspace {
  const ws = createWorkspace(answers, NOW);
  const controls = { ...ws.controls };
  const evidences: Evidence[] = [];
  for (const c of CONTROLS) {
    if (!controls[c.id].applicable) continue;
    controls[c.id] = { ...controls[c.id], status: "conforme", owner: "Alice", lastReviewedAt: NOW.toISOString() };
    evidences.push(proof(c.id));
  }
  const supplier = {
    id: "s1",
    name: "Hébergeur",
    service: "Hébergement",
    contact: "",
    criticality: "critique" as const,
    dataAccess: "personnelles" as const,
    hasSecurityClauses: true,
    hasDpa: true,
    certifications: "ISO 27001",
    questionnaireSentAt: NOW.toISOString(),
    answers: Object.fromEntries(SUPPLIER_QUESTIONNAIRE.map((q) => [q.id, "oui" as const])),
    answeredAt: NOW.toISOString(),
    lastReviewAt: null,
    notes: "",
    createdAt: NOW.toISOString(),
  };
  return { ...ws, controls, evidences, risks: [1, 2, 3, 4, 5].map(risk), suppliers: [supplier] };
}

describe("audit blanc", () => {
  it("relève des écarts majeurs sur un espace qui démarre", () => {
    const ws = createWorkspace(answers, NOW);
    const f = mockAudit(ws, NOW);
    expect(f.filter((x) => x.level === "majeur").map((x) => x.id)).toEqual(
      expect.arrayContaining(["doc-politique", "doc-soa", "risques-vide", "socle-a-faire"]),
    );
    const r = readiness(ws, NOW);
    expect(r.stage1Ready).toBe(false);
    expect(r.stage2Ready).toBe(false);
  });

  it("déclare prêt un espace complet et prouvé, sans écart", () => {
    const ws = complete();
    const r = readiness(ws, NOW);
    expect(r.findings).toEqual([]);
    expect(r.stage1Ready).toBe(true);
    expect(r.stage2Ready).toBe(true);
    expect(r.docs.every((d) => d.state === "present" || d.state === "non_applicable")).toBe(true);
  });

  it("transforme un document obligatoire déclaré mais sans preuve en écart mineur", () => {
    const ws = complete();
    const noProof = { ...ws, evidences: ws.evidences.filter((e) => e.controlId !== "SMSI.9.3") };
    const f = mockAudit(noProof, NOW);
    expect(f.find((x) => x.id === "docp-revue-direction")?.level).toBe("mineur");
  });

  it("signale les risques sans propriétaire", () => {
    const ws = complete();
    const f = mockAudit({ ...ws, risks: ws.risks.map((r, i) => (i === 0 ? { ...r, owner: null } : r)) }, NOW);
    expect(f.find((x) => x.id === "risques-owner")?.level).toBe("mineur");
  });

  it("signale un fournisseur critique sans clauses ni questionnaire", () => {
    const ws = complete();
    const bad = { ...ws.suppliers[0], hasSecurityClauses: false, answers: {}, answeredAt: null, questionnaireSentAt: null };
    const f = mockAudit({ ...ws, suppliers: [bad] }, NOW);
    expect(f.find((x) => x.id === "fournisseur-s1")?.level).toBe("mineur");
    expect(mockAudit({ ...ws, suppliers: [] }, NOW).some((x) => x.id === "fournisseurs-vide")).toBe(true);
  });

  it("ne référence que des contrôles existants dans les documents exigés", () => {
    const ids = new Set(CONTROLS.map((c) => c.id));
    for (const d of REQUIRED_DOCS) for (const id of d.controlIds) expect(ids.has(id)).toBe(true);
  });
});
