"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { inputClass, PageHeader, StatusBadge } from "@/components/ui";
import { CONTROLS } from "@/lib/catalog/controls";
import { STATUS_LABELS, THEME_LABELS, type ControlStatus, type Theme } from "@/lib/catalog/types";
import { evidenceFor, formatDate, hasValidEvidence } from "@/lib/domain";
import { useWorkspace } from "@/lib/store";

type Filter = { key: string; value: string | null; label: string };

function Chips({ param, options }: { param: string; options: Filter[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const current = params.get(param);
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={param}>
      {options.map((o) => {
        const active = current === o.value;
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={active}
            onClick={() => {
              const next = new URLSearchParams(params);
              if (o.value) next.set(param, o.value);
              else next.delete(param);
              router.replace(`${pathname}?${next}`, { scroll: false });
            }}
            className={clsx(
              "h-8 rounded-full border px-3 text-sm",
              active ? "border-stamp bg-stamp-soft font-semibold text-stamp" : "border-line text-ink-soft hover:border-line-strong",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ControlesList() {
  const { workspace: ws } = useWorkspace();
  const params = useSearchParams();
  const [q, setQ] = useState("");

  const theme = params.get("theme") as Theme | null;
  const statut = params.get("statut") as ControlStatus | null;
  const ref = params.get("referentiel");
  const socle = params.get("filtre") === "socle";

  const rows = useMemo(() => {
    if (!ws) return [];
    const needle = q.trim().toLowerCase();
    return CONTROLS.filter((c) => {
      const oc = ws.controls[c.id];
      if (statut ? oc.status !== statut : !oc.applicable) return false;
      if (theme && c.theme !== theme) return false;
      if (ref && !c.covers.some((r) => r.startsWith(ref + ":"))) return false;
      if (socle && c.priority !== "socle") return false;
      if (needle && !`${c.id} ${c.title} ${c.enClair}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [ws, q, theme, statut, ref, socle]);

  if (!ws) return null;

  return (
    <>
      <PageHeader
        title="Contrôles"
        description="Chaque contrôle est une action concrète. Il peut couvrir plusieurs exigences ISO 27001 et NIS2 à la fois."
      />

      <div className="mb-6 space-y-3">
        <input
          type="search"
          className={clsx(inputClass, "max-w-md")}
          placeholder="Rechercher un contrôle (ex. sauvegarde, mot de passe, A.8.13)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Rechercher un contrôle"
        />
        <Chips
          param="statut"
          options={[
            { key: "all", value: null, label: "Tous les applicables" },
            ...(["a_faire", "en_cours", "conforme", "non_applicable"] as ControlStatus[]).map((s) => ({
              key: s,
              value: s,
              label: STATUS_LABELS[s],
            })),
          ]}
        />
        <Chips
          param="theme"
          options={[
            { key: "all", value: null, label: "Tous les domaines" },
            ...(Object.keys(THEME_LABELS) as Theme[]).map((t) => ({ key: t, value: t, label: THEME_LABELS[t] })),
          ]}
        />
        <Chips
          param="referentiel"
          options={[
            { key: "all", value: null, label: "ISO 27001 et NIS2" },
            { key: "iso", value: "iso27001", label: "ISO 27001" },
            { key: "nis2", value: "nis2", label: "NIS2" },
          ]}
        />
        <Chips
          param="filtre"
          options={[
            { key: "all", value: null, label: "Toutes priorités" },
            { key: "socle", value: "socle", label: "Essentiels uniquement" },
          ]}
        />
      </div>

      <p className="mb-2 text-sm text-ink-soft tabular">
        {rows.length} contrôle{rows.length > 1 ? "s" : ""}
      </p>
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="border-b border-line text-ink-soft">
            <tr>
              <th className="px-4 py-2.5 font-medium">Réf.</th>
              <th className="px-4 py-2.5 font-medium">Contrôle</th>
              <th className="px-4 py-2.5 font-medium">Statut</th>
              <th className="px-4 py-2.5 font-medium">Preuves</th>
              <th className="px-4 py-2.5 font-medium">Responsable</th>
              <th className="px-4 py-2.5 font-medium">Échéance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((c) => {
              const oc = ws.controls[c.id];
              const ev = evidenceFor(ws, c.id);
              const proven = hasValidEvidence(ws, c.id);
              return (
                <tr key={c.id} className="hover:bg-paper">
                  <td className="px-4 py-3 align-top text-ink-faint tabular">{c.id}</td>
                  <td className="px-4 py-3 align-top">
                    <Link href={`/controles/${encodeURIComponent(c.id)}`} className="font-medium hover:underline">
                      {c.title}
                    </Link>
                    {c.priority === "socle" && <span className="ml-2 text-xs text-stamp">Essentiel</span>}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <StatusBadge status={oc.status} />
                  </td>
                  <td className="px-4 py-3 align-top tabular">
                    {ev.length === 0 ? (
                      <span className="text-ink-faint">—</span>
                    ) : (
                      <span className={proven ? "" : "text-signal"}>
                        {ev.length}
                        {!proven && " (expirée)"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">{oc.owner ?? <span className="text-ink-faint">—</span>}</td>
                  <td className="px-4 py-3 align-top tabular">{formatDate(oc.dueDate)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-soft">
                  Aucun contrôle ne correspond à ces filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function ControlesPage() {
  return (
    <Suspense>
      <ControlesList />
    </Suspense>
  );
}
