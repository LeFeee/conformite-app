// Registre des fournisseurs (ISO 27001 A.5.19 à A.5.22, NIS2 art. 21 §2 d).
// Logique pure : criticité, questionnaire sécurité et score des réponses.

export type SupplierCriticality = "critique" | "importante" | "standard";
export type DataAccess = "aucune" | "internes" | "personnelles" | "sensibles";
export type Answer = "oui" | "partiel" | "non";

export const CRITICALITY_LABELS: Record<SupplierCriticality, string> = {
  critique: "Critique",
  importante: "Importante",
  standard: "Standard",
};

export const CRITICALITY_HELP = "Critique : l'activité s'arrête sans lui. Importante : gêne sérieuse en cas de défaillance.";

export const DATA_ACCESS_LABELS: Record<DataAccess, string> = {
  aucune: "Aucune donnée",
  internes: "Données internes",
  personnelles: "Données personnelles",
  sensibles: "Données sensibles",
};

export interface Supplier {
  id: string;
  name: string;
  service: string;
  contact: string;
  criticality: SupplierCriticality;
  dataAccess: DataAccess;
  hasSecurityClauses: boolean;
  hasDpa: boolean; // accord de sous-traitance RGPD (art. 28)
  certifications: string;
  questionnaireSentAt: string | null;
  answers: Record<string, Answer>;
  answeredAt: string | null;
  lastReviewAt: string | null;
  notes: string;
  createdAt: string;
}

export interface Question {
  id: string;
  text: string;
  short: string;
  /** poids dans le score (1 = normal, 2 = essentiel) */
  weight: 1 | 2;
}

export const SUPPLIER_QUESTIONNAIRE: Question[] = [
  { id: "mfa", text: "L'accès à vos systèmes et aux nôtres est-il protégé par une double authentification (MFA) ?", short: "double authentification", weight: 2 },
  { id: "sauvegardes", text: "Nos données sont-elles sauvegardées régulièrement, avec des tests de restauration ?", short: "sauvegardes testées", weight: 2 },
  { id: "chiffrement", text: "Nos données sont-elles chiffrées pendant leur transfert et leur stockage ?", short: "chiffrement des données", weight: 2 },
  { id: "incidents", text: "Vous engagez-vous à nous prévenir sous 24 heures en cas d'incident de sécurité nous concernant ?", short: "alerte sous 24 h en cas d'incident", weight: 2 },
  { id: "localisation", text: "Nos données sont-elles hébergées dans l'Union européenne ?", short: "hébergement dans l'UE", weight: 1 },
  { id: "acces", text: "Les accès de votre personnel à nos données sont-ils limités au strict nécessaire et tracés ?", short: "accès limités et tracés", weight: 1 },
  { id: "mises_a_jour", text: "Appliquez-vous les correctifs de sécurité dans un délai défini ?", short: "correctifs de sécurité", weight: 1 },
  { id: "sous_traitants", text: "Nous informez-vous des sous-traitants qui accèdent à nos données ?", short: "transparence sur les sous-traitants", weight: 1 },
  { id: "tests", text: "Réalisez-vous des tests d'intrusion ou audits de sécurité au moins une fois par an ?", short: "tests de sécurité annuels", weight: 1 },
  { id: "certification", text: "Disposez-vous d'une certification (ISO 27001, SOC 2, HDS, SecNumCloud…) ?", short: "certification", weight: 1 },
  { id: "continuite", text: "Disposez-vous d'un plan de continuité testé pour le service que vous nous fournissez ?", short: "plan de continuité", weight: 1 },
  { id: "reversibilite", text: "Pouvons-nous récupérer l'ensemble de nos données en fin de contrat, dans un format exploitable ?", short: "réversibilité des données", weight: 1 },
];

const POINTS: Record<Answer, number> = { oui: 1, partiel: 0.5, non: 0 };

/** Score des réponses, de 0 à 100 ; null tant que rien n'est saisi. */
export function questionnaireScore(answers: Record<string, Answer>): number | null {
  const answered = SUPPLIER_QUESTIONNAIRE.filter((q) => answers[q.id]);
  if (!answered.length) return null;
  const max = SUPPLIER_QUESTIONNAIRE.reduce((s, q) => s + q.weight, 0);
  const got = SUPPLIER_QUESTIONNAIRE.reduce((s, q) => s + (answers[q.id] ? POINTS[answers[q.id]] * q.weight : 0), 0);
  return Math.round((got / max) * 100);
}

/** Réponses "non" sur une question essentielle : points bloquants à traiter. */
export function blockingGaps(answers: Record<string, Answer>): Question[] {
  return SUPPLIER_QUESTIONNAIRE.filter((q) => q.weight === 2 && answers[q.id] === "non");
}

export type SupplierIssue =
  | "sans_clauses"
  | "sans_dpa"
  | "questionnaire_absent"
  | "questionnaire_sans_reponse"
  | "point_bloquant"
  | "revue_a_faire";

export function supplierIssues(s: Supplier, now = new Date()): SupplierIssue[] {
  const issues: SupplierIssue[] = [];
  const watched = s.criticality !== "standard" || s.dataAccess === "personnelles" || s.dataAccess === "sensibles";
  if (!watched) return issues;
  if (!s.hasSecurityClauses) issues.push("sans_clauses");
  if ((s.dataAccess === "personnelles" || s.dataAccess === "sensibles") && !s.hasDpa) issues.push("sans_dpa");
  if (!s.questionnaireSentAt && !s.answeredAt) issues.push("questionnaire_absent");
  else if (s.questionnaireSentAt && !s.answeredAt) {
    const days = (now.getTime() - new Date(s.questionnaireSentAt).getTime()) / 86_400_000;
    if (days > 30) issues.push("questionnaire_sans_reponse");
  }
  if (blockingGaps(s.answers).length) issues.push("point_bloquant");
  const ref = s.lastReviewAt ?? s.answeredAt;
  if (ref && (now.getTime() - new Date(ref).getTime()) / 86_400_000 > 365) issues.push("revue_a_faire");
  return issues;
}

export const ISSUE_LABELS: Record<SupplierIssue, string> = {
  sans_clauses: "Pas de clauses de sécurité dans le contrat",
  sans_dpa: "Pas d'accord de sous-traitance RGPD",
  questionnaire_absent: "Questionnaire sécurité non envoyé",
  questionnaire_sans_reponse: "Questionnaire sans réponse depuis plus de 30 jours",
  point_bloquant: "Réponse négative sur un point essentiel",
  revue_a_faire: "Revue annuelle à faire",
};

export const SUPPLIER_SUGGESTIONS: { name: string; service: string; criticality: SupplierCriticality; dataAccess: DataAccess }[] = [
  { name: "Prestataire informatique", service: "Infogérance, maintenance des postes et du réseau", criticality: "critique", dataAccess: "sensibles" },
  { name: "Messagerie et bureautique en ligne", service: "Microsoft 365 ou Google Workspace", criticality: "critique", dataAccess: "personnelles" },
  { name: "Hébergeur", service: "Hébergement du site, de l'application ou des serveurs", criticality: "critique", dataAccess: "personnelles" },
  { name: "Logiciel de comptabilité et paie", service: "Comptabilité, paie, déclarations", criticality: "importante", dataAccess: "sensibles" },
  { name: "Service de sauvegarde", service: "Sauvegarde externalisée des données", criticality: "critique", dataAccess: "sensibles" },
  { name: "Expert-comptable", service: "Tenue comptable et sociale", criticality: "importante", dataAccess: "sensibles" },
];

export function questionnaireText(orgName: string, supplierName: string): string {
  return [
    `Objet : questionnaire sécurité — ${orgName}`,
    "",
    `Bonjour,`,
    "",
    `Dans le cadre de notre démarche de sécurité (ISO 27001 / NIS2), ${orgName} évalue ses fournisseurs. Pourriez-vous répondre par Oui, Partiellement ou Non aux questions suivantes, en joignant si possible un justificatif (certificat, extrait de contrat, rapport) ?`,
    "",
    ...SUPPLIER_QUESTIONNAIRE.map((q, i) => `${i + 1}. ${q.text}`),
    "",
    `Merci de nous répondre sous 30 jours.`,
    "",
    `Cordialement,`,
    orgName,
    "",
    `(Fournisseur : ${supplierName})`,
  ].join("\n");
}
