// Retour du lien magique envoyé par email.
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** N'accepte qu'un chemin interne, pour éviter toute redirection vers un autre site. */
function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/tableau-de-bord";
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNext(params.get("suite"));
  const supabase = await supabaseServer();

  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("lien incomplet") };

  const target = request.nextUrl.clone();
  target.search = "";
  if (error) {
    target.pathname = "/connexion";
    target.searchParams.set("erreur", "lien");
  } else {
    target.pathname = next;
  }
  return NextResponse.redirect(target);
}
