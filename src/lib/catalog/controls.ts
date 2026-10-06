// Catalogue unifié des contrôles.
// Principe : un contrôle = une action concrète, qui couvre une ou plusieurs
// exigences (ISO 27001 et/ou NIS2). On le met en œuvre une seule fois, on
// fournit une seule preuve, et elle compte pour tous les référentiels.

import { ISO_ANNEX_A } from "./frameworks";
import type { ApplicabilityTag, Control, Priority, Theme } from "./types";

type Nis2Key =
  | "20.1" | "20.2" | "21.2.a" | "21.2.b" | "21.2.c" | "21.2.d" | "21.2.e"
  | "21.2.f" | "21.2.g" | "21.2.h" | "21.2.i" | "21.2.j" | "23" | "27";

interface AnnexDef {
  p?: Priority; // défaut : standard
  tags?: ApplicabilityTag[];
  days?: number; // défaut : 365
  nis2?: Nis2Key[];
  enClair: string;
  evidence: string[];
}

const ISO_TITLE = new Map(ISO_ANNEX_A.map(([ref, title]) => [ref, title]));

const themeOf = (ref: string): Theme =>
  ref.startsWith("5.")
    ? "organisationnel"
    : ref.startsWith("6.")
      ? "humain"
      : ref.startsWith("7.")
        ? "physique"
        : "technologique";

// ---------------------------------------------------------------------------
// Annexe A — 93 mesures, réécrites "en clair" avec des preuves adaptées
// aux TPE/PME (y compris preuves papier / photo pour le terrain).
// ---------------------------------------------------------------------------
const ANNEX: Record<string, AnnexDef> = {
  "5.1": { p: "socle", nis2: ["21.2.a", "20.1"], enClair: "Écrire une politique de sécurité courte, validée et signée par la direction, et la communiquer à tous.", evidence: ["Politique de sécurité signée par le dirigeant", "Preuve de diffusion (email, affichage, accusé de lecture)"] },
  "5.2": { p: "socle", nis2: ["21.2.a"], enClair: "Désigner qui s'occupe de quoi en sécurité (référent interne, prestataire informatique, dirigeant).", evidence: ["Organigramme sécurité ou fiche de poste du référent", "Contrat du prestataire informatique précisant son rôle"] },
  "5.3": { tags: ["salaries"], nis2: ["21.2.i"], enClair: "Éviter qu'une même personne puisse à la fois demander, valider et exécuter une action sensible (ex. paiement, droits d'accès).", evidence: ["Matrice des validations (qui demande / qui valide)", "Extrait de paramétrage des droits dans les outils"] },
  "5.4": { nis2: ["20.1"], enClair: "La direction s'assure que chacun applique les règles de sécurité et y consacre les moyens nécessaires.", evidence: ["Compte rendu de réunion de direction mentionnant la sécurité", "Budget ou plan d'action validé"] },
  "5.5": { nis2: ["21.2.b"], enClair: "Savoir qui contacter en cas d'incident : ANSSI/CERT-FR, CNIL, police/gendarmerie, cybermalveillance.gouv.fr.", evidence: ["Fiche des contacts d'urgence à jour", "Procédure indiquant quand contacter chaque autorité"] },
  "5.6": { enClair: "Suivre au moins une source spécialisée (CERT-FR, CLUSIF, fédération professionnelle) pour rester informé.", evidence: ["Abonnement à une lettre d'alerte (capture)", "Participation à un club ou groupe métier"] },
  "5.7": { nis2: ["21.2.e"], enClair: "Surveiller les menaces qui concernent votre activité (alertes CERT-FR, fournisseurs) et en tenir compte.", evidence: ["Journal des alertes reçues et des suites données", "Abonnement aux bulletins de sécurité des éditeurs utilisés"] },
  "5.8": { nis2: ["21.2.e"], enClair: "Intégrer une question sécurité dans chaque nouveau projet (nouvel outil, nouveau site, nouvelle machine connectée).", evidence: ["Check-list sécurité projet remplie", "Compte rendu de lancement de projet"] },
  "5.9": { p: "socle", nis2: ["21.2.i"], enClair: "Tenir une liste à jour de vos équipements, logiciels et données importantes, avec un responsable pour chacun.", evidence: ["Inventaire des actifs (tableur ou export outil)", "Date de dernière mise à jour de l'inventaire"] },
  "5.10": { nis2: ["21.2.g", "21.2.i"], enClair: "Fixer les règles d'usage des outils (ordinateurs, messagerie, Internet) dans une charte connue de tous.", evidence: ["Charte informatique signée", "Annexe au règlement intérieur"] },
  "5.11": { tags: ["salaries"], nis2: ["21.2.i"], enClair: "Récupérer le matériel, les badges et les clés quand quelqu'un quitte l'entreprise.", evidence: ["Check-list de départ signée", "Registre de remise du matériel"] },
  "5.12": { nis2: ["21.2.i"], enClair: "Classer les informations selon leur sensibilité (publique, interne, confidentielle).", evidence: ["Règle de classification documentée", "Exemples de documents classés"] },
  "5.13": { enClair: "Indiquer visiblement la sensibilité d'un document (mention « Confidentiel », dossier dédié…).", evidence: ["Modèle de document avec mention de classification", "Photo d'un classeur étiqueté"] },
  "5.14": { nis2: ["21.2.j", "21.2.h"], enClair: "Encadrer l'envoi d'informations (emails, clés USB, transferts de fichiers) pour éviter les fuites.", evidence: ["Règle d'échange de fichiers sensibles", "Outil de transfert sécurisé utilisé (capture)"] },
  "5.15": { p: "socle", nis2: ["21.2.i"], enClair: "Définir qui a accès à quoi, selon le besoin réel de chacun.", evidence: ["Politique de contrôle d'accès", "Tableau des droits par fonction"] },
  "5.16": { nis2: ["21.2.i"], enClair: "Un compte nominatif par personne, créé à l'arrivée et supprimé au départ.", evidence: ["Liste des comptes actifs comparée à la liste du personnel", "Procédure arrivée/départ"] },
  "5.17": { p: "socle", nis2: ["21.2.i", "21.2.j"], enClair: "Des mots de passe solides, jamais partagés, stockés dans un gestionnaire de mots de passe.", evidence: ["Règle de mots de passe", "Capture du gestionnaire de mots de passe déployé"] },
  "5.18": { days: 180, nis2: ["21.2.i"], enClair: "Revoir régulièrement les droits d'accès et retirer ceux qui ne servent plus.", evidence: ["Compte rendu de revue des accès daté", "Liste des droits retirés"] },
  "5.19": { p: "socle", nis2: ["21.2.d"], enClair: "Identifier vos fournisseurs critiques (informatique, hébergement, maintenance) et les risques qu'ils représentent.", evidence: ["Liste des fournisseurs critiques", "Questionnaire sécurité rempli par les fournisseurs"] },
  "5.20": { nis2: ["21.2.d"], enClair: "Prévoir des clauses de sécurité et de confidentialité dans les contrats fournisseurs.", evidence: ["Contrats avec clauses sécurité", "Accord de sous-traitance RGPD signé"] },
  "5.21": { nis2: ["21.2.d"], enClair: "S'assurer que le matériel et les logiciels achetés viennent de sources fiables et sont maintenus.", evidence: ["Liste des fournisseurs informatiques agréés", "Contrats de maintenance"] },
  "5.22": { nis2: ["21.2.d"], enClair: "Suivre la qualité et la sécurité des services fournisseurs, et réagir en cas de changement.", evidence: ["Compte rendu de revue fournisseur", "Rapports de service ou certificats reçus"] },
  "5.23": { tags: ["cloud"], nis2: ["21.2.d"], enClair: "Choisir et paramétrer les services cloud (messagerie, stockage, logiciels en ligne) en connaissant les règles de sécurité.", evidence: ["Liste des services cloud utilisés et leur localisation", "Certifications des fournisseurs cloud (ISO 27001, HDS…)"] },
  "5.24": { p: "socle", nis2: ["21.2.b"], enClair: "Préparer à l'avance ce qu'on fait en cas d'incident : qui alerter, qui décide, quelles premières actions.", evidence: ["Procédure de gestion des incidents", "Fiche réflexe affichée ou diffusée"] },
  "5.25": { nis2: ["21.2.b"], enClair: "Savoir distinguer un simple événement d'un vrai incident, et décider de la suite.", evidence: ["Critères de qualification d'un incident", "Registre des événements analysés"] },
  "5.26": { nis2: ["21.2.b"], enClair: "Réagir à un incident selon la procédure prévue et tracer les actions menées.", evidence: ["Registre des incidents", "Compte rendu d'un incident traité"] },
  "5.27": { nis2: ["21.2.b", "21.2.f"], enClair: "Tirer les leçons de chaque incident pour éviter qu'il se reproduise.", evidence: ["Retour d'expérience rédigé", "Actions correctives issues d'un incident"] },
  "5.28": { nis2: ["21.2.b"], enClair: "Conserver les traces utiles (journaux, captures, emails) en cas d'incident, notamment pour un dépôt de plainte.", evidence: ["Procédure de conservation des preuves", "Exemple de dossier d'incident archivé"] },
  "5.29": { nis2: ["21.2.c"], enClair: "Maintenir un niveau de sécurité minimum même en situation de crise (panne, sinistre, cyberattaque).", evidence: ["Plan de continuité mentionnant la sécurité", "Mode dégradé documenté"] },
  "5.30": { p: "socle", nis2: ["21.2.c"], enClair: "Prévoir comment redémarrer l'informatique après un sinistre, et le tester.", evidence: ["Plan de reprise informatique", "Compte rendu de test de restauration"] },
  "5.31": { nis2: ["21.2.a"], enClair: "Lister les obligations légales et contractuelles de sécurité qui s'appliquent à vous (RGPD, NIS2, contrats clients).", evidence: ["Registre des exigences légales et contractuelles", "Revue annuelle datée"] },
  "5.32": { enClair: "Utiliser uniquement des logiciels et contenus dont vous avez les licences.", evidence: ["Inventaire des licences", "Factures ou contrats de licence"] },
  "5.33": { enClair: "Protéger les documents à conserver (factures, contrats, registres) contre la perte et la falsification.", evidence: ["Règle de conservation et d'archivage", "Photo/capture de l'archivage sécurisé"] },
  "5.34": { tags: ["donnees_perso"], enClair: "Respecter le RGPD pour les données personnelles (clients, salariés, fournisseurs).", evidence: ["Registre des traitements RGPD", "Mentions d'information et politique de confidentialité"] },
  "5.35": { nis2: ["21.2.f"], enClair: "Faire vérifier votre sécurité par un regard extérieur (audit, prestataire indépendant) de temps en temps.", evidence: ["Rapport d'audit externe ou de test d'intrusion", "Plan de suivi des recommandations"] },
  "5.36": { nis2: ["21.2.f"], enClair: "Vérifier que les règles internes de sécurité sont réellement appliquées.", evidence: ["Contrôles internes réalisés (check-list datée)", "Écarts relevés et actions associées"] },
  "5.37": { enClair: "Écrire les procédures importantes (sauvegarde, arrivée d'un salarié, mise à jour) pour qu'elles ne dépendent pas d'une seule personne.", evidence: ["Procédures d'exploitation documentées", "Date de dernière mise à jour"] },

  "6.1": { tags: ["salaries"], nis2: ["21.2.i"], enClair: "Vérifier, dans le respect du droit du travail, les informations des candidats à des postes sensibles.", evidence: ["Procédure de recrutement", "Check-list de vérifications réalisées"] },
  "6.2": { tags: ["salaries"], nis2: ["21.2.i"], enClair: "Inclure les obligations de sécurité et de confidentialité dans les contrats de travail.", evidence: ["Modèle de contrat avec clause de confidentialité", "Charte informatique annexée"] },
  "6.3": { p: "socle", days: 365, nis2: ["21.2.g"], enClair: "Sensibiliser tout le personnel aux bons réflexes (hameçonnage, mots de passe, verrouillage) au moins une fois par an.", evidence: ["Feuille d'émargement ou attestation de formation", "Support de sensibilisation utilisé"] },
  "6.4": { tags: ["salaries"], enClair: "Prévoir les suites en cas de manquement aux règles de sécurité (dans le règlement intérieur).", evidence: ["Règlement intérieur mentionnant la sécurité", "Charte informatique signée"] },
  "6.5": { tags: ["salaries"], nis2: ["21.2.i"], enClair: "Rappeler au départ d'un salarié qu'il reste tenu à la confidentialité, et retirer ses accès.", evidence: ["Check-list de départ signée", "Preuve de désactivation des comptes"] },
  "6.6": { nis2: ["21.2.i"], enClair: "Faire signer des accords de confidentialité aux personnes et partenaires qui accèdent à des informations sensibles.", evidence: ["Accords de confidentialité signés", "Liste des signataires"] },
  "6.7": { nis2: ["21.2.g"], enClair: "Encadrer le télétravail : poste sécurisé, connexion protégée, confidentialité à domicile.", evidence: ["Charte télétravail", "Configuration VPN ou accès sécurisé"] },
  "6.8": { p: "socle", nis2: ["21.2.b"], enClair: "Chacun sait comment et à qui signaler un comportement suspect ou un incident, sans délai.", evidence: ["Procédure de signalement diffusée", "Adresse ou canal dédié (capture)"] },

  "7.1": { tags: ["locaux"], nis2: ["21.2.i"], enClair: "Délimiter les zones à protéger (bureaux, local informatique, atelier) et leurs accès.", evidence: ["Plan des locaux avec zones", "Photos des accès sécurisés"] },
  "7.2": { tags: ["locaux"], nis2: ["21.2.i"], enClair: "Contrôler qui entre dans les locaux (clés, badges, registre des visiteurs).", evidence: ["Registre des visiteurs", "Liste des détenteurs de clés/badges"] },
  "7.3": { tags: ["locaux"], enClair: "Fermer à clé les bureaux et armoires contenant des informations ou du matériel sensibles.", evidence: ["Photo des armoires et portes verrouillées", "Règle de fermeture des locaux"] },
  "7.4": { tags: ["locaux"], enClair: "Surveiller les locaux (alarme, vidéoprotection, gardiennage) selon le niveau de risque.", evidence: ["Contrat d'alarme ou de télésurveillance", "Rapport de maintenance du système"] },
  "7.5": { tags: ["locaux"], nis2: ["21.2.c"], enClair: "Protéger le matériel contre l'incendie, l'eau, la chaleur et les coupures.", evidence: ["Vérification des extincteurs", "Photo du local serveur (climatisation, onduleur)"] },
  "7.6": { tags: ["locaux"], enClair: "Fixer des règles de comportement dans les zones sensibles (pas de visiteur seul, pas de photo…).", evidence: ["Consignes affichées", "Règle d'accompagnement des visiteurs"] },
  "7.7": { p: "socle", nis2: ["21.2.g"], enClair: "Ne pas laisser de documents sensibles sur les bureaux et verrouiller son écran en s'absentant.", evidence: ["Règle bureau propre/écran verrouillé", "Paramétrage du verrouillage automatique (capture)"] },
  "7.8": { tags: ["locaux"], enClair: "Placer le matériel informatique à l'abri des regards, des chocs et des accès non autorisés.", evidence: ["Photo de l'emplacement des serveurs/équipements", "Inventaire avec localisation"] },
  "7.9": { nis2: ["21.2.i"], enClair: "Protéger les ordinateurs et téléphones utilisés à l'extérieur (chiffrement, vigilance en déplacement).", evidence: ["Liste du matériel nomade", "Preuve du chiffrement des portables"] },
  "7.10": { nis2: ["21.2.i"], enClair: "Encadrer l'usage des clés USB et disques externes, et les effacer avant mise au rebut.", evidence: ["Règle d'usage des supports amovibles", "Registre des supports"] },
  "7.11": { tags: ["locaux"], nis2: ["21.2.c"], enClair: "Assurer l'alimentation électrique et les services nécessaires au matériel (onduleur, climatisation).", evidence: ["Contrat de maintenance onduleur", "Test de bascule sur onduleur"] },
  "7.12": { tags: ["locaux"], enClair: "Protéger les câbles réseau et électriques contre les dommages et les branchements pirates.", evidence: ["Photo de la baie de brassage fermée", "Plan de câblage"] },
  "7.13": { nis2: ["21.2.e"], enClair: "Entretenir le matériel selon les recommandations du fabricant, avec des intervenants autorisés.", evidence: ["Contrats et rapports de maintenance", "Registre des interventions"] },
  "7.14": { nis2: ["21.2.i"], enClair: "Effacer de manière sûre les données avant de jeter, vendre ou réattribuer un équipement.", evidence: ["Certificat de destruction ou d'effacement", "Registre de sortie du matériel"] },

  "8.1": { p: "socle", nis2: ["21.2.g"], enClair: "Sécuriser les ordinateurs et téléphones : mises à jour, antivirus, verrouillage, chiffrement.", evidence: ["Liste des postes avec état de sécurité", "Capture de la console de gestion des postes"] },
  "8.2": { p: "socle", days: 180, nis2: ["21.2.i"], enClair: "Limiter les comptes administrateurs au strict nécessaire et les surveiller.", evidence: ["Liste des comptes administrateurs", "Revue des comptes à privilèges datée"] },
  "8.3": { nis2: ["21.2.i"], enClair: "Chacun n'accède qu'aux dossiers et applications dont il a besoin.", evidence: ["Paramétrage des droits sur les partages", "Tableau des droits par fonction"] },
  "8.4": { tags: ["dev"], enClair: "Protéger l'accès au code source (dépôt privé, droits limités, historique).", evidence: ["Capture des droits du dépôt de code", "Liste des personnes ayant accès"] },
  "8.5": { p: "socle", nis2: ["21.2.j"], enClair: "Activer la double authentification (MFA) sur la messagerie, les accès à distance et les outils critiques.", evidence: ["Capture de l'activation MFA", "Liste des services protégés par MFA"] },
  "8.6": { enClair: "Surveiller l'espace disque, la puissance et les ressources pour éviter les saturations.", evidence: ["Tableau de suivi des capacités", "Alertes de supervision"] },
  "8.7": { p: "socle", nis2: ["21.2.g"], enClair: "Installer et maintenir à jour un antivirus/EDR sur tous les postes et serveurs.", evidence: ["Console antivirus montrant les postes protégés", "Rapport de détection récent"] },
  "8.8": { p: "socle", days: 90, nis2: ["21.2.e"], enClair: "Appliquer rapidement les mises à jour de sécurité et suivre les failles connues.", evidence: ["Rapport de mises à jour appliquées", "Scan de vulnérabilités daté"] },
  "8.9": { nis2: ["21.2.e"], enClair: "Configurer les équipements de façon sécurisée et garder une trace de ces réglages.", evidence: ["Fiches de configuration de référence", "Capture des paramètres de sécurité"] },
  "8.10": { tags: ["donnees_perso"], nis2: ["21.2.i"], enClair: "Supprimer les données dont vous n'avez plus besoin, dans les délais prévus.", evidence: ["Durées de conservation définies", "Preuve de purge réalisée"] },
  "8.11": { tags: ["dev"], enClair: "Masquer ou anonymiser les données sensibles quand leur affichage complet n'est pas nécessaire.", evidence: ["Règles de masquage", "Capture d'un écran avec données masquées"] },
  "8.12": { enClair: "Limiter les risques de fuite de données (envois externes, partages publics, impressions).", evidence: ["Paramétrage des partages externes", "Règle de prévention des fuites"] },
  "8.13": { p: "socle", days: 90, nis2: ["21.2.c"], enClair: "Sauvegarder régulièrement les données, en garder une copie hors ligne et tester la restauration.", evidence: ["Rapport de sauvegarde récent", "Compte rendu de test de restauration"] },
  "8.14": { nis2: ["21.2.c"], enClair: "Doubler les éléments indispensables (connexion, serveur, stockage) pour éviter un arrêt total.", evidence: ["Schéma de l'infrastructure redondante", "Contrat de secours (4G, second lien)"] },
  "8.15": { nis2: ["21.2.b"], enClair: "Conserver les journaux d'événements importants (connexions, erreurs, actions d'administration).", evidence: ["Paramétrage de la journalisation", "Extrait de journal"] },
  "8.16": { nis2: ["21.2.b"], enClair: "Surveiller les systèmes pour détecter les comportements anormaux.", evidence: ["Alertes de supervision configurées", "Rapport de surveillance"] },
  "8.17": { enClair: "Régler tous les équipements sur la même heure de référence, pour des journaux cohérents.", evidence: ["Paramétrage NTP (capture)"] },
  "8.18": { enClair: "Réserver les outils système puissants aux administrateurs.", evidence: ["Liste des outils restreints", "Paramétrage des restrictions"] },
  "8.19": { nis2: ["21.2.e"], enClair: "Contrôler l'installation de logiciels sur les postes et serveurs.", evidence: ["Règle d'installation des logiciels", "Liste des logiciels autorisés"] },
  "8.20": { nis2: ["21.2.j"], enClair: "Protéger le réseau : pare-feu, Wi-Fi sécurisé, accès distants maîtrisés.", evidence: ["Schéma réseau", "Configuration du pare-feu et du Wi-Fi"] },
  "8.21": { nis2: ["21.2.j"], enClair: "Exiger un niveau de sécurité des fournisseurs réseau (box, opérateur, VPN).", evidence: ["Contrat opérateur avec engagements", "Paramètres de sécurité des services réseau"] },
  "8.22": { enClair: "Séparer les réseaux (invités, production, bureautique, machines) pour limiter la propagation d'une attaque.", evidence: ["Schéma des réseaux séparés", "Capture du Wi-Fi invité isolé"] },
  "8.23": { nis2: ["21.2.g"], enClair: "Bloquer l'accès aux sites web dangereux.", evidence: ["Configuration du filtrage web", "Rapport de sites bloqués"] },
  "8.24": { p: "socle", nis2: ["21.2.h"], enClair: "Chiffrer les données sensibles (disques des portables, sauvegardes, échanges) et protéger les clés.", evidence: ["Preuve du chiffrement des disques", "Règle d'usage du chiffrement"] },
  "8.25": { tags: ["dev"], nis2: ["21.2.e"], enClair: "Intégrer la sécurité à chaque étape du développement logiciel.", evidence: ["Processus de développement documenté", "Revue de sécurité d'une fonctionnalité"] },
  "8.26": { tags: ["dev"], nis2: ["21.2.e"], enClair: "Définir les exigences de sécurité de vos applications avant de les développer ou de les acheter.", evidence: ["Exigences sécurité dans un cahier des charges", "Ticket de spécification avec critères sécurité"] },
  "8.27": { tags: ["dev"], nis2: ["21.2.e"], enClair: "Concevoir les systèmes selon des principes de sécurité reconnus (moindre privilège, défense en profondeur).", evidence: ["Schéma d'architecture", "Principes de conception documentés"] },
  "8.28": { tags: ["dev"], nis2: ["21.2.e"], enClair: "Appliquer les bonnes pratiques de code sécurisé (validation des entrées, dépendances à jour).", evidence: ["Règles de codage", "Rapport d'analyse de code ou de dépendances"] },
  "8.29": { tags: ["dev"], nis2: ["21.2.e", "21.2.f"], enClair: "Tester la sécurité avant chaque mise en production.", evidence: ["Résultats de tests de sécurité", "Rapport de test d'intrusion"] },
  "8.30": { tags: ["dev"], nis2: ["21.2.d", "21.2.e"], enClair: "Encadrer et contrôler la sécurité quand le développement est confié à un prestataire.", evidence: ["Contrat de développement avec exigences sécurité", "Recette sécurité du livrable"] },
  "8.31": { tags: ["dev"], nis2: ["21.2.e"], enClair: "Séparer les environnements de développement, de test et de production.", evidence: ["Schéma des environnements", "Droits d'accès à la production"] },
  "8.32": { nis2: ["21.2.e"], enClair: "Préparer, valider et tracer les changements importants sur les systèmes.", evidence: ["Registre des changements", "Exemple de changement validé"] },
  "8.33": { tags: ["dev"], enClair: "Ne pas utiliser de vraies données sensibles pour les tests, ou les protéger.", evidence: ["Règle sur les données de test", "Jeu de données anonymisé"] },
  "8.34": { enClair: "Organiser les audits techniques pour qu'ils ne perturbent pas l'activité.", evidence: ["Planning d'audit validé", "Accès temporaire accordé et retiré"] },
};

// ---------------------------------------------------------------------------
// Contrôles de gouvernance (clauses 4 à 10 de l'ISO) et spécifiques NIS2.
// ---------------------------------------------------------------------------
const GOVERNANCE: Omit<Control, "sort">[] = [
  { id: "SMSI.4", title: "Contexte et périmètre du SMSI", theme: "gouvernance", priority: "socle", tags: [], reviewDays: 365, covers: ["iso27001:4.1", "iso27001:4.2", "iso27001:4.3", "iso27001:4.4"], enClair: "Décrire votre activité, vos parties prenantes (clients, autorités…) et ce que couvre votre démarche de sécurité.", evidence: ["Note de contexte et de périmètre", "Liste des parties intéressées et de leurs attentes"] },
  { id: "SMSI.5", title: "Engagement de la direction et politique", theme: "gouvernance", priority: "socle", tags: [], reviewDays: 365, covers: ["iso27001:5.1", "iso27001:5.2", "nis2:20.1"], enClair: "La direction porte la démarche, approuve la politique et les moyens, et en rend compte.", evidence: ["Politique signée par la direction", "Décision de lancement de la démarche"] },
  { id: "SMSI.5.3", title: "Rôles et responsabilités du SMSI", theme: "gouvernance", priority: "socle", tags: [], reviewDays: 365, covers: ["iso27001:5.3"], enClair: "Nommer un responsable de la démarche et préciser qui rend compte à la direction.", evidence: ["Lettre de nomination du responsable sécurité", "Organigramme du SMSI"] },
  { id: "SMSI.6.1", title: "Appréciation et traitement des risques", theme: "gouvernance", priority: "socle", tags: [], reviewDays: 365, covers: ["iso27001:6.1", "iso27001:8.2", "iso27001:8.3", "nis2:21.2.a"], enClair: "Lister ce qui pourrait mal tourner, évaluer la gravité et la probabilité, et décider quoi faire pour chaque risque.", evidence: ["Registre des risques", "Plan de traitement des risques validé"] },
  { id: "SMSI.SOA", title: "Déclaration d'applicabilité", theme: "gouvernance", priority: "socle", tags: [], reviewDays: 365, covers: ["iso27001:6.1"], enClair: "Le document qui liste toutes les mesures de l'annexe A, dit lesquelles vous appliquez et justifie les exclusions. Il est généré automatiquement par l'outil.", evidence: ["Déclaration d'applicabilité exportée et signée"] },
  { id: "SMSI.6.2", title: "Objectifs de sécurité", theme: "gouvernance", priority: "standard", tags: [], reviewDays: 365, covers: ["iso27001:6.2", "iso27001:6.3"], enClair: "Fixer quelques objectifs mesurables (ex. 100 % des postes à jour) et planifier les changements.", evidence: ["Tableau des objectifs avec indicateurs", "Plan d'action daté"] },
  { id: "SMSI.7", title: "Ressources, compétences et communication", theme: "gouvernance", priority: "standard", tags: [], reviewDays: 365, covers: ["iso27001:7.1", "iso27001:7.2", "iso27001:7.4"], enClair: "Vérifier que les personnes impliquées ont le temps et les compétences, et organiser la communication sur la sécurité.", evidence: ["Matrice de compétences", "Plan de communication interne"] },
  { id: "SMSI.7.3", title: "Sensibilisation au SMSI", theme: "gouvernance", priority: "standard", tags: [], reviewDays: 365, covers: ["iso27001:7.3"], enClair: "Chacun connaît la politique de sécurité et sait ce qu'on attend de lui.", evidence: ["Attestations de lecture de la politique"] },
  { id: "SMSI.7.5", title: "Documentation et maîtrise opérationnelle", theme: "gouvernance", priority: "standard", tags: [], reviewDays: 365, covers: ["iso27001:7.5", "iso27001:8.1"], enClair: "Tenir à jour les documents de la démarche (versions, validations) et appliquer ce qui est prévu.", evidence: ["Liste des documents avec version et date", "Historique des validations"] },
  { id: "SMSI.9.1", title: "Indicateurs et suivi", theme: "gouvernance", priority: "standard", tags: [], reviewDays: 180, covers: ["iso27001:9.1", "nis2:21.2.f"], enClair: "Suivre quelques indicateurs (score de conformité, incidents, formations) pour mesurer les progrès.", evidence: ["Tableau de bord des indicateurs (export de l'outil)"] },
  { id: "SMSI.9.2", title: "Audit interne", theme: "gouvernance", priority: "standard", tags: [], reviewDays: 365, covers: ["iso27001:9.2", "nis2:21.2.f"], enClair: "Vérifier au moins une fois par an que la démarche fonctionne, avant l'auditeur externe.", evidence: ["Programme d'audit interne", "Rapport d'audit interne"] },
  { id: "SMSI.9.3", title: "Revue de direction", theme: "gouvernance", priority: "standard", tags: [], reviewDays: 365, covers: ["iso27001:9.3", "nis2:20.1"], enClair: "Une réunion annuelle où la direction fait le point et prend des décisions sur la sécurité.", evidence: ["Compte rendu de revue de direction signé"] },
  { id: "SMSI.10", title: "Amélioration et actions correctives", theme: "gouvernance", priority: "standard", tags: [], reviewDays: 180, covers: ["iso27001:10.1", "iso27001:10.2", "nis2:21.2.f"], enClair: "Traiter les écarts constatés, corriger leurs causes et suivre les actions jusqu'au bout.", evidence: ["Registre des non-conformités et actions correctives"] },
  { id: "NIS2.20", title: "Formation des dirigeants à la cybersécurité", theme: "gouvernance", priority: "socle", tags: ["nis2"], reviewDays: 365, covers: ["nis2:20.2"], enClair: "Les dirigeants suivent une formation pour comprendre les risques cyber et les décisions qu'ils doivent prendre.", evidence: ["Attestation de formation des dirigeants"] },
  { id: "NIS2.23", title: "Notification des incidents à l'ANSSI", theme: "gouvernance", priority: "socle", tags: ["nis2"], reviewDays: 365, covers: ["nis2:23", "nis2:21.2.b"], enClair: "Savoir notifier un incident important : alerte sous 24 h, notification sous 72 h, rapport final sous 1 mois.", evidence: ["Procédure de notification", "Test ou exercice de notification réalisé"] },
  { id: "NIS2.27", title: "Enregistrement auprès de l'ANSSI", theme: "gouvernance", priority: "socle", tags: ["nis2"], reviewDays: 365, covers: ["nis2:27"], enClair: "S'enregistrer sur MonEspaceNIS2 et tenir les informations à jour.", evidence: ["Capture de l'enregistrement sur MonEspaceNIS2"] },
];

const annexControls: Omit<Control, "sort">[] = ISO_ANNEX_A.map(([ref]) => {
  const d = ANNEX[ref];
  if (!d) throw new Error(`Contrôle A.${ref} non défini dans le catalogue`);
  return {
    id: `A.${ref}`,
    title: ISO_TITLE.get(ref)!,
    enClair: d.enClair,
    theme: themeOf(ref),
    priority: d.p ?? "standard",
    tags: d.tags ?? [],
    evidence: d.evidence,
    reviewDays: d.days ?? 365,
    covers: [`iso27001:A.${ref}`, ...(d.nis2 ?? []).map((k) => `nis2:${k}`)],
  };
});

export const CONTROLS: Control[] = [...GOVERNANCE, ...annexControls].map(
  (c, i) => ({ ...c, sort: i }),
);

export const CONTROLS_BY_ID = new Map(CONTROLS.map((c) => [c.id, c]));
