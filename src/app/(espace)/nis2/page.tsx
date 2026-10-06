"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PageHeader, Section, StatusDot } from "@/components/ui";
import { CONTROLS } from "@/lib/catalog/controls";
import { REQUIREMENTS } from "@/lib/catalog/frameworks";
import { controlCredit } from "@/lib/domain";
import { NIS2_SECTORS } from "@/lib/scoping";
import { useWorkspace } from "@/lib/store";

export default function Nis2Page() {
  const { workspace: ws } = useWorkspace();

  const reqs = useMemo(() => {
    if (!ws) return [];
    return REQUIREMENTS.filter((r) => r.frameworkId === "nis2").map((r) => {
      const controls = CONTROLS.filter((c) => c.covers.includes(r.id) && ws.controls[c.id]?.applicable);
      const credit = controls.reduce((s, c) => s + controlCredit(ws, ws.controls[c.id]), 0);
      const percent = controls.length ? Math.round((credit / controls.length) * 100) : 0;
      return { req: r, controls, percent };
    });
  }, [ws]);

  if (!ws) return null;
  const sector = NIS2_SECTORS.find((s) => s.id === ws.answers.nis2SectorId);

  return (
    <>
      <PageHeader
        title="NIS2"
        description="Votre situation au regard de la directive et l'avancement de chaque obligation."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1.5fr]">
        <Section title="Votre situation">
          <div className="space-y-3 p-5">
            <p className="text-xl font-semibold">{ws.nis2.label}</p>
            <p className="text-ink-soft">{ws.nis2.explanation}</p>
            <dl className="grid grid-cols-[9rem_1fr] gap-y-2 border-t border-line pt-4 text-sm">
              <dt className="text-ink-soft">Secteur</dt>
              <dd>{sector ? `${sector.label} (annexe ${sector.annex})` : "Aucun secteur NIS2"}</dd>
              <dt className="text-ink-soft">Fournisseur NIS2</dt>
              <dd>{ws.answers.supplierOfNis2Entity ? "Oui" : "Non"}</dd>
              {ws.nis2.sanction && (
                <>
                  <dt className="text-ink-soft">Sanction maximale</dt>
                  <dd>{ws.nis2.sanction}</dd>
                </>
              )}
            </dl>
            <p className="pt-2 text-xs text-ink-faint">
              Estimation à confirmer avec le test officiel sur MonEspaceNIS2 (ANSSI). La loi Résilience qui transpose NIS2
              en France est encore en cours d&apos;adoption ; le référentiel ReCyF de l&apos;ANSSI donne déjà le contenu attendu.
            </p>
          </div>
        </Section>

        <Section title="Obligations" aside={ws.answers.targetNis2 ? undefined : "NIS2 non visé"}>
          <ul className="divide-y divide-line">
            {reqs.map(({ req, controls, percent }) => (
              <li key={req.id} className="px-5 py-3">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-sm">
                    <span className="mr-2 text-ink-faint tabular">{req.ref}</span>
                    <span className="font-medium">{req.title}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular">{controls.length ? `${percent} %` : <span className="font-normal text-ink-faint">Non applicable</span>}</span>
                </div>
                {controls.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {controls.map((c) => (
                      <Link
                        key={c.id}
                        href={`/controles/${encodeURIComponent(c.id)}`}
                        className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
                        title={c.title}
                      >
                        <StatusDot status={ws.controls[c.id].status} />
                        <span className="tabular">{c.id}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  );
}
