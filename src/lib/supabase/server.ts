// Client Supabase côté serveur (route handlers, composants serveur).
// cookies() est asynchrone depuis Next.js 15.
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) store.set(name, value, options);
        } catch {
          // appelé depuis un composant serveur : le proxy se charge de rafraîchir la session
        }
      },
    },
  });
}
