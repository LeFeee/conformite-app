"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button, inputClass } from "@/components/ui";
import { CONTROLS } from "@/lib/catalog/controls";
import { APP_NAME } from "@/lib/config";
import {
  assessNis2,
  computeApplicability,
  DEFAULT_ANSWERS,
  NIS2_SECTORS,
  type HeadcountBand,
  type RevenueBand,
  type ScopingAnswers,
} from "@/lib/scoping";
import { useWorkspace } from "@/lib/store";

const HEADCOUNTS: [HeadcountBand, string][] = [
  ["1", "Seulement moi"],
  ["2-9", "2 à 9 personnes"],
  ["10-49", "10 à 49 personnes"],
  ["50-249", "50 à 249 personnes"],
  ["250+", "250 personnes ou plus"],
];

const REVENUES: [RevenueBand, string][] = [
  ["<2M", "Moins de 2 M€"],
  ["2-10M", "2 à 10 M€"],
  ["10-50M", "10 à 50 M€"],
  ["50M+", "Plus de 50 M€"],
];

function Choice({
  selected,
  onClick,
  children,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={clsx(
        "w-full rounded-md border px-4 py-3 text-left transition-colors",
        selected
          ? "border-ink bg-void"
          : "border-line bg-surface hover:border-line-strong",
      )}
    >
      <span className="font-medium">{children}</span>
      {hint && <span className="mt-0.5 block text-sm text-ink-soft">{hint}</span>}
    </button>
  );
}

function YesNo({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line py-4 last:border-0">
      <div className="max-w-md">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-ink-soft">{hint}</p>
      </div>
      <div className="flex gap-2" role="radiogroup" aria-label={label}>
        {[true, false].map((v) => (
          <button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className={clsx(
              "h-9 w-16 rounded-md border text-sm font-semibold",
              value === v ? "border-ink bg-ink text-surface" : "border-line-strong",
            )}
          >
            {v ? "Oui" : "Non"}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Demarrer() {
  const router = useRouter();
  const { create, importDemo, localDemo, needsLogin, mode } = useWorkspace();
  const [a, setA] = useState<ScopingAnswers>(DEFAULT_ANSWERS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (needsLogin) router.replace("/connexion?suite=/demarrer");
  }, [needsLogin, router]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      router.push("/tableau-de-bord");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };
  const [step, setStep] = useState(0);
  const set = (patch: Partial<ScopingAnswers>) => setA((x) => ({ ...x, ...patch }));

  const result = useMemo(() => {
    const app = computeApplicability(a);
    const applicable = CONTROLS.filter((c) => app.get(c.id)!.applicable);
    const exclusions = new Map<string, string[]>();
    for (const c of CONTROLS) {
      const r = app.get(c.id)!;
      if (!r.applicable && r.exclusionReason) {
        exclusions.set(r.exclusionReason, [...(exclusions.get(r.exclusionReason) ?? []), c.id]);
      }
    }
    return { nis2: assessNis2(a), applicable, exclusions };
  }, [a]);

  const steps: { title: string; body: ReactNode; valid: boolean }[] = [
    {
      title: "Votre organisation",
      valid: a.organizationName.trim().length > 1,
      body: (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Nom de l&apos;organisation</span>
            <input
              className={inputClass}
              value={a.organizationName}
              onChange={(e) => set({ organizationName: e.target.value })}
              placeholder="Ex. Atelier Martin SAS"
              autoFocus
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Activité en une phrase</span>
            <input
              className={inputClass}
              value={a.activity}
              onChange={(e) => set({ activity: e.target.value })}
              placeholder="Ex. usinage de pièces pour l'aéronautique"
            />
          </label>
        </div>
      ),
    },
    {
      title: "Votre taille",
      valid: true,
      body: (
        <div className="grid gap-8 sm:grid-cols-2">
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Effectif</legend>
            {HEADCOUNTS.map(([v, l]) => (
              <Choice key={v} selected={a.headcount === v} onClick={() => set({ headcount: v })}>
                {l}
              </Choice>
            ))}
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Chiffre d&apos;affaires annuel</legend>
            {REVENUES.map(([v, l]) => (
              <Choice key={v} selected={a.revenue === v} onClick={() => set({ revenue: v })}>
                {l}
              </Choice>
            ))}
          </fieldset>
        </div>
      ),
    },
    {
      title: "Votre secteur",
      valid: true,
      body: (
        <div className="space-y-2">
          <p className="mb-3 text-ink-soft">
            Choisissez le secteur NIS2 qui correspond à votre activité principale, s&apos;il y en a un.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {NIS2_SECTORS.map((s) => (
              <Choice key={s.id} selected={a.nis2SectorId === s.id} onClick={() => set({ nis2SectorId: s.id })}>
                {s.label}
              </Choice>
            ))}
          </div>
          <Choice selected={a.nis2SectorId === null} onClick={() => set({ nis2SectorId: null })}>
            Aucun de ces secteurs
          </Choice>
        </div>
      ),
    },
    {
      title: "Vos clients",
      valid: true,
      body: (
        <YesNo
          label="Travaillez-vous pour des clients soumis à NIS2 ?"
          hint="Grands groupes industriels, hôpitaux, collectivités, énergéticiens, transporteurs… Ils vous demanderont des garanties de sécurité."
          value={a.supplierOfNis2Entity}
          onChange={(v) => set({ supplierOfNis2Entity: v })}
        />
      ),
    },
    {
      title: "Votre environnement",
      valid: true,
      body: (
        <div>
          <YesNo
            label="Développez-vous du logiciel ?"
            hint="En interne ou via un prestataire : site, application, logiciel métier."
            value={a.hasDevelopment}
            onChange={(v) => set({ hasDevelopment: v })}
          />
          <YesNo
            label="Avez-vous des locaux que vous maîtrisez ?"
            hint="Bureaux, atelier, entrepôt. Répondez non si vous êtes domicilié, en coworking ou 100 % à distance."
            value={a.hasPremises}
            onChange={(v) => set({ hasPremises: v })}
          />
          <YesNo
            label="Utilisez-vous des services en ligne ?"
            hint="Messagerie Microsoft 365 ou Google, stockage en ligne, logiciels en ligne (compta, CRM…)."
            value={a.usesCloud}
            onChange={(v) => set({ usesCloud: v })}
          />
          <YesNo
            label="Traitez-vous des données personnelles ?"
            hint="Fichiers clients, salariés, patients, candidats."
            value={a.handlesPersonalData}
            onChange={(v) => set({ handlesPersonalData: v })}
          />
        </div>
      ),
    },
    {
      title: "Vos objectifs",
      valid: a.targetIso27001 || a.targetNis2,
      body: (
        <div className="space-y-2">
          <Choice
            selected={a.targetIso27001}
            onClick={() => set({ targetIso27001: !a.targetIso27001 })}
            hint="Certification reconnue, souvent demandée par les grands clients."
          >
            Viser la certification ISO 27001
          </Choice>
          <Choice
            selected={a.targetNis2}
            onClick={() => set({ targetNis2: !a.targetNis2 })}
            hint="Obligation légale pour les entités concernées, attendue par leurs fournisseurs."
          >
            Se conformer à NIS2
          </Choice>
          {!(a.targetIso27001 || a.targetNis2) && (
            <p className="text-sm text-signal">Choisissez au moins un objectif pour continuer.</p>
          )}
        </div>
      ),
    },
  ];

  const isResult = step === steps.length;
  const current = steps[step];

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold">{APP_NAME}</span>
        <span className="text-ink-soft tabular">
          {isResult ? "Résultat du cadrage" : `Étape ${step + 1} sur ${steps.length}`}
        </span>
      </div>
      <div className="mt-3 h-1 rounded-full bg-void" aria-hidden>
        <div
          className="h-1 rounded-full bg-ink transition-[width]"
          style={{ width: `${(Math.min(step, steps.length) / steps.length) * 100}%` }}
        />
      </div>

      {mode === "supabase" && localDemo && step === 0 && (
        <div className="mt-8 rounded-lg border border-line bg-surface px-5 py-4">
          <p className="font-semibold">Un espace de démonstration existe dans ce navigateur</p>
          <p className="mt-1 text-sm text-ink-soft">
            « {localDemo.answers.organizationName} » : vous pouvez le reprendre tel quel, avec ses contrôles, preuves,
            risques, fournisseurs et sensibilisations. Les fichiers joints en démo ne sont pas transférés.
          </p>
          <Button className="mt-3" disabled={busy} onClick={() => run(importDemo)}>
            {busy ? "Import en cours…" : "Reprendre cet espace"}
          </Button>
        </div>
      )}
      {error && <p className="mt-6 rounded-md bg-signal-soft px-4 py-3 text-sm text-signal">Une erreur est survenue : {error}</p>}

      {!isResult ? (
        <section className="mt-10">
          <h1 className="text-[1.75rem] font-bold">{current.title}</h1>
          <div className="mt-6">{current.body}</div>
          <div className="mt-10 flex justify-between">
            <Button variant="quiet" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
              Précédent
            </Button>
            <Button onClick={() => setStep((s) => s + 1)} disabled={!current.valid}>
              Continuer
            </Button>
          </div>
        </section>
      ) : (
        <section className="mt-10">
          <h1 className="text-[1.75rem] font-bold">{a.organizationName}</h1>

          <div className="mt-6 rounded-lg border border-line bg-surface p-5">
            <p className="text-sm text-ink-soft">Situation NIS2</p>
            <p className="mt-1 text-xl font-semibold">{result.nis2.label}</p>
            <p className="mt-2 text-ink-soft">{result.nis2.explanation}</p>
            {result.nis2.sanction && (
              <p className="mt-2 text-sm">Sanction maximale : {result.nis2.sanction}</p>
            )}
            <p className="mt-3 text-xs text-ink-faint">
              Estimation à confirmer avec le test officiel de l&apos;ANSSI sur MonEspaceNIS2.
            </p>
          </div>

          <div className="mt-4 rounded-lg border border-line bg-surface p-5">
            <p className="text-sm text-ink-soft">Votre plan</p>
            <p className="mt-1 text-xl font-semibold tabular">
              {result.applicable.length} contrôles à mettre en place,{" "}
              {result.applicable.filter((c) => c.priority === "socle").length} essentiels pour commencer
            </p>
            {result.exclusions.size > 0 && (
              <>
                <p className="mt-4 text-sm font-medium">
                  {CONTROLS.length - result.applicable.length} contrôles exclus, avec justification déjà rédigée :
                </p>
                <ul className="mt-2 space-y-2 text-sm text-ink-soft">
                  {[...result.exclusions].map(([reason, ids]) => (
                    <li key={reason}>
                      <span className="tabular font-medium text-ink">{ids.length}</span> — {reason}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="mt-10 flex justify-between">
            <Button variant="quiet" onClick={() => setStep((s) => s - 1)}>
              Modifier mes réponses
            </Button>
            <Button disabled={busy} onClick={() => run(() => create(a))}>
              {busy ? "Création…" : "Créer mon espace"}
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}
