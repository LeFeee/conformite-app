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

describe("fournisseurs", async () => {
  const { questionnaireScore, blockingGaps, supplierIssues, SUPPLIER_QUESTIONNAIRE } = await import("./suppliers");
  const all = (a: "oui" | "partiel" | "non") => Object.fromEntries(SUPPLIER_QUESTIONNAIRE.map((q) => [q.id, a]));

  it("calcule le score pondéré du questionnaire", () => {
    expect(questionnaireScore({})).toBeNull();
    expect(questionnaireScore(all("oui"))).toBe(100);
    expect(questionnaireScore(all("partiel"))).toBe(50);
    expect(questionnaireScore(all("non"))).toBe(0);
  });

  it("repère les réponses négatives sur les points essentiels", () => {
    expect(blockingGaps({ ...all("oui"), mfa: "non" }).map((q) => q.id)).toEqual(["mfa"]);
  });

  it("ne surveille pas un fournisseur standard sans données", () => {
    const base = {
      id: "x", name: "Papeterie", service: "", contact: "", criticality: "standard" as const, dataAccess: "aucune" as const,
      hasSecurityClauses: false, hasDpa: false, certifications: "", questionnaireSentAt: null, answers: {}, answeredAt: null,
      lastReviewAt: null, notes: "", createdAt: NOW.toISOString(),
    };
    expect(supplierIssues(base, NOW)).toEqual([]);
    expect(supplierIssues({ ...base, dataAccess: "personnelles" }, NOW)).toEqual(
      expect.arrayContaining(["sans_clauses", "sans_dpa", "questionnaire_absent"]),
    );
  });
});

describe("sensibilisation", async () => {
  const { QUIZ, quizScore, trainingStatus } = await import("./training");

  it("note le quiz sur le nombre de bonnes réponses", () => {
    expect(quizScore(QUIZ.map((q) => q.correct))).toBe(QUIZ.length);
    expect(quizScore(QUIZ.map(() => null))).toBe(0);
  });

  it("garde la formation la plus récente par personne et repère les expirations", () => {
    const rec = (person: string, date: string, validUntil: string, audience: "salarie" | "dirigeant" = "salarie") => ({
      id: person + date, person, audience, method: "quiz" as const, date, score: 9, validUntil, notes: "",
    });
    const s = trainingStatus(
      [rec("Alice", "2025-01-01", "2026-01-01"), rec("alice", "2026-09-01", "2027-09-01", "dirigeant"), rec("Bob", "2025-02-01", "2026-02-01")],
      "2026-10-07",
    );
    expect(s.latestByPerson.length).toBe(2);
    expect(s.expired.map((r) => r.person)).toEqual(["Bob"]);
    expect(s.leadersTrained).toBe(true);
  });
});

describe("inventaire des actifs", async () => {
  const { suggestedAssets, assetIssues, inventoryReady } = await import("./assets");
  const { mockAudit } = await import("./readiness");

  it("propose les actifs d'un éditeur SaaS sans locaux", () => {
    const names = suggestedAssets(equo).map((a) => a.name);
    expect(names).toEqual(expect.arrayContaining(["Code source", "Base de données de production", "Données clients"]));
    expect(names).not.toContain("Locaux");
    expect(names).not.toContain("Dossiers du personnel"); // une seule personne
  });

  it("exige un inventaire d'au moins 5 actifs, chacun avec un responsable", () => {
    const ws = createWorkspace(equo, NOW);
    const asset = (n: number, owner: string | null) => ({
      ...suggestedAssets(equo)[0], id: `a${n}`, name: `Actif ${n}`, owner, createdAt: NOW.toISOString(), reviewedAt: NOW.toISOString(),
    });
    expect(mockAudit(ws, NOW).some((f) => f.id === "inventaire-actifs")).toBe(true);
    const five = [1, 2, 3, 4, 5].map((n) => asset(n, n === 3 ? null : "Fabien"));
    expect(inventoryReady(five, NOW)).toBe(false);
    expect(assetIssues(five[2], NOW)).toContain("sans_proprietaire");
    const ready = five.map((x) => ({ ...x, owner: "Fabien" }));
    expect(inventoryReady(ready, NOW)).toBe(true);
    expect(mockAudit({ ...ws, assets: ready }, NOW).some((f) => f.id === "inventaire-actifs")).toBe(false);
  });

  it("demande une revue annuelle de chaque fiche", () => {
    const old = { ...suggestedAssets(equo)[0], id: "x", owner: "Fabien", createdAt: "2025-01-01T00:00:00Z", reviewedAt: "2025-06-01T00:00:00Z" };
    expect(assetIssues(old, NOW)).toContain("revue_a_faire");
  });
});

describe("liens vers les écrans de l'outil", async () => {
  const { MODULE_CONTROL_IDS } = await import("./modules");
  it("ne référence que des contrôles existants", () => {
    const ids = new Set(CONTROLS.map((c) => c.id));
    for (const id of MODULE_CONTROL_IDS) expect(ids.has(id)).toBe(true);
  });
});

describe("fiche sécurité clients", async () => {
  const { trustSheet, trustSheetText } = await import("./trust");
  const find = (ws: Workspace, id: string) => trustSheet(ws, NOW).flatMap((s) => s.items).find((i) => i.id === id)!;
  const base = createWorkspace(equo, NOW);

  it("répond « pas encore » tant que rien n'est fait, sans jamais se dire certifié", () => {
    expect(find(base, "mfa").answer).toBe("non");
    expect(find(base, "certification").answer).toBe("en_cours");
    expect(trustSheetText(base, trustSheet(base, NOW))).not.toMatch(/sommes certifiés|certifiés ISO 27001\s*:\s*Oui/i);
  });

  it("ne propose un justificatif que si une preuve valide existe", () => {
    const declared = withControl(base, "A.8.5", { status: "conforme" });
    expect(find(declared, "mfa")).toMatchObject({ answer: "oui", proof: false });
    const proven = { ...declared, evidences: [evidence("A.8.5", "2027-10-01")] };
    expect(find(proven, "mfa")).toMatchObject({ answer: "oui", proof: true });
    const expired = { ...declared, evidences: [evidence("A.8.5", "2026-10-01")] };
    expect(find(expired, "mfa").proof).toBe(false);
  });

  it("répond « en cours » si une partie seulement des mesures est en place", () => {
    const ws = withControl(base, "A.5.15", { status: "conforme" });
    expect(find(ws, "droits").answer).toBe("en_cours");
  });

  it("n'affiche la partie développement que pour un éditeur de logiciel", () => {
    expect(trustSheet(base, NOW).some((s) => s.title === "Développement")).toBe(true);
    const noDev = createWorkspace({ ...equo, hasDevelopment: false }, NOW);
    expect(trustSheet(noDev, NOW).some((s) => s.title === "Développement")).toBe(false);
  });

  it("présente l'effet cascade NIS2 sans se dire directement soumis", () => {
    expect(find(base, "nis2")).toMatchObject({ answer: "info" });
    expect(find(base, "nis2").detail).toMatch(/exigences de sécurité transmises par nos clients/);
  });
});

describe("lien actif ↔ fournisseur", async () => {
  const { guessSupplier } = await import("./assets");
  const suppliers = [
    { id: "h", name: "Scaleway", service: "Hébergement de l'application" },
    { id: "m", name: "Google Workspace", service: "Messagerie" },
  ];
  it("retrouve le fournisseur probable d'un actif suggéré", () => {
    expect(guessSupplier({ name: "Hébergement et infrastructure" }, suppliers)).toBe("h");
    expect(guessSupplier({ name: "Messagerie et agendas" }, suppliers)).toBe("m");
    expect(guessSupplier({ name: "Ordinateurs de l'équipe" }, suppliers)).toBeNull();
  });
});
