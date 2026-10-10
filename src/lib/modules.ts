// Écrans de l'outil qui permettent de traiter un contrôle donné.

export interface ModuleLink {
  href: string;
  label: string;
  detail: string;
}

const ACTIFS: ModuleLink = { href: "/actifs", label: "Inventaire des actifs", detail: "Recensez ce que vous protégez et désignez un responsable par actif." };
const RISQUES: ModuleLink = { href: "/risques", label: "Registre des risques", detail: "Évaluez vos risques et reliez-les aux mesures qui les réduisent." };
const FOURNISSEURS: ModuleLink = { href: "/fournisseurs", label: "Fournisseurs", detail: "Criticité, contrat, accord RGPD et questionnaire sécurité." };
const INCIDENTS: ModuleLink = { href: "/incidents", label: "Incidents", detail: "Registre, échéances NIS2 et retour d'expérience." };
const SENSIBILISATION: ModuleLink = { href: "/sensibilisation", label: "Sensibilisation", detail: "Quiz, sessions et attestations valables un an." };
const SOA: ModuleLink = { href: "/applicabilite", label: "Déclaration d'applicabilité", detail: "Générée automatiquement, exportable." };
const AUDIT: ModuleLink = { href: "/certification", label: "Audit blanc", detail: "Écarts relevés comme le ferait un auditeur, avec les actions à mener." };

const BY_CONTROL: Record<string, ModuleLink[]> = {
  "A.5.9": [ACTIFS],
  "A.5.10": [ACTIFS],
  "A.5.11": [ACTIFS],
  "A.5.12": [ACTIFS],
  "A.5.13": [ACTIFS],
  "SMSI.6.1": [RISQUES],
  "SMSI.SOA": [SOA],
  "SMSI.9.2": [AUDIT],
  "A.5.19": [FOURNISSEURS],
  "A.5.20": [FOURNISSEURS],
  "A.5.21": [FOURNISSEURS],
  "A.5.22": [FOURNISSEURS],
  "A.5.23": [FOURNISSEURS, ACTIFS],
  "A.5.24": [INCIDENTS],
  "A.5.25": [INCIDENTS],
  "A.5.26": [INCIDENTS],
  "A.5.27": [INCIDENTS],
  "A.5.28": [INCIDENTS],
  "A.6.8": [INCIDENTS],
  "NIS2.23": [INCIDENTS],
  "A.6.3": [SENSIBILISATION],
  "SMSI.7.3": [SENSIBILISATION],
  "NIS2.20": [SENSIBILISATION],
};

export function modulesForControl(controlId: string): ModuleLink[] {
  return BY_CONTROL[controlId] ?? [];
}

export const MODULE_CONTROL_IDS = Object.keys(BY_CONTROL);
