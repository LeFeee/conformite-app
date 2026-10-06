// Registre des risques (ISO 27001 §6.1 et §8.2, NIS2 art. 21 §2 a).
// Logique pure + bibliothèque de risques types pour TPE/PME.

import type { ApplicabilityTag } from "./catalog/types";

export type RiskTreatment = "reduire" | "accepter" | "transferer" | "eviter";

export const TREATMENT_LABELS: Record<RiskTreatment, string> = {
  reduire: "Réduire",
  accepter: "Accepter",
  transferer: "Transférer (assurance, prestataire)",
  eviter: "Éviter (arrêter l'activité concernée)",
};

export const LIKELIHOOD_LABELS = ["", "Rare", "Possible", "Probable", "Quasi certain"] as const;
export const IMPACT_LABELS = ["", "Faible", "Modéré", "Grave", "Critique"] as const;

export interface Risk {
  id: string;
  asset: string;
  threat: string;
  likelihood: 1 | 2 | 3 | 4;
  impact: 1 | 2 | 3 | 4;
  treatment: RiskTreatment;
  owner: string | null;
  controlIds: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type RiskLevel = "critique" | "eleve" | "modere" | "faible";

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  critique: "Critique",
  eleve: "Élevé",
  modere: "Modéré",
  faible: "Faible",
};

export function riskLevel(likelihood: number, impact: number): RiskLevel {
  const s = likelihood * impact;
  if (s >= 12) return "critique";
  if (s >= 8) return "eleve";
  if (s >= 4) return "modere";
  return "faible";
}

export interface RiskTemplate {
  key: string;
  asset: string;
  threat: string;
  likelihood: Risk["likelihood"];
  impact: Risk["impact"];
  controlIds: string[];
  /** proposé seulement si l'organisation a ces caractéristiques */
  tags?: ApplicabilityTag[];
}

export const RISK_LIBRARY: RiskTemplate[] = [
  { key: "ransomware", asset: "Données et serveurs", threat: "Rançongiciel qui chiffre les fichiers et bloque l'activité", likelihood: 3, impact: 4, controlIds: ["A.8.13", "A.8.7", "A.8.8", "A.5.30", "A.6.3"] },
  { key: "phishing", asset: "Messagerie", threat: "Hameçonnage et vol des identifiants de messagerie", likelihood: 4, impact: 3, controlIds: ["A.8.5", "A.6.3", "A.5.17"] },
  { key: "fraude", asset: "Paiements", threat: "Fraude au président ou faux changement de RIB fournisseur", likelihood: 3, impact: 4, controlIds: ["A.5.3", "A.6.3", "A.5.14"] },
  { key: "portable", asset: "Ordinateurs portables", threat: "Vol ou perte d'un portable contenant des données sensibles", likelihood: 3, impact: 3, controlIds: ["A.8.24", "A.7.9", "A.8.1"] },
  { key: "sauvegarde", asset: "Sauvegardes", threat: "Sauvegarde absente, incomplète ou impossible à restaurer le jour venu", likelihood: 2, impact: 4, controlIds: ["A.8.13", "A.5.30"] },
  { key: "prestataire", asset: "Prestataire informatique", threat: "Défaillance ou piratage du prestataire qui gère votre informatique", likelihood: 2, impact: 4, controlIds: ["A.5.19", "A.5.20", "A.5.22"] },
  { key: "ancien_compte", asset: "Comptes utilisateurs", threat: "Compte d'un ancien salarié ou prestataire toujours actif", likelihood: 3, impact: 3, controlIds: ["A.5.16", "A.5.18", "A.6.5"], tags: ["salaries"] },
  { key: "fuite", asset: "Données personnelles", threat: "Fuite ou divulgation de données clients ou salariés", likelihood: 2, impact: 4, controlIds: ["A.5.34", "A.8.12", "A.5.15"], tags: ["donnees_perso"] },
  { key: "sinistre", asset: "Locaux et matériel", threat: "Incendie ou dégât des eaux détruisant le matériel", likelihood: 1, impact: 4, controlIds: ["A.7.5", "A.8.13", "A.5.29"], tags: ["locaux"] },
  { key: "intrusion", asset: "Locaux", threat: "Intrusion physique et vol de matériel ou de documents", likelihood: 2, impact: 3, controlIds: ["A.7.2", "A.7.4", "A.7.3"], tags: ["locaux"] },
  { key: "faille", asset: "Applications et site web", threat: "Faille non corrigée exploitée sur une application exposée", likelihood: 3, impact: 3, controlIds: ["A.8.8", "A.8.28", "A.8.29"], tags: ["dev"] },
  { key: "cloud", asset: "Services en ligne", threat: "Indisponibilité prolongée d'un service cloud indispensable", likelihood: 2, impact: 3, controlIds: ["A.5.23", "A.8.14", "A.5.30"], tags: ["cloud"] },
];
