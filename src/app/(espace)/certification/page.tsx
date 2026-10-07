"use client";

import clsx from "clsx";
import Link from "next/link";
import { useMemo } from "react";
import { Button, PageHeader, Section } from "@/components/ui";
import { formatDate } from "@/lib/domain";
import {
  certificationPath,
  FINDING_HELP,
  FINDING_LABELS,
  FINDING_PLURAL,
  readiness,
  STAGE2_MIN_PERCENT,
  templateTitle,
  type DocState,
  type FindingLevel,
  type StepState,
} from "@/lib/readiness";
import { useWorkspace } from "@/lib/store";

const LEVEL_STYLE: Record<FindingLevel, string> = {
  majeur: "bg-signal-soft text-signal",
  mineur: "bg-ochre-soft text-ochre-text",
  observation: "bg-void text-ink-soft",
};

const DOC_STATE: Record<DocState, { label: string; className: string }> = {
  present: { label: "Présent et prouvé", className: "text-ok" },
  sans_preuve: { label: "Déclaré, sans preuve", className: "text-ochre-text" },
  manquant: { label: "Manquant", className: "text-signal font-semibold" },
  non_applicable: { label: "Non applicable", className: "text-ink-faint" },
};

const STEP_MARK: Record<StepState, { label: string; className: string }> = {
  fait: { label: "Fait", className: "bg-ok text-white dark:text-paper" },
  en_cours: { label: "En cours", className: "bg-ochre text-black" },
  a_venir: { label: "À venir", className: "border border-line-strong text-ink-soft" },
};

function Verdict({ title, ready, text }: { title: string; ready: boolean; text: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <p className="text-sm text-ink-soft">{title}</p>
      <p className={clsx("mt-1 text-xl font-semibold", ready ? "text-ok" : "text-ink")}>
        {ready ? "Prêt" : "Pas encore prêt"}
      </p>
      <p className="mt-1 text-sm text-ink-soft">{text}</p>
    </div>
  );
}

export default function Certification() {
  const { workspace: ws } = useWorkspace();
  const r = useMemo(() => (ws ? readiness(ws) : null), [ws]);
  const path = useMemo(() => (ws && r ? certificationPath(ws, r) : []), [ws, r]);
  if (!ws || !r) return null;

  const missingStage1 = r.docs.filter((d) => d.doc.stage === 1 && d.state !== "present" && d.state !== "non_applicable");

  return (
    <>
      <PageHeader
        title="Préparation à la certification"
        description="Un audit blanc qui examine votre démarche comme le ferait un auditeur ISO 27001, et la liste de ce qu'il reste à faire pour obtenir le certificat."
        actions={
          <Button variant="secondary" onClick={() => window.print()} className="print:hidden">
            Imprimer le rapport
          </Button>
        }
      />

      {!ws.answers.targetIso27001 && (
        <p className="mb-6 rounded-lg border border-line bg-surface px-5 py-4 text-sm">
          Vous ne visez pas la certification ISO 27001. NIS2 ne donne lieu à aucun certificat : la conformité est contrôlée par
          l&apos;ANSSI. Cet audit blanc reste utile pour préparer un contrôle ou répondre aux questionnaires de vos clients.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Verdict
          title="Audit d'étape 1 (revue documentaire)"
          ready={r.stage1Ready}
          text={
            r.stage1Ready
              ? "Les documents exigés sont présents et prouvés."
              : `${missingStage1.length || 1} document${missingStage1.length > 1 ? "s" : ""} ou élément${missingStage1.length > 1 ? "s" : ""} à finaliser.`
          }
        />
        <Verdict
          title="Audit d'étape 2 (sur le terrain)"
          ready={r.stage2Ready}
          text={`Objectif : aucun écart majeur et au moins ${STAGE2_MIN_PERCENT}\u00a0% de conformité prouvée. Vous êtes à ${r.provenPercent}\u00a0%.`}
        />
        <div className="rounded-lg border border-line bg-surface p-5">
          <p className="text-sm text-ink-soft">Résultat de l&apos;audit blanc</p>
          <dl className="mt-2 space-y-1 text-sm">
            {(["majeur", "mineur", "observation"] as FindingLevel[]).map((l) => (
              <div key={l} className="flex justify-between">
                <dt>{FINDING_PLURAL[l]}</dt>
                <dd className="font-semibold tabular">{l === "majeur" ? r.majeurs : l === "mineur" ? r.mineurs : r.observations}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <p className="mt-3 text-xs text-ink-faint">
        Estimation indicative au {formatDate(new Date().toISOString())}. Seul un organisme certificateur accrédité décide de la
        délivrance du certificat.
      </p>

      <Section title="Écarts et actions à mener" aside={`${r.findings.length}`} className="mt-8">
        {r.findings.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-soft">
            Aucun écart relevé. Vous pouvez demander des devis à des organismes certificateurs.
          </p>
        ) : (
          <ol className="divide-y divide-line">
            {r.findings.map((f) => (
              <li key={f.id} className="break-inside-avoid px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={clsx("rounded px-2 py-0.5 text-xs font-semibold", LEVEL_STYLE[f.level])} title={FINDING_HELP[f.level]}>
                    {FINDING_LABELS[f.level]}
                  </span>
                  <span className="text-xs text-ink-faint tabular">{f.ref}</span>
                </div>
                <p className="mt-1.5 font-semibold">{f.title}</p>
                <p className="mt-1 text-sm text-ink-soft">{f.observed}</p>
                <p className="mt-2 text-sm">
                  <span className="font-medium">À faire : </span>
                  {f.action}
                </p>
                {f.href && (
                  <Link href={f.href} className="mt-2 inline-block text-sm underline decoration-line-strong underline-offset-4 hover:decoration-ink print:hidden">
                    Ouvrir
                  </Link>
                )}
              </li>
            ))}
          </ol>
        )}
        <dl className="grid gap-2 border-t border-line px-5 py-4 text-xs text-ink-soft sm:grid-cols-3">
          {(["majeur", "mineur", "observation"] as FindingLevel[]).map((l) => (
            <div key={l}>
              <dt className="font-semibold text-ink">{FINDING_LABELS[l]}</dt>
              <dd>{FINDING_HELP[l]}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Section title="Documents exigés par la norme">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-line">
              {r.docs.map(({ doc, state }) => (
                <tr key={doc.id} className="break-inside-avoid">
                  <td className="w-28 px-5 py-2.5 align-top text-ink-faint tabular">{doc.ref}</td>
                  <td className="py-2.5 pr-3 align-top">
                    <Link href={`/controles/${encodeURIComponent(doc.controlIds[0])}`} className="hover:underline">
                      {doc.title}
                    </Link>
                    {doc.template && state !== "present" && (
                      <Link href={`/documents/${doc.template}`} className="block text-xs text-ink-soft underline decoration-line-strong underline-offset-2 print:hidden">
                        Modèle : {templateTitle(doc.template)}
                      </Link>
                    )}
                  </td>
                  <td className={clsx("whitespace-nowrap py-2.5 pr-5 text-right align-top", DOC_STATE[state].className)}>
                    {DOC_STATE[state].label}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Parcours jusqu'au certificat">
          <ol className="space-y-4 p-5">
            {path.map((s, i) => (
              <li key={s.title} className="grid grid-cols-[1.75rem_1fr] gap-3">
                <span className={clsx("flex size-7 items-center justify-center rounded-full text-xs font-semibold tabular", STEP_MARK[s.state].className)} aria-label={STEP_MARK[s.state].label}>
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium">
                    {s.href ? (
                      <Link href={s.href} className="hover:underline">
                        {s.title}
                      </Link>
                    ) : (
                      s.title
                    )}
                    <span className="ml-2 text-xs font-normal text-ink-faint">{STEP_MARK[s.state].label}</span>
                  </p>
                  <p className="text-sm text-ink-soft">{s.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>
      </div>

      <Section title="Qui délivre le certificat ?" className="mt-8 break-inside-avoid">
        <div className="grid gap-6 p-5 text-sm md:grid-cols-3">
          <div>
            <p className="font-semibold">Un organisme accrédité</p>
            <p className="mt-1 text-ink-soft">
              En France, le certificat ISO 27001 est délivré par un organisme certificateur accrédité par le COFRAC, par
              exemple AFNOR Certification, Bureau Veritas, BSI, LRQA ou SGS. Demandez plusieurs devis : le prix dépend de la
              taille et du périmètre.
            </p>
          </div>
          <div>
            <p className="font-semibold">Budget et durée indicatifs</p>
            <p className="mt-1 text-ink-soft">
              Pour une PME, l&apos;audit initial (étapes 1 et 2) se chiffre souvent entre 8 000 et 15 000 €, puis un audit de
              surveillance chaque année. Le certificat est valable 3 ans. Une petite structure bien préparée paie en général
              moins, car la durée d&apos;audit dépend de l&apos;effectif.
            </p>
          </div>
          <div>
            <p className="font-semibold">Le rôle de cet outil</p>
            <p className="mt-1 text-ink-soft">
              Il vous prépare et vous fournit le dossier d&apos;audit. Il ne délivre pas de certificat : les règles
              d&apos;impartialité interdisent à un même acteur d&apos;accompagner une entreprise et de la certifier. NIS2 ne
              donne pas lieu à certificat ; c&apos;est l&apos;ANSSI qui contrôle.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
