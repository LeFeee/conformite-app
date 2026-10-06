import { describe, expect, it } from "vitest";
import { CONTROLS } from "./catalog/controls";
import { REQUIREMENTS, REQUIREMENTS_BY_ID } from "./catalog/frameworks";
import { DOC_TEMPLATES } from "./documents";
import {
  computeAlerts,
  createWorkspace,
  scoreOf,
  type Evidence,
  type Workspace,
} from "./domain";
import { formatRemaining, incidentDeadlines, type Incident } from "./incidents";
import { RISK_LIBRARY, riskLevel } from "./risks";
import { assessNis2, computeApplicability, DEFAULT_ANSWERS, type ScopingAnswers } from "./scoping";

const NOW = new Date("2026-10-07T10:00:00Z");

const equo: ScopingAnswers = {
  ...DEFAULT_ANSWERS,
  organizationName: "Equo Expense",
  headcount: "1",
  revenue: "<2M",
  nis2SectorId: null,
  supplierOfNis2Entity: true,
  hasDevelopment: true,
  hasPremises: false,
};

function evidence(controlId: string, validUntil: string | null): Evidence {
  return {
    id: `e-${controlId}-${validUntil}`,
    controlId,
    title: "Preuve",
    kind: "document",
    fileName: null,
    url: null,
    validUntil,
    addedAt: NOW.toISOString(),
    addedBy: "test",
  };
}

function withControl(ws: Workspace, id: string, patch: Partial<Workspace["controls"][string]>): Workspace {
  return { ...ws, controls: { ...ws.controls, [id]: { ...ws.controls[id], ...patch } } };
}

describe("catalogue", () => {
  it("couvre chaque exigence ISO 27001 et NIS2, sans référence cassée", () => {
    const covered = new Set(CONTROLS.flatMap((c) => c.covers));
    expect(REQUIREMENTS.filter((r) => !covered.has(r.id))).toEqual([]);
    for (const c of CONTROLS) for (const r of c.covers) expect(REQUIREMENTS_BY_ID.has(r)).toBe(true);
  });

  it("contient les 93 mesures de l'annexe A, avec des identifiants uniques", () => {
    expect(CONTROLS.filter((c) => c.id.startsWith("A.")).length).toBe(93);
    expect(new Set(CONTROLS.map((c) => c.id)).size).toBe(CONTROLS.length);
  });

  it("ne référence que des contrôles existants dans les risques types et les modèles", () => {
    const ids = new Set(CONTROLS.map((c) => c.id));
    for (const r of RISK_LIBRARY) for (const id of r.controlIds) expect(ids.has(id)).toBe(true);
    for (const t of DOC_TEMPLATES) for (const id of t.controlIds) expect(ids.has(id)).toBe(true);
  });
});

describe("éligibilité NIS2", () => {
  it("classe un fournisseur sous les seuils en effet cascade", () => {
    expect(assessNis2(equo).status).toBe("cascade");
  });

  it("classe une grande entreprise de l'annexe I en entité essentielle", () => {
    expect(assessNis2({ ...equo, headcount: "250+", nis2SectorId: "energie" }).status).toBe("essentielle");
  });

  it("classe une moyenne entreprise de l'annexe II en entité importante", () => {
    expect(assessNis2({ ...equo, headcount: "50-249", nis2SectorId: "chimie" }).status).toBe("importante");
  });

  it("classe une grande entreprise de l'annexe II en entité importante, pas essentielle", () => {
    expect(assessNis2({ ...equo, headcount: "250+", nis2SectorId: "alimentaire" }).status).toBe("importante");
  });

  it("classe une organisation sans secteur ni client NIS2 hors champ", () => {
    expect(assessNis2({ ...equo, supplierOfNis2Entity: false }).status).toBe("hors_champ");
  });
});

describe("applicabilité", () => {
  const app = computeApplicability(equo);

  it("exclut les obligations propres aux entités NIS2 pour un fournisseur en cascade", () => {
    for (const id of ["NIS2.20", "NIS2.23", "NIS2.27"]) expect(app.get(id)!.applicable).toBe(false);
  });

  it("garde les contrôles de développement quand l'organisation développe", () => {
    expect(app.get("A.8.25")!.applicable).toBe(true);
  });

  it("exclut les contrôles physiques sans locaux, avec une justification", () => {
    const a = app.get("A.7.2")!;
    expect(a.applicable).toBe(false);
    expect(a.exclusionReason).toMatch(/locaux/);
  });

  it("exclut ce qui ne couvre qu'un référentiel non visé", () => {
    const isoOnly = computeApplicability({ ...equo, targetIso27001: true, targetNis2: false });
    expect(isoOnly.get("NIS2.27")!.applicable).toBe(false);
    const nis2Only = computeApplicability({ ...equo, targetIso27001: false, targetNis2: true });
    expect(nis2Only.get("A.5.32")!.applicable).toBe(false); // propriété intellectuelle : ISO uniquement
    expect(nis2Only.get("A.8.5")!.applicable).toBe(true); // MFA : couvre NIS2
  });
});

describe("score prouvé", () => {
  const base = createWorkspace(equo, NOW);
  const control = ["A.5.1"];

  it("compte 100 % un contrôle conforme avec preuve valide", () => {
    const ws = { ...withControl(base, "A.5.1", { status: "conforme" }), evidences: [evidence("A.5.1", "2027-10-01")] };
    expect(scoreOf(ws, CONTROLS.filter((c) => control.includes(c.id)), NOW).percent).toBe(100);
  });

  it("compte 50 % un contrôle conforme sans preuve", () => {
    const ws = withControl(base, "A.5.1", { status: "conforme" });
    expect(scoreOf(ws, CONTROLS.filter((c) => control.includes(c.id)), NOW).percent).toBe(50);
  });

  it("compte 50 % un contrôle conforme dont la preuve a expiré", () => {
    const ws = { ...withControl(base, "A.5.1", { status: "conforme" }), evidences: [evidence("A.5.1", "2026-10-01")] };
    expect(scoreOf(ws, CONTROLS.filter((c) => control.includes(c.id)), NOW).percent).toBe(50);
  });

  it("ignore les contrôles non applicables", () => {
    const s = scoreOf(base, CONTROLS, NOW);
    expect(s.applicable).toBe([...computeApplicability(equo).values()].filter((a) => a.applicable).length);
  });
});

describe("alertes", () => {
  const base = createWorkspace(equo, NOW);

  it("signale en critique une preuve expirée et une échéance dépassée", () => {
    let ws = withControl(base, "A.8.13", { status: "en_cours", dueDate: "2026-10-01" });
    ws = { ...ws, evidences: [evidence("A.5.1", "2026-10-05")] };
    const critical = computeAlerts(ws, NOW).filter((a) => a.severity === "critique").map((a) => a.id);
    expect(critical).toContain("due-A.8.13");
    expect(critical.some((id) => id.startsWith("exp-"))).toBe(true);
  });

  it("prévient avant l'expiration d'une preuve (30 jours)", () => {
    const ws = { ...base, evidences: [evidence("A.5.1", "2026-10-20")] };
    expect(computeAlerts(ws, NOW).some((a) => a.severity === "attention" && a.id.startsWith("soon-"))).toBe(true);
  });
});

describe("incidents NIS2", () => {
  const incident: Incident = {
    id: "i1",
    title: "Test",
    description: "",
    detectedAt: "2026-10-06T08:00:00Z",
    significant: true,
    earlyWarningAt: null,
    notificationAt: null,
    finalReportAt: null,
    status: "ouvert",
    lessons: "",
    createdAt: "2026-10-06T08:00:00Z",
  };

  it("calcule les échéances 24 h, 72 h et 1 mois après la notification", () => {
    const [warn, notif, final] = incidentDeadlines(incident, NOW);
    expect(warn.due.toISOString()).toBe("2026-10-07T08:00:00.000Z");
    expect(notif.due.toISOString()).toBe("2026-10-09T08:00:00.000Z");
    expect(final.due.toISOString()).toBe("2026-11-09T08:00:00.000Z");
    expect(warn.state).toBe("en_retard");
    expect(notif.state).toBe("a_faire");
  });

  it("recale le rapport final sur la date réelle de notification", () => {
    const [, , final] = incidentDeadlines({ ...incident, notificationAt: "2026-10-08T12:00:00Z" }, NOW);
    expect(final.due.toISOString()).toBe("2026-11-08T12:00:00.000Z");
  });

  it("ne crée aucune échéance pour un incident mineur", () => {
    expect(incidentDeadlines({ ...incident, significant: false }, NOW)).toEqual([]);
  });

  it("formule le temps restant ou le retard", () => {
    expect(formatRemaining(-2 * 3_600_000)).toBe("en retard de 2 h");
    expect(formatRemaining(26 * 3_600_000)).toBe("reste 1 j 2 h");
  });
});

describe("niveaux de risque", () => {
  it("applique les seuils de la matrice 4 × 4", () => {
    expect(riskLevel(1, 3)).toBe("faible");
    expect(riskLevel(2, 2)).toBe("modere");
    expect(riskLevel(2, 4)).toBe("eleve");
    expect(riskLevel(3, 4)).toBe("critique");
  });
});
