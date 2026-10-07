// Lectures et écritures Supabase côté navigateur.
// Toutes les requêtes passent par la RLS : un utilisateur ne voit que ses organisations.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Workspace } from "../domain";
import { computeApplicability, type ScopingAnswers } from "../scoping";
import { supabaseBrowser } from "./client";
import { orgToRow, workspaceFromRows, type WorkspaceRows } from "./mapping";
import { diffWorkspace, type SyncOp } from "./sync";

const ORG_KEY = "conformite:org";

export interface Session {
  userId: string;
  email: string;
}

export async function currentSession(sb: SupabaseClient = supabaseBrowser()): Promise<Session | null> {
  const { data } = await sb.auth.getUser();
  return data.user ? { userId: data.user.id, email: data.user.email ?? "" } : null;
}

export function displayName(s: Session): string {
  const local = s.email.split("@")[0] ?? "";
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : "Vous";
}

/** Organisation active : la dernière ouverte, sinon la plus ancienne. */
export async function currentOrgId(sb: SupabaseClient = supabaseBrowser()): Promise<string | null> {
  const { data, error } = await sb.from("my_organizations").select("id").order("created_at");
  if (error) throw error;
  const ids = (data ?? []).map((r) => r.id as string);
  let saved: string | null = null;
  try {
    saved = window.localStorage.getItem(ORG_KEY);
  } catch {}
  return saved && ids.includes(saved) ? saved : (ids[0] ?? null);
}

export function rememberOrg(orgId: string) {
  try {
    window.localStorage.setItem(ORG_KEY, orgId);
  } catch {}
}

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what} : ${res.error.message}`);
  return res.data as T;
}

export async function loadWorkspace(orgId: string, sb: SupabaseClient = supabaseBrowser()): Promise<Workspace> {
  const byOrg = (table: string) => sb.from(table).select("*").eq("org_id", orgId);
  const [org, controls, evidences, risks, incidents, suppliers, trainings, activity] = await Promise.all([
    sb.from("organizations").select("*").eq("id", orgId).single(),
    byOrg("org_controls"),
    byOrg("evidences"),
    byOrg("risks"),
    byOrg("incidents"),
    byOrg("suppliers"),
    byOrg("trainings"),
    byOrg("activity_log").order("at", { ascending: false }).limit(500),
  ]);
  const rows: WorkspaceRows = {
    org: must(org, "organisation"),
    controls: must(controls, "contrôles"),
    evidences: must(evidences, "preuves"),
    risks: must(risks, "risques"),
    incidents: must(incidents, "incidents"),
    suppliers: must(suppliers, "fournisseurs"),
    trainings: must(trainings, "sensibilisation"),
    activity: must(activity, "journal"),
  };
  return workspaceFromRows(rows);
}

/** Crée l'organisation, le membre propriétaire et l'état initial des contrôles (RPC transactionnelle). */
export async function createOrganization(answers: ScopingAnswers, sb: SupabaseClient = supabaseBrowser()): Promise<string> {
  const org = orgToRow(answers);
  const controls = [...computeApplicability(answers).entries()].map(([controlId, a]) => ({
    control_id: controlId,
    applicable: a.applicable,
    exclusion_reason: a.exclusionReason,
  }));
  const orgId = must(
    await sb.rpc("create_organization", {
      p_name: org.name,
      p_activity: org.activity,
      p_scoping: org.scoping,
      p_nis2_status: org.nis2_status,
      p_target_iso: org.target_iso27001,
      p_target_nis2: org.target_nis2,
      p_controls: controls,
    }),
    "création de l'organisation",
  ) as string;
  rememberOrg(orgId);
  return orgId;
}

export async function applyOps(ops: SyncOp[], orgId: string, sb: SupabaseClient = supabaseBrowser()): Promise<void> {
  for (const op of ops) {
    switch (op.kind) {
      case "org":
        must(await sb.from("organizations").update(op.row).eq("id", orgId), "organisation");
        break;
      case "control": {
        // Les lignes existent déjà (créées par la RPC) : simple mise à jour.
        const patch: Partial<typeof op.row> = { ...op.row };
        delete patch.org_id;
        delete patch.control_id;
        must(await sb.from("org_controls").update(patch).eq("org_id", orgId).eq("control_id", op.controlId), `contrôle ${op.controlId}`);
        break;
      }
      case "upsert":
        must(await sb.from(op.table).upsert(op.rows), op.table);
        break;
      case "delete": {
        if (op.table === "evidences") {
          // Supprime aussi les fichiers stockés.
          const rows = must(await sb.from("evidences").select("storage_path").in("id", op.ids), "preuves") as { storage_path: string | null }[];
          const paths = rows.map((r) => r.storage_path).filter((p): p is string => !!p);
          if (paths.length) must(await sb.storage.from("evidences").remove(paths), "suppression des fichiers");
        }
        must(await sb.from(op.table).delete().eq("org_id", orgId).in("id", op.ids), op.table);
        break;
      }
      case "log":
        must(await sb.from("activity_log").upsert(op.rows, { onConflict: "client_id", ignoreDuplicates: true }), "journal");
        break;
    }
  }
}

export async function syncWorkspace(prev: Workspace | null, next: Workspace, orgId: string, userId: string): Promise<number> {
  const ops = diffWorkspace(prev, next, orgId, userId);
  await applyOps(ops, orgId);
  return ops.length;
}

/** Envoie un fichier de preuve dans le bucket privé (dossier = organisation). */
export async function uploadEvidenceFile(orgId: string, evidenceId: string, file: File, sb: SupabaseClient = supabaseBrowser()): Promise<string> {
  const safe = file.name.normalize("NFD").replace(/[^\w.-]+/g, "_");
  const path = `${orgId}/${evidenceId}/${safe}`;
  must(await sb.storage.from("evidences").upload(path, file, { upsert: false, contentType: file.type || undefined }), "envoi du fichier");
  must(await sb.from("evidences").update({ storage_path: path }).eq("id", evidenceId), "lien du fichier");
  return path;
}

/** Lien de téléchargement temporaire (10 minutes) vers un fichier de preuve. */
export async function evidenceDownloadUrl(evidenceId: string, sb: SupabaseClient = supabaseBrowser()): Promise<string | null> {
  const row = must(await sb.from("evidences").select("storage_path").eq("id", evidenceId).single(), "preuve") as { storage_path: string | null };
  if (!row.storage_path) return null;
  const signed = must(await sb.storage.from("evidences").createSignedUrl(row.storage_path, 600), "lien de téléchargement") as { signedUrl: string };
  return signed.signedUrl;
}

export async function signOut(sb: SupabaseClient = supabaseBrowser()) {
  await sb.auth.signOut();
  try {
    window.localStorage.removeItem(ORG_KEY);
  } catch {}
}
