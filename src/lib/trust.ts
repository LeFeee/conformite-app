// Fiche sécurité pour les clients : réponses aux questions habituelles des
// questionnaires sécurité, déduites de l'état réel des contrôles.
// Règle : ne jamais affirmer plus que ce que l'outil sait. Un contrôle déclaré
// conforme sans preuve valide n'est pas présenté comme « justificatif disponible ».

import { hasValidEvidence, scoreOf, today, type Workspace } from "./domain";
import { CONTROLS } from "./catalog/controls";
import { trainingStatus } from "./training";

export type TrustAnswer = "oui" | "en_cours" | "non" | "na" | "info";

export const TRUST_ANSWER_LABELS: Record<TrustAnswer, string> = {
  oui: "Oui",
  en_cours: "En cours",
  non: "Pas encore",
  na: "Non applicable",
  info: "Information",
};

export interface TrustItem {
  id: string;
  question: string;
  answer: TrustAnswer;
  /** précision rédigée pour le client */
  detail: string;
  /** une preuve valide existe et peut être transmise sur demande */
  proof: boolean;
  controlIds: string[];
}

export interface TrustSection {
  title: string;
  items: TrustItem[];
}

function fromControls(ws: Workspace, ids: string[], now: Date): { answer: TrustAnswer; proof: boolean } {
  const applicable = ids.filter((id) => ws.controls[id]?.applicable && ws.controls[id].status !== "non_applicable");
  if (!applicable.length) return { answer: "na", proof: false };
  const statuses = applicable.map((id) => ws.controls[id].status);
  const proof = applicable.every((id) => hasValidEvidence(ws, id, now));
  if (statuses.every((s) => s === "conforme")) return { answer: "oui", proof };
  if (statuses.some((s) => s === "conforme" || s === "en_cours")) return { answer: "en_cours", proof: false };
  return { answer: "non", proof: false };
}

function nis2Item(ws: Workspace): TrustItem {
  const base = { id: "nis2", question: "Êtes-vous concernés par la directive NIS2 ?", proof: false, controlIds: [] };
  switch (ws.nis2.status) {
    case "essentielle":
    case "importante":
      return { ...base, answer: "oui", detail: `Entité ${ws.nis2.status} au sens de NIS2 ; les mesures de l'article 21 sont suivies dans notre plan de conformité.` };
    case "cascade":
      return { ...base, answer: "info", detail: "Pas directement soumis ; nous appliquons les exigences de sécurité transmises par nos clients concernés." };
    default:
      return { ...base, answer: "info", detail: "Pas concernés à ce jour." };
  }
}

export function trustSheet(ws: Workspace, now = new Date()): TrustSection[] {
  const a = ws.answers;
  const item = (id: string, question: string, controlIds: string[], details: Partial<Record<TrustAnswer, string>>): TrustItem => {
    const { answer, proof } = fromControls(ws, controlIds, now);
    return { id, question, answer, proof, controlIds, detail: details[answer] ?? "" };
  };

  const referent = ws.controls["SMSI.5.3"]?.owner ?? ws.controls["A.5.2"]?.owner ?? null;
  const total = scoreOf(ws, CONTROLS, now);
  const tr = trainingStatus(ws.trainings, today(now));
  const hosts = ws.suppliers.filter((s) => /h[ée]berg|cloud|infra/i.test(`${s.name} ${s.service}`));
  const subProcessors = ws.suppliers.filter((s) => s.dataAccess === "personnelles" || s.dataAccess === "sensibles");

  const sections: TrustSection[] = [
    {
      title: "Gouvernance",
      items: [
        item("politique", "Disposez-vous d'une politique de sécurité de l'information approuvée par la direction ?", ["A.5.1"], {
          oui: "Politique écrite, signée par la direction et revue chaque année.",
          en_cours: "Politique en cours de rédaction ou de validation.",
        }),
        {
          id: "referent",
          question: "Une personne est-elle responsable de la sécurité de l'information ?",
          answer: referent ? "oui" : "non",
          proof: false,
          controlIds: ["SMSI.5.3"],
          detail: referent ? `Référent sécurité : ${referent}.` : "",
        },
        {
          id: "certification",
          question: "Êtes-vous certifiés ISO 27001 ?",
          answer: a.targetIso27001 ? "en_cours" : "non",
          proof: false,
          controlIds: [],
          detail: a.targetIso27001
            ? `Démarche de mise en conformité ISO 27001 engagée et suivie dans un outil de pilotage${total.percent >= 50 ? ` ; ${total.percent} % des mesures applicables sont en place et justifiées` : ""}.`
            : "Pas de certification visée à ce jour ; les mesures de sécurité suivent le référentiel ISO 27001.",
        },
        nis2Item(ws),
      ],
    },
    {
      title: "Accès",
      items: [
        item("mfa", "La double authentification est-elle activée sur les accès ?", ["A.8.5"], {
          oui: "Double authentification sur la messagerie, les services en ligne et les accès d'administration.",
          en_cours: "Déploiement de la double authentification en cours.",
        }),
        item("droits", "Les droits d'accès sont-ils limités et revus régulièrement ?", ["A.5.15", "A.5.18"], {
          oui: "Accès accordés selon le besoin d'en connaître, revus tous les six mois.",
          en_cours: "Politique d'accès définie, revues périodiques en cours de mise en place.",
        }),
        item("departs", "Les accès sont-ils retirés au départ d'un collaborateur ou d'un prestataire ?", ["A.6.5", "A.5.18"], {
          oui: "Procédure de départ : accès coupés le dernier jour, matériel restitué.",
          en_cours: "Procédure de départ en cours de formalisation.",
        }),
      ],
    },
    {
      title: "Protection des données",
      items: [
        item("chiffrement", "Les données sont-elles chiffrées ?", ["A.8.24"], {
          oui: "Chiffrement des échanges et des supports de stockage.",
          en_cours: "Chiffrement partiellement en place.",
        }),
        item("sauvegardes", "Les données sont-elles sauvegardées, avec des tests de restauration ?", ["A.8.13"], {
          oui: "Sauvegardes régulières, dont une copie hors ligne ou isolée, avec tests de restauration.",
          en_cours: "Sauvegardes en place, tests de restauration en cours d'organisation.",
        }),
        {
          id: "hebergement",
          question: "Où les données sont-elles hébergées ?",
          answer: hosts.length ? "info" : "na",
          proof: false,
          controlIds: ["A.5.23"],
          detail: hosts.length
            ? hosts.map((h) => `${h.name}${h.certifications ? ` (${h.certifications})` : ""}${h.answers.localisation === "oui" ? ", hébergement dans l'Union européenne" : ""}`).join(" ; ") + "."
            : "",
        },
        item("rgpd", "Respectez-vous le RGPD (registre, contrat de sous-traitance, notification des violations) ?", ["A.5.34"], {
          oui: "Registre des traitements tenu, accord de sous-traitance disponible, procédure de notification sous 72 heures.",
          en_cours: "Mise en conformité RGPD en cours.",
          na: "Aucune donnée personnelle traitée pour le compte de clients.",
        }),
        {
          id: "sous-traitants",
          question: "Quels sous-traitants accèdent à nos données ?",
          answer: subProcessors.length ? "info" : "na",
          proof: false,
          controlIds: ["A.5.19"],
          detail: subProcessors.length ? subProcessors.map((s) => `${s.name} (${s.service || "service"})`).join(" ; ") + "." : "",
        },
      ],
    },
    {
      title: "Exploitation",
      items: [
        item("malveillants", "Les postes et serveurs sont-ils protégés contre les logiciels malveillants ?", ["A.8.7"], {
          oui: "Protection active sur l'ensemble des postes et serveurs.",
        }),
        item("correctifs", "Les correctifs de sécurité sont-ils appliqués dans un délai défini ?", ["A.8.8"], {
          oui: "Veille sur les vulnérabilités et correctifs critiques appliqués rapidement.",
          en_cours: "Processus de gestion des correctifs en cours de formalisation.",
        }),
        item("journaux", "Les accès et événements de sécurité sont-ils journalisés ?", ["A.8.15", "A.8.16"], {
          oui: "Journaux conservés et surveillés.",
          en_cours: "Journalisation en place, surveillance en cours d'amélioration.",
        }),
      ],
    },
    ...(a.hasDevelopment
      ? [
          {
            title: "Développement",
            items: [
              item("dev-securise", "Le développement suit-il des règles de sécurité ?", ["A.8.25", "A.8.28"], {
                oui: "Règles de développement sécurisé, revue de code, dépendances surveillées.",
                en_cours: "Règles de développement sécurisé en cours de formalisation.",
              }),
              item("tests", "Réalisez-vous des tests de sécurité ?", ["A.8.29"], {
                oui: "Tests de sécurité avant mise en production.",
                en_cours: "Tests de sécurité en cours d'organisation.",
              }),
            ],
          },
        ]
      : []),
    {
      title: "Incidents et continuité",
      items: [
        item("incidents", "Disposez-vous d'une procédure de gestion des incidents ?", ["A.5.24", "A.5.26"], {
          oui: "Procédure écrite ; les clients concernés sont informés sans délai en cas d'incident les affectant.",
          en_cours: "Procédure de gestion des incidents en cours de formalisation.",
        }),
        item("continuite", "Disposez-vous d'un plan de continuité d'activité ?", ["A.5.30"], {
          oui: "Plan de continuité et de reprise documenté et testé.",
          en_cours: "Plan de continuité en cours d'élaboration.",
        }),
      ],
    },
    {
      title: "Personnes",
      items: [
        {
          id: "sensibilisation",
          question: "Le personnel est-il sensibilisé à la sécurité ?",
          answer: tr.valid.length ? (tr.expired.length ? "en_cours" : "oui") : "non",
          proof: tr.valid.length > 0 && !tr.expired.length,
          controlIds: ["A.6.3"],
          detail: tr.valid.length
            ? `Sensibilisation annuelle avec attestation ; ${tr.valid.length} personne${tr.valid.length > 1 ? "s" : ""} à jour${tr.expired.length ? `, ${tr.expired.length} en cours de renouvellement` : ""}.`
            : "",
        },
        item("confidentialite", "Le personnel est-il tenu à la confidentialité ?", ["A.6.6"], {
          oui: "Engagement de confidentialité signé par les salariés et prestataires.",
        }),
        item("charte", "Existe-t-il des règles d'utilisation des outils informatiques ?", ["A.5.10"], {
          oui: "Charte informatique signée par chaque utilisateur.",
          en_cours: "Charte informatique en cours de diffusion.",
        }),
      ],
    },
  ];
  return sections;
}

/** Version texte, à coller dans un questionnaire client ou un email. */
export function trustSheetText(ws: Workspace, sections: TrustSection[]): string {
  const lines = [`Fiche sécurité — ${ws.answers.organizationName}`, `Établie le ${new Date().toLocaleDateString("fr-FR")}`, ""];
  for (const s of sections) {
    lines.push(s.title.toUpperCase());
    for (const i of s.items) {
      lines.push(`- ${i.question}`);
      const label = i.answer === "info" ? "" : TRUST_ANSWER_LABELS[i.answer];
      lines.push(`  ${[label, i.detail].filter(Boolean).join(" : ")}${i.proof ? " (justificatif disponible sur demande)" : ""}`);
    }
    lines.push("");
  }
  lines.push("Ces informations décrivent les mesures en place à la date indiquée. Elles ne valent pas certification.");
  return lines.join("\n");
}
