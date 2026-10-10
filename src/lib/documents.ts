// Modèles de documents pré-remplis avec les données de l'organisation.
// Rédaction générique destinée aux TPE/PME : à relire et adapter avant signature.

import { CONTROLS } from "./catalog/controls";
import { CATEGORY_PLURAL, CLASSIFICATION_LABELS, type Asset } from "./assets";
import { STATUS_LABELS } from "./catalog/types";
import { computeAlerts, formatDate, frameworkScores, scoreOf, today, type Workspace } from "./domain";
import { incidentDeadlines } from "./incidents";
import { IMPACT_LABELS, LIKELIHOOD_LABELS, riskLevel, TREATMENT_LABELS } from "./risks";
import { trainingStatus } from "./training";

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
  {
    slug: "plan-sauvegarde",
    title: "Plan de sauvegarde",
    summary: "Ce qui est sauvegardé, où, à quelle fréquence, et comment on vérifie que la restauration fonctionne.",
    controlIds: ["A.8.13", "A.5.30"],
    signer: "direction",
    render: (ws) => {
      const c = ctx(ws);
      return [
        {
          heading: "Objet",
          blocks: [
            p(`Ce plan garantit que ${c.org} peut retrouver ses données après une panne, une erreur, un vol ou une cyberattaque. Il est tenu à jour par ${c.referent}.`),
          ],
        },
        {
          heading: "La règle 3-2-1",
          blocks: [
            list(
              "3 copies des données : l'original et deux sauvegardes.",
              "Sur 2 supports différents (par exemple un service de sauvegarde en ligne et un disque externe).",
              "Dont 1 copie hors ligne ou non modifiable, à l'abri d'un rançongiciel.",
            ),
          ],
        },
        {
          heading: "Ce qui est sauvegardé",
          blocks: [
            list(
              "Messagerie et agendas : [outil, fréquence, durée de conservation]",
              "Documents et fichiers partagés : [outil, fréquence, durée de conservation]",
              "Comptabilité, paie et gestion commerciale : [outil, fréquence, durée de conservation]",
              ...(ws.answers.hasDevelopment
                ? ["Code source et bases de données de production : [outil, fréquence, durée de conservation]"]
                : []),
              "Configuration des équipements (pare-feu, serveurs) : [outil, fréquence]",
            ),
          ],
        },
        {
          heading: "Qui fait quoi",
          blocks: [
            list(
              `Supervision des sauvegardes et lecture des rapports : ${c.referent}`,
              `Mise en œuvre technique : ${c.prestataire}`,
              "Remplaçant en cas d'absence : [Nom]",
            ),
          ],
        },
        {
          heading: "Vérifications",
          blocks: [
            list(
              "Chaque semaine : lecture du rapport de sauvegarde, traitement de toute erreur.",
              "Chaque trimestre : restauration test d'un dossier et d'une boîte mail, consignée avec la date et le résultat.",
              "Chaque année : restauration complète d'un poste ou d'un serveur sur un environnement de test.",
            ),
            p("Chaque test de restauration est enregistré comme preuve dans l'outil de conformité."),
          ],
        },
      ];
    },
  },
  {
    slug: "plan-continuite",
    title: "Plan de continuité d'activité simplifié",
    summary: "Comment continuer à travailler et redémarrer si l'informatique ou les locaux deviennent indisponibles.",
    controlIds: ["A.5.30", "A.5.29"],
    signer: "direction",
    render: (ws) => {
      const c = ctx(ws);
      return [
        {
          heading: "Activités essentielles",
          blocks: [
            p(`Les activités sans lesquelles ${c.org} ne peut pas fonctionner plus de quelques jours, et le délai d'interruption acceptable pour chacune :`),
            list(
              "[Activité 1, ex. prise de commandes] — interruption maximale : [24 h]",
              "[Activité 2, ex. production ou livraison] — interruption maximale : [48 h]",
              "[Activité 3, ex. facturation et paie] — interruption maximale : [5 jours]",
            ),
          ],
        },
        {
          heading: "Scénarios couverts",
          blocks: [
            list(
              "Cyberattaque bloquant les ordinateurs (rançongiciel).",
              "Panne d'Internet ou d'un service en ligne indispensable.",
              ...(c.remote ? [] : ["Locaux inaccessibles : incendie, dégât des eaux, coupure prolongée d'électricité."]),
              "Absence d'une personne clé (dirigeant, référent informatique).",
            ),
          ],
        },
        {
          heading: "Mode dégradé",
          blocks: [
            list(
              "Liste papier à jour des contacts clés : clients, fournisseurs, prestataire informatique, assureur, banque.",
              "Accès de secours : téléphone portable, partage de connexion 4G/5G, ordinateur de remplacement prêt.",
              "Procédures manuelles temporaires : [bons de commande papier, facturation différée…].",
              "Communication : qui prévient les clients, avec quel message.",
            ),
          ],
        },
        {
          heading: "Redémarrage",
          blocks: [
            steps(
              "Le dirigeant déclenche le plan et désigne un coordinateur.",
              "Le prestataire informatique évalue les dégâts et l'ordre de redémarrage.",
              "Restauration des données à partir de sauvegardes saines (voir le plan de sauvegarde).",
              "Redémarrage des activités essentielles dans l'ordre de priorité ci-dessus.",
              "Retour d'expérience et mise à jour de ce plan.",
            ),
          ],
        },
        {
          heading: "Test du plan",
          blocks: [
            p("Le plan est testé au moins une fois par an par un exercice sur table d'une heure : on déroule un scénario et on vérifie que chacun sait quoi faire. Le compte rendu est enregistré comme preuve."),
          ],
        },
      ];
    },
  },
  {
    slug: "revue-de-direction",
    title: "Compte rendu de revue de direction",
    summary: "La réunion annuelle exigée par l'ISO 27001, pré-remplie avec l'état réel de votre démarche.",
    controlIds: ["SMSI.9.3", "A.5.4"],
    signer: "direction",
    render: (ws) => {
      const c = ctx(ws);
      const total = scoreOf(ws, CONTROLS);
      const fws = frameworkScores(ws);
      const alerts = computeAlerts(ws);
      const critical = alerts.filter((a) => a.severity === "critique").length;
      const yearAgo = new Date();
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      const incidents = ws.incidents.filter((i) => new Date(i.detectedAt) >= yearAgo);
      const significant = incidents.filter((i) => i.significant).length;
      const topRisks = ws.risks.filter((r) => {
        const l = riskLevel(r.likelihood, r.impact);
        return l === "critique" || l === "eleve";
      });
      const socleRestant = CONTROLS.filter(
        (x) => x.priority === "socle" && ws.controls[x.id]?.applicable && ws.controls[x.id].status !== "conforme",
      );
      return [
        {
          heading: "Informations",
          blocks: [
            list(
              `Organisation : ${c.org}`,
              `Date de la revue : ${formatDate(new Date().toISOString())}`,
              "Participants : [Noms et fonctions]",
              `Animée par : ${c.referent}`,
            ),
          ],
        },
        {
          heading: "État de la démarche",
          blocks: [
            list(
              `Conformité prouvée globale : ${total.percent} % (${total.conformes} contrôles conformes sur ${total.applicable} applicables).`,
              ...fws.map(({ framework, score }) => `${framework.shortName} : ${score.percent} %.`),
              `Situation NIS2 : ${ws.nis2.label.toLowerCase()}.`,
              alerts.length
                ? `Alertes en cours : ${alerts.length}, ${critical ? `dont ${critical} critique${critical > 1 ? "s" : ""}` : "aucune critique"}.`
                : "Aucune alerte en cours.",
            ),
          ],
        },
        {
          heading: "Incidents des 12 derniers mois",
          blocks: [
            incidents.length
              ? list(
                  `${incidents.length} incident${incidents.length > 1 ? "s" : ""} enregistré${incidents.length > 1 ? "s" : ""}, dont ${significant} important${significant > 1 ? "s" : ""}.`,
                  ...incidents.slice(0, 8).map((i) => `${formatDate(i.detectedAt)} — ${i.title}${i.lessons ? ` (leçon : ${i.lessons})` : ""}`),
                )
              : p("Aucun incident enregistré sur la période."),
          ],
        },
        {
          heading: "Risques principaux",
          blocks: [
            topRisks.length
              ? list(
                  ...topRisks.map((r) => {
                    const linked = r.controlIds.filter((id) => ws.controls[id]?.applicable);
                    const done = linked.filter((id) => ws.controls[id].status === "conforme").length;
                    return `${r.threat} — mesures en place : ${done}/${linked.length}.`;
                  }),
                )
              : p("Aucun risque élevé ou critique au registre."),
          ],
        },
        {
          heading: "Points à décider",
          blocks: [
            list(
              socleRestant.length
                ? `${socleRestant.length} contrôle${socleRestant.length > 1 ? "s" : ""} essentiel${socleRestant.length > 1 ? "s" : ""} restent à finaliser : ${socleRestant.slice(0, 6).map((x) => x.title.toLowerCase()).join(", ")}${socleRestant.length > 6 ? "…" : ""}.`
                : "Tous les contrôles essentiels sont en place.",
              "Moyens alloués pour l'année à venir (budget, temps, prestataires) : [à compléter]",
              "La politique de sécurité reste-t-elle adaptée ? [oui / modifications à apporter]",
              "Changements d'activité ou de réglementation à prendre en compte : [à compléter]",
            ),
          ],
        },
        {
          heading: "Décisions et objectifs pour l'année",
          blocks: [
            steps("[Décision ou objectif 1, responsable, échéance]", "[Décision ou objectif 2, responsable, échéance]", "[Décision ou objectif 3, responsable, échéance]"),
          ],
        },
      ];
    },
  },
  {
    slug: "perimetre-smsi",
    title: "Contexte et périmètre du système de management de la sécurité",
    summary: "Ce que couvre votre démarche, pour qui et pourquoi. Premier document lu par l'auditeur (ISO 27001 §4).",
    controlIds: ["SMSI.4"],
    signer: "direction",
    render: (ws) => {
      const c = ctx(ws);
      const a = ws.answers;
      const excluded = Object.values(ws.controls).filter((x) => !x.applicable);
      const reasons = [...new Set(excluded.map((x) => x.exclusionReason?.trim().replace(/\.+$/, "")).filter(Boolean))] as string[];
      const byCat = (cat: Asset["category"]) => ws.assets.filter((x) => x.category === cat).map((x) => x.name);
      const keySuppliers = ws.suppliers.filter((s) => s.criticality !== "standard");
      const parties = [
        "Clients : confidentialité de leurs données, continuité du service, transparence en cas d'incident.",
        a.headcount !== "1" && "Salariés : outils fiables, règles claires, respect de leur vie privée.",
        "Direction et associés : protection de l'activité, de la réputation et du patrimoine.",
        "Fournisseurs et prestataires : règles d'accès claires, échanges sécurisés.",
        a.handlesPersonalData && "CNIL : respect du RGPD, notification des violations de données sous 72 heures.",
        c.directScope && "ANSSI : application des mesures NIS2, notification des incidents importants (24 h, 72 h, 1 mois).",
        ws.nis2.status === "cascade" && "Clients soumis à NIS2 : exigences de sécurité reportées dans les contrats et questionnaires fournisseurs.",
        "Assureur : niveau de sécurité attendu pour la garantie cyber, le cas échéant.",
      ].filter(Boolean) as string[];
      return [
        {
          heading: "Contexte",
          blocks: [
            p(`${c.org} exerce l'activité suivante : ${c.activity}.`),
            list(
              `Effectif : ${{ "1": "une personne", "2-9": "2 à 9 personnes", "10-49": "10 à 49 personnes", "50-249": "50 à 249 personnes", "250+": "250 personnes et plus" }[a.headcount]}.`,
              `Situation au regard de NIS2 : ${ws.nis2.label.toLowerCase()}.`,
              a.hasPremises ? "L'activité s'exerce dans des locaux propres." : "L'activité s'exerce sans locaux dédiés (télétravail, espaces partagés).",
              a.usesCloud ? "Les outils de travail sont principalement des services en ligne." : "Les outils de travail sont principalement installés localement.",
              a.hasDevelopment ? "L'organisation développe et exploite ses propres applications." : "L'organisation ne développe pas de logiciel.",
            ),
            p("Enjeux identifiés : [compléter, par exemple exigences des clients, croissance, dépendance à un fournisseur, menaces propres au secteur]."),
          ],
        },
        {
          heading: "Parties intéressées et leurs attentes",
          blocks: [list(...parties)],
        },
        {
          heading: "Périmètre",
          blocks: [
            p(`Le système de management couvre l'ensemble des activités de ${c.org}, les personnes qui y participent et les informations qu'elles utilisent, quel que soit leur support.`),
            ws.assets.length
              ? list(
                  ...(["donnees", "application", "service", "materiel", "locaux"] as const)
                    .filter((cat) => byCat(cat).length)
                    .map((cat) => `${CATEGORY_PLURAL[cat]} : ${byCat(cat).join(", ")}.`),
                )
              : p("Actifs couverts : voir l'inventaire des actifs [à compléter dans l'outil]."),
            keySuppliers.length
              ? p(`Interfaces et dépendances : ${keySuppliers.map((s) => `${s.name} (${s.service || "service"})`).join(", ")}. Ces fournisseurs sont hors périmètre mais encadrés par contrat et évalués chaque année.`)
              : p("Interfaces et dépendances : [lister les fournisseurs et prestataires dont dépend l'activité]."),
          ],
        },
        {
          heading: "Référentiels et exclusions",
          blocks: [
            list(
              ...[c.iso && "ISO/IEC 27001:2022", a.targetNis2 && "Directive (UE) 2022/2555 (NIS2)"].filter((x): x is string => !!x),
            ),
            excluded.length
              ? p(`${excluded.length} mesure${excluded.length > 1 ? "s sont exclues" : " est exclue"}, avec la justification suivante : ${reasons.join(" ; ")}. Le détail figure dans la déclaration d'applicabilité.`)
              : p("Aucune mesure n'est exclue."),
          ],
        },
        {
          heading: "Revue",
          blocks: [p(`Ce document est revu chaque année lors de la revue de direction, ou plus tôt en cas de changement important (nouvelle activité, déménagement, nouveau fournisseur critique). Responsable : ${c.referent}.`)],
        },
      ];
    },
  },
  {
    slug: "methode-risques",
    title: "Méthode d'appréciation et de traitement des risques",
    summary: "Comment vous évaluez et traitez vos risques : échelles, seuils, critères d'acceptation (ISO 27001 §6.1.2 et §6.1.3).",
    controlIds: ["SMSI.6.1"],
    signer: "direction",
    render: (ws) => {
      const c = ctx(ws);
      const count = (lvl: string) => ws.risks.filter((r) => riskLevel(r.likelihood, r.impact) === lvl).length;
      return [
        {
          heading: "Principe",
          blocks: [
            p(`${c.org} identifie ce qui pourrait porter atteinte à la confidentialité, à l'intégrité ou à la disponibilité de ses informations, évalue chaque risque, puis décide comment le traiter. La méthode est volontairement simple pour être appliquée et refaite à l'identique chaque année.`),
          ],
        },
        {
          heading: "Identification",
          blocks: [
            list(
              "Point de départ : l'inventaire des actifs (données, applications, services en ligne, matériel, locaux).",
              "Pour chaque actif important : qu'est-ce qui pourrait mal tourner, et pourquoi ?",
              "Chaque risque a un responsable chargé de son suivi.",
            ),
          ],
        },
        {
          heading: "Échelles d'évaluation",
          blocks: [
            p("Probabilité :"),
            list(
              `1 — ${LIKELIHOOD_LABELS[1]} : peu d'occurrences connues, aucune ces dernières années.`,
              `2 — ${LIKELIHOOD_LABELS[2]} : déjà arrivé dans des organisations comparables.`,
              `3 — ${LIKELIHOOD_LABELS[3]} : déjà arrivé chez nous ou fréquent dans notre secteur.`,
              `4 — ${LIKELIHOOD_LABELS[4]} : se produit régulièrement ou attendu dans l'année.`,
            ),
            p("Impact :"),
            list(
              `1 — ${IMPACT_LABELS[1]} : gêne passagère, sans conséquence pour les clients.`,
              `2 — ${IMPACT_LABELS[2]} : perturbation de quelques jours, coût limité.`,
              `3 — ${IMPACT_LABELS[3]} : clients touchés, perte financière ou atteinte à la réputation sensible.`,
              `4 — ${IMPACT_LABELS[4]} : arrêt de l'activité, violation de données importante ou sanction.`,
            ),
          ],
        },
        {
          heading: "Niveau de risque et critères d'acceptation",
          blocks: [
            p("Niveau = probabilité × impact."),
            list(
              "De 1 à 3 — faible : acceptable, suivi lors de la revue annuelle.",
              "De 4 à 7 — modéré : acceptable avec l'accord de la direction, mesures si elles sont simples et peu coûteuses.",
              "De 8 à 11 — élevé : traitement obligatoire, plan d'action daté.",
              "12 et plus — critique : traitement prioritaire ; à défaut, acceptation écrite et motivée de la direction.",
            ),
          ],
        },
        {
          heading: "Traitement",
          blocks: [
            list(
              `${TREATMENT_LABELS.reduire} : mettre en place des mesures de l'annexe A, reliées au risque dans le registre.`,
              `${TREATMENT_LABELS.transferer} : par contrat ou assurance, sans transférer la responsabilité.`,
              `${TREATMENT_LABELS.eviter}.`,
              `${TREATMENT_LABELS.accepter} : décision de la direction, tracée dans le registre.`,
            ),
            p("Le plan de traitement est constitué par le registre des risques et les contrôles qui y sont reliés. Les risques résiduels sont approuvés par la direction lors de la revue de direction."),
          ],
        },
        {
          heading: "Fréquence et état actuel",
          blocks: [
            p(`L'appréciation est refaite chaque année et après tout incident important ou changement notable. Responsable : ${c.referent}.`),
            ws.risks.length
              ? p(`À la date d'édition, le registre compte ${ws.risks.length} risque${ws.risks.length > 1 ? "s" : ""} : ${count("critique")} critique${count("critique") > 1 ? "s" : ""}, ${count("eleve")} élevé${count("eleve") > 1 ? "s" : ""}, ${count("modere")} modéré${count("modere") > 1 ? "s" : ""}, ${count("faible")} faible${count("faible") > 1 ? "s" : ""}.`)
              : p("Le registre des risques n'est pas encore rempli."),
          ],
        },
      ];
    },
  },
  {
    slug: "objectifs-securite",
    title: "Objectifs de sécurité de l'information",
    summary: "Quelques objectifs mesurables avec leur indicateur et leur valeur actuelle (ISO 27001 §6.2).",
    controlIds: ["SMSI.6.2"],
    signer: "direction",
    render: (ws) => {
      const c = ctx(ws);
      const total = scoreOf(ws, CONTROLS);
      const st = (id: string) => (ws.controls[id]?.applicable ? STATUS_LABELS[ws.controls[id].status].toLowerCase() : "non applicable");
      const tr = trainingStatus(ws.trainings, today());
      const critical = ws.suppliers.filter((s) => s.criticality === "critique");
      const evaluated = critical.filter((s) => s.answeredAt).length;
      const late = ws.incidents.filter((i) => incidentDeadlines(i).some((d) => d.state === "en_retard")).length;
      const objective = (title: string, indicator: string, target: string, now: string, deadline: string) =>
        `${title} — indicateur : ${indicator} ; cible : ${target} ; aujourd'hui : ${now} ; échéance : ${deadline}.`;
      return [
        {
          heading: "Objectifs pour l'année",
          blocks: [
            steps(
              objective("Être prêt pour l'audit de certification", "conformité prouvée (contrôles conformes avec preuve valide)", "80 % au moins", `${total.percent} %`, "[date]"),
              objective("Sensibiliser toute l'équipe", "personnes avec une sensibilisation de moins d'un an", "100 %", `${tr.valid.length} personne${tr.valid.length > 1 ? "s" : ""} à jour${tr.expired.length ? `, ${tr.expired.length} à renouveler` : ""}`, "[date]"),
              objective("Protéger tous les accès par double authentification", "comptes avec double authentification", "100 % des comptes", `contrôle A.8.5 ${st("A.8.5")}`, "[date]"),
              objective("Pouvoir restaurer les données", "test de restauration réussi", "un test par trimestre", `contrôle A.8.13 ${st("A.8.13")}`, "[date]"),
              objective("Maîtriser les fournisseurs critiques", "fournisseurs critiques ayant répondu au questionnaire", "100 %", critical.length ? `${evaluated} sur ${critical.length}` : "aucun fournisseur critique recensé", "[date]"),
              ...(c.directScope || ws.incidents.length
                ? [objective("Respecter les délais de notification", "incidents importants notifiés dans les délais", "100 %", late ? `${late} incident${late > 1 ? "s" : ""} en retard` : "aucun retard", "en continu")]
                : []),
            ),
          ],
        },
        {
          heading: "Suivi",
          blocks: [
            p(`Les indicateurs sont suivis dans l'outil de pilotage et présentés à la revue de direction. Responsable du suivi : ${c.referent}.`),
            p("Objectifs complémentaires propres à l'organisation : [à compléter]."),
          ],
        },
      ];
    },
  },
  {
    slug: "politique-acces",
    title: "Politique de contrôle d'accès",
    summary: "Qui accède à quoi, comment les droits sont donnés, revus et retirés (ISO 27001 A.5.15 à A.5.18, A.8.5).",
    controlIds: ["A.5.15", "A.5.16", "A.5.18", "A.8.5"],
    signer: "direction",
    render: (ws) => {
      const c = ctx(ws);
      const sensitive = ws.assets.filter((x) => x.classification === "sensible" || x.classification === "confidentiel");
      return [
        {
          heading: "Principes",
          blocks: [
            list(
              "Besoin d'en connaître : chacun n'accède qu'aux informations nécessaires à sa mission.",
              "Moindre privilège : les droits d'administration sont limités aux personnes qui en ont l'usage, et utilisés seulement quand c'est nécessaire.",
              "Comptes nominatifs : pas de compte partagé ; un compte technique a toujours un responsable désigné.",
              "Double authentification obligatoire sur la messagerie, les services en ligne, les accès à distance et tous les comptes d'administration.",
            ),
          ],
        },
        {
          heading: "Informations les plus protégées",
          blocks: [
            sensitive.length
              ? list(...sensitive.map((x) => `${x.name} (${CLASSIFICATION_LABELS[x.classification].toLowerCase()}) — accès décidé par ${x.owner || "[responsable à désigner]"}.`))
              : p("Voir l'inventaire des actifs : les actifs confidentiels et sensibles et leur responsable [à compléter]."),
          ],
        },
        {
          heading: "Arrivée, changement de poste, départ",
          blocks: [
            steps(
              "Arrivée : le responsable demande les accès nécessaires ; ils sont créés au plus tard le premier jour, avec double authentification activée.",
              "Changement de poste : les droits devenus inutiles sont retirés en même temps que les nouveaux sont donnés.",
              "Départ : tous les accès sont coupés le dernier jour de travail (comptes, badges, clés, partages), le matériel est restitué et les mots de passe partagés qu'il connaissait sont changés.",
              "Prestataires : accès nominatifs, limités dans le temps et retirés à la fin de la mission.",
            ),
          ],
        },
        {
          heading: "Mots de passe",
          blocks: [
            list(
              "Mots de passe longs (au moins 12 caractères, une phrase de passe de préférence) et différents pour chaque service.",
              "Utilisation d'un gestionnaire de mots de passe fourni par l'organisation.",
              "Changement immédiat en cas de doute sur une fuite ; pas de changement périodique imposé sans raison.",
            ),
          ],
        },
        {
          heading: "Revue des droits",
          blocks: [
            p(`Tous les six mois, ${c.referent} passe en revue les comptes de chaque service important avec les responsables concernés : comptes inutilisés ou d'anciens collaborateurs supprimés, droits d'administration justifiés. La revue est datée et conservée comme preuve.`),
          ],
        },
      ];
    },
  },
  {
    slug: "registre-legal",
    title: "Registre des exigences légales, réglementaires et contractuelles",
    summary: "Les textes et engagements qui s'imposent à vous en matière de sécurité, et comment vous y répondez (ISO 27001 A.5.31).",
    controlIds: ["A.5.31"],
    signer: "direction",
    render: (ws) => {
      const c = ctx(ws);
      const a = ws.answers;
      const entry = (text: string, impl: string, how: string) => `${text} — ce que cela implique : ${impl} ; comment nous y répondons : ${how}.`;
      const items = [
        a.handlesPersonalData &&
          entry(
            "RGPD (règlement (UE) 2016/679) et loi Informatique et Libertés",
            "registre des traitements, sécurité des données (art. 32), contrats avec les sous-traitants (art. 28), notification des violations à la CNIL sous 72 heures (art. 33) et information des personnes si le risque est élevé (art. 34)",
            "[registre des traitements, accords de sous-traitance suivis dans le registre des fournisseurs, procédure de gestion des incidents]",
          ),
        c.directScope &&
          entry(
            "Directive (UE) 2022/2555 (NIS2) et sa transposition en droit français",
            "mesures de gestion des risques (art. 21), formation et responsabilité des dirigeants (art. 20), notification des incidents importants : alerte sous 24 heures, notification sous 72 heures, rapport final sous un mois (art. 23)",
            "plan de mise en conformité suivi dans l'outil, registre des incidents avec échéances",
          ),
        ws.nis2.status === "cascade" &&
          entry(
            "Exigences NIS2 transmises par les clients (effet cascade)",
            "clauses de sécurité, questionnaires fournisseurs, notification des incidents aux clients dans les délais convenus",
            "[liste des contrats concernés et des engagements pris, réponses aux questionnaires]",
          ),
        entry(
          "Engagements contractuels envers les clients",
          "clauses de confidentialité, de sécurité, de disponibilité (niveau de service) et de réversibilité",
          "[contrats types et conditions générales, à recenser]",
        ),
        a.headcount !== "1" &&
          entry(
            "Code du travail",
            "information préalable des salariés sur tout dispositif permettant de les contrôler (art. L1222-4), consultation du CSE le cas échéant, charte informatique portée à la connaissance de chacun",
            "charte informatique signée, information des salariés",
          ),
        entry(
          "Code pénal, articles 323-1 et suivants",
          "l'accès frauduleux à un système d'information est un délit : la conservation des traces aide à porter plainte",
          "journaux d'accès conservés, procédure de gestion des incidents",
        ),
        entry(
          "Code de la propriété intellectuelle",
          "utilisation de logiciels sous licence valide, respect des droits sur les contenus",
          "inventaire des applications et de leurs licences",
        ),
        entry(
          "Code de commerce, article L123-22",
          "conservation des documents comptables pendant 10 ans",
          "plan de sauvegarde et durées de conservation",
        ),
        a.hasDevelopment &&
          entry(
            "Loi pour la confiance dans l'économie numérique (LCEN)",
            "mentions légales sur le site et l'application, identification de l'hébergeur",
            "[pages de mentions légales et conditions d'utilisation]",
          ),
      ].filter((x): x is string => !!x);
      return [
        {
          heading: "Objet",
          blocks: [
            p(`Ce registre recense les obligations qui s'imposent à ${c.org} en matière de sécurité de l'information et indique comment elles sont respectées. Il est revu chaque année et à chaque évolution réglementaire ou nouveau contrat important.`),
            p("Ce document ne constitue pas un avis juridique : faites-le relire par votre conseil si nécessaire."),
          ],
        },
        { heading: "Exigences identifiées", blocks: [steps(...items)] },
        {
          heading: "Veille",
          blocks: [
            p(`Responsable de la veille : ${c.referent}. Sources suivies : site de la CNIL, site de l'ANSSI et cyber.gouv.fr, informations transmises par l'expert-comptable, l'avocat ou les organisations professionnelles.`),
            p("Autres exigences propres à l'activité (agréments, normes sectorielles, données de santé…) : [à compléter]."),
          ],
        },
      ];
    },
  },
  {
    slug: "liste-documents",
    title: "Liste des documents du système de management",
    summary: "Chaque document avec sa date de validation, sa prochaine revue et son responsable (ISO 27001 §7.5).",
    controlIds: ["SMSI.7.5"],
    signer: "direction",
    render: (ws) => {
      const c = ctx(ws);
      const rows = DOC_TEMPLATES.filter((t) => t.slug !== "liste-documents").map((t) => {
        const ev = ws.evidences.find((e) => e.controlId === t.controlIds[0] && e.title === t.title);
        return ev
          ? `${t.title} — validé le ${formatDate(ev.addedAt)}${ev.validUntil ? `, à revoir avant le ${formatDate(ev.validUntil)}` : ""} ; preuve : ${t.controlIds[0]}.`
          : `${t.title} — à rédiger ou à faire valider.`;
      });
      return [
        {
          heading: "Règles de gestion",
          blocks: [
            list(
              "Chaque document porte un titre, une date de validation et le nom de la personne qui l'a approuvé.",
              "Les documents sont revus au moins une fois par an ; la version précédente est conservée.",
              "Les documents sont accessibles aux personnes concernées et protégés contre les modifications non autorisées.",
              `Responsable de la liste : ${c.referent}.`,
            ),
          ],
        },
        { heading: "Documents", blocks: [list(...rows)] },
        {
          heading: "Registres tenus dans l'outil",
          blocks: [
            list(
              `Inventaire des actifs : ${ws.assets.length} actif${ws.assets.length > 1 ? "s" : ""}.`,
              `Registre des risques : ${ws.risks.length} risque${ws.risks.length > 1 ? "s" : ""}.`,
              `Registre des incidents : ${ws.incidents.length} incident${ws.incidents.length > 1 ? "s" : ""}.`,
              `Registre des fournisseurs : ${ws.suppliers.length} fournisseur${ws.suppliers.length > 1 ? "s" : ""}.`,
              `Registre de sensibilisation : ${ws.trainings.length} formation${ws.trainings.length > 1 ? "s" : ""}.`,
              "Déclaration d'applicabilité et journal d'activité, mis à jour en continu.",
            ),
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
