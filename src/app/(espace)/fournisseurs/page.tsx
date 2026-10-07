"use client";

import clsx from "clsx";
import { useState, type FormEvent } from "react";
import { Button, inputClass, PageHeader, Section } from "@/components/ui";
import { formatDate } from "@/lib/domain";
import { useWorkspace } from "@/lib/store";
import {
  blockingGaps,
  CRITICALITY_HELP,
  CRITICALITY_LABELS,
  DATA_ACCESS_LABELS,
  ISSUE_LABELS,
  questionnaireScore,
  questionnaireText,
  SUPPLIER_QUESTIONNAIRE,
  SUPPLIER_SUGGESTIONS,
  supplierIssues,
  type Answer,
  type DataAccess,
  type Supplier,
  type SupplierCriticality,
} from "@/lib/suppliers";

const ANSWERS: [Answer, string][] = [
  ["oui", "Oui"],
  ["partiel", "Partiellement"],
  ["non", "Non"],
];

const blank = (name: string, service: string, criticality: SupplierCriticality, dataAccess: DataAccess): Omit<Supplier, "id" | "createdAt"> => ({
  name,
  service,
  contact: "",
  criticality,
  dataAccess,
  hasSecurityClauses: false,
  hasDpa: false,
  certifications: "",
  questionnaireSentAt: null,
  answers: {},
  answeredAt: null,
  lastReviewAt: null,
  notes: "",
});

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" className="size-4 accent-[var(--ink)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function SupplierCard({ s }: { s: Supplier }) {
  const { workspace: ws, updateSupplier, removeSupplier } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!ws) return null;

  const issues = supplierIssues(s);
  const score = questionnaireScore(s.answers);
  const gaps = blockingGaps(s.answers);
  const set = (patch: Partial<Supplier>) => updateSupplier(s.id, patch);

  const copy = async () => {
    const text = questionnaireText(ws.answers.organizationName, s.name);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copiez le questionnaire :", text);
    }
  };

  return (
    <li className="rounded-lg border border-line bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-3">
        <div>
          <p className="font-semibold">{s.name}</p>
          <p className="text-sm text-ink-soft">{s.service}</p>
        </div>
        <div className="text-right text-sm">
          {score !== null ? (
            <p>
              Questionnaire : <strong className="tabular">{score} %</strong>
            </p>
          ) : (
            <p className="text-ink-faint">Questionnaire non renseigné</p>
          )}
          {s.answeredAt && <p className="text-xs text-ink-faint">Réponses du {formatDate(s.answeredAt)}</p>}
        </div>
      </div>

      {issues.length > 0 && (
        <ul className="flex flex-wrap gap-2 border-b border-line px-5 py-3">
          {issues.map((i) => (
            <li
              key={i}
              className={clsx(
                "rounded px-2 py-0.5 text-xs font-semibold",
                i === "point_bloquant" ? "bg-signal-soft text-signal" : "bg-ochre-soft text-ochre-text",
              )}
            >
              {ISSUE_LABELS[i]}
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 px-5 py-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm">
          <span className="mb-1 block text-ink-soft">Nom du fournisseur</span>
          <input className={inputClass} defaultValue={s.name} onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== s.name && set({ name: e.target.value.trim() })} />
        </label>
        <label className="text-sm xl:col-span-3">
          <span className="mb-1 block text-ink-soft">Service rendu</span>
          <input className={inputClass} defaultValue={s.service} onBlur={(e) => e.target.value.trim() !== s.service && set({ service: e.target.value.trim() })} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-ink-soft">Criticité</span>
          <select className={inputClass} value={s.criticality} onChange={(e) => set({ criticality: e.target.value as SupplierCriticality })}>
            {Object.entries(CRITICALITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-ink-soft">Données confiées</span>
          <select className={inputClass} value={s.dataAccess} onChange={(e) => set({ dataAccess: e.target.value as DataAccess })}>
            {Object.entries(DATA_ACCESS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-ink-soft">Certifications</span>
          <input className={inputClass} defaultValue={s.certifications} placeholder="Ex. ISO 27001, HDS" onBlur={(e) => set({ certifications: e.target.value.trim() })} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-ink-soft">Contact</span>
          <input className={inputClass} defaultValue={s.contact} placeholder="Nom, email" onBlur={(e) => set({ contact: e.target.value.trim() })} />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line px-5 py-3">
        <Toggle label="Clauses de sécurité au contrat" checked={s.hasSecurityClauses} onChange={(v) => set({ hasSecurityClauses: v })} />
        <Toggle label="Accord de sous-traitance RGPD signé" checked={s.hasDpa} onChange={(v) => set({ hasDpa: v })} />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
        <Button variant="secondary" className="h-9" onClick={copy}>
          {copied ? "Questionnaire copié" : "Copier le questionnaire"}
        </Button>
        {!s.questionnaireSentAt ? (
          <Button variant="secondary" className="h-9" onClick={() => set({ questionnaireSentAt: new Date().toISOString() })}>
            Marquer comme envoyé
          </Button>
        ) : (
          <span className="text-sm text-ink-soft">Envoyé le {formatDate(s.questionnaireSentAt)}</span>
        )}
        <Button variant="secondary" className="h-9" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? "Fermer les réponses" : "Saisir les réponses"}
        </Button>
        {s.answeredAt && (
          <Button variant="quiet" className="h-9" onClick={() => set({ lastReviewAt: new Date().toISOString() })}>
            Marquer comme revu
          </Button>
        )}
        <Button variant="danger" className="ml-auto h-9 px-2" onClick={() => confirm(`Supprimer ${s.name} ?`) && removeSupplier(s.id)}>
          Supprimer
        </Button>
      </div>

      {open && (
        <div className="border-t border-line px-5 py-4">
          <ol className="space-y-3">
            {SUPPLIER_QUESTIONNAIRE.map((q, i) => (
              <li key={q.id} className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
                <p className="text-sm">
                  <span className="mr-1 text-ink-faint tabular">{i + 1}.</span>
                  {q.text}
                  {q.weight === 2 && <span className="ml-2 text-xs text-ink-soft">(essentiel)</span>}
                </p>
                <div className="flex gap-1" role="radiogroup" aria-label={q.text}>
                  {ANSWERS.map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={s.answers[q.id] === v}
                      onClick={() =>
                        set({
                          answers: { ...s.answers, [q.id]: v },
                          answeredAt: s.answeredAt ?? new Date().toISOString(),
                        })
                      }
                      className={clsx(
                        "h-8 rounded-md border px-3 text-xs font-semibold",
                        s.answers[q.id] === v ? "border-ink bg-ink text-surface" : "border-line-strong text-ink-soft",
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          {gaps.length > 0 && (
            <p className="mt-4 text-sm text-signal">
              Point{gaps.length > 1 ? "s" : ""} bloquant{gaps.length > 1 ? "s" : ""} : {gaps.map((g) => g.short).join(", ")}. Demandez un
              engagement écrit ou un plan de correction, ou envisagez un autre fournisseur.
            </p>
          )}
        </div>
      )}
    </li>
  );
}

export default function Fournisseurs() {
  const { workspace: ws, addSupplier } = useWorkspace();
  const [name, setName] = useState("");
  const [service, setService] = useState("");
  const [criticality, setCriticality] = useState<SupplierCriticality>("importante");
  const [dataAccess, setDataAccess] = useState<DataAccess>("internes");
  if (!ws) return null;

  const existing = new Set(ws.suppliers.map((s) => s.name));
  const suggestions = SUPPLIER_SUGGESTIONS.filter((x) => !existing.has(x.name));
  const order: Record<SupplierCriticality, number> = { critique: 0, importante: 1, standard: 2 };
  const sorted = [...ws.suppliers].sort((a, b) => order[a.criticality] - order[b.criticality]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addSupplier(blank(name.trim(), service.trim(), criticality, dataAccess));
    setName("");
    setService("");
  };

  return (
    <>
      <PageHeader
        title="Fournisseurs"
        description={`Les prestataires qui accèdent à vos informations ou dont votre activité dépend. Exigé par l'ISO 27001 (A.5.19 à A.5.22) et NIS2 (sécurité de la chaîne d'approvisionnement). ${CRITICALITY_HELP}`}
      />

      {suggestions.length > 0 && (
        <Section title="Fournisseurs courants à recenser" className="mb-6">
          <div className="flex flex-wrap gap-2 p-5">
            {suggestions.map((x) => (
              <Button key={x.name} variant="secondary" className="h-9" onClick={() => addSupplier(blank(x.name, x.service, x.criticality, x.dataAccess))}>
                Ajouter : {x.name}
              </Button>
            ))}
          </div>
          <p className="border-t border-line px-5 py-3 text-xs text-ink-faint">
            Remplacez ensuite le nom générique par celui de votre fournisseur, directement dans sa fiche.
          </p>
        </Section>
      )}

      {sorted.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong px-5 py-8 text-center text-ink-soft">
          Aucun fournisseur recensé. Commencez par votre prestataire informatique et votre messagerie.
        </p>
      ) : (
        <ul className="space-y-4">
          {sorted.map((s) => (
            <SupplierCard key={s.id} s={s} />
          ))}
        </ul>
      )}

      <Section title="Ajouter un fournisseur" className="mt-8">
        <form onSubmit={submit} className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-[1fr_1.5fr_1fr_1fr_auto] xl:items-end">
          <label className="text-sm">
            <span className="mb-1 block text-ink-soft">Nom</span>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. InfoServices Lyon" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-ink-soft">Service rendu</span>
            <input className={inputClass} value={service} onChange={(e) => setService(e.target.value)} placeholder="Ex. maintenance du parc informatique" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-ink-soft">Criticité</span>
            <select className={inputClass} value={criticality} onChange={(e) => setCriticality(e.target.value as SupplierCriticality)}>
              {Object.entries(CRITICALITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-ink-soft">Données confiées</span>
            <select className={inputClass} value={dataAccess} onChange={(e) => setDataAccess(e.target.value as DataAccess)}>
              {Object.entries(DATA_ACCESS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <Button type="submit" disabled={!name.trim()}>
            Ajouter
          </Button>
        </form>
      </Section>
    </>
  );
}
