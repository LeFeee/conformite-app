// Modèles de documents pré-remplis avec les données de l'organisation.
// Rédaction générique destinée aux TPE/PME : à relire et adapter avant signature.

import type { Workspace } from "./domain";

export type Block =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "steps"; items: string[] };

export interface DocSection {
  heading: string;
  blocks: Block[];
}

export interface DocTemplate {
  slug: string;
  title: string;
  summary: string;
  /** contrôles que le document permet de démontrer ; le premier reçoit la preuve */
  controlIds: string[];
  signer: "direction" | "salarie";
  render: (ws: Workspace) => DocSection[];
}

const p = (text: string): Block => ({ kind: "p", text });
const list = (...items: string[]): Block => ({ kind: "list", items });
const steps = (...items: string[]): Block => ({ kind: "steps", items });

function ctx(ws: Workspace) {
  const a = ws.answers;
  const owner = (id: string) => ws.controls[id]?.owner;
  const directScope = ws.nis2.status === "essentielle" || ws.nis2.status === "importante";
  return {
    org: a.organizationName || "[Nom de l'organisation]",
    activity: a.activity || "[description de l'activité]",
    referent: owner("SMSI.5.3") ?? owner("A.5.2") ?? "[Nom du référent sécurité]",
    prestataire: "[Nom du prestataire informatique, le cas échéant]",
    directScope,
    personalData: a.handlesPersonalData,
    remote: !a.hasPremises,
    iso: a.targetIso27001,
  };
}

export const DOC_TEMPLATES: DocTemplate[] = [
  {
    slug: "politique-securite",
    title: "Politique de sécurité de l'information",
    summary: "Le document fondateur, signé par la direction. Exigé par l'ISO 27001 et attendu par NIS2.",
    controlIds: ["A.5.1", "SMSI.5"],
    signer: "direction",
    render: (ws) => {
      const c = ctx(ws);
      return [
        {
          heading: "Objet et périmètre",
          blocks: [
            p(`La présente politique fixe les règles de sécurité de l'information de ${c.org}, dont l'activité est : ${c.activity}.`),
            p("Elle s'applique à toutes les personnes qui accèdent aux informations et aux outils de l'organisation : dirigeants, salariés, stagiaires, prestataires et partenaires."),
          ],
        },
        {
          heading: "Engagement de la direction",
          blocks: [
            p(`La direction de ${c.org} considère la sécurité de l'information comme une condition de la confiance de ses clients et de la continuité de son activité. Elle s'engage à fournir les moyens nécessaires, à faire appliquer cette politique et à la revoir au moins une fois par an.`),
          ],
        },
        {
          heading: "Nos objectifs",
          blocks: [
            list(
              "Confidentialité : seules les personnes autorisées accèdent aux informations.",
              "Intégrité : les informations restent exactes et complètes.",
              "Disponibilité : les informations et les outils sont accessibles quand on en a besoin.",
              "Conformité : nous respectons nos obligations légales, réglementaires et contractuelles.",
            ),
          ],
        },
        {
          heading: "Organisation",
          blocks: [
            p(`${c.referent} est désigné(e) référent(e) sécurité. Il ou elle pilote la démarche, suit les actions et rend compte à la direction.`),
            p(`Le prestataire informatique (${c.prestataire}) intervient dans le cadre d'un contrat précisant ses obligations de sécurité.`),
            p("Chaque personne est responsable de l'application de ces règles dans son travail quotidien."),
          ],
        },
        {
          heading: "Règles essentielles",
          blocks: [
            list(
              "Un compte nominatif par personne, des mots de passe robustes et uniques conservés dans un gestionnaire de mots de passe.",
              "La double authentification est activée sur la messagerie, les accès à distance et les outils critiques.",
              "Les postes, téléphones et logiciels sont mis à jour sans délai et protégés par un antivirus.",
              "Les données sont sauvegardées régulièrement, avec une copie hors ligne, et la restauration est testée.",
              "Les accès sont accordés selon le besoin et retirés dès le départ d'une personne.",
              "Les fournisseurs qui accèdent à nos informations s'engagent contractuellement sur la sécurité.",
              "Tout incident ou comportement suspect est signalé immédiatement au référent sécurité.",
            ),
          ],
        },
        {
          heading: "Obligations à respecter",
          blocks: [
            list(
              ...[
                c.personalData ? "Le RGPD pour les données personnelles que nous traitons." : null,
                c.directScope
                  ? "La directive NIS2 et sa transposition française, en tant qu'entité soumise."
                  : "Les exigences de sécurité de nos clients soumis à NIS2, telles que prévues dans nos contrats.",
                c.iso ? "Les exigences de la norme ISO/IEC 27001, dans le cadre de notre démarche de certification." : null,
                "Les engagements de sécurité et de confidentialité pris dans nos contrats.",
              ].filter((x): x is string => Boolean(x)),
            ),
          ],
        },
        {
          heading: "Non-respect et révision",
          blocks: [
            p("Le non-respect de cette politique peut entraîner des mesures disciplinaires conformément au règlement intérieur, ou la rupture du contrat pour un prestataire."),
            p("Cette politique est revue chaque année en revue de direction, et après tout incident important ou changement majeur d'activité."),
          ],
        },
      ];
    },
  },
  {
    slug: "charte-informatique",
    title: "Charte d'utilisation des outils numériques",
    summary: "Les règles d'usage au quotidien, à faire signer par chaque salarié et prestataire.",
    controlIds: ["A.5.10", "A.6.2", "A.7.7", "A.6.7"],
    signer: "salarie",
    render: (ws) => {
      const c = ctx(ws);
      return [
        {
          heading: "Pourquoi cette charte",
          blocks: [
            p(`Les outils numériques de ${c.org} sont indispensables à notre activité. Cette charte explique comment les utiliser sans mettre en danger l'entreprise, ses clients et vous-même.`),
          ],
        },
        {
          heading: "Comptes et mots de passe",
          blocks: [
            list(
              "Votre compte est personnel : ne le prêtez pas et n'utilisez pas celui d'un collègue.",
              "Utilisez un mot de passe différent pour chaque service, stocké dans le gestionnaire de mots de passe fourni.",
              "Acceptez toujours la double authentification quand elle est proposée.",
            ),
          ],
        },
        {
          heading: "Messagerie et Internet",
          blocks: [
            list(
              "Méfiez-vous des messages urgents, inattendus ou qui demandent un paiement, un changement de RIB ou vos identifiants.",
              "En cas de doute, vérifiez par téléphone avec un numéro que vous connaissez déjà, jamais celui du message.",
              "N'installez pas de logiciel sans accord, et ne téléchargez que depuis des sources fiables.",
            ),
          ],
        },
        {
          heading: "Poste de travail et appareils",
          blocks: [
            list(
              "Verrouillez votre écran dès que vous vous éloignez, même quelques minutes.",
              "Ne laissez pas de documents confidentiels sur votre bureau en votre absence.",
              "Acceptez les mises à jour proposées et ne désactivez pas l'antivirus.",
              "N'utilisez pas de clé USB d'origine inconnue.",
            ),
          ],
        },
        {
          heading: c.remote ? "Travail à distance" : "Télétravail et déplacements",
          blocks: [
            list(
              "Travaillez sur le matériel fourni par l'entreprise, connecté à un réseau de confiance.",
              "Évitez les Wi-Fi publics sans connexion sécurisée, et protégez votre écran des regards dans les lieux publics.",
              "Signalez immédiatement la perte ou le vol d'un ordinateur ou d'un téléphone.",
            ),
          ],
        },
        {
          heading: "Données et confidentialité",
          blocks: [
            list(
              "Ne partagez des informations internes qu'avec les personnes qui en ont besoin.",
              "N'envoyez pas de données sensibles sur une messagerie ou un stockage personnel.",
              ...(c.personalData ? ["Traitez les données personnelles des clients et collègues avec la plus grande discrétion."] : []),
            ),
          ],
        },
        {
          heading: "Signaler un problème",
          blocks: [
            p(`Message suspect, comportement anormal de votre poste, perte de matériel, erreur d'envoi : prévenez ${c.referent} immédiatement. Signaler vite n'est jamais reproché ; cacher un incident aggrave toujours ses conséquences.`),
          ],
        },
        {
          heading: "Départ de l'entreprise",
          blocks: [
            p("À votre départ, vous restituez le matériel, les badges et les clés. Vos accès sont désactivés et vous restez tenu(e) à la confidentialité des informations dont vous avez eu connaissance."),
          ],
        },
        {
          heading: "Contrôles",
          blocks: [
            p("L'entreprise peut contrôler le respect de cette charte dans le respect de la vie privée et du droit du travail. Les manquements peuvent entraîner des sanctions prévues par le règlement intérieur."),
          ],
        },
      ];
    },
  },
  {
    slug: "procedure-incident",
    title: "Procédure de gestion des incidents",
    summary: "Qui prévenir, quoi faire dans la première heure, quand notifier. À afficher et diffuser.",
    controlIds: ["A.5.24", "A.5.26", "A.6.8", "NIS2.23"],
    signer: "direction",
    render: (ws) => {
      const c = ctx(ws);
      return [
        {
          heading: "Qui prévenir",
          blocks: [
            list(
              `Référent sécurité : ${c.referent} — [téléphone]`,
              `Prestataire informatique : ${c.prestataire} — [téléphone d'astreinte]`,
              "Assistance aux victimes : cybermalveillance.gouv.fr",
              ...(c.directScope ? ["Autorité NIS2 : ANSSI / CERT-FR, via le service de déclaration prévu"] : []),
              "En cas d'infraction : police ou gendarmerie, pour un dépôt de plainte",
            ),
          ],
        },
        {
          heading: "Les premiers réflexes",
          blocks: [
            steps(
              "Prévenir immédiatement le référent sécurité, par téléphone.",
              "Isoler l'appareil touché : débrancher le câble réseau ou couper le Wi-Fi, sans l'éteindre.",
              "Ne rien effacer : conserver messages, captures d'écran et fichiers suspects.",
              "Noter l'heure de découverte et tout ce qui a été observé ou fait.",
              "Ne jamais payer de rançon et ne pas répondre à l'attaquant.",
              "Changer les mots de passe des comptes potentiellement compromis, depuis un appareil sain.",
            ),
          ],
        },
        {
          heading: "Évaluer la gravité",
          blocks: [
            p("Le référent qualifie l'incident. Il est considéré comme important s'il perturbe gravement l'activité, cause des pertes financières, ou des dommages importants à des tiers."),
            p("Tout incident, même mineur, est enregistré dans le registre des incidents."),
          ],
        },
        {
          heading: "Notifier dans les délais",
          blocks: [
            list(
              ...(c.directScope
                ? [
                    "Incident important — ANSSI : alerte précoce sous 24 h, notification sous 72 h, rapport final dans le mois qui suit.",
                  ]
                : ["Incident important — clients concernés : selon les délais prévus dans vos contrats."]),
              ...(c.personalData
                ? ["Violation de données personnelles présentant un risque — CNIL : sous 72 h ; personnes concernées : sans délai si le risque est élevé."]
                : []),
              "Assureur cyber, le cas échéant : selon les délais du contrat.",
            ),
          ],
        },
        {
          heading: "Remise en service",
          blocks: [
            p("Le retour à la normale se fait avec le prestataire informatique, à partir de sauvegardes saines, après avoir corrigé la cause de l'incident."),
          ],
        },
        {
          heading: "Retour d'expérience",
          blocks: [
            p("Dans les deux semaines qui suivent, le référent rédige un retour d'expérience : cause, chronologie, ce qui a bien ou mal fonctionné, et actions décidées pour éviter que l'incident se reproduise."),
          ],
        },
      ];
    },
  },
];

export const TEMPLATES_BY_SLUG = new Map(DOC_TEMPLATES.map((t) => [t.slug, t]));

export function templatesForControl(controlId: string): DocTemplate[] {
  return DOC_TEMPLATES.filter((t) => t.controlIds.includes(controlId));
}
