// Nom provisoire : à remplacer une fois la marque choisie.
export const APP_NAME = "Conformité";

/** Le mode Supabase s'active dès que les variables d'environnement sont présentes. */
export const SUPABASE_ENABLED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
