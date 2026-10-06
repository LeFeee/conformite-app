"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ControlRing } from "@/components/control-ring";
import { PageHeader, Section, SeverityTag, StatusDot } from "@/components/ui";
import { CONTROLS } from "@/lib/catalog/controls";
import { STATUS_LABELS, THEME_LABELS, type ControlStatus, type Theme } from "@/lib/catalog/types";
import {
  computeAlerts,
  frameworkScores,
  hasValidEvidence,
  nextActions,
  scoreOf,
} from "@/lib/domain";
import { useWorkspace } from "@/lib/store";

const ORDER: ControlStatus[] = ["conforme", "en_cours", "a_faire"];

function Bar({ percent, label }: { percent: number; label: string }) {
  return (
    <div
      className="h-2 w-full rounded-full bg-void"
      role="meter"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="h-2 rounded-full bg-ok" style={{ width: `${percent}%` }} />
    </div>
  );
}

export default function TableauDeBord() {
  const { workspace: ws } = useWorkspace();

  const data = useMemo(() => {
    if (!ws) return null;
    const applicable = CONTROLS.filter((c) => ws.controls[c.id]?.applicable);
    const ticks = applicable.map((c) => ({
      control: c,
      status: ws.controls[c.id].status,
      proven: hasValidEvidence(ws, c.id),
    }));
    const counts = Object.fromEntries(
      ORDER.map((s) => [s, ticks.filter((t) => t.status === s).length]),
    ) as Record<ControlStatus, number>;
    const themes = (Object.keys(THEME_LABELS) as Theme[])
      .map((t) => ({ theme: t, score: scoreOf(ws, CONTROLS.filter((c) => c.theme === t)) }))
      .filter((t) => t.score.applicable > 0);
    return {
      ticks,
      counts,
      total: scoreOf(ws, CONTROLS),
      frameworks: frameworkScores(ws),
      themes,
      alerts: computeAlerts(ws),
      actions: nextActions(ws),
    };
  }, [ws]);

  if (!ws || !data) return null;

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description={
          <>
            {ws.answers.organizationName} · NIS2 :{" "}
            <Link href="/nis2" className="underline decoration-line-strong underline-offset-4 hover:decoration-ink">
              {ws.nis2.label.toLowerCase()}
            </Link>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Section title="État de la démarche" aside={`${data.total.applicable} contrôles applicables`}>
          <div className="flex flex-col items-center gap-8 p-6 sm:flex-row sm:items-center">
            <ControlRing ticks={data.ticks} percent={data.total.percent} />
            <div className="w-full flex-1 space-y-6">
              <ul className="space-y-2" aria-label="Répartition par statut">
                {ORDER.map((s) => (
                  <li key={s} className="flex items-center justify-between gap-4 text-sm">
                    <span className="flex items-center gap-2">
                      <StatusDot status={s} />
                      {STATUS_LABELS[s]}
                    </span>
                    <span className="font-semibold tabular">{data.counts[s]}</span>
                  </li>
                ))}
                {data.total.sansPreuve > 0 && (
                  <li className="text-xs text-ink-faint">
                    dont {data.total.sansPreuve} conforme{data.total.sansPreuve > 1 ? "s" : ""} sans preuve valide (traits
                    plus courts sur l&apos;anneau, comptés à 50 %)
                  </li>
                )}
              </ul>
              <div className="space-y-4 border-t border-line pt-5">
                {data.frameworks.map(({ framework, score }) => (
                  <div key={framework.id}>
                    <div className="mb-1.5 flex items-baseline justify-between text-sm">
                      <span className="font-medium">{framework.shortName}</span>
                      <span className="tabular text-ink-soft">
                        <span className="font-semibold text-ink">{score.percent} %</span> · {score.conformes}/
                        {score.applicable}
                      </span>
                    </div>
                    <Bar percent={score.percent} label={`Conformité ${framework.shortName}`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section title="Alertes" aside={data.alerts.length ? `${data.alerts.length}` : undefined}>
          {data.alerts.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-soft">
              Rien à signaler. Les preuves qui expirent et les échéances dépassées apparaîtront ici.
            </p>
          ) : (
            <ul className="max-h-[26rem] divide-y divide-line overflow-y-auto">
              {data.alerts.map((a) => {
                const inner = (
                  <>
                    <div className="flex items-center gap-2">
                      <SeverityTag severity={a.severity} />
                      <span className="text-sm font-medium">{a.title}</span>
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">{a.detail}</p>
                  </>
                );
                return (
                  <li key={a.id}>
                    <Link
                      href={a.href ?? (a.controlId ? `/controles/${encodeURIComponent(a.controlId)}` : "/controles?filtre=socle")}
                      className="block px-5 py-3 hover:bg-paper"
                    >
                      {inner}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Section title="À faire maintenant" aside="Les contrôles essentiels d'abord">
          {data.actions.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-soft">Tous les contrôles applicables sont traités.</p>
          ) : (
            <ul className="divide-y divide-line">
              {data.actions.map((c) => {
                const oc = ws.controls[c.id];
                return (
                  <li key={c.id}>
                    <Link
                      href={`/controles/${encodeURIComponent(c.id)}`}
                      className="grid grid-cols-[4.5rem_1fr_auto] items-baseline gap-3 px-5 py-3 hover:bg-paper"
                    >
                      <span className="text-sm text-ink-faint tabular">{c.id}</span>
                      <span>
                        <span className="font-medium">{c.title}</span>
                        <span className="mt-0.5 line-clamp-1 block text-sm text-ink-soft">{c.enClair}</span>
                      </span>
                      <span className="flex items-center gap-2 text-sm text-ink-soft">
                        <StatusDot status={oc.status} />
                        <span className="hidden sm:inline">{STATUS_LABELS[oc.status]}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title="Par domaine">
          <ul className="space-y-4 p-5">
            {data.themes.map(({ theme, score }) => (
              <li key={theme}>
                <div className="mb-1.5 flex items-baseline justify-between text-sm">
                  <Link href={`/controles?theme=${theme}`} className="font-medium hover:underline">
                    {THEME_LABELS[theme]}
                  </Link>
                  <span className="tabular text-ink-soft">{score.percent} %</span>
                </div>
                <Bar percent={score.percent} label={`Conformité ${THEME_LABELS[theme]}`} />
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  );
}
