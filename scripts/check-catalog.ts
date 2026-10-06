import { CONTROLS } from "../src/lib/catalog/controls";
import { REQUIREMENTS_BY_ID, REQUIREMENTS } from "../src/lib/catalog/frameworks";
import { DEFAULT_ANSWERS, assessNis2, computeApplicability } from "../src/lib/scoping";

let errors = 0;
const ids = new Set<string>();
for (const c of CONTROLS) {
  if (ids.has(c.id)) { console.error("doublon", c.id); errors++; }
  ids.add(c.id);
  for (const r of c.covers) if (!REQUIREMENTS_BY_ID.has(r)) { console.error("exigence inconnue", c.id, r); errors++; }
}
const covered = new Set(CONTROLS.flatMap((c) => c.covers));
const uncovered = REQUIREMENTS.filter((r) => !covered.has(r.id));
console.log("contrôles:", CONTROLS.length, "exigences:", REQUIREMENTS.length, "non couvertes:", uncovered.map((r) => r.id));
const equo = { ...DEFAULT_ANSWERS, organizationName: "Equo", headcount: "1" as const, hasDevelopment: true, hasPremises: false, supplierOfNis2Entity: true };
const app = computeApplicability(equo);
console.log("Equo applicables:", [...app.values()].filter((a) => a.applicable).length, assessNis2(equo).status);
if (errors || uncovered.length) process.exit(1);
