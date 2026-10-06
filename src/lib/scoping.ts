// Questionnaire de cadrage + test d'éligibilité NIS2 + applicabilité des contrôles.
// Logique pure (aucune dépendance à l'interface ni à la base), testable seule.

import { CONTROLS } from "./catalog/controls";
import type { ApplicabilityTag, Control } from "./catalog/types";

// ---------------------------------------------------------------------------
// Secteurs NIS2 (annexes I et II de la directive)
// ---------------------------------------------------------------------------
export type Nis2Annex = "I" | "II";

export interface Nis2Sector {
  id: string;
  label: string;
  annex: Nis2Annex;
}

export const NIS2_SECTORS: Nis2Sector[] = [
  // Annexe I — secteurs hautement critiques
  { id: "energie", label: "Énergie (électricité, gaz, pétrole, hydrogène, réseaux de chaleur)", annex: "I" },
  { id: "transports", label: "Transports (aérien, ferroviaire, maritime, routier)", annex: "I" },
  { id: "banque", label: "Banque", annex: "I" },
  { id: "marches_financiers", label: "Infrastructures des marchés financiers", annex: "I" },
  { id: "sante", label: "Santé (établissements, laboratoires, fabricants de médicaments ou dispositifs critiques)", annex: "I" },
  { id: "eau_potable", label: "Eau potable", annex: "I" },
  { id: "eaux_usees", label: "Eaux usées", annex: "I" },
  { id: "infra_numerique", label: "Infrastructures numériques (hébergement, cloud, data centers, DNS, télécoms…)", annex: "I" },
  { id: "services_tic", label: "Gestion de services informatiques B2B (infogérance, sécurité managée)", annex: "I" },
  { id: "administration", label: "Administration publique", annex: "I" },
  { id: "espace", label: "Espace", annex: "I" },
  // Annexe II — autres secteurs critiques
  { id: "postal", label: "Services postaux et d'expédition", annex: "II" },
  { id: "dechets", label: "Gestion des déchets", annex: "II" },
  { id: "chimie", label: "Fabrication, production et distribution de produits chimiques", annex: "II" },
  { id: "alimentaire", label: "Production, transformation et distribution de denrées alimentaires", annex: "II" },
  { id: "fabrication", label: "Fabrication (dispositifs médicaux, électronique, équipements électriques, machines, véhicules…)", annex: "II" },
  { id: "fournisseurs_numeriques", label: "Fournisseurs numériques (places de marché, moteurs de recherche, réseaux sociaux)", annex: "II" },
  { id: "recherche", label: "Recherche", annex: "II" },
];

// ---------------------------------------------------------------------------
// Réponses du questionnaire
// ---------------------------------------------------------------------------
export type HeadcountBand = "1" | "2-9" | "10-49" | "50-249" | "250+";
export type RevenueBand = "<2M" | "2-10M" | "10-50M" | "50M+";

export interface ScopingAnswers {
  organizationName: string;
  activity: string; // description libre de l'activité
  headcount: HeadcountBand;
  revenue: RevenueBand;
  nis2SectorId: string | null; // null = aucun secteur listé
  supplierOfNis2Entity: boolean; // fournisseur/sous-traitant d'une entité NIS2
  hasDevelopment: boolean;
  hasPremises: boolean;
  usesCloud: boolean;
  handlesPersonalData: boolean;
  targetIso27001: boolean;
  targetNis2: boolean;
}

export const DEFAULT_ANSWERS: ScopingAnswers = {
  organizationName: "",
  activity: "",
  headcount: "2-9",
  revenue: "<2M",
  nis2SectorId: null,
  supplierOfNis2Entity: false,
  hasDevelopment: false,
  hasPremises: true,
  usesCloud: true,
  handlesPersonalData: true,
  targetIso27001: true,
  targetNis2: true,
};

// ---------------------------------------------------------------------------
// Éligibilité NIS2 (estimation simplifiée — à confirmer sur MonEspaceNIS2)
// ---------------------------------------------------------------------------
export type Nis2Status =
  | "essentielle"
  | "importante"
  | "cascade" // pas dans le champ direct, mais exigences reçues via les clients
  | "hors_champ";

export interface Nis2Assessment {
  status: Nis2Status;
  label: string;
  explanation: string;
  sanction: string | null;
}

const isLarge = (a: ScopingAnswers) =>
  a.headcount === "250+" || a.revenue === "50M+";
const isMedium = (a: ScopingAnswers) =>
  a.headcount === "50-249" || a.revenue === "10-50M";

export function assessNis2(a: ScopingAnswers): Nis2Assessment {
  const sector = NIS2_SECTORS.find((s) => s.id === a.nis2SectorId);

  if (sector && (isLarge(a) || isMedium(a))) {
    const essential = sector.annex === "I" && isLarge(a);
    return essential
      ? {
          status: "essentielle",
          label: "Entité essentielle (estimation)",
          explanation: `Votre secteur (${sector.label}) figure à l'annexe I et votre taille dépasse le seuil des grandes entreprises. Vous serez soumis à une supervision proactive de l'ANSSI.`,
          sanction: "Jusqu'à 10 M€ ou 2 % du chiffre d'affaires mondial",
        }
      : {
          status: "importante",
          label: "Entité importante (estimation)",
          explanation: `Votre secteur (${sector.label}) est couvert par NIS2 et votre taille dépasse le seuil des moyennes entreprises. Supervision a posteriori de l'ANSSI.`,
          sanction: "Jusqu'à 7 M€ ou 1,4 % du chiffre d'affaires mondial",
        };
  }

  if (sector || a.supplierOfNis2Entity) {
    return {
      status: "cascade",
      label: "Concerné par effet cascade",
      explanation: sector
        ? "Votre secteur est couvert par NIS2 mais votre taille est sous les seuils : vous n'êtes probablement pas dans le champ direct. En revanche vos clients soumis à NIS2 vous demanderont des garanties (questionnaires, clauses, certification)."
        : "Vous n'êtes pas dans le champ direct, mais en tant que fournisseur d'entités soumises à NIS2, vos clients vous demanderont des garanties de sécurité (questionnaires, clauses contractuelles, ISO 27001).",
      sanction: null,
    };
  }

  return {
    status: "hors_champ",
    label: "Probablement hors champ NIS2",
    explanation:
      "Votre activité ne semble pas couverte par NIS2. Les mesures restent utiles et une certification ISO 27001 reste un argument commercial.",
    sanction: null,
  };
}

// ---------------------------------------------------------------------------
// Applicabilité des contrôles
// ---------------------------------------------------------------------------
export function activeTags(a: ScopingAnswers): Set<ApplicabilityTag> {
  const tags = new Set<ApplicabilityTag>();
  if (a.hasDevelopment) tags.add("dev");
  if (a.hasPremises) tags.add("locaux");
  if (a.usesCloud) tags.add("cloud");
  if (a.handlesPersonalData) tags.add("donnees_perso");
  if (a.headcount !== "1") tags.add("salaries");
  // Les obligations propres aux entités (enregistrement, notification ANSSI,
  // formation des dirigeants) ne s'appliquent qu'aux entités dans le champ direct.
  const st = assessNis2(a).status;
  if (a.targetNis2 && (st === "essentielle" || st === "importante")) tags.add("nis2");
  return tags;
}

const EXCLUSION_REASON: Record<ApplicabilityTag, string> = {
  dev: "L'organisation ne développe pas de logiciel et ne fait pas développer de logiciel pour son compte.",
  locaux: "L'organisation ne dispose pas de locaux propres qu'elle maîtrise (domiciliation, coworking ou télétravail intégral).",
  cloud: "L'organisation n'utilise pas de services cloud.",
  donnees_perso: "L'organisation ne traite pas de données personnelles dans le périmètre.",
  salaries: "L'organisation n'emploie aucun salarié en dehors du dirigeant.",
  nis2: "Obligation propre aux entités essentielles et importantes : l'organisation n'est pas directement soumise à NIS2.",
};

export interface Applicability {
  applicable: boolean;
  /** justification pré-remplie pour la déclaration d'applicabilité */
  exclusionReason: string | null;
}

export function controlApplicability(
  control: Control,
  tags: Set<ApplicabilityTag>,
  a: ScopingAnswers,
): Applicability {
  // Un contrôle qui ne couvre qu'un référentiel non visé est hors périmètre.
  const coversIso = control.covers.some((r) => r.startsWith("iso27001:"));
  const coversNis2 = control.covers.some((r) => r.startsWith("nis2:"));
  if (!(coversIso && a.targetIso27001) && !(coversNis2 && a.targetNis2)) {
    return {
      applicable: false,
      exclusionReason: "Hors périmètre des référentiels visés.",
    };
  }
  const missing = control.tags.find((t) => !tags.has(t));
  return missing
    ? { applicable: false, exclusionReason: EXCLUSION_REASON[missing] }
    : { applicable: true, exclusionReason: null };
}

export function computeApplicability(a: ScopingAnswers) {
  const tags = activeTags(a);
  return new Map(
    CONTROLS.map((c) => [c.id, controlApplicability(c, tags, a)] as const),
  );
}
