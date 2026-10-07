// Préparation à la certification ISO 27001 : audit blanc.
// Reproduit la logique d'un auditeur (écart majeur, mineur, observation)
// à partir des données de l'espace. Estimation indicative : seul un
// organisme certificateur accrédité (COFRAC en France) délivre le certificat.

import { CONTROLS, CONTROLS_BY_ID } from "./catalog/controls";
import { DOC_TEMPLATES } from "./documents";
import {
  daysBetween,
  evidenceFor,
  hasValidEvidence,
  isEvidenceValid,
  scoreOf,
  today,
  type Workspace,
} from "./domain";
import { riskLevel } from "./risks";
import { ISSUE_LABELS, supplierIssues } from "./suppliers";
import { trainingStatus } from "./training";

export type FindingLevel = "majeur" | "mineur" | "observation";

export const FINDING_LABELS: Record<FindingLevel, string> = {
  majeur: "Écart majeur",
  mineur: "Écart mineur",
  observation: "Observation",
};

export const FINDING_PLURAL: Record<FindingLevel, string> = {
  majeur: "Écarts majeurs",
  mineur: "Écarts mineurs",
  observation: "Observations",
};

export const FINDING_HELP: Record<FindingLevel, string> = {
  majeur: "Bloque la certification tant qu'il n'est pas corrigé.",
  mineur: "N'empêche pas le certificat, mais doit être corrigé dans les mois qui suivent l'audit (souvent 3 mois).",
  observation: "Piste d'amélioration relevée par l'auditeur, sans obligation immédiate.",
};

export interface Finding {
  id: string;
  level: FindingLevel;
  ref: string; // clause ou mesure concernée
  title: string;
  observed: string; // ce que l'auditeur constaterait
  action: string; // ce qu'il faut faire
  controlIds: string[];
  href?: string;
}

// ---------------------------------------------------------------------------
// Informations documentées exigées par l'ISO 27001 (clauses 4 à 10)
// et documents habituellement demandés pour l'annexe A.
// ---------------------------------------------------------------------------
export interface RequiredDoc {
  id: string;
  ref: string;
  title: string;
  /** contrôles qui doivent être conformes et prouvés */
  controlIds: string[];
  /** modèle disponible dans l'outil */
  template?: string;
  /** exigence complémentaire calculée */
  check?: (ws: Workspace) => boolean;
  stage: 1 | 2; // examiné dès l'étape 1 (revue documentaire) ou en étape 2
}

export const REQUIRED_DOCS: RequiredDoc[] = [
  { id: "perimetre", ref: "§4.3", title: "Périmètre du SMSI", controlIds: ["SMSI.4"], stage: 1 },
  { id: "politique", ref: "§5.2", title: "Politique de sécurité de l'information", controlIds: ["SMSI.5", "A.5.1"], template: "politique-securite", stage: 1 },
  { id: "methode-risques", ref: "§6.1.2 · §6.1.3", title: "Méthode d'appréciation et de traitement des risques", controlIds: ["SMSI.6.1"], stage: 1 },
  { id: "soa", ref: "§6.1.3 d)", title: "Déclaration d'applicabilité", controlIds: ["SMSI.SOA"], stage: 1 },
  { id: "objectifs", ref: "§6.2", title: "Objectifs de sécurité", controlIds: ["SMSI.6.2"], stage: 1 },
  { id: "competences", ref: "§7.2", title: "Preuves de compétences", controlIds: ["SMSI.7"], stage: 2 },
  { id: "maitrise-doc", ref: "§7.5 · §8.1", title: "Maîtrise de la documentation et planification opérationnelle", controlIds: ["SMSI.7.5"], stage: 1 },
  {
    id: "resultats-risques",
    ref: "§8.2 · §8.3",
    title: "Résultats de l'appréciation et du traitement des risques",
    controlIds: ["SMSI.6.1"],
    check: (ws) => ws.risks.length >= 5,
    stage: 1,
  },
  { id: "surveillance", ref: "§9.1", title: "Résultats de surveillance et de mesure", controlIds: ["SMSI.9.1"], stage: 2 },
  { id: "audit-interne", ref: "§9.2", title: "Programme et résultats d'audit interne", controlIds: ["SMSI.9.2"], stage: 2 },
  { id: "revue-direction", ref: "§9.3", title: "Résultats de la revue de direction", controlIds: ["SMSI.9.3"], template: "revue-de-direction", stage: 2 },
  { id: "actions-correctives", ref: "§10.2", title: "Non-conformités et actions correctives", controlIds: ["SMSI.10"], stage: 2 },
  { id: "inventaire", ref: "A.5.9", title: "Inventaire des actifs", controlIds: ["A.5.9"], stage: 2 },
  { id: "charte", ref: "A.5.10", title: "Règles d'utilisation des actifs (charte)", controlIds: ["A.5.10"], template: "charte-informatique", stage: 2 },
  { id: "acces", ref: "A.5.15", title: "Politique de contrôle d'accès", controlIds: ["A.5.15"], stage: 2 },
  { id: "incidents", ref: "A.5.24", title: "Procédure de gestion des incidents", controlIds: ["A.5.24"], template: "procedure-incident", stage: 2 },
  { id: "continuite", ref: "A.5.30", title: "Plan de continuité et de reprise", controlIds: ["A.5.30"], template: "plan-continuite", stage: 2 },
  { id: "legal", ref: "A.5.31", title: "Registre des exigences légales et contractuelles", controlIds: ["A.5.31"], stage: 2 },
];

export type DocState = "present" | "sans_preuve" | "manquant" | "non_applicable";

export function docState(ws: Workspace, d: RequiredDoc, now = new Date()): DocState {
  const ids = d.controlIds.filter((id) => ws.controls[id]);
  const applicable = ids.filter((id) => ws.controls[id].applicable && ws.controls[id].status !== "non_applicable");
  if (!applicable.length) return "non_applicable";
  const conformes = applicable.filter((id) => ws.controls[id].status === "conforme");
  if (conformes.length < applicable.length) return "manquant";
  if (d.check && !d.check(ws)) return "manquant";
  return applicable.some((id) => hasValidEvidence(ws, id, now)) ? "present" : "sans_preuve";
}

// ---------------------------------------------------------------------------
// Audit blanc
// ---------------------------------------------------------------------------
const href = (id: string) => `/controles/${encodeURIComponent(id)}`;

export function mockAudit(ws: Workspace, now = new Date()): Finding[] {
  const t = today(now);
  const out: Finding[] = [];
  const applicable = CONTROLS.filter((c) => ws.controls[c.id]?.applicable && ws.controls[c.id].status !== "non_applicable");

  // 1. Documents obligatoires absents → majeur ; présents sans preuve → mineur
  for (const d of REQUIRED_DOCS.filter((x) => x.ref.startsWith("§"))) {
    const st = docState(ws, d, now);
    if (st === "manquant") {
      out.push({
        id: `doc-${d.id}`,
        level: "majeur",
        ref: d.ref,
        title: `${d.title} : absent ou incomplet`,
        observed: "L'auditeur ne peut pas vérifier cette exigence obligatoire de la norme.",
        action: d.template
          ? "Utilisez le modèle fourni, adaptez-le, faites-le valider puis marquez le contrôle conforme avec la preuve signée."
          : `Rédigez ce document, faites-le valider par la direction, puis marquez ${d.controlIds.join(" et ")} conforme avec la preuve.`,
        controlIds: d.controlIds,
        href: d.template ? `/documents/${d.template}` : href(d.controlIds[0]),
      });
    } else if (st === "sans_preuve") {
      out.push({
        id: `docp-${d.id}`,
        level: "mineur",
        ref: d.ref,
        title: `${d.title} : déclaré mais non démontré`,
        observed: "Le contrôle est marqué conforme sans document ou preuve valide à présenter.",
        action: "Ajoutez la version signée et datée du document comme preuve.",
        controlIds: d.controlIds,
        href: href(d.controlIds[0]),
      });
    }
  }

  // 2. Registre des risques
  if (ws.risks.length === 0) {
    out.push({
      id: "risques-vide",
      level: "majeur",
      ref: "§6.1.2 · §8.2",
      title: "Aucun risque identifié",
      observed: "Le SMSI repose sur l'appréciation des risques : sans registre, la sélection des mesures n'est pas justifiée.",
      action: "Ajoutez au moins les risques types proposés, ajustez probabilité et impact, et désignez un responsable pour chacun.",
      controlIds: ["SMSI.6.1"],
      href: "/risques",
    });
  } else {
    const sansResponsable = ws.risks.filter((r) => !r.owner);
    if (sansResponsable.length) {
      out.push({
        id: "risques-owner",
        level: "mineur",
        ref: "§6.1.2 c)",
        title: `${sansResponsable.length} risque${sansResponsable.length > 1 ? "s" : ""} sans propriétaire`,
        observed: "La norme exige qu'un propriétaire soit identifié pour chaque risque.",
        action: "Renseignez un responsable pour chaque risque du registre.",
        controlIds: ["SMSI.6.1"],
        href: "/risques",
      });
    }
    for (const r of ws.risks) {
      const lvl = riskLevel(r.likelihood, r.impact);
      if (r.treatment !== "reduire" || (lvl !== "critique" && lvl !== "eleve")) continue;
      const linked = r.controlIds.filter((id) => ws.controls[id]?.applicable);
      const missing = linked.filter((id) => ws.controls[id].status !== "conforme");
      if (linked.length === 0) {
        out.push({
          id: `risque-nomesure-${r.id}`,
          level: "mineur",
          ref: "§6.1.3",
          title: `Risque ${lvl === "critique" ? "critique" : "élevé"} sans mesure associée : ${r.threat}`,
          observed: "Le plan de traitement ne dit pas comment ce risque est réduit.",
          action: "Associez les mesures qui réduisent ce risque dans le registre.",
          controlIds: [],
          href: "/risques",
        });
      } else if (missing.length && lvl === "critique") {
        out.push({
          id: `risque-ouvert-${r.id}`,
          level: "mineur",
          ref: "§8.3",
          title: `Risque critique encore ouvert : ${r.threat}`,
          observed: `${missing.length} mesure${missing.length > 1 ? "s" : ""} prévue${missing.length > 1 ? "s" : ""} sur ${linked.length} non mise${missing.length > 1 ? "s" : ""} en œuvre.`,
          action: `Finalisez en priorité : ${missing.join(", ")}. À défaut, faites accepter formellement le risque résiduel par la direction.`,
          controlIds: missing,
          href: "/risques",
        });
      }
    }
  }

  // 2 bis. Fournisseurs (A.5.19 à A.5.22)
  if (ws.controls["A.5.19"]?.applicable) {
    if (ws.suppliers.length === 0) {
      out.push({
        id: "fournisseurs-vide",
        level: "mineur",
        ref: "A.5.19",
        title: "Aucun fournisseur évalué",
        observed: "L'auditeur demandera la liste des fournisseurs qui accèdent à vos informations et la façon dont vous maîtrisez les risques associés.",
        action: "Recensez vos fournisseurs critiques (prestataire informatique, hébergeur, messagerie…) et envoyez-leur le questionnaire sécurité.",
        controlIds: ["A.5.19"],
        href: "/fournisseurs",
      });
    } else {
      const atRisk = ws.suppliers.filter((x) => x.criticality === "critique" && supplierIssues(x, now).length);
      for (const sup of atRisk) {
        out.push({
          id: `fournisseur-${sup.id}`,
          level: "mineur",
          ref: "A.5.20 · A.5.22",
          title: `Fournisseur critique insuffisamment encadré : ${sup.name}`,
          observed: supplierIssues(sup, now).map((i) => ISSUE_LABELS[i]).join(" ; ") + ".",
          action: "Complétez le contrat (clauses de sécurité, accord RGPD), obtenez les réponses au questionnaire et traitez les points bloquants.",
          controlIds: ["A.5.20", "A.5.22"],
          href: "/fournisseurs",
        });
      }
    }
  }

  // 2 ter. Sensibilisation (A.6.3, §7.3)
  if (ws.controls["A.6.3"]?.applicable) {
    const tr = trainingStatus(ws.trainings, t);
    if (tr.valid.length === 0) {
      out.push({
        id: "sensibilisation",
        level: "mineur",
        ref: "A.6.3 · §7.3",
        title: "Aucune sensibilisation à jour",
        observed: "L'auditeur interrogera le personnel et demandera la preuve d'une sensibilisation récente.",
        action: "Faites passer le quiz de sensibilisation à chaque personne : l'attestation est enregistrée automatiquement comme preuve.",
        controlIds: ["A.6.3"],
        href: "/sensibilisation",
      });
    } else if (tr.expired.length) {
      out.push({
        id: "sensibilisation-expiree",
        level: "observation",
        ref: "A.6.3",
        title: `Sensibilisation à renouveler pour ${tr.expired.length} personne${tr.expired.length > 1 ? "s" : ""}`,
        observed: tr.expired.map((r) => r.person).join(", "),
        action: "Planifiez le renouvellement annuel.",
        controlIds: ["A.6.3"],
        href: "/sensibilisation",
      });
    }
  }

  // 3. Mesures essentielles non engagées → majeur ; en cours → mineur
  const socle = applicable.filter((c) => c.priority === "socle" && !c.id.startsWith("SMSI"));
  const socleAFaire = socle.filter((c) => ws.controls[c.id].status === "a_faire");
  if (socleAFaire.length) {
    out.push({
      id: "socle-a-faire",
      level: "majeur",
      ref: "Annexe A",
      title: `${socleAFaire.length} mesure${socleAFaire.length > 1 ? "s" : ""} essentielle${socleAFaire.length > 1 ? "s" : ""} non engagée${socleAFaire.length > 1 ? "s" : ""}`,
      observed: `La déclaration d'applicabilité les retient, mais rien n'est en place : ${socleAFaire.map((c) => c.id).join(", ")}.`,
      action: "Lancez ces mesures en premier : ce sont celles que l'auditeur vérifie systématiquement (sauvegardes, MFA, mises à jour, accès, sensibilisation…).",
      controlIds: socleAFaire.map((c) => c.id),
      href: "/controles?filtre=socle&statut=a_faire",
    });
  }
  const socleEnCours = socle.filter((c) => ws.controls[c.id].status === "en_cours");
  if (socleEnCours.length) {
    out.push({
      id: "socle-en-cours",
      level: "mineur",
      ref: "Annexe A",
      title: `${socleEnCours.length} mesure${socleEnCours.length > 1 ? "s" : ""} essentielle${socleEnCours.length > 1 ? "s" : ""} pas encore achevée${socleEnCours.length > 1 ? "s" : ""}`,
      observed: socleEnCours.map((c) => `${c.id} ${c.title}`).join(" ; "),
      action: "Terminez-les et ajoutez une preuve avant l'audit d'étape 2.",
      controlIds: socleEnCours.map((c) => c.id),
      href: "/controles?filtre=socle&statut=en_cours",
    });
  }

  // 4. Conformes sans preuve / preuves expirées → mineur (regroupés)
  const sansPreuve = applicable.filter(
    (c) => !c.id.startsWith("SMSI") && ws.controls[c.id].status === "conforme" && !hasValidEvidence(ws, c.id, now),
  );
  if (sansPreuve.length) {
    const expired = sansPreuve.filter((c) => evidenceFor(ws, c.id).some((e) => !isEvidenceValid(e, now)));
    out.push({
      id: "preuves",
      level: "mineur",
      ref: "§7.5",
      title: `${sansPreuve.length} mesure${sansPreuve.length > 1 ? "s" : ""} déclarée${sansPreuve.length > 1 ? "s" : ""} conforme${sansPreuve.length > 1 ? "s" : ""} sans preuve valide`,
      observed: `${expired.length ? `Dont ${expired.length} avec une preuve expirée. ` : ""}Contrôles : ${sansPreuve.map((c) => c.id).join(", ")}.`,
      action: "Pour chacune, ajoutez une preuve datée : document, capture d'écran, photo ou registre.",
      controlIds: sansPreuve.map((c) => c.id),
      href: "/controles?statut=conforme",
    });
  }

  // 5. Échéances dépassées → mineur
  const retard = applicable.filter((c) => {
    const oc = ws.controls[c.id];
    return oc.dueDate && oc.dueDate < t && oc.status !== "conforme";
  });
  if (retard.length) {
    out.push({
      id: "retards",
      level: "mineur",
      ref: "§6.2 · §8.1",
      title: `${retard.length} action${retard.length > 1 ? "s" : ""} en retard sur le plan`,
      observed: retard.map((c) => `${c.id} (prévu le ${ws.controls[c.id].dueDate})`).join(", "),
      action: "Terminez ces actions ou replanifiez-les avec une nouvelle échéance validée par la direction.",
      controlIds: retard.map((c) => c.id),
    });
  }

  // 6. Incidents importants sans retour d'expérience → mineur
  const sansRex = ws.incidents.filter((i) => i.significant && i.status === "clos" && !i.lessons.trim());
  if (sansRex.length) {
    out.push({
      id: "incidents-rex",
      level: "mineur",
      ref: "A.5.27",
      title: `${sansRex.length} incident${sansRex.length > 1 ? "s" : ""} important${sansRex.length > 1 ? "s" : ""} clos sans retour d'expérience`,
      observed: "Les leçons tirées des incidents doivent être documentées.",
      action: "Complétez le retour d'expérience de chaque incident important.",
      controlIds: ["A.5.27"],
      href: "/incidents",
    });
  }

  // 7. Observations : revues en retard, responsables manquants, reste à faire
  const revues = applicable.filter((c) => {
    const oc = ws.controls[c.id];
    if (oc.status !== "conforme") return false;
    return daysBetween(oc.lastReviewedAt ?? oc.updatedAt, t) > c.reviewDays;
  });
  if (revues.length) {
    out.push({
      id: "revues",
      level: "observation",
      ref: "§9.1",
      title: `${revues.length} mesure${revues.length > 1 ? "s" : ""} non revue${revues.length > 1 ? "s" : ""} depuis plus longtemps que prévu`,
      observed: revues.map((c) => c.id).join(", "),
      action: "Vérifiez que ces mesures fonctionnent toujours et marquez-les comme revues.",
      controlIds: revues.map((c) => c.id),
    });
  }
  const sansResponsable = applicable.filter((c) => ws.controls[c.id].status !== "conforme" && !ws.controls[c.id].owner);
  if (sansResponsable.length) {
    out.push({
      id: "responsables",
      level: "observation",
      ref: "§5.3",
      title: `${sansResponsable.length} mesure${sansResponsable.length > 1 ? "s" : ""} sans responsable désigné`,
      observed: "Sans responsable ni échéance, l'auditeur doutera que le plan d'action soit piloté.",
      action: "Attribuez un responsable et une échéance à chaque mesure restante.",
      controlIds: sansResponsable.map((c) => c.id),
      href: "/controles?statut=a_faire",
    });
  }
  const resteAFaire = applicable.filter((c) => c.priority !== "socle" && ws.controls[c.id].status === "a_faire");
  if (resteAFaire.length) {
    out.push({
      id: "reste",
      level: "observation",
      ref: "Annexe A",
      title: `${resteAFaire.length} autre${resteAFaire.length > 1 ? "s" : ""} mesure${resteAFaire.length > 1 ? "s" : ""} retenue${resteAFaire.length > 1 ? "s" : ""} pas encore engagée${resteAFaire.length > 1 ? "s" : ""}`,
      observed: "Elles figurent dans votre déclaration d'applicabilité comme appliquées.",
      action: "Planifiez-les, ou excluez-les avec une justification si elles ne s'appliquent finalement pas à vous.",
      controlIds: resteAFaire.map((c) => c.id),
      href: "/controles?statut=a_faire",
    });
  }

  const order: Record<FindingLevel, number> = { majeur: 0, mineur: 1, observation: 2 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}

// ---------------------------------------------------------------------------
// Verdict et parcours de certification
// ---------------------------------------------------------------------------
export interface Readiness {
  findings: Finding[];
  majeurs: number;
  mineurs: number;
  observations: number;
  stage1Ready: boolean;
  stage2Ready: boolean;
  provenPercent: number;
  docs: { doc: RequiredDoc; state: DocState }[];
}

/** Seuil indicatif : une base solide avant l'étape 2. */
export const STAGE2_MIN_PERCENT = 80;

export function readiness(ws: Workspace, now = new Date()): Readiness {
  const findings = mockAudit(ws, now);
  const docs = REQUIRED_DOCS.map((doc) => ({ doc, state: docState(ws, doc, now) }));
  const majeurs = findings.filter((f) => f.level === "majeur").length;
  const provenPercent = scoreOf(ws, CONTROLS, now).percent;
  const stage1Docs = docs.filter((d) => d.doc.stage === 1 && d.state !== "non_applicable");
  return {
    findings,
    majeurs,
    mineurs: findings.filter((f) => f.level === "mineur").length,
    observations: findings.filter((f) => f.level === "observation").length,
    stage1Ready: stage1Docs.every((d) => d.state === "present") && ws.risks.length > 0,
    stage2Ready: majeurs === 0 && provenPercent >= STAGE2_MIN_PERCENT,
    provenPercent,
    docs,
  };
}

export type StepState = "fait" | "en_cours" | "a_venir";

export interface Step {
  title: string;
  detail: string;
  state: StepState;
  href?: string;
}

export function certificationPath(ws: Workspace, r: Readiness): Step[] {
  const ok = (id: string) => ws.controls[id]?.status === "conforme";
  const risksDone = ws.risks.length >= 5 && ok("SMSI.6.1");
  const docsDone = r.docs.filter((d) => d.doc.stage === 1).every((d) => d.state === "present" || d.state === "non_applicable");
  const implDone = r.provenPercent >= STAGE2_MIN_PERCENT && r.majeurs === 0;
  return [
    { title: "Cadrage", detail: "Périmètre, référentiels visés, mesures applicables.", state: "fait", href: "/applicabilite" },
    {
      title: "Analyse des risques",
      detail: "Registre des risques complet, chaque risque avec un propriétaire et une décision.",
      state: risksDone ? "fait" : ws.risks.length ? "en_cours" : "a_venir",
      href: "/risques",
    },
    {
      title: "Documents du système de management",
      detail: "Politique, méthode des risques, déclaration d'applicabilité, objectifs.",
      state: docsDone ? "fait" : r.docs.some((d) => d.state === "present") ? "en_cours" : "a_venir",
      href: "/documents",
    },
    {
      title: "Mise en œuvre des mesures",
      detail: `Au moins ${STAGE2_MIN_PERCENT} % de conformité prouvée et aucun écart majeur (actuellement ${r.provenPercent} %).`,
      state: implDone ? "fait" : r.provenPercent > 0 ? "en_cours" : "a_venir",
      href: "/controles",
    },
    {
      title: "Audit interne",
      detail: "Vérification indépendante de la démarche, au moins une fois avant l'audit de certification.",
      state: ok("SMSI.9.2") ? "fait" : "a_venir",
      href: href("SMSI.9.2"),
    },
    {
      title: "Revue de direction",
      detail: "La direction fait le point et prend les décisions.",
      state: ok("SMSI.9.3") ? "fait" : "a_venir",
      href: "/documents/revue-de-direction",
    },
    {
      title: "Choix de l'organisme certificateur",
      detail: "Demander 2 ou 3 devis à des organismes accrédités par le COFRAC pour l'ISO 27001.",
      state: implDone ? "en_cours" : "a_venir",
    },
    {
      title: "Audit d'étape 1",
      detail: "Revue documentaire, généralement 1 à 2 jours. L'auditeur vérifie que le système est prêt à être audité.",
      state: "a_venir",
    },
    {
      title: "Audit d'étape 2",
      detail: "Vérification sur le terrain que les mesures fonctionnent, avec entretiens et preuves.",
      state: "a_venir",
    },
    {
      title: "Certificat",
      detail: "Valable 3 ans, avec un audit de surveillance chaque année, puis un audit de renouvellement.",
      state: "a_venir",
    },
  ];
}

export function templateTitle(slug?: string): string | undefined {
  return slug ? DOC_TEMPLATES.find((t) => t.slug === slug)?.title : undefined;
}

export function controlTitle(id: string): string {
  return CONTROLS_BY_ID.get(id)?.title ?? id;
}
