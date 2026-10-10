// Inventaire des actifs (ISO 27001 A.5.9, A.5.10, A.5.12 ; NIS2 art. 21 §2 i).
// Ce qu'il faut protéger : données, applications, services en ligne, matériel, locaux.

import type { ScopingAnswers } from "./scoping";
import type { Supplier } from "./suppliers";

export type AssetCategory = "donnees" | "application" | "service" | "materiel" | "locaux";
export type Classification = "public" | "interne" | "confidentiel" | "sensible";

export const CATEGORY_LABELS: Record<AssetCategory, string> = {
  donnees: "Données",
  application: "Application ou logiciel",
  service: "Service en ligne",
  materiel: "Matériel",
  locaux: "Locaux",
};

export const CATEGORY_PLURAL: Record<AssetCategory, string> = {
  donnees: "Données",
  application: "Applications et logiciels",
  service: "Services en ligne",
  materiel: "Matériel",
  locaux: "Locaux",
};

export const CLASSIFICATION_LABELS: Record<Classification, string> = {
  public: "Public",
  interne: "Interne",
  confidentiel: "Confidentiel",
  sensible: "Sensible",
};

export const CLASSIFICATION_HELP: Record<Classification, string> = {
  public: "Peut être diffusé à tous sans conséquence (site web, plaquette).",
  interne: "Réservé à l'organisation ; une fuite serait gênante sans plus.",
  confidentiel: "Réservé aux personnes concernées ; une fuite causerait un préjudice (contrats, chiffres, code source).",
  sensible: "Données personnelles, de santé, bancaires ou secrets d'affaires : une fuite aurait des conséquences graves ou légales.",
};

export interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  description: string;
  owner: string | null;
  classification: Classification;
  /** l'activité s'arrête si cet actif est indisponible */
  essential: boolean;
  personalData: boolean;
  location: string; // hébergement, bureau, éditeur…
  supplierId: string | null;
  reviewedAt: string | null; // ISO
  createdAt: string; // ISO
}

export type AssetDraft = Omit<Asset, "id" | "createdAt" | "reviewedAt">;

const draft = (
  name: string,
  category: AssetCategory,
  description: string,
  classification: Classification,
  extra: Partial<AssetDraft> = {},
): AssetDraft => ({
  name,
  category,
  description,
  classification,
  owner: null,
  essential: false,
  personalData: false,
  location: "",
  supplierId: null,
  ...extra,
});

/** Actifs habituels selon le cadrage : point de départ à ajuster. */
export function suggestedAssets(a: ScopingAnswers): AssetDraft[] {
  const out: AssetDraft[] = [
    draft("Messagerie et agendas", "service", "Emails, agendas et contacts de l'équipe", "confidentiel", { essential: true, personalData: true }),
    draft("Documents de gestion", "donnees", "Contrats, devis, factures, documents comptables", "confidentiel"),
    draft("Ordinateurs de l'équipe", "materiel", "Postes fixes et portables", "interne", { essential: true }),
    draft("Téléphones professionnels", "materiel", "Smartphones utilisés pour la messagerie et la double authentification", "interne"),
    draft("Sauvegardes", "donnees", "Copies de sauvegarde des données importantes", "confidentiel", { essential: true }),
    draft("Comptes bancaires en ligne", "service", "Accès à la banque et aux paiements", "sensible", { essential: true }),
  ];
  if (a.handlesPersonalData) {
    out.push(draft("Données clients", "donnees", "Coordonnées, historique, échanges avec les clients", "sensible", { essential: true, personalData: true }));
  }
  if (a.headcount !== "1") {
    out.push(draft("Dossiers du personnel", "donnees", "Contrats de travail, paie, évaluations", "sensible", { personalData: true }));
  }
  if (a.hasDevelopment) {
    out.push(
      draft("Code source", "donnees", "Dépôts de code de l'application", "confidentiel", { essential: true, location: "GitHub, GitLab…" }),
      draft("Application en production", "application", "L'application utilisée par les clients", "confidentiel", { essential: true, personalData: a.handlesPersonalData }),
      draft("Base de données de production", "donnees", "Données des clients stockées par l'application", "sensible", { essential: true, personalData: a.handlesPersonalData }),
      draft("Hébergement et infrastructure", "service", "Serveurs, base de données et stockage chez l'hébergeur", "confidentiel", { essential: true }),
      draft("Secrets et clés d'API", "donnees", "Mots de passe techniques, clés de service, certificats", "sensible", { essential: true }),
    );
  }
  if (a.usesCloud && !a.hasDevelopment) {
    out.push(draft("Stockage de fichiers en ligne", "service", "Drive partagé, OneDrive, Dropbox…", "confidentiel", { essential: true }));
  }
  if (a.hasPremises) {
    out.push(
      draft("Locaux", "locaux", "Bureaux, atelier, entrepôt", "interne", { essential: true }),
      draft("Réseau et box internet", "materiel", "Box, Wi-Fi, routeur, pare-feu", "interne", { essential: true }),
    );
  }
  return out;
}

export type AssetIssue = "sans_proprietaire" | "revue_a_faire" | "service_sans_fournisseur";

export const ASSET_ISSUE_LABELS: Record<AssetIssue, string> = {
  sans_proprietaire: "Pas de responsable",
  revue_a_faire: "Revue annuelle à faire",
  service_sans_fournisseur: "Fournisseur non renseigné",
};

export function assetIssues(x: Asset, now = new Date()): AssetIssue[] {
  const issues: AssetIssue[] = [];
  if (!x.owner?.trim()) issues.push("sans_proprietaire");
  const ref = x.reviewedAt ?? x.createdAt;
  if ((now.getTime() - new Date(ref).getTime()) / 86_400_000 > 365) issues.push("revue_a_faire");
  if (x.category === "service" && x.essential && !x.supplierId) issues.push("service_sans_fournisseur");
  return issues;
}

/** Nombre minimal d'actifs pour qu'un inventaire soit crédible devant un auditeur. */
export const MIN_ASSETS = 5;

export function inventoryReady(assets: Asset[], now = new Date()): boolean {
  return assets.length >= MIN_ASSETS && assets.every((x) => !assetIssues(x, now).includes("sans_proprietaire"));
}

const SUPPLIER_HINTS: [RegExp, RegExp][] = [
  [/h[ée]berg|infrastructure|base de donn[ée]es de production|application en production/i, /h[ée]berg|cloud|infra|serveur|aws|azure|scaleway|ovh|gcp|vercel|supabase/i],
  [/messagerie|agenda/i, /messag|365|microsoft|google|workspace|mail/i],
  [/sauvegarde/i, /sauvegard|backup/i],
  [/stockage de fichiers/i, /drive|dropbox|onedrive|stockage|365|google/i],
  [/compta|paie/i, /compta|paie|expert/i],
];

/** Fournisseur probable d'un actif, d'après les noms et services déjà saisis. */
export function guessSupplier(asset: Pick<AssetDraft, "name">, suppliers: Pick<Supplier, "id" | "name" | "service">[]): string | null {
  for (const [assetRe, supplierRe] of SUPPLIER_HINTS) {
    if (!assetRe.test(asset.name)) continue;
    const match = suppliers.find((s) => supplierRe.test(`${s.name} ${s.service}`));
    if (match) return match.id;
  }
  return null;
}
