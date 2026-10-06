"use client";

import clsx from "clsx";
import { useEffect, useState, type FormEvent } from "react";
import { Button, inputClass, PageHeader, Section } from "@/components/ui";
import {
  formatRemaining,
  INCIDENT_STATUS_LABELS,
  incidentDeadlines,
  type IncidentStatus,
} from "@/lib/incidents";
import { useWorkspace } from "@/lib/store";

const fmt = (d: Date | string) =>
  new Date(d).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });

function localNow() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function Incidents() {
  const { workspace: ws, addIncident, updateIncident, removeIncident } = useWorkspace();
  const [now, setNow] = useState(() => new Date());
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [detectedAt, setDetectedAt] = useState(localNow);
  const [significant, setSignificant] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  if (!ws) return null;

  const directScope = ws.nis2.status === "essentielle" || ws.nis2.status === "importante";
  const recipient = directScope ? "l'ANSSI (CERT-FR)" : "vos clients concernés, si vos contrats le prévoient";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addIncident({
      title: title.trim(),
      description: description.trim(),
      detectedAt: new Date(detectedAt).toISOString(),
      significant,
      earlyWarningAt: null,
      notificationAt: null,
      finalReportAt: null,
      status: "ouvert",
      lessons: "",
    });
    setTitle("");
    setDescription("");
    setSignificant(false);
    setDetectedAt(localNow());
    setOpen(false);
  };

  return (
    <>
      <PageHeader
        title="Incidents"
        description="Le registre de tout ce qui s'est passé, avec les échéances de notification pour les incidents importants."
        actions={!open && <Button onClick={() => setOpen(true)}>Déclarer un incident</Button>}
      />

      <div className="mb-6 rounded-lg border border-line bg-surface px-5 py-4 text-sm">
        <p>
          <strong>Incident important</strong> : il perturbe gravement votre activité, cause des pertes financières, ou des
          dommages importants à d&apos;autres personnes ou entreprises.
        </p>
        <p className="mt-1 text-ink-soft">
          Dans votre situation ({ws.nis2.label.toLowerCase()}), un incident important se signale à {recipient} : alerte
          précoce sous 24 h, notification sous 72 h, rapport final dans le mois qui suit.
        </p>
      </div>

      {open && (
        <Section title="Déclarer un incident" className="mb-6">
          <form onSubmit={submit} className="space-y-4 p-5">
            <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
              <label className="text-sm">
                <span className="mb-1 block font-medium">Ce qui s&apos;est passé</span>
                <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Messagerie d'un commercial piratée" autoFocus required />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Détecté le</span>
                <input type="datetime-local" className={inputClass} value={detectedAt} onChange={(e) => setDetectedAt(e.target.value)} required />
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Détails</span>
              <textarea className={clsx(inputClass, "h-24 py-2")} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Comment l'avez-vous découvert ? Qu'est-ce qui est touché ? Qu'avez-vous déjà fait ?" />
            </label>
            <fieldset className="text-sm">
              <legend className="mb-2 font-medium">Est-ce un incident important ?</legend>
              <div className="flex gap-2">
                {[true, false].map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    aria-pressed={significant === v}
                    onClick={() => setSignificant(v)}
                    className={clsx("h-9 rounded-md border px-4 font-semibold", significant === v ? "border-ink bg-ink text-surface" : "border-line-strong")}
                  >
                    {v ? "Oui, déclencher les échéances" : "Non"}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="flex gap-2">
              <Button type="submit" disabled={!title.trim()}>
                Enregistrer l&apos;incident
              </Button>
              <Button variant="quiet" type="button" onClick={() => setOpen(false)}>
                Annuler
              </Button>
            </div>
          </form>
        </Section>
      )}

      {ws.incidents.length === 0 && !open && (
        <p className="rounded-lg border border-dashed border-line-strong px-5 py-8 text-center text-ink-soft">
          Aucun incident enregistré. Tenir ce registre, même pour des incidents mineurs, est attendu par l&apos;auditeur ISO 27001.
        </p>
      )}

      <ul className="space-y-4">
        {ws.incidents.map((inc) => {
          const deadlines = incidentDeadlines(inc, now);
          return (
            <li key={inc.id} className="rounded-lg border border-line bg-surface">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-3">
                <div>
                  <p className="font-semibold">{inc.title}</p>
                  <p className="text-sm text-ink-soft">
                    Détecté le {fmt(inc.detectedAt)}
                    {inc.significant ? " · incident important" : " · incident mineur"}
                  </p>
                </div>
                <select
                  className="h-9 rounded-md border border-line-strong bg-surface px-2 text-sm"
                  value={inc.status}
                  aria-label="Statut de l'incident"
                  onChange={(e) => updateIncident(inc.id, { status: e.target.value as IncidentStatus })}
                >
                  {Object.entries(INCIDENT_STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {inc.description && <p className="border-b border-line px-5 py-3 text-sm text-ink-soft">{inc.description}</p>}

              {deadlines.length > 0 && (
                <ol className="grid border-b border-line md:grid-cols-3">
                  {deadlines.map((d, idx) => (
                    <li key={d.key} className={clsx("px-5 py-4", idx > 0 && "border-t border-line md:border-l md:border-t-0")}>
                      <p className="text-sm font-medium">
                        {idx + 1}. {d.label}
                      </p>
                      <p className="text-xs text-ink-soft">Avant le {fmt(d.due)}</p>
                      {d.state === "fait" ? (
                        <p className="mt-2 text-sm text-ok">Envoyé le {fmt(d.doneAt!)}</p>
                      ) : (
                        <>
                          <p className={clsx("mt-2 text-sm font-semibold tabular", d.state === "en_retard" ? "text-signal" : "text-ink")}>
                            {formatRemaining(d.remainingMs)}
                          </p>
                          <Button
                            variant="secondary"
                            className="mt-2 h-8 px-3"
                            onClick={() => updateIncident(inc.id, { [d.key]: new Date().toISOString() })}
                          >
                            Marquer comme envoyé
                          </Button>
                        </>
                      )}
                    </li>
                  ))}
                </ol>
              )}

              <div className="px-5 py-4">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Retour d&apos;expérience</span>
                  <textarea
                    className={clsx(inputClass, "h-20 py-2")}
                    defaultValue={inc.lessons}
                    placeholder="Cause, ce qui a bien ou mal fonctionné, mesures prises pour éviter que ça recommence."
                    onBlur={(e) => e.target.value !== inc.lessons && updateIncident(inc.id, { lessons: e.target.value })}
                  />
                </label>
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="danger"
                    className="h-8 px-2"
                    onClick={() => confirm("Supprimer cet incident du registre ?") && removeIncident(inc.id)}
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
