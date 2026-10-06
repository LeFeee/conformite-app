// Génère supabase/seed.sql à partir du catalogue TypeScript
// (source unique de vérité). Usage : npm run seed:generate

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { CONTROLS } from "../src/lib/catalog/controls";
import { FRAMEWORKS, REQUIREMENTS } from "../src/lib/catalog/frameworks";

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const arr = (xs: string[]) =>
  xs.length ? `array[${xs.map(q).join(", ")}]::text[]` : `'{}'::text[]`;

const lines: string[] = [
  "-- Fichier généré par scripts/generate-seed.ts — ne pas modifier à la main.",
  "begin;",
  "",
  "insert into public.frameworks (id, name, short_name, version, description) values",
  FRAMEWORKS.map(
    (f) => `  (${q(f.id)}, ${q(f.name)}, ${q(f.shortName)}, ${q(f.version)}, ${q(f.description)})`,
  ).join(",\n"),
  "on conflict (id) do update set name = excluded.name, short_name = excluded.short_name, version = excluded.version, description = excluded.description;",
  "",
  "insert into public.requirements (id, framework_id, ref, title, sort) values",
  REQUIREMENTS.map(
    (r) => `  (${q(r.id)}, ${q(r.frameworkId)}, ${q(r.ref)}, ${q(r.title)}, ${r.sort})`,
  ).join(",\n"),
  "on conflict (id) do update set ref = excluded.ref, title = excluded.title, sort = excluded.sort;",
  "",
  "insert into public.controls (id, title, en_clair, theme, priority, applicability_tags, evidence_examples, review_days, sort) values",
  CONTROLS.map(
    (c) =>
      `  (${q(c.id)}, ${q(c.title)}, ${q(c.enClair)}, ${q(c.theme)}, ${q(c.priority)}, ${arr(c.tags)}, ${arr(c.evidence)}, ${c.reviewDays}, ${c.sort})`,
  ).join(",\n"),
  "on conflict (id) do update set title = excluded.title, en_clair = excluded.en_clair, theme = excluded.theme, priority = excluded.priority, applicability_tags = excluded.applicability_tags, evidence_examples = excluded.evidence_examples, review_days = excluded.review_days, sort = excluded.sort;",
  "",
  "delete from public.control_requirements;",
  "insert into public.control_requirements (control_id, requirement_id) values",
  CONTROLS.flatMap((c) => c.covers.map((r) => `  (${q(c.id)}, ${q(r)})`)).join(",\n") + ";",
  "",
  "commit;",
  "",
];

const out = join(__dirname, "..", "supabase", "seed.sql");
writeFileSync(out, lines.join("\n"));
console.log(`seed.sql généré : ${CONTROLS.length} contrôles, ${REQUIREMENTS.length} exigences.`);
