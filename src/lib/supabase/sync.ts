// Calcule les écritures à envoyer à Supabase entre deux états de l'espace.
// Le store garde la même logique en mode démo et en mode Supabase : chaque
// action produit un nouvel état, et ce module en déduit les lignes à écrire.

import type { Workspace } from "../domain";
import {
  activityToRow,
  assetToRow,
  controlToRow,
  evidenceToRow,
  incidentToRow,
  isUuid,
  orgToRow,
  riskToRow,
  supplierToRow,
  trainingToRow,
  type ActivityRow,
  type OrgControlRow,
  type OrgRow,
} from "./mapping";

export type CollectionTable = "evidences" | "risks" | "incidents" | "suppliers" | "trainings" | "assets";

export type SyncOp =
  | { kind: "org"; row: Omit<OrgRow, "id" | "created_at"> }
  | { kind: "control"; controlId: string; row: Omit<OrgControlRow, "updated_at"> }
  | { kind: "upsert"; table: CollectionTable; rows: { id: string }[] }
  | { kind: "delete"; table: CollectionTable; ids: string[] }
  | { kind: "log"; rows: ActivityRow[] };

const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);

const COLLECTIONS = {
  evidences: (ws: Workspace) => ws.evidences,
  risks: (ws: Workspace) => ws.risks,
  incidents: (ws: Workspace) => ws.incidents,
  suppliers: (ws: Workspace) => ws.suppliers,
  trainings: (ws: Workspace) => ws.trainings,
  assets: (ws: Workspace) => ws.assets,
} satisfies Record<CollectionTable, (ws: Workspace) => { id: string }[]>;

/* eslint-disable @typescript-eslint/no-explicit-any */
const TO_ROW: Record<CollectionTable, (item: any, orgId: string) => { id: string }> = {
  evidences: (e, org) => evidenceToRow(e, org),
  risks: riskToRow,
  incidents: incidentToRow,
  suppliers: supplierToRow,
  trainings: trainingToRow,
  assets: assetToRow,
};
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Écritures nécessaires pour passer de `prev` à `next`.
 * `prev = null` signifie une base vide pour cette organisation (import complet).
 * L'ordre compte : les preuves supprimées partent avant les nouvelles, le journal en dernier.
 */
export function diffWorkspace(prev: Workspace | null, next: Workspace, orgId: string, actorId: string | null): SyncOp[] {
  const ops: SyncOp[] = [];

  if (!prev || !same(prev.answers, next.answers)) ops.push({ kind: "org", row: orgToRow(next.answers) });

  for (const [id, c] of Object.entries(next.controls)) {
    if (!prev || !same(prev.controls[id], c)) ops.push({ kind: "control", controlId: id, row: controlToRow(c, orgId) });
  }

  for (const table of Object.keys(COLLECTIONS) as CollectionTable[]) {
    const get = COLLECTIONS[table];
    const before = new Map((prev ? get(prev) : []).map((x) => [x.id, x]));
    const after = get(next);
    const afterIds = new Set(after.map((x) => x.id));
    const removed = [...before.keys()].filter((id) => !afterIds.has(id));
    const changed = after.filter((x) => !same(before.get(x.id), x));
    if (removed.length) ops.push({ kind: "delete", table, ids: removed });
    if (changed.length) ops.push({ kind: "upsert", table, rows: changed.map((x) => TO_ROW[table](x, orgId)) });
  }

  const known = new Set((prev?.activity ?? []).map((a) => a.id));
  const fresh = next.activity.filter((a) => !known.has(a.id));
  if (fresh.length) ops.push({ kind: "log", rows: fresh.reverse().map((a) => activityToRow(a, orgId, actorId)) });

  return ops;
}

/**
 * Prépare un espace de démo (stockage local) pour l'import dans Supabase :
 * les identifiants qui ne sont pas des UUID sont remplacés, en gardant les liens.
 */
export function withUuids(ws: Workspace, makeId: () => string = () => crypto.randomUUID()): Workspace {
  const renamed = new Map<string, string>();
  const fix = <T extends { id: string }>(items: T[]): T[] =>
    items.map((x) => {
      if (isUuid(x.id)) return x;
      const id = makeId();
      renamed.set(x.id, id);
      return { ...x, id };
    });
  const suppliers = fix(ws.suppliers);
  // Les actifs gardent leur lien vers le fournisseur renommé.
  const fixAssets = (assets: Workspace["assets"]) =>
    fix(assets).map((x) => (x.supplierId && renamed.has(x.supplierId) ? { ...x, supplierId: renamed.get(x.supplierId)! } : x));
  return {
    ...ws,
    evidences: fix(ws.evidences),
    risks: fix(ws.risks),
    incidents: fix(ws.incidents),
    suppliers,
    trainings: fix(ws.trainings),
    assets: fixAssets(ws.assets),
    activity: fix(ws.activity),
  };
}

/** Résumé lisible des écritures, pour le journal de synchronisation et les tests. */
export function describeOps(ops: SyncOp[]): string[] {
  return ops.map((op) => {
    switch (op.kind) {
      case "org":
        return "organisation";
      case "control":
        return `contrôle ${op.controlId}`;
      case "upsert":
        return `${op.table} +${op.rows.length}`;
      case "delete":
        return `${op.table} -${op.ids.length}`;
      case "log":
        return `journal +${op.rows.length}`;
    }
  });
}
