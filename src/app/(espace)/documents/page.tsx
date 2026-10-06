"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { DOC_TEMPLATES } from "@/lib/documents";
import { evidenceFor } from "@/lib/domain";
import { useWorkspace } from "@/lib/store";

export default function Documents() {
  const { workspace: ws } = useWorkspace();
  if (!ws) return null;

  return (
    <>
      <PageHeader
        title="Modèles de documents"
        description="Des documents pré-remplis avec vos informations. Relisez-les, complétez les champs entre crochets, imprimez et faites signer."
      />
      <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
        {DOC_TEMPLATES.map((t) => {
          const signed = evidenceFor(ws, t.controlIds[0]).some((e) => e.title === t.title);
          return (
            <li key={t.slug}>
              <Link href={`/documents/${t.slug}`} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 hover:bg-paper">
                <div className="max-w-2xl">
                  <p className="font-semibold">{t.title}</p>
                  <p className="mt-0.5 text-sm text-ink-soft">{t.summary}</p>
                  <p className="mt-1 text-xs text-ink-faint tabular">Démontre : {t.controlIds.join(", ")}</p>
                </div>
                <span className="text-sm text-ink-soft">{signed ? "Signé, enregistré comme preuve" : "À signer"}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
