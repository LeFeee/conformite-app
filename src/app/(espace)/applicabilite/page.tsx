"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Button, PageHeader, StatusBadge } from "@/components/ui";
import { CONTROLS } from "@/lib/catalog/controls";
import { STATUS_LABELS } from "@/lib/catalog/types";
import { evidenceFor, today } from "@/lib/domain";
import { useWorkspace } from "@/lib/store";

const INCLUSION = "Mesure retenue pour traiter les risques identifiés.";

export default function Applicabilite() {
  const { workspace: ws } = useWorkspace();

  const rows = useMemo(() => {
    if (!ws) return [];
    return CONTROLS.filter((c) => c.id.startsWith("A.")).map((c) => {
      const oc = ws.controls[c.id];
      return {
        control: c,
        oc,
        applicable: oc.applicable && oc.status !== "non_applicable",
        justification:
          oc.applicable && oc.status !== "non_applicable" ? INCLUSION : (oc.exclusionReason ?? "À justifier"),
        evidences: evidenceFor(ws, c.id).length,
      };
    });
  }, [ws]);

  if (!ws) return null;
  const included = rows.filter((r) => r.applicable).length;

  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [
      ["Référence", "Mesure", "Applicable", "Justification", "Statut de mise en œuvre", "Nombre de preuves"],
      ...rows.map((r) => [
        r.control.id,
        r.control.title,
        r.applicable ? "Oui" : "Non",
        r.justification,
        STATUS_LABELS[r.oc.status],
        r.evidences,
      ]),
    ].map((l) => l.map(esc).join(";"));
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `declaration-applicabilite-${ws.answers.organizationName.replace(/\W+/g, "-").toLowerCase()}-${today()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <PageHeader
        title="Déclaration d'applicabilité"
        description={`Document exigé par l'ISO 27001 : les 93 mesures de l'annexe A, celles que vous appliquez et la justification des exclusions. ${included} mesures retenues, ${rows.length - included} exclues.`}
        actions={<Button onClick={exportCsv}>Exporter en CSV</Button>}
      />
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="border-b border-line text-ink-soft">
            <tr>
              <th className="px-4 py-2.5 font-medium">Réf.</th>
              <th className="px-4 py-2.5 font-medium">Mesure</th>
              <th className="px-4 py-2.5 font-medium">Applicable</th>
              <th className="px-4 py-2.5 font-medium">Justification</th>
              <th className="px-4 py-2.5 font-medium">Mise en œuvre</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.control.id} className={r.applicable ? "" : "bg-paper"}>
                <td className="px-4 py-3 align-top text-ink-faint tabular">{r.control.id}</td>
                <td className="px-4 py-3 align-top">
                  <Link href={`/controles/${encodeURIComponent(r.control.id)}`} className="hover:underline">
                    {r.control.title}
                  </Link>
                </td>
                <td className="px-4 py-3 align-top">{r.applicable ? "Oui" : <strong>Non</strong>}</td>
                <td className="max-w-md px-4 py-3 align-top text-ink-soft">{r.justification}</td>
                <td className="px-4 py-3 align-top">
                  <StatusBadge status={r.oc.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
