# Conformité ISO 27001 + NIS2

SaaS de conformité continue pour les TPE/PME, en particulier non-tech (industrie, santé, négoce, BTP) et éditeurs SaaS qui doivent prouver leur sécurité à leurs clients.

Nom de produit provisoire : modifiable dans `src/lib/config.ts`.

## État actuel

| Partie | État |
|---|---|
| Catalogue : 109 contrôles couvrant les 130 exigences ISO 27001:2022 (clauses 4 à 10 + 93 mesures de l'annexe A) et NIS2 (art. 20, 21, 23, 27) | Fait, vérifié par `npm run check:catalog` |
| Questionnaire de cadrage + estimation NIS2 (essentielle / importante / effet cascade / hors champ) | Fait |
| Applicabilité automatique des contrôles avec justification des exclusions | Fait |
| Tableau de bord (anneau de contrôles, score prouvé, alertes, prochaines actions) | Fait |
| Fiches contrôle (statut, responsable, échéance, notes, preuves avec date de validité, revue) | Fait |
| Déclaration d'applicabilité (SoA) + export CSV | Fait |
| Vue NIS2 par obligation | Fait |
| Journal d'activité | Fait |
| Registre des risques : matrice probabilité × impact, 12 risques types pour TPE/PME, lien vers les contrôles qui les réduisent | Fait |
| Incidents : registre, échéances NIS2 24 h / 72 h / 1 mois avec décompte, retour d'expérience | Fait |
| 12 modèles prêts à signer, pré-remplis avec les données réelles : politique de sécurité, périmètre du SMSI, méthode d'appréciation des risques, objectifs de sécurité, liste des documents, politique de contrôle d'accès, registre des exigences légales, charte informatique, procédure incident, plan de sauvegarde, plan de continuité, revue de direction. Imprimables en PDF, enregistrés comme preuve une fois signés. Chaque document exigé à l'étape 1 de l'audit a un modèle ou un écran dédié | Fait |
| Inventaire des actifs : suggestions selon le profil, responsable et sensibilité par actif, attribution groupée, lien automatique vers le fournisseur, revue annuelle, alimente le registre des risques et le périmètre | Fait |
| Fiche sécurité pour les clients : réponses aux questions habituelles des questionnaires sécurité, tirées de l'état réel des contrôles (sans jamais affirmer plus que ce qui est prouvé), à imprimer ou copier en texte | Fait |
| Dossier d'audit complet (synthèse, SoA, gouvernance, preuves, actifs, risques, incidents, fournisseurs, sensibilisation, journal), exportable en PDF | Fait |
| Préparation à la certification : audit blanc (écarts majeurs, mineurs, observations avec actions à mener), documents exigés par la norme, parcours jusqu'au certificat, verdict étape 1 / étape 2, rapport imprimable | Fait |
| Registre des fournisseurs : criticité, données confiées, clauses et accord RGPD, questionnaire sécurité de 12 questions à copier et envoyer, score des réponses et points bloquants | Fait |
| Sensibilisation des équipes : quiz de 10 situations (réussite à 8/10), sessions collectives et formations externes, registre, attestation imprimable valable un an, preuve ajoutée automatiquement (A.6.3, §7.3, NIS2 art. 20 pour les dirigeants) | Fait |
| Tests automatiques (`npm test`, 57 tests : calculs métier, modèles de documents, fiche clients, conversion et synchronisation Supabase) | Fait |
| Schéma Supabase (15 tables, RLS, RPC de création d'organisation, bucket de preuves privé, vue d'alertes) | Écrit et testé sur PostgreSQL 16 (isolation entre organisations vérifiée), **pas encore appliqué** |
| Branchement Supabase : connexion par lien magique, proxy de session, lecture de l'espace, enregistrement différentiel de chaque modification, envoi des fichiers de preuve dans le stockage privé, import de l'espace de démo | Code prêt, **s'active dès que les variables d'environnement sont renseignées** |

Sans variables Supabase, l'appli fonctionne en **mode démo** : tout est enregistré dans le navigateur (localStorage). Les intitulés ISO sont reformulés en français ; le texte de la norme n'est pas reproduit.

## Direction artistique

Interface en noir et blanc (Public Sans, fonds blanc et gris très clair, actions en noir). La couleur est réservée aux données : vert (conforme), ambre (en cours), gris (à faire), rouge (critique), et l'échelle vert → rouge de la matrice des risques. Palette de statuts vérifiée pour le daltonisme. Les jetons sont dans `src/app/globals.css`.

## Démarrer en local

```bash
npm install
npm run dev          # http://localhost:3000
```

Scripts utiles :

```bash
npm test                # tests des calculs (statut NIS2, applicabilité, score, alertes, échéances)
npm run check:catalog   # vérifie que chaque exigence est couverte et qu'aucun id n'est cassé
npm run seed:generate   # régénère supabase/seed.sql depuis le catalogue TypeScript
```

## Brancher Supabase (quand le projet Pro est créé)

1. **Créer le projet** dans la région Europe (Paris `eu-west-3` ou Francfort `eu-central-1`) : les données de conformité de vos clients restent dans l'UE.
2. **Appliquer le schéma**, dans l'ordre, depuis l'éditeur SQL ou avec `supabase db push` :
   `20261006000000_init.sql`, `20261007000000_suppliers.sql`, `20261008000000_trainings.sql`, `20261009000000_sync.sql`, `20261010000000_assets.sql`, puis `supabase/seed.sql` (catalogue).
3. **Authentification** (Authentication → URL Configuration) : *Site URL* = l'adresse de l'appli, et ajouter `https://<votre-domaine>/auth/callback` (et `http://localhost:3000/auth/callback` pour le développement) dans les *Redirect URLs*. Fournisseur Email activé ; configurer un SMTP (Resend, Brevo…) pour ne pas dépendre de la limite d'envoi par défaut.
4. **Variables** : copier `.env.example` en `.env.local` et renseigner `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clé publique ; jamais la clé `service_role`).
5. **Premier lancement** : se connecter avec son email ; si un espace de démo existe dans le navigateur, l'écran de cadrage propose de le reprendre tel quel.

Fonctionnement : le store (`src/lib/store.tsx`) garde la même interface dans les deux modes. En mode Supabase, chaque changement d'état est comparé au précédent (`src/lib/supabase/sync.ts`) et seules les lignes modifiées sont envoyées ; en cas d'échec, l'espace est rechargé depuis la base. Le proxy (`src/proxy.ts`) rafraîchit la session et redirige vers `/connexion` toute page de l'espace sans session valide.

Le catalogue TypeScript reste la source unique : toute modification passe par `src/lib/catalog/` puis `npm run seed:generate`.

## Certification : qui fait quoi

- Le certificat ISO 27001 est délivré par un organisme certificateur accrédité (en France par le COFRAC) : AFNOR Certification, Bureau Veritas, BSI, LRQA, SGS…
- Cet outil ne certifie pas et ne pourra pas certifier : la norme ISO/IEC 17021-1 interdit à un organisme de certifier une entreprise qu'il a accompagnée (au moins deux ans d'écart). Le rôle de l'outil est de préparer et de produire le dossier d'audit.
- Piste commerciale : partenariats d'apport d'affaires avec des organismes certificateurs ou des auditeurs, sans lien capitalistique.
- NIS2 ne donne pas lieu à un certificat : la conformité est contrôlée par l'ANSSI.

## Positionnement face à Formalize

Formalize est une plateforme GRC généraliste (8 000+ clients, 80 pays, ISO 27001, NIS2, DORA, RGPD, lanceurs d'alerte), orientée mid-market et grands comptes, avec prix sur devis.

| | Formalize | Ici |
|---|---|---|
| Cible | Équipes conformité / sécurité, mid-market et enterprise | Dirigeant ou référent de TPE/PME sans expert sécurité |
| Prix | Sur devis, facturation annuelle | Public : 150 / 375 / ≈830 €/mois |
| Démarrage | Démo commerciale, onboarding accompagné | Cadrage en 6 écrans, plan personnalisé immédiat |
| NIS2 | Module de gestion des obligations | Estimation du statut (dont effet cascade fournisseur), obligations non applicables écartées automatiquement |
| Applicabilité | Paramétrage manuel | Exclusions déduites du cadrage avec justification pré-rédigée pour la SoA |
| Langage | Texte de la norme sous licence | Chaque contrôle expliqué en langage clair |
| Preuves | Centralisées, intégrations Jira, M365… | Preuves de terrain (papier scanné, photo) avec date de validité et alerte avant expiration |
| Score | Avancement des tâches | Score « prouvé » : un contrôle ne compte à 100 % qu'avec une preuve valide |

## Prochaines étapes

1. Supabase : invitations de membres (dont rôle auditeur en lecture seule), choix entre plusieurs organisations, synchronisation en temps réel entre plusieurs personnes.
2. Liens publics sans compte : questionnaire à remplir par les fournisseurs, quiz de sensibilisation à envoyer à chaque salarié.
3. Rappels par email (preuves qui expirent, échéances) via une tâche planifiée sur la vue `org_alerts`.
4. Référentiel ReCyF de l'ANSSI en correspondance avec les contrôles existants.
5. Modèles pour les documents de l'étape 2 encore sans modèle : programme d'audit interne (§9.2), registre des non-conformités et actions correctives (§10.2), indicateurs de surveillance (§9.1), matrice de compétences (§7.2).
6. Fiche sécurité publiable par lien (page « confiance » à partager avec les clients), une fois Supabase branché.
