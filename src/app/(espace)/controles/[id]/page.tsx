"use client";

import clsx from "clsx";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, inputClass, Section, STATUS_COLOR } from "@/components/ui";
import { CONTROLS_BY_ID } from "@/lib/catalog/controls";
import { FRAMEWORKS, REQUIREMENTS_BY_ID } from "@/lib/catalog/frameworks";
import { STATUS_LABELS, TAG_LABELS, THEME_LABELS, type ControlStatus } from "@/lib/catalog/types";
import {
  addDays,
  daysBetween,
  EVIDENCE_KIND_LABELS,
  evidenceFor,
  formatDate,
  isEvidenceValid,
  today,
  type EvidenceKind,
} from "@/lib/domain";
import { useWorkspace } from "@/lib/store";

const STATUSES: ControlStatus[] = ["a_faire", "en_cours", "conforme", "non_applicable"];

export default function ControlePage() {
  const { id: rawId } = useParams<{ id: string }>();
  const id = decodeURIComponent(rawId);
  // key : on repart d'un état de formulaire vierge à chaque changement de contrôle
  return <ControleDetail key={id} id={id} />;
}

function ControleDetail({ id }: { id: string }) {
  const control = CONTROLS_BY_ID.get(id);
  const { workspace: ws, updateControl, addEvidence, removeEvidence, markReviewed } = useWorkspace();

  const [evTitle, setEvTitle] = useState("");
  const [evKind, setEvKind] = useState<EvidenceKind>("document");
  const [evFile, setEvFile] = useState<string | null>(null);
  const [evUrl, setEvUrl] = useState("");
  const [evUntil, setEvUntil] = useState(() => (control ? addDays(today(), control.reviewDays) : ""));
  const [naReason, setNaReason] = useState("");
  const [askNa, setAskNa] = useState(false);

  if (!ws) return null;
  if (!control) {
    return (
      <div>
        <p>Ce contrôle n&apos;existe pas.</p>
        <Link href="/controles" className="underline">
          Retour à la liste
        </Link>
      </div>
    );
  }

  const oc = ws.controls[id];
  const evidences = evidenceFor(ws, id);
  const byFramework = FRAMEWORKS.map((f) => ({
    framework: f,
    reqs: control.covers.filter((r) => r.startsWith(f.id + ":")).map((r) => REQUIREMENTS_BY_ID.get(r)!),
  })).filter((g) => g.reqs.length);

  const setStatus = (s: ControlStatus) => {
    if (s === "non_applicable") {
      setNaReason(oc.exclusionReason ?? "");
      setAskNa(true);
      return;
    }
    setAskNa(false);
    updateControl(id, { status: s, applicable: true });
  };

  const submitEvidence = (e: FormEvent) => {
    e.preventDefault();
    if (!evTitle.trim()) return;
    addEvidence({
      controlId: id,
      title: evTitle.trim(),
      kind: evKind,
      fileName: evFile,
      url: evUrl.trim() || null,
      validUntil: evUntil || null,
    });
    setEvTitle("");
    setEvFile(null);
    setEvUrl("");
    (e.target as HTMLFormElement).reset();
  };

  return (
    <>
      <nav className="mb-4 text-sm text-ink-soft">
        <Link href="/controles" className="hover:underline">
          Contrôles
        </Link>{" "}
        / <span className="tabular">{control.id}</span>
      </nav>

      <header className="mb-8 max-w-3xl">
        <h1 className="text-[1.75rem] font-bold leading-tight">{control.title}</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {THEME_LABELS[control.theme]}
          {control.priority === "socle" && " · Essentiel pour commencer"}
          {control.tags.length > 0 && ` · Concerne : ${control.tags.map((t) => TAG_LABELS[t].toLowerCase()).join(", ")}`}
        </p>
        <p className="mt-4 text-lg leading-relaxed">{control.enClair}</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Section title="Avancement">
            <div className="space-y-5 p-5">
              <div role="radiogroup" aria-label="Statut" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {STATUSES.map((s) => {
                  const active = oc.status === s && !(askNa && s !== "non_applicable");
                  return (
                    <button
                      key={s}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setStatus(s)}
                      className={clsx(
                        "flex h-11 items-center justify-center gap-2 rounded-md border text-sm",
                        active ? "border-ink font-semibold" : "border-line text-ink-soft hover:border-line-strong",
                      )}
                    >
                      <span className="size-2.5 rounded-full" style={{ background: STATUS_COLOR[s] }} aria-hidden />
                      {STATUS_LABELS[s]}
                    </button>
                  );
                })}
              </div>

              {(askNa || oc.status === "non_applicable") && (
                <div className="rounded-md bg-paper p-4">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">
                      Justification de l&apos;exclusion (reprise dans la déclaration d&apos;applicabilité)
                    </span>
                    <textarea
                      className={clsx(inputClass, "h-20 py-2")}
                      value={askNa ? naReason : (oc.exclusionReason ?? "")}
                      onChange={(e) =>
                        askNa ? setNaReason(e.target.value) : updateControl(id, { exclusionReason: e.target.value })
                      }
                    />
                  </label>
                  {askNa && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        disabled={naReason.trim().length < 10}
                        onClick={() => {
                          updateControl(id, { status: "non_applicable", applicable: false, exclusionReason: naReason.trim() });
                          setAskNa(false);
                        }}
                      >
                        Exclure ce contrôle
                      </Button>
                      <Button variant="quiet" onClick={() => setAskNa(false)}>
                        Annuler
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">Responsable</span>
                  <input
                    className={inputClass}
                    defaultValue={oc.owner ?? ""}
                    placeholder="Ex. Julie (office manager)"
                    onBlur={(e) => {
                      const v = e.target.value.trim() || null;
                      if (v !== oc.owner) updateControl(id, { owner: v });
                    }}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">Échéance</span>
                  <input
                    type="date"
                    className={inputClass}
                    value={oc.dueDate ?? ""}
                    onChange={(e) => updateControl(id, { dueDate: e.target.value || null })}
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Notes</span>
                <textarea
                  className={clsx(inputClass, "h-24 py-2")}
                  defaultValue={oc.notes}
                  placeholder="Ce qui est en place, ce qu'il reste à faire, qui a été contacté…"
                  onBlur={(e) => e.target.value !== oc.notes && updateControl(id, { notes: e.target.value })}
                />
              </label>
              {oc.status === "conforme" && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-sm">
                  <span className="text-ink-soft">
                    Dernière revue : {formatDate(oc.lastReviewedAt)} · prochaine avant le{" "}
                    {formatDate(addDays(oc.lastReviewedAt ?? oc.updatedAt, control.reviewDays))}
                  </span>
                  <Button variant="secondary" onClick={() => markReviewed(id)}>
                    Marquer comme revu aujourd&apos;hui
                  </Button>
                </div>
              )}
            </div>
          </Section>

          <Section title="Preuves" aside={`${evidences.length}`}>
            {evidences.length > 0 && (
              <ul className="divide-y divide-line border-b border-line">
                {evidences.map((ev) => {
                  const valid = isEvidenceValid(ev);
                  const left = ev.validUntil ? daysBetween(today(), ev.validUntil) : null;
                  return (
                    <li key={ev.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
                      <div>
                        <p className="font-medium">{ev.title}</p>
                        <p className="text-sm text-ink-soft">
                          {EVIDENCE_KIND_LABELS[ev.kind]}
                          {ev.fileName && ` · ${ev.fileName}`}
                          {ev.url && (
                            <>
                              {" · "}
                              <a href={ev.url} target="_blank" rel="noreferrer" className="underline">
                                lien
                              </a>
                            </>
                          )}
                          {" · ajoutée le "}
                          {formatDate(ev.addedAt)}
                        </p>
                        <p className={clsx("text-sm", !valid ? "text-signal" : left !== null && left <= 30 ? "text-ochre" : "text-ink-soft")}>
                          {ev.validUntil
                            ? valid
                              ? `Valable jusqu'au ${formatDate(ev.validUntil)}`
                              : `Expirée depuis le ${formatDate(ev.validUntil)}`
                            : "Sans date d'expiration"}
                        </p>
                      </div>
                      <Button variant="danger" className="h-8 px-2" onClick={() => removeEvidence(ev.id)}>
                        Supprimer
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
            <form onSubmit={submitEvidence} className="space-y-4 p-5">
              <p className="text-sm font-medium">Ajouter une preuve</p>
              <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
                <input
                  className={inputClass}
                  placeholder="Ex. Politique de sécurité signée"
                  value={evTitle}
                  onChange={(e) => setEvTitle(e.target.value)}
                  aria-label="Titre de la preuve"
                  required
                />
                <select
                  className={inputClass}
                  value={evKind}
                  onChange={(e) => setEvKind(e.target.value as EvidenceKind)}
                  aria-label="Type de preuve"
                >
                  {Object.entries(EVIDENCE_KIND_LABELS).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Fichier</span>
                  <input
                    type="file"
                    className="block w-full text-sm text-ink-soft file:mr-3 file:rounded-md file:border file:border-line-strong file:bg-surface file:px-3 file:py-1.5 file:text-ink"
                    onChange={(e) => setEvFile(e.target.files?.[0]?.name ?? null)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Ou un lien</span>
                  <input className={inputClass} type="url" placeholder="https://" value={evUrl} onChange={(e) => setEvUrl(e.target.value)} />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Valable jusqu&apos;au</span>
                  <input className={inputClass} type="date" value={evUntil} onChange={(e) => setEvUntil(e.target.value)} />
                </label>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-ink-faint">
                  Démo : seul le nom du fichier est enregistré. Le dépôt réel arrivera avec Supabase.
                </p>
                <Button type="submit" disabled={!evTitle.trim()}>
                  Ajouter la preuve
                </Button>
              </div>
            </form>
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Preuves attendues">
            <ul className="space-y-1 p-3">
              {control.evidence.map((e) => (
                <li key={e}>
                  <button
                    type="button"
                    onClick={() => setEvTitle(e)}
                    className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-paper"
                    title="Utiliser comme titre de preuve"
                  >
                    {e}
                  </button>
                </li>
              ))}
            </ul>
            <p className="border-t border-line px-5 py-3 text-xs text-ink-faint">
              Cliquez sur une ligne pour la reprendre comme titre. Revue recommandée tous les {control.reviewDays} jours.
            </p>
          </Section>

          <Section title="Exigences couvertes">
            <div className="divide-y divide-line">
              {byFramework.map(({ framework, reqs }) => (
                <div key={framework.id} className="px-5 py-4">
                  <p className="mb-2 text-sm font-semibold">{framework.shortName}</p>
                  <ul className="space-y-1.5 text-sm">
                    {reqs.map((r) => (
                      <li key={r.id} className="grid grid-cols-[6.5rem_1fr] gap-2">
                        <span className="text-ink-faint tabular">{r.ref}</span>
                        <span className="text-ink-soft">{r.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}
