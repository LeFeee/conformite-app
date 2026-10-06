"use client";

import clsx from "clsx";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { Button, inputClass, PageHeader, Section, StatusDot } from "@/components/ui";
import { CONTROLS, CONTROLS_BY_ID } from "@/lib/catalog/controls";
import {
  IMPACT_LABELS,
  LIKELIHOOD_LABELS,
  RISK_LEVEL_LABELS,
  RISK_LIBRARY,
  riskLevel,
  TREATMENT_LABELS,
  type Risk,
  type RiskLevel,
  type RiskTreatment,
} from "@/lib/risks";
import { activeTags } from "@/lib/scoping";
import { useWorkspace } from "@/lib/store";

const LEVEL_STYLE: Record<RiskLevel, { bg: string; text: string }> = {
  faible: { bg: "var(--heat-faible)", text: "var(--ink)" },
  modere: { bg: "var(--heat-modere)", text: "var(--ink)" },
  eleve: { bg: "var(--heat-eleve)", text: "var(--ink)" },
  critique: { bg: "var(--heat-critique)", text: "var(--ink)" },
};

function LevelTag({ level }: { level: RiskLevel }) {
  const s = LEVEL_STYLE[level];
  return (
    <span className="rounded px-2 py-0.5 text-xs font-semibold" style={{ background: s.bg, color: s.text }}>
      {RISK_LEVEL_LABELS[level]}
    </span>
  );
}

const SCALE = [1, 2, 3, 4] as const;

export default function Risques() {
  const { workspace: ws, addRisk, updateRisk, removeRisk } = useWorkspace();
  const [cell, setCell] = useState<[number, number] | null>(null);
  const [asset, setAsset] = useState("");
  const [threat, setThreat] = useState("");
  const [lk, setLk] = useState<Risk["likelihood"]>(2);
  const [im, setIm] = useState<Risk["impact"]>(2);

  const suggestions = useMemo(() => {
    if (!ws) return [];
    const tags = activeTags(ws.answers);
    const used = new Set(ws.risks.map((r) => r.threat));
    return RISK_LIBRARY.filter((t) => !used.has(t.threat) && (t.tags ?? []).every((x) => tags.has(x)));
  }, [ws]);

  if (!ws) return null;

  const applicableControls = CONTROLS.filter((c) => ws.controls[c.id]?.applicable);
  const sorted = [...ws.risks].sort((a, b) => b.likelihood * b.impact - a.likelihood * a.impact);
  const shown = cell ? sorted.filter((r) => r.likelihood === cell[0] && r.impact === cell[1]) : sorted;

  const addCustom = (e: FormEvent) => {
    e.preventDefault();
    if (!asset.trim() || !threat.trim()) return;
    addRisk({ asset: asset.trim(), threat: threat.trim(), likelihood: lk, impact: im, treatment: "reduire", owner: null, controlIds: [], notes: "" });
    setAsset("");
    setThreat("");
  };

  return (
    <>
      <PageHeader
        title="Registre des risques"
        description="Ce qui pourrait mal tourner, sa probabilité, sa gravité et les mesures qui le réduisent. Exigé par l'ISO 27001 (§6.1) et NIS2 (art. 21)."
      />

      <div className="grid gap-6 xl:grid-cols-[auto_1fr]">
        <Section title="Matrice" aside={cell ? <button className="underline" onClick={() => setCell(null)}>Tout afficher</button> : `${ws.risks.length} risques`}>
          <div className="p-5">
            <div className="grid grid-cols-[5.5rem_repeat(4,3.75rem)] gap-1 text-xs">
              {[...SCALE].reverse().map((i) => (
                <div key={i} className="contents">
                  <div className="flex items-center justify-end pr-2 text-right text-ink-soft">{IMPACT_LABELS[i]}</div>
                  {SCALE.map((l) => {
                    const lvl = riskLevel(l, i);
                    const n = ws.risks.filter((r) => r.likelihood === l && r.impact === i).length;
                    const active = cell?.[0] === l && cell?.[1] === i;
                    return (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setCell(active ? null : [l, i])}
                        aria-label={`Probabilité ${LIKELIHOOD_LABELS[l]}, impact ${IMPACT_LABELS[i]} : ${n} risque${n > 1 ? "s" : ""}`}
                        aria-pressed={active}
                        className={clsx(
                          "flex h-14 items-center justify-center rounded text-base font-semibold tabular",
                          active && "outline-2 outline-ink",
                        )}
                        style={{ background: LEVEL_STYLE[lvl].bg, color: n ? "var(--ink)" : "transparent" }}
                      >
                        {n || "·"}
                      </button>
                    );
                  })}
                </div>
              ))}
              <div />
              {SCALE.map((l) => (
                <div key={l} className="pt-1 text-center text-ink-soft">
                  {LIKELIHOOD_LABELS[l]}
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between pl-[5.5rem] text-xs text-ink-faint">
              <span>Impact ↑</span>
              <span>Probabilité →</span>
            </div>
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Niveaux de risque">
              {(["faible", "modere", "eleve", "critique"] as RiskLevel[]).map((l) => (
                <li key={l}>
                  <LevelTag level={l} />
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <Section title="Risques types à évaluer" aside={suggestions.length ? `${suggestions.length} suggestions` : undefined}>
          {suggestions.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-soft">Tous les risques types adaptés à votre situation sont dans le registre.</p>
          ) : (
            <ul className="max-h-[22rem] divide-y divide-line overflow-y-auto">
              {suggestions.map((t) => (
                <li key={t.key} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{t.threat}</p>
                    <p className="text-xs text-ink-soft">
                      {t.asset} · <LevelTag level={riskLevel(t.likelihood, t.impact)} />
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    className="h-8 shrink-0 px-3"
                    onClick={() =>
                      addRisk({
                        asset: t.asset,
                        threat: t.threat,
                        likelihood: t.likelihood,
                        impact: t.impact,
                        treatment: "reduire",
                        owner: null,
                        controlIds: t.controlIds.filter((id) => ws.controls[id]?.applicable),
                        notes: "",
                      })
                    }
                  >
                    Ajouter
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <h2 className="mb-3 mt-10 text-lg font-semibold">
        {cell ? `Risques : probabilité ${LIKELIHOOD_LABELS[cell[0]].toLowerCase()}, impact ${IMPACT_LABELS[cell[1]].toLowerCase()}` : "Tous les risques"}
      </h2>

      {shown.length === 0 && (
        <p className="rounded-lg border border-dashed border-line-strong px-5 py-8 text-center text-ink-soft">
          {ws.risks.length === 0
            ? "Commencez par ajouter les risques types proposés ci-dessus, puis ajustez probabilité et impact à votre réalité."
            : "Aucun risque dans cette case."}
        </p>
      )}

      <ul className="space-y-3">
        {shown.map((r) => {
          const lvl = riskLevel(r.likelihood, r.impact);
          const linked = r.controlIds.filter((id) => ws.controls[id]);
          const done = linked.filter((id) => ws.controls[id].status === "conforme").length;
          return (
            <li key={r.id} className="rounded-lg border border-line bg-surface">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-3">
                <div>
                  <p className="font-semibold">{r.threat}</p>
                  <p className="text-sm text-ink-soft">{r.asset}</p>
                </div>
                <LevelTag level={lvl} />
              </div>
              <div className="grid gap-4 px-5 py-4 md:grid-cols-4">
                <label className="text-sm">
                  <span className="mb-1 block text-ink-soft">Probabilité</span>
                  <select className={inputClass} value={r.likelihood} onChange={(e) => updateRisk(r.id, { likelihood: Number(e.target.value) as Risk["likelihood"] })}>
                    {SCALE.map((v) => <option key={v} value={v}>{LIKELIHOOD_LABELS[v]}</option>)}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-ink-soft">Impact</span>
                  <select className={inputClass} value={r.impact} onChange={(e) => updateRisk(r.id, { impact: Number(e.target.value) as Risk["impact"] })}>
                    {SCALE.map((v) => <option key={v} value={v}>{IMPACT_LABELS[v]}</option>)}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-ink-soft">Décision</span>
                  <select className={inputClass} value={r.treatment} onChange={(e) => updateRisk(r.id, { treatment: e.target.value as RiskTreatment })}>
                    {Object.entries(TREATMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-ink-soft">Responsable</span>
                  <input className={inputClass} defaultValue={r.owner ?? ""} placeholder="Nom" onBlur={(e) => updateRisk(r.id, { owner: e.target.value.trim() || null })} />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-5 py-3 text-sm">
                <span className="text-ink-soft tabular">
                  Mesures en place : <strong className="text-ink">{done}/{linked.length}</strong>
                </span>
                {linked.map((id) => (
                  <span key={id} className="inline-flex items-center gap-1.5">
                    <Link href={`/controles/${encodeURIComponent(id)}`} className="inline-flex items-center gap-1.5 hover:underline" title={CONTROLS_BY_ID.get(id)?.title}>
                      <StatusDot status={ws.controls[id].status} />
                      <span className="tabular">{id}</span>
                    </Link>
                    <button
                      type="button"
                      className="text-ink-faint hover:text-signal"
                      aria-label={`Retirer ${id}`}
                      onClick={() => updateRisk(r.id, { controlIds: r.controlIds.filter((x) => x !== id) })}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <select
                  className="h-8 rounded-md border border-line-strong bg-surface px-2 text-sm"
                  value=""
                  aria-label="Ajouter une mesure"
                  onChange={(e) => e.target.value && updateRisk(r.id, { controlIds: [...r.controlIds, e.target.value] })}
                >
                  <option value="">+ Ajouter une mesure</option>
                  {applicableControls
                    .filter((c) => !r.controlIds.includes(c.id))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.id} — {c.title}
                      </option>
                    ))}
                </select>
                <Button variant="danger" className="ml-auto h-8 px-2" onClick={() => removeRisk(r.id)}>
                  Supprimer
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <Section title="Ajouter un risque propre à votre activité" className="mt-8">
        <form onSubmit={addCustom} className="grid gap-4 p-5 md:grid-cols-[1fr_2fr_10rem_10rem_auto] md:items-end">
          <label className="text-sm">
            <span className="mb-1 block text-ink-soft">Ce qui est menacé</span>
            <input className={inputClass} value={asset} onChange={(e) => setAsset(e.target.value)} placeholder="Ex. Machine à commande numérique" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-ink-soft">Ce qui pourrait arriver</span>
            <input className={inputClass} value={threat} onChange={(e) => setThreat(e.target.value)} placeholder="Ex. Prise de contrôle à distance via la connexion du fabricant" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-ink-soft">Probabilité</span>
            <select className={inputClass} value={lk} onChange={(e) => setLk(Number(e.target.value) as Risk["likelihood"])}>
              {SCALE.map((v) => <option key={v} value={v}>{LIKELIHOOD_LABELS[v]}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-ink-soft">Impact</span>
            <select className={inputClass} value={im} onChange={(e) => setIm(Number(e.target.value) as Risk["impact"])}>
              {SCALE.map((v) => <option key={v} value={v}>{IMPACT_LABELS[v]}</option>)}
            </select>
          </label>
          <Button type="submit" disabled={!asset.trim() || !threat.trim()}>
            Ajouter le risque
          </Button>
        </form>
      </Section>
    </>
  );
}
