"use client";

import clsx from "clsx";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { Button, inputClass, PageHeader, Section } from "@/components/ui";
import { addDays, formatDate, today } from "@/lib/domain";
import { useWorkspace } from "@/lib/store";
import {
  AUDIENCE_LABELS,
  METHOD_LABELS,
  PASS_MARK,
  QUIZ,
  quizScore,
  trainingStatus,
  type TrainingAudience,
  type TrainingMethod,
} from "@/lib/training";

const VALIDITY_DAYS = 365;

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" | "bad" }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <p className="text-sm text-ink-soft">{label}</p>
      <p
        className={clsx(
          "mt-1 text-2xl font-semibold tabular",
          tone === "ok" && "text-ok",
          tone === "warn" && "text-ochre-text",
          tone === "bad" && "text-signal",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Quiz() {
  const { addTraining, workspace: ws } = useWorkspace();
  const [person, setPerson] = useState("");
  const [audience, setAudience] = useState<TrainingAudience>("salarie");
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(() => QUIZ.map(() => null));
  const [result, setResult] = useState<{ score: number; recorded: boolean } | null>(null);

  const remaining = answers.filter((a) => a === null).length;

  const restart = (keepPerson: boolean) => {
    setAnswers(QUIZ.map(() => null));
    setResult(null);
    setStarted(keepPerson);
    if (!keepPerson) setPerson("");
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const score = quizScore(answers);
    const passed = score >= PASS_MARK;
    if (passed) {
      const date = today();
      addTraining({
        person: person.trim(),
        audience,
        method: "quiz",
        date,
        score,
        validUntil: addDays(date, VALIDITY_DAYS),
        notes: "",
      });
    }
    setResult({ score, recorded: passed });
    window.scrollTo({ top: document.getElementById("quiz")?.offsetTop ?? 0, behavior: "smooth" });
  };

  const latestId = result?.recorded ? ws?.trainings[0]?.id : undefined;

  if (!started) {
    return (
      <form
        className="grid gap-4 p-5 sm:grid-cols-[1fr_14rem_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (person.trim()) setStarted(true);
        }}
      >
        <label className="text-sm">
          <span className="mb-1 block text-ink-soft">Nom de la personne qui passe le quiz</span>
          <input className={inputClass} value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Prénom Nom" required />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-ink-soft">Fonction</span>
          <select className={inputClass} value={audience} onChange={(e) => setAudience(e.target.value as TrainingAudience)}>
            {Object.entries(AUDIENCE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <Button type="submit">Commencer</Button>
        <p className="text-sm text-ink-soft sm:col-span-3">
          10 questions sur les situations du quotidien, environ 5 minutes. Il faut {PASS_MARK} bonnes réponses sur 10 pour
          obtenir l&apos;attestation, valable un an.
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={submit}>
      {result && (
        <div className={clsx("border-b border-line px-5 py-4", result.recorded ? "bg-ok-soft" : "bg-ochre-soft")}>
          <p className="text-lg font-semibold">
            {person} : {result.score}/10 —{" "}
            {result.recorded ? "réussi, attestation enregistrée" : `pas encore, il faut ${PASS_MARK}/10`}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {result.recorded
              ? "L'attestation sert de preuve pour la sensibilisation (ISO 27001 A.6.3 et §7.3). Relisez les explications ci-dessous."
              : "Lisez les explications sous chaque question, puis recommencez."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {latestId && (
              <Link href={`/sensibilisation/${latestId}`} className="inline-flex h-10 items-center rounded-md bg-ink px-4 text-sm font-semibold text-surface hover:opacity-85">
                Voir l&apos;attestation
              </Link>
            )}
            {!result.recorded && (
              <Button type="button" onClick={() => restart(true)}>
                Recommencer
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={() => restart(false)}>
              Quiz pour une autre personne
            </Button>
          </div>
        </div>
      )}

      <ol className="divide-y divide-line">
        {QUIZ.map((q, i) => {
          const chosen = answers[i];
          return (
            <li key={q.id} className="px-5 py-4">
              <fieldset disabled={!!result}>
                <legend className="font-medium">
                  <span className="mr-2 text-ink-faint tabular">{i + 1}.</span>
                  {q.question}
                </legend>
                <div className="mt-3 space-y-2">
                  {q.options.map((opt, j) => {
                    const isRight = j === q.correct;
                    return (
                      <label
                        key={opt}
                        className={clsx(
                          "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm",
                          !result && (chosen === j ? "border-ink" : "border-line hover:border-line-strong"),
                          result && isRight && "border-ok bg-ok-soft",
                          result && !isRight && chosen === j && "border-signal bg-signal-soft",
                          result && !isRight && chosen !== j && "border-line opacity-60",
                        )}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          className="mt-0.5 size-4 accent-[var(--ink)]"
                          checked={chosen === j}
                          onChange={() => setAnswers((a) => a.map((x, k) => (k === i ? j : x)))}
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
                {result && (
                  <p className="mt-2 text-sm text-ink-soft">
                    <span className="font-medium text-ink">{chosen === q.correct ? "Bonne réponse. " : "À retenir : "}</span>
                    {q.explanation}
                  </p>
                )}
              </fieldset>
            </li>
          );
        })}
      </ol>

      {!result && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
          <p className="text-sm text-ink-soft">
            {remaining ? `${remaining} question${remaining > 1 ? "s" : ""} sans réponse` : "Toutes les questions ont une réponse."}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="quiet" onClick={() => restart(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={remaining > 0}>
              Valider mes réponses
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}

function SessionForm() {
  const { addTraining } = useWorkspace();
  const [names, setNames] = useState("");
  const [method, setMethod] = useState<Exclude<TrainingMethod, "quiz">>("session");
  const [audience, setAudience] = useState<TrainingAudience>("salarie");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(0);

  const people = names
    .split(/\n|,|;/)
    .map((n) => n.trim())
    .filter(Boolean);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!people.length) return;
    for (const person of people) {
      addTraining({ person, audience, method, date, score: null, validUntil: addDays(date, VALIDITY_DAYS), notes: notes.trim() });
    }
    setSaved(people.length);
    setNames("");
    setNotes("");
  };

  return (
    <form onSubmit={submit} className="grid gap-4 p-5 md:grid-cols-2">
      <label className="text-sm md:row-span-3">
        <span className="mb-1 block text-ink-soft">Participants (un nom par ligne)</span>
        <textarea
          className={clsx(inputClass, "h-40 py-2")}
          value={names}
          onChange={(e) => {
            setNames(e.target.value);
            setSaved(0);
          }}
          placeholder={"Prénom Nom\nPrénom Nom"}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-ink-soft">Type</span>
          <select className={inputClass} value={method} onChange={(e) => setMethod(e.target.value as "session" | "externe")}>
            <option value="session">{METHOD_LABELS.session}</option>
            <option value="externe">{METHOD_LABELS.externe}</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-ink-soft">Date</span>
          <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
      </div>
      <label className="text-sm">
        <span className="mb-1 block text-ink-soft">Fonction</span>
        <select className={inputClass} value={audience} onChange={(e) => setAudience(e.target.value as TrainingAudience)}>
          {Object.entries(AUDIENCE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-ink-soft">Sujet, intervenant ou organisme</span>
        <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex. Atelier hameçonnage, Cybermalveillance.gouv.fr" />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2">
        <p className="text-sm text-ink-soft">
          {saved
            ? `${saved} personne${saved > 1 ? "s" : ""} ajoutée${saved > 1 ? "s" : ""} au registre. Gardez la feuille d'émargement ou le certificat de l'organisme.`
            : "Chaque participant reçoit une attestation valable un an."}
        </p>
        <Button type="submit" disabled={!people.length}>
          Enregistrer {people.length > 1 ? `${people.length} participants` : "le participant"}
        </Button>
      </div>
    </form>
  );
}

export default function Sensibilisation() {
  const { workspace: ws, removeTraining } = useWorkspace();
  const status = useMemo(() => (ws ? trainingStatus(ws.trainings, today()) : null), [ws]);
  if (!ws || !status) return null;

  const leadersRequired = !!ws.controls["NIS2.20"]?.applicable;
  const history = (person: string) => ws.trainings.filter((t) => t.person.trim().toLowerCase() === person.trim().toLowerCase()).length;

  return (
    <>
      <PageHeader
        title="Sensibilisation des équipes"
        description="Chaque personne qui accède à vos données doit être sensibilisée une fois par an. Faites passer le quiz ou enregistrez une session : l'attestation devient une preuve pour l'audit."
        actions={
          <Button variant="secondary" onClick={() => window.print()} className="print:hidden">
            Imprimer le registre
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Personnes à jour" value={`${status.valid.length}`} tone={status.valid.length ? "ok" : undefined} />
        <Stat label="À renouveler" value={`${status.expired.length}`} tone={status.expired.length ? "warn" : undefined} />
        <Stat
          label="Dirigeants formés (NIS2 art. 20)"
          value={leadersRequired ? (status.leadersTrained ? "Oui" : "Non") : "Non exigé"}
          tone={leadersRequired ? (status.leadersTrained ? "ok" : "bad") : undefined}
        />
      </div>

      <Section title="Quiz de sensibilisation" className="mt-8 print:hidden">
        <div id="quiz">
          <Quiz />
        </div>
      </Section>

      <Section title="Session collective ou formation externe" className="mt-8 print:hidden">
        <SessionForm />
      </Section>

      <Section title="Registre des personnes sensibilisées" aside={`${status.latestByPerson.length}`} className="mt-8">
        {status.latestByPerson.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-soft">
            Personne n&apos;est encore enregistré. Commencez par vous-même : passez le quiz ci-dessus.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-ink-faint">
                <tr>
                  <th className="px-5 py-2 font-medium">Personne</th>
                  <th className="py-2 pr-3 font-medium">Fonction</th>
                  <th className="py-2 pr-3 font-medium">Formation</th>
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Valable jusqu&apos;au</th>
                  <th className="py-2 pr-5 font-medium print:hidden" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {status.latestByPerson.map((t) => {
                  const expired = t.validUntil < today();
                  const n = history(t.person);
                  return (
                    <tr key={t.id} className="break-inside-avoid">
                      <td className="px-5 py-2.5">
                        <span className="font-medium">{t.person}</span>
                        {n > 1 && <span className="ml-2 text-xs text-ink-faint">{n} formations</span>}
                      </td>
                      <td className="py-2.5 pr-3">{AUDIENCE_LABELS[t.audience]}</td>
                      <td className="py-2.5 pr-3">
                        {METHOD_LABELS[t.method]}
                        {t.score !== null && <span className="ml-1 text-ink-soft tabular">({t.score}/10)</span>}
                        {t.notes && <span className="block text-xs text-ink-soft">{t.notes}</span>}
                      </td>
                      <td className="whitespace-nowrap py-2.5 pr-3 tabular">{formatDate(t.date)}</td>
                      <td className={clsx("whitespace-nowrap py-2.5 pr-3 tabular", expired && "font-semibold text-signal")}>
                        {formatDate(t.validUntil)}
                        {expired && <span className="block text-xs font-normal">À renouveler</span>}
                      </td>
                      <td className="whitespace-nowrap py-2.5 pr-5 text-right print:hidden">
                        <Link href={`/sensibilisation/${t.id}`} className="underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                          Attestation
                        </Link>
                        <button
                          type="button"
                          className="ml-3 text-ink-faint hover:text-signal"
                          onClick={() => confirm(`Retirer la formation de ${t.person} du registre ?`) && removeTraining(t.id)}
                        >
                          Retirer
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <p className="mt-4 text-xs text-ink-faint print:hidden">
        Ce que l&apos;auditeur vérifiera : que toute personne ayant accès à l&apos;information a été sensibilisée, à quelle date,
        et que la sensibilisation est renouvelée. Les dirigeants d&apos;une entité NIS2 doivent suivre une formation
        spécifique (art. 20 §2).
      </p>
    </>
  );
}
