import type { Framework, Requirement } from "./types";

export const FRAMEWORKS: Framework[] = [
  {
    id: "iso27001",
    name: "ISO/IEC 27001:2022",
    shortName: "ISO 27001",
    version: "2022",
    description:
      "Norme internationale de management de la sécurité de l'information (SMSI). Certifiable par un organisme accrédité.",
  },
  {
    id: "nis2",
    name: "Directive NIS2 (UE 2022/2555)",
    shortName: "NIS2",
    version: "2022/2555",
    description:
      "Directive européenne de cybersécurité, transposée en France par la loi Résilience. Contrôlée par l'ANSSI.",
  },
];

// ---------------------------------------------------------------------------
// ISO 27001 — exigences du système de management (clauses 4 à 10)
// Intitulés reformulés en français (le texte de la norme n'est pas reproduit).
// ---------------------------------------------------------------------------
const ISO_CLAUSES: [string, string][] = [
  ["4.1", "Comprendre l'organisation et son contexte"],
  ["4.2", "Comprendre les attentes des parties intéressées"],
  ["4.3", "Définir le périmètre du SMSI"],
  ["4.4", "Établir et faire vivre le SMSI"],
  ["5.1", "Leadership et engagement de la direction"],
  ["5.2", "Politique de sécurité de l'information"],
  ["5.3", "Rôles, responsabilités et autorités"],
  ["6.1", "Appréciation et traitement des risques"],
  ["6.2", "Objectifs de sécurité et plans pour les atteindre"],
  ["6.3", "Planification des modifications"],
  ["7.1", "Ressources"],
  ["7.2", "Compétences"],
  ["7.3", "Sensibilisation"],
  ["7.4", "Communication"],
  ["7.5", "Informations documentées"],
  ["8.1", "Planification et maîtrise opérationnelles"],
  ["8.2", "Réalisation de l'appréciation des risques"],
  ["8.3", "Mise en œuvre du traitement des risques"],
  ["9.1", "Surveillance, mesure, analyse et évaluation"],
  ["9.2", "Audit interne"],
  ["9.3", "Revue de direction"],
  ["10.1", "Amélioration continue"],
  ["10.2", "Non-conformités et actions correctives"],
];

// ---------------------------------------------------------------------------
// ISO 27001 — Annexe A (93 mesures). Intitulés reformulés en français.
// ---------------------------------------------------------------------------
export const ISO_ANNEX_A: [string, string][] = [
  // A.5 — Mesures organisationnelles (37)
  ["5.1", "Politiques de sécurité de l'information"],
  ["5.2", "Rôles et responsabilités en sécurité"],
  ["5.3", "Séparation des tâches"],
  ["5.4", "Responsabilités de la direction"],
  ["5.5", "Relations avec les autorités"],
  ["5.6", "Relations avec des groupes spécialisés"],
  ["5.7", "Veille sur les menaces"],
  ["5.8", "Sécurité dans la gestion de projet"],
  ["5.9", "Inventaire des informations et des actifs"],
  ["5.10", "Utilisation acceptable des actifs"],
  ["5.11", "Restitution des actifs"],
  ["5.12", "Classification des informations"],
  ["5.13", "Marquage des informations"],
  ["5.14", "Transfert des informations"],
  ["5.15", "Contrôle d'accès"],
  ["5.16", "Gestion des identités"],
  ["5.17", "Informations d'authentification"],
  ["5.18", "Droits d'accès"],
  ["5.19", "Sécurité dans les relations fournisseurs"],
  ["5.20", "Sécurité dans les contrats fournisseurs"],
  ["5.21", "Sécurité de la chaîne d'approvisionnement informatique"],
  ["5.22", "Suivi et revue des services fournisseurs"],
  ["5.23", "Sécurité des services cloud"],
  ["5.24", "Préparation à la gestion des incidents"],
  ["5.25", "Évaluation des événements de sécurité"],
  ["5.26", "Réponse aux incidents de sécurité"],
  ["5.27", "Retour d'expérience sur les incidents"],
  ["5.28", "Collecte des preuves"],
  ["5.29", "Sécurité pendant une perturbation"],
  ["5.30", "Préparation des TIC à la continuité d'activité"],
  ["5.31", "Exigences légales, réglementaires et contractuelles"],
  ["5.32", "Droits de propriété intellectuelle"],
  ["5.33", "Protection des enregistrements"],
  ["5.34", "Vie privée et protection des données personnelles"],
  ["5.35", "Revue indépendante de la sécurité"],
  ["5.36", "Conformité aux politiques et règles internes"],
  ["5.37", "Procédures d'exploitation documentées"],
  // A.6 — Mesures liées aux personnes (8)
  ["6.1", "Vérifications avant embauche"],
  ["6.2", "Clauses du contrat de travail"],
  ["6.3", "Sensibilisation et formation à la sécurité"],
  ["6.4", "Processus disciplinaire"],
  ["6.5", "Responsabilités après départ ou changement de poste"],
  ["6.6", "Accords de confidentialité"],
  ["6.7", "Travail à distance"],
  ["6.8", "Signalement des événements de sécurité"],
  // A.7 — Mesures physiques (14)
  ["7.1", "Périmètres de sécurité physique"],
  ["7.2", "Contrôle des entrées physiques"],
  ["7.3", "Sécurisation des bureaux, salles et équipements"],
  ["7.4", "Surveillance de la sécurité physique"],
  ["7.5", "Protection contre les menaces physiques et environnementales"],
  ["7.6", "Travail dans les zones sécurisées"],
  ["7.7", "Bureau propre et écran verrouillé"],
  ["7.8", "Emplacement et protection du matériel"],
  ["7.9", "Sécurité des actifs hors des locaux"],
  ["7.10", "Supports de stockage"],
  ["7.11", "Services généraux (électricité, climatisation…)"],
  ["7.12", "Sécurité du câblage"],
  ["7.13", "Maintenance du matériel"],
  ["7.14", "Mise au rebut ou réutilisation sécurisée du matériel"],
  // A.8 — Mesures technologiques (34)
  ["8.1", "Terminaux des utilisateurs"],
  ["8.2", "Droits d'accès à privilèges"],
  ["8.3", "Restriction d'accès aux informations"],
  ["8.4", "Accès au code source"],
  ["8.5", "Authentification sécurisée"],
  ["8.6", "Gestion des capacités"],
  ["8.7", "Protection contre les logiciels malveillants"],
  ["8.8", "Gestion des vulnérabilités techniques"],
  ["8.9", "Gestion des configurations"],
  ["8.10", "Suppression des informations"],
  ["8.11", "Masquage des données"],
  ["8.12", "Prévention des fuites de données"],
  ["8.13", "Sauvegarde des informations"],
  ["8.14", "Redondance des moyens de traitement"],
  ["8.15", "Journalisation"],
  ["8.16", "Surveillance des activités"],
  ["8.17", "Synchronisation des horloges"],
  ["8.18", "Utilitaires à privilèges"],
  ["8.19", "Installation de logiciels sur les systèmes en production"],
  ["8.20", "Sécurité des réseaux"],
  ["8.21", "Sécurité des services réseau"],
  ["8.22", "Cloisonnement des réseaux"],
  ["8.23", "Filtrage web"],
  ["8.24", "Utilisation de la cryptographie"],
  ["8.25", "Cycle de développement sécurisé"],
  ["8.26", "Exigences de sécurité des applications"],
  ["8.27", "Architecture et principes d'ingénierie sécurisés"],
  ["8.28", "Codage sécurisé"],
  ["8.29", "Tests de sécurité en développement et recette"],
  ["8.30", "Développement externalisé"],
  ["8.31", "Séparation des environnements dev, test et production"],
  ["8.32", "Gestion des changements"],
  ["8.33", "Données de test"],
  ["8.34", "Protection des systèmes pendant les audits"],
];

// ---------------------------------------------------------------------------
// NIS2 — exigences (art. 20, 21 §2 a à j, 23, 27). Formulations synthétiques.
// ---------------------------------------------------------------------------
export const NIS2_REQUIREMENTS: [string, string, string][] = [
  ["20.1", "Art. 20 §1", "Approbation et supervision des mesures par les dirigeants"],
  ["20.2", "Art. 20 §2", "Formation à la cybersécurité des dirigeants"],
  ["21.2.a", "Art. 21 §2 a)", "Analyse des risques et politiques de sécurité des SI"],
  ["21.2.b", "Art. 21 §2 b)", "Gestion des incidents"],
  ["21.2.c", "Art. 21 §2 c)", "Continuité d'activité : sauvegardes, reprise, gestion de crise"],
  ["21.2.d", "Art. 21 §2 d)", "Sécurité de la chaîne d'approvisionnement"],
  ["21.2.e", "Art. 21 §2 e)", "Sécurité de l'acquisition, du développement et de la maintenance, gestion des vulnérabilités"],
  ["21.2.f", "Art. 21 §2 f)", "Évaluation de l'efficacité des mesures"],
  ["21.2.g", "Art. 21 §2 g)", "Cyberhygiène de base et formation"],
  ["21.2.h", "Art. 21 §2 h)", "Cryptographie et chiffrement"],
  ["21.2.i", "Art. 21 §2 i)", "Sécurité RH, contrôle d'accès et gestion des actifs"],
  ["21.2.j", "Art. 21 §2 j)", "Authentification multifacteur et communications sécurisées"],
  ["23", "Art. 23", "Notification des incidents importants (24 h / 72 h / 1 mois)"],
  ["27", "Art. 27", "Enregistrement auprès de l'autorité nationale (ANSSI)"],
];

export const REQUIREMENTS: Requirement[] = [
  ...ISO_CLAUSES.map(([ref, title], i) => ({
    id: `iso27001:${ref}`,
    frameworkId: "iso27001" as const,
    ref: `§${ref}`,
    title,
    sort: i,
  })),
  ...ISO_ANNEX_A.map(([ref, title], i) => ({
    id: `iso27001:A.${ref}`,
    frameworkId: "iso27001" as const,
    ref: `A.${ref}`,
    title,
    sort: 100 + i,
  })),
  ...NIS2_REQUIREMENTS.map(([key, ref, title], i) => ({
    id: `nis2:${key}`,
    frameworkId: "nis2" as const,
    ref,
    title,
    sort: i,
  })),
];

export const REQUIREMENTS_BY_ID = new Map(REQUIREMENTS.map((r) => [r.id, r]));
