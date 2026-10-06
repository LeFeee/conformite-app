// Types du catalogue de conformité (source unique de vérité,
// utilisée par l'interface ET par le script qui génère le seed SQL).

export type FrameworkId = "iso27001" | "nis2";

export type Theme =
  | "gouvernance" // exigences du système de management (clauses 4 à 10 ISO, art. 20 NIS2)
  | "organisationnel" // Annexe A.5
  | "humain" // Annexe A.6
  | "physique" // Annexe A.7
  | "technologique"; // Annexe A.8

/**
 * Tags d'applicabilité : un contrôle portant un tag n'est applicable
 * que si l'organisation a répondu "oui" à la question correspondante
 * du questionnaire de cadrage.
 */
export type ApplicabilityTag =
  | "dev" // l'organisation développe (ou fait développer) du logiciel
  | "locaux" // l'organisation dispose de locaux qu'elle maîtrise
  | "cloud" // l'organisation utilise des services cloud / SaaS
  | "donnees_perso" // traitement de données personnelles
  | "salaries" // au moins un salarié en plus du dirigeant
  | "nis2"; // l'organisation est dans le champ direct de NIS2 (entité essentielle ou importante)

export type Priority = "socle" | "standard";

export interface Framework {
  id: FrameworkId;
  name: string;
  shortName: string;
  version: string;
  description: string;
}

export interface Requirement {
  /** identifiant global, ex. "iso27001:A.5.1" ou "nis2:21.2.a" */
  id: string;
  frameworkId: FrameworkId;
  /** référence lisible, ex. "A.5.1" ou "Art. 21 §2 a)" */
  ref: string;
  title: string;
  sort: number;
}

export interface Control {
  /** identifiant stable, ex. "A.5.1", "SMSI.6.1", "NIS2.23" */
  id: string;
  title: string;
  /** explication en langage clair, pour un dirigeant non-expert */
  enClair: string;
  theme: Theme;
  priority: Priority;
  /** tags qui conditionnent l'applicabilité (ET logique) */
  tags: ApplicabilityTag[];
  /** exemples de preuves acceptables, y compris "terrain" (papier, photo…) */
  evidence: string[];
  /** fréquence de revue recommandée, en jours */
  reviewDays: number;
  /** exigences couvertes (ids de Requirement) */
  covers: string[];
  sort: number;
}

export type ControlStatus =
  | "a_faire"
  | "en_cours"
  | "conforme"
  | "non_applicable";

export const STATUS_LABELS: Record<ControlStatus, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  conforme: "Conforme",
  non_applicable: "Non applicable",
};

export const THEME_LABELS: Record<Theme, string> = {
  gouvernance: "Gouvernance",
  organisationnel: "Organisation",
  humain: "Personnes",
  physique: "Physique",
  technologique: "Technique",
};

export const TAG_LABELS: Record<ApplicabilityTag, string> = {
  dev: "Développement logiciel",
  locaux: "Locaux maîtrisés",
  cloud: "Services cloud",
  donnees_perso: "Données personnelles",
  salaries: "Salariés",
  nis2: "Entité soumise à NIS2",
};
