"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Button, ButtonLink, inputClass } from "@/components/ui";
import { APP_NAME, SUPABASE_ENABLED } from "@/lib/config";
import { supabaseBrowser } from "@/lib/supabase/client";

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const linkError = params.get("erreur") === "lien";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState("sending");
    const suite = params.get("suite");
    const callback = new URL("/auth/callback", window.location.origin);
    if (suite) callback.searchParams.set("suite", suite);
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callback.toString() },
    });
    if (error) {
      setState("error");
      setMessage(
        /fetch|network/i.test(error.message)
          ? "le service de connexion est injoignable, réessayez dans un instant"
          : /rate|too many/i.test(error.message)
            ? "trop de demandes, patientez une minute avant de redemander un lien"
            : error.message,
      );
    } else {
      setState("sent");
    }
  };

  if (state === "sent") {
    return (
      <div className="mt-8">
        <p className="text-lg font-semibold">Vérifiez votre boîte mail</p>
        <p className="mt-2 text-ink-soft">
          Un lien de connexion a été envoyé à <strong className="text-ink">{email}</strong>. Il est valable une heure. Pensez à
          regarder dans les courriers indésirables.
        </p>
        <Button variant="quiet" className="mt-4 -ml-4" onClick={() => setState("idle")}>
          Utiliser une autre adresse
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      {linkError && (
        <p className="rounded-md bg-signal-soft px-4 py-3 text-sm text-signal">
          Ce lien de connexion a expiré ou a déjà servi. Demandez-en un nouveau.
        </p>
      )}
      <label className="block text-sm">
        <span className="mb-1 block text-ink-soft">Adresse email professionnelle</span>
        <input
          type="email"
          required
          autoComplete="email"
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="prenom@entreprise.fr"
        />
      </label>
      <Button type="submit" className="w-full" disabled={state === "sending"}>
        {state === "sending" ? "Envoi…" : "Recevoir un lien de connexion"}
      </Button>
      {state === "error" && <p className="text-sm text-signal">L&apos;envoi a échoué : {message}</p>}
      <p className="text-sm text-ink-faint">Pas de mot de passe : un lien à usage unique vous est envoyé par email.</p>
    </form>
  );
}

export default function Connexion() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <Link href="/" className="font-bold">
        {APP_NAME}
      </Link>
      <h1 className="mt-10 text-[1.75rem] font-bold leading-tight">Se connecter</h1>
      {SUPABASE_ENABLED ? (
        <Suspense>
          <LoginForm />
        </Suspense>
      ) : (
        <div className="mt-4">
          <p className="text-ink-soft">
            Vous êtes sur la version de démonstration : aucun compte n&apos;est nécessaire, vos données restent dans ce
            navigateur.
          </p>
          <ButtonLink href="/demarrer" className="mt-6">
            Commencer le cadrage
          </ButtonLink>
        </div>
      )}
    </main>
  );
}
