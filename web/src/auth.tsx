import { useSignInWithUsernamePassword, useSignUpWithUsernamePassword } from "@convex-dev/auth/methods/username-password/react";
import { useMutation } from "convex/react";
import { FormEvent, useState } from "react";
import { api } from "../../convex/_generated/api";
import { authError, errorText } from "./format";

export function AuthScreen() {
  const { signIn, pending: signingIn } = useSignInWithUsernamePassword(api.auth);
  const { signUp, pending: signingUp } = useSignUpWithUsernamePassword(api.auth);
  const completeProfile = useMutation(api.users.completeProfile);
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const pending = signingIn || signingUp;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();
    const role = form.get("role") === "trainer" ? "trainer" : "client";
    try {
      if (mode === "signIn") {
        const result = await signIn({ username: email, password });
        if (result.status !== "complete") {
          setError(authError(result.userError.error));
        }
        return;
      }
      const result = await signUp({ username: email, password });
      if (result.status !== "complete") {
        setError(authError(result.userError.error));
        return;
      }
      await completeProfile({ name, role, email });
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  return (
    <div className="shell">
      <header className="top">
        <a className="brand" href="/">
          <span className="mark" aria-hidden="true" />
          Karnet
        </a>
      </header>
      <form className="card" onSubmit={onSubmit} style={{ maxWidth: 460 }}>
        <h1>{mode === "signIn" ? "Zaloguj się" : "Załóż konto"}</h1>
        <label>
          E-mail
          <input id="email" name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          Hasło
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "signIn" ? "current-password" : "new-password"}
            minLength={10}
            required
          />
        </label>
        {mode === "signUp" ? (
          <>
            <label>
              Imię i nazwisko
              <input id="name" name="name" type="text" autoComplete="name" required minLength={2} />
            </label>
            <div className="roles">
              <label>
                <input type="radio" name="role" value="trainer" defaultChecked />
                Trener
              </label>
              <label>
                <input type="radio" name="role" value="client" />
                Klient
              </label>
            </div>
            <p className="who">Hasło: minimum 10 znaków. Login to ten e-mail.</p>
          </>
        ) : null}
        {error ? (
          <p className="alert" role="alert">
            {error}
          </p>
        ) : null}
        <div className="row">
          <button className="solid" type="submit" disabled={pending}>
            {mode === "signIn" ? "Zaloguj" : "Załóż konto"}
          </button>
          <button
            className="texty"
            type="button"
            onClick={() => {
              setMode(mode === "signIn" ? "signUp" : "signIn");
              setError(null);
            }}
          >
            {mode === "signIn" ? "Nie mam konta" : "Mam już konto"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ProfileForm() {
  const completeProfile = useMutation(api.users.completeProfile);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await completeProfile({
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        role: form.get("role") === "trainer" ? "trainer" : "client",
      });
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  return (
    <form className="card" onSubmit={onSubmit} style={{ maxWidth: 460 }}>
      <h1>Dokończ konto</h1>
      <p className="who">E-mail musi być taki sam jak przy logowaniu.</p>
      <label>
        E-mail
        <input name="email" type="email" required />
      </label>
      <label>
        Imię i nazwisko
        <input name="name" required minLength={2} />
      </label>
      <div className="roles">
        <label>
          <input type="radio" name="role" value="trainer" defaultChecked />
          Trener
        </label>
        <label>
          <input type="radio" name="role" value="client" />
          Klient
        </label>
      </div>
      {error ? (
        <p className="alert" role="alert">
          {error}
        </p>
      ) : null}
      <button className="solid" type="submit">
        Zapisz
      </button>
    </form>
  );
}
