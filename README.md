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
| 6 modèles prêts à signer (politique de sécurité, charte informatique, procédure incident, plan de sauvegarde, plan de continuité, revue de direction alimentée par les données réelles), imprimables en PDF, enregistrés comme preuve une fois signés | Fait |
| Dossier d'audit complet (synthèse, SoA, gouvernance, preuves, risques, incidents, journal), exportable en PDF | Fait |
| Préparation à la certification : audit blanc (écarts majeurs, mineurs, observations avec actions à mener), documents exigés par la norme, parcours jusqu'au certificat, verdict étape 1 / étape 2, rapport imprimable | Fait |
| Registre des fournisseurs : criticité, données confiées, clauses et accord RGPD, questionnaire sécurité de 12 questions à copier et envoyer, score des réponses et points bloquants | Fait |
| Tests automatiques des calculs métier (`npm test`, 32 tests) | Fait |
| Schéma Supabase (tables, RLS, RPC de création d'organisation, bucket de preuves, vue d'alertes) | Écrit et testé sur PostgreSQL 16, **pas encore appliqué** |
| Branchement Supabase (auth, lecture/écriture, dépôt réel des fichiers) | À faire dès que le projet Supabase Pro existe |

Aujourd'hui l'appli fonctionne en **mode démo** : tout est enregistré dans le navigateur (localStorage). Les intitulés ISO sont reformulés en français ; le texte de la norme n'est pas reproduit.

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

1. Appliquer `supabase/migrations/20261006000000_init.sql`, puis `supabase/seed.sql`.
2. Copier `.env.example` en `.env.local` et renseigner l'URL et la clé publique.
3. Remplacer le stockage local de `src/lib/store.tsx` par les appels Supabase (même interface).

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

1. Supabase : auth par lien magique, multi-organisations, dépôt de fichiers, invitations (dont rôle auditeur en lecture seule).
2. Lien de réponse au questionnaire pour les fournisseurs (ils répondent directement, sans compte), une fois Supabase branché.
3. Rappels par email (preuves qui expirent, échéances) via une tâche planifiée sur la vue `org_alerts`.
4. Référentiel ReCyF de l'ANSSI en correspondance avec les contrôles existants.
