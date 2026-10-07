// Sensibilisation des équipes (ISO 27001 A.6.3 et §7.3, NIS2 art. 20 §2 et art. 21 §2 g).
// Quiz court, attestations et registre des personnes formées. Logique pure.

export type TrainingMethod = "quiz" | "session" | "externe";
export type TrainingAudience = "salarie" | "dirigeant";

export const METHOD_LABELS: Record<TrainingMethod, string> = {
  quiz: "Quiz en ligne",
  session: "Session collective",
  externe: "Formation externe",
};

export const AUDIENCE_LABELS: Record<TrainingAudience, string> = {
  salarie: "Salarié ou prestataire",
  dirigeant: "Dirigeant",
};

export interface TrainingRecord {
  id: string;
  person: string;
  audience: TrainingAudience;
  method: TrainingMethod;
  date: string; // AAAA-MM-JJ
  score: number | null; // sur 10 pour le quiz
  validUntil: string; // AAAA-MM-JJ, en général un an après
  notes: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export const PASS_MARK = 8;
export const QUIZ: QuizQuestion[] = [
  {
    id: "phishing",
    question: "Vous recevez un email de votre banque vous demandant de confirmer vos identifiants via un lien, sous peine de blocage du compte. Que faites-vous ?",
    options: [
      "Je clique et je vérifie que le site ressemble bien à celui de ma banque",
      "Je ne clique pas, je me connecte en tapant moi-même l'adresse de la banque et je signale l'email",
      "Je réponds pour demander si c'est bien eux",
    ],
    correct: 1,
    explanation: "L'urgence et la demande d'identifiants sont les signes classiques de l'hameçonnage. Passez toujours par l'adresse que vous connaissez, jamais par le lien reçu.",
  },
  {
    id: "mot_de_passe",
    question: "Quel est le meilleur choix de mot de passe ?",
    options: [
      "Le même mot de passe complexe pour tous les services, pour ne pas l'oublier",
      "Une phrase longue et unique pour chaque service, conservée dans un gestionnaire de mots de passe",
      "Le prénom d'un proche suivi de l'année, changé tous les mois",
    ],
    correct: 1,
    explanation: "La longueur protège mieux que la complexité, et un mot de passe unique évite qu'une fuite sur un site ouvre tous vos comptes.",
  },
  {
    id: "mfa",
    question: "Vous recevez un code de connexion par SMS alors que vous n'essayez pas de vous connecter. Que faites-vous ?",
    options: [
      "Rien, c'est sûrement une erreur",
      "Je transmets le code à la personne qui m'appelle pour « vérifier mon compte »",
      "Je ne communique jamais le code, je change mon mot de passe et je préviens le référent sécurité",
    ],
    correct: 2,
    explanation: "Quelqu'un connaît probablement votre mot de passe. La double authentification l'a bloqué : changez le mot de passe et signalez-le.",
  },
  {
    id: "usb",
    question: "Vous trouvez une clé USB sur le parking de l'entreprise. Que faites-vous ?",
    options: [
      "Je la branche pour retrouver son propriétaire",
      "Je ne la branche pas et je la remets au référent sécurité",
      "Je la garde, elle peut servir",
    ],
    correct: 1,
    explanation: "Une clé abandonnée peut contenir un programme malveillant qui s'exécute dès le branchement.",
  },
  {
    id: "rib",
    question: "Un fournisseur vous annonce par email un changement de RIB pour les prochains paiements. Que faites-vous ?",
    options: [
      "Je mets à jour le RIB, l'email vient de son adresse habituelle",
      "J'appelle le fournisseur au numéro que nous connaissons déjà pour vérifier avant toute modification",
      "Je réponds à l'email pour demander confirmation",
    ],
    correct: 1,
    explanation: "La fraude au faux RIB passe souvent par une boîte mail piratée : l'adresse peut être la vraie. Seul un appel à un numéro connu permet de vérifier.",
  },
  {
    id: "support",
    question: "Un « technicien Microsoft » vous appelle et demande à prendre la main sur votre ordinateur pour corriger un problème. Que faites-vous ?",
    options: [
      "J'accepte, il connaît mon nom et mon entreprise",
      "Je raccroche et je préviens le référent sécurité",
      "Je lui donne accès seulement quelques minutes",
    ],
    correct: 1,
    explanation: "Les éditeurs n'appellent jamais spontanément. Les escrocs trouvent facilement votre nom et votre entreprise en ligne.",
  },
  {
    id: "wifi",
    question: "Vous devez travailler depuis une gare avec un Wi-Fi public gratuit. Quelle est la bonne pratique ?",
    options: [
      "Utiliser le partage de connexion de votre téléphone, ou le VPN de l'entreprise",
      "Se connecter directement, c'est rapide",
      "Se connecter et désactiver l'antivirus pour aller plus vite",
    ],
    correct: 0,
    explanation: "Un Wi-Fi public peut être espionné ou imité. Le partage de connexion ou le VPN protègent vos échanges.",
  },
  {
    id: "ecran",
    question: "Vous quittez votre poste cinq minutes pour un café. Que faites-vous ?",
    options: [
      "Rien, c'est trop court",
      "Je verrouille mon écran (touches Windows + L, ou Ctrl + Cmd + Q sur Mac)",
      "Je baisse la luminosité",
    ],
    correct: 1,
    explanation: "Quelques secondes suffisent pour envoyer un email ou copier un fichier depuis une session ouverte.",
  },
  {
    id: "mises_a_jour",
    question: "Votre ordinateur vous propose une mise à jour de sécurité. Que faites-vous ?",
    options: [
      "Je la reporte indéfiniment pour ne pas être dérangé",
      "Je l'installe dès que possible, au plus tard en fin de journée",
      "Je désactive les mises à jour automatiques",
    ],
    correct: 1,
    explanation: "Les mises à jour corrigent des failles souvent déjà exploitées par des attaquants.",
  },
  {
    id: "erreur_envoi",
    question: "Vous avez envoyé par erreur un fichier contenant des données de clients au mauvais destinataire. Que faites-vous ?",
    options: [
      "Rien, le destinataire supprimera sûrement le message",
      "Je préviens immédiatement le référent : il peut s'agir d'une violation de données à déclarer à la CNIL sous 72 heures",
      "Je renvoie un email en demandant de ne pas l'ouvrir et je n'en parle à personne",
    ],
    correct: 1,
    explanation: "Signaler vite permet de limiter les conséquences et de respecter le délai légal. Une erreur signalée n'est jamais reprochée ; une erreur cachée aggrave tout.",
  },
];

export function quizScore(answers: (number | null)[]): number {
  return QUIZ.reduce((s, q, i) => s + (answers[i] === q.correct ? 1 : 0), 0);
}

export interface TrainingStatus {
  valid: TrainingRecord[];
  expired: TrainingRecord[];
  /** une seule ligne par personne : la formation la plus récente */
  latestByPerson: TrainingRecord[];
  leadersTrained: boolean;
}

export function trainingStatus(records: TrainingRecord[], todayIso: string): TrainingStatus {
  const latest = new Map<string, TrainingRecord>();
  for (const r of [...records].sort((a, b) => a.date.localeCompare(b.date))) {
    latest.set(r.person.trim().toLowerCase(), r);
  }
  const latestByPerson = [...latest.values()].sort((a, b) => a.person.localeCompare(b.person, "fr"));
  return {
    latestByPerson,
    valid: latestByPerson.filter((r) => r.validUntil >= todayIso),
    expired: latestByPerson.filter((r) => r.validUntil < todayIso),
    leadersTrained: latestByPerson.some((r) => r.audience === "dirigeant" && r.validUntil >= todayIso),
  };
}
