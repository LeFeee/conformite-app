"use client";

import clsx from "clsx";
import { useMemo, useState, type FormEvent } from "react";
import { Button, inputClass, PageHeader, Section } from "@/components/ui";
import {
  ASSET_ISSUE_LABELS,
  assetIssues,
  CATEGORY_LABELS,
  CATEGORY_PLURAL,
  CLASSIFICATION_HELP,
  CLASSIFICATION_LABELS,
  guessSupplier,
  MIN_ASSETS,
  suggestedAssets,
  type Asset,
  type AssetCategory,
  type AssetDraft,
  type Classification,
} from "@/lib/assets";
import { formatDate } from "@/lib/domain";
import { useWorkspace } from "@/lib/store";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as AssetCategory[];
const CLASSIFICATIONS = Object.keys(CLASSIFICATION_LABELS) as Classification[];

const CLASS_STYLE: Record<Classification, string> = {
  public: "text-ink-soft",
  interne: "text-ink",
  confidentiel: "text-ochre-text font-semibold",
  sensible: "text-signal font-semibold",
};

function Suggestions({ drafts, onAdd, title }: { drafts: AssetDraft[]; onAdd: (d: AssetDraft[]) => void; title: string }) {
  const [picked, setPicked] = useState<Set<string>>(() => new Set(drafts.map((d) => d.name)));
  const chosen = drafts.filter((d) => picked.has(d.name));
  return (
    <Section title={title} aside={`${drafts.length}`} className="mt-8 print:hidden">
      <ul className="grid gap-x-6 gap-y-1 px-5 py-4 sm:grid-cols-2">
        {drafts.map((d) => (
          <li key={d.name}>
            <label className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-1.5 hover:bg-void">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-[var(--ink)]"
                checked={picked.has(d.name)}
                onChange={(e) =>
                  setPicked((p) => {
                    const n = new Set(p);
                    if (e.target.checked) n.add(d.name);
                    else n.delete(d.name);
                    return n;
                  })
                }
              />
              <span className="text-sm">
                <span className="font-medium">{d.name}</span>
                <span className="text-ink-soft"> · {CATEGORY_LABELS[d.category]} · {CLASSIFICATION_LABELS[d.classification]}</span>
                <span className="block text-ink-soft">{d.description}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
        <p className="text-sm text-ink-soft">Proposés d&apos;après votre cadrage. Vous pourrez tout ajuster ensuite.</p>
        <Button disabled={!chosen.length} onClick={() => onAdd(chosen)}>
          Ajouter {chosen.length} actif{chosen.length > 1 ? "s" : ""}
        </Button>
      </div>
    </Section>
  );
}

function AddForm() {
  const { addAssets } = useWorkspace();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<AssetCategory>("donnees");
  const [classification, setClassification] = useState<Classification>("interne");
  const [owner, setOwner] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addAssets([
      {
        name: name.trim(),
        category,
        classification,
        description: "",
        owner: owner.trim() || null,
        essential: false,
        personalData: classification === "sensible",
        location: "",
        supplierId: null,
      },
    ]);
    setName("");
    setOwner("");
  };

  return (
    <form onSubmit={submit} className="grid gap-4 p-5 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto] md:items-end">
      <label className="text-sm">
        <span className="mb-1 block text-ink-soft">Actif</span>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Logiciel de paie" required />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-ink-soft">Type</span>
        <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value as AssetCategory)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-ink-soft">Sensibilité</span>
        <select className={inputClass} value={classification} onChange={(e) => setClassification(e.target.value as Classification)}>
          {CLASSIFICATIONS.map((c) => (
            <option key={c} value={c}>{CLASSIFICATION_LABELS[c]}</option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-ink-soft">Responsable</span>
        <input className={inputClass} value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Prénom" />
      </label>
      <Button type="submit" disabled={!name.trim()}>
        Ajouter
      </Button>
    </form>
  );
}

function AssetRow({ x }: { x: Asset }) {
  const { workspace: ws, updateAsset, reviewAsset, removeAsset } = useWorkspace();
  if (!ws) return null;
  const issues = assetIssues(x);
  const set = (patch: Partial<Asset>) => updateAsset(x.id, patch);

  return (
    <tr className="break-inside-avoid align-top">
      <td className="px-5 py-3">
        <input
          className="w-full bg-transparent font-medium focus:outline-none print:hidden"
          defaultValue={x.name}
          aria-label="Nom de l'actif"
          onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== x.name && set({ name: e.target.value.trim() })}
        />
        <span className="hidden font-medium print:inline">{x.name}</span>
        {x.description && <p className="text-xs text-ink-soft">{x.description}</p>}
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs print:hidden">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" className="size-3.5 accent-[var(--ink)]" checked={x.essential} onChange={(e) => set({ essential: e.target.checked })} />
            Indispensable à l&apos;activité
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" className="size-3.5 accent-[var(--ink)]" checked={x.personalData} onChange={(e) => set({ personalData: e.target.checked })} />
            Données personnelles
          </label>
        </div>
        <p className="hidden text-xs text-ink-soft print:block">
          {[x.essential && "Indispensable", x.personalData && "Données personnelles"].filter(Boolean).join(" · ")}
        </p>
        {issues.length > 0 && (
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {issues.map((i) => (
              <li key={i} className="rounded bg-ochre-soft px-1.5 py-0.5 text-xs font-semibold text-ochre-text">
                {ASSET_ISSUE_LABELS[i]}
              </li>
            ))}
          </ul>
        )}
      </td>
      <td className="py-3 pr-3">
        <input
          className={clsx(inputClass, "h-9", !x.owner && "border-ochre")}
          defaultValue={x.owner ?? ""}
          placeholder="À désigner"
          aria-label={`Responsable de ${x.name}`}
          onBlur={(e) => (e.target.value.trim() || null) !== x.owner && set({ owner: e.target.value.trim() || null })}
        />
      </td>
      <td className="py-3 pr-3">
        <select
          className={clsx(inputClass, "h-9", CLASS_STYLE[x.classification])}
          value={x.classification}
          title={CLASSIFICATION_HELP[x.classification]}
          aria-label={`Sensibilité de ${x.name}`}
          onChange={(e) => set({ classification: e.target.value as Classification })}
        >
          {CLASSIFICATIONS.map((c) => (
            <option key={c} value={c}>{CLASSIFICATION_LABELS[c]}</option>
          ))}
        </select>
      </td>
      <td className="py-3 pr-3">
        <input
          className={clsx(inputClass, "h-9")}
          defaultValue={x.location}
          placeholder="Où ?"
          aria-label={`Emplacement de ${x.name}`}
          onBlur={(e) => e.target.value.trim() !== x.location && set({ location: e.target.value.trim() })}
        />
      </td>
      <td className="py-3 pr-3">
        <select
          className={clsx(inputClass, "h-9")}
          value={x.supplierId ?? ""}
          aria-label={`Fournisseur de ${x.name}`}
          onChange={(e) => set({ supplierId: e.target.value || null })}
        >
          <option value="">Aucun</option>
          {ws.suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </td>
      <td className="whitespace-nowrap py-3 pr-5 text-right text-sm print:hidden">
        <button type="button" className="text-ink-soft underline decoration-line-strong underline-offset-4 hover:text-ink" onClick={() => reviewAsset(x.id)} title={`Revu le ${formatDate(x.reviewedAt ?? x.createdAt)}`}>
          Revu
        </button>
        <button type="button" className="ml-3 text-ink-faint hover:text-signal" onClick={() => confirm(`Retirer « ${x.name} » de l'inventaire ?`) && removeAsset(x.id)}>
          Retirer
        </button>
      </td>
    </tr>
  );
}

function BulkOwner({ count }: { count: number }) {
  const { workspace: ws, updateAsset } = useWorkspace();
  const [name, setName] = useState("");
  if (!ws) return null;
  return (
    <form
      className="mt-8 flex flex-wrap items-center gap-3 rounded-lg border border-ochre bg-ochre-soft px-5 py-3 text-sm print:hidden"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        for (const x of ws.assets) if (!x.owner?.trim()) updateAsset(x.id, { owner: name.trim() });
        setName("");
      }}
    >
      <span>
        <strong>{count} actif{count > 1 ? "s" : ""}</strong> sans responsable. Les confier tous à :
      </span>
      <span className="w-44">
        <input className={clsx(inputClass, "h-9")} value={name} onChange={(e) => setName(e.target.value)} placeholder="Prénom" aria-label="Responsable à attribuer" />
      </span>
      <Button type="submit" className="h-9" disabled={!name.trim()}>
        Attribuer
      </Button>
      <span className="text-ink-soft">Vous pourrez ensuite changer au cas par cas.</span>
    </form>
  );
}

export default function Actifs() {
  const { workspace: ws, addAssets: add } = useWorkspace();
  const addAssets = (drafts: AssetDraft[]) =>
    add(drafts.map((d) => ({ ...d, supplierId: d.supplierId ?? guessSupplier(d, ws?.suppliers ?? []) })));
  const remaining = useMemo(() => {
    if (!ws) return [];
    const have = new Set(ws.assets.map((x) => x.name.trim().toLowerCase()));
    return suggestedAssets(ws.answers).filter((d) => !have.has(d.name.toLowerCase()));
  }, [ws]);
  if (!ws) return null;

  const orphans = ws.assets.filter((x) => !x.owner?.trim()).length;
  const essentials = ws.assets.filter((x) => x.essential).length;
  const personal = ws.assets.filter((x) => x.personalData).length;
  const byCategory = CATEGORIES.map((c) => [c, ws.assets.filter((x) => x.category === c)] as const).filter(([, list]) => list.length);

  return (
    <>
      <PageHeader
        title="Inventaire des actifs"
        description="Tout ce que vous devez protéger : données, applications, services en ligne, matériel et locaux. Chaque actif a un responsable et un niveau de sensibilité."
        actions={
          ws.assets.length > 0 && (
            <Button variant="secondary" onClick={() => window.print()} className="print:hidden">
              Imprimer l&apos;inventaire
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ["Actifs recensés", ws.assets.length, ws.assets.length >= MIN_ASSETS ? "text-ok" : "text-ink"],
          ["Sans responsable", orphans, orphans ? "text-ochre-text" : "text-ink"],
          ["Indispensables", essentials, "text-ink"],
          ["Avec données personnelles", personal, "text-ink"],
        ].map(([label, value, tone]) => (
          <div key={label as string} className="rounded-lg border border-line bg-surface p-5">
            <p className="text-sm text-ink-soft">{label}</p>
            <p className={clsx("mt-1 text-2xl font-semibold tabular", tone as string)}>{value}</p>
          </div>
        ))}
      </div>

      {ws.assets.length === 0 && remaining.length > 0 && (
        <Suggestions key="first" title="Commencez par les actifs habituels" drafts={remaining} onAdd={addAssets} />
      )}

      {orphans > 0 && <BulkOwner count={orphans} />}

      {byCategory.map(([cat, list]) => (
        <Section key={cat} title={CATEGORY_PLURAL[cat]} aside={`${list.length}`} className="mt-8">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[54rem] table-fixed text-sm print:min-w-0">
              <colgroup>
                <col className="w-[31%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
                <col className="w-[11%] print:w-0" />
              </colgroup>
              <thead className="text-left text-xs text-ink-faint">
                <tr>
                  <th className="px-5 py-2 font-medium">Actif</th>
                  <th className="py-2 pr-3 font-medium">Responsable</th>
                  <th className="py-2 pr-3 font-medium">Sensibilité</th>
                  <th className="py-2 pr-3 font-medium">Emplacement</th>
                  <th className="py-2 pr-3 font-medium">Fournisseur</th>
                  <th className="py-2 pr-5 print:hidden" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.map((x) => (
                  <AssetRow key={x.id} x={x} />
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ))}

      <Section title="Ajouter un actif" className="mt-8 print:hidden">
        <AddForm />
      </Section>

      {ws.assets.length > 0 && remaining.length > 0 && (
        <Suggestions key={remaining.length} title="Autres actifs souvent oubliés" drafts={remaining} onAdd={addAssets} />
      )}

      <dl className="mt-8 grid gap-4 text-xs text-ink-soft sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        {CLASSIFICATIONS.map((c) => (
          <div key={c}>
            <dt className={clsx("font-semibold", CLASS_STYLE[c])}>{CLASSIFICATION_LABELS[c]}</dt>
            <dd>{CLASSIFICATION_HELP[c]}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
