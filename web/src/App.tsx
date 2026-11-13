import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";
import { AuthScreen, ProfileForm } from "./auth";
import { ClientHome } from "./client";
import { TrainerHome } from "./trainer";

export function Crm() {
  const me = useQuery(api.users.me);
  const { signOut } = useAuthActions();
  const registerDevice = useMutation(api.notifications.registerDevice);
  const clients = useQuery(
    api.crm.listClients,
    me?.role === "trainer" ? {} : "skip",
  );
  const home = useQuery(api.crm.clientHome, me?.role === "client" ? {} : "skip");

  useEffect(() => {
    if (!me?.id) return;
    const key = "karnet-device";
    let token = localStorage.getItem(key);
    if (!token) {
      token = `web-${crypto.randomUUID()}`;
      localStorage.setItem(key, token);
    }
    void registerDevice({ token, platform: "web" });
  }, [me?.id, registerDevice]);

  if (me === undefined) {
    return (
      <div className="shell">
        <p className="who">Ładowanie…</p>
      </div>
    );
  }
  if (me === null || me.role === null) {
    return (
      <div className="shell">
        <header className="top">
          <a className="brand" href="/">
            <span className="mark" aria-hidden="true" />
            Karnet
          </a>
          <button className="ghost" type="button" onClick={() => void signOut()}>
            Wyloguj
          </button>
        </header>
        {me === null ? <p className="who">Ładowanie konta…</p> : <ProfileForm />}
      </div>
    );
  }

  return (
    <div className="shell">
      <header className="top">
        <a className="brand" href="/">
          <span className="mark" aria-hidden="true" />
          Karnet
        </a>
        <div className="nav">
          <span className="who">
            {me.name ?? me.email} · {me.role === "trainer" ? "trener" : "klient"}
          </span>
          <button className="ghost" type="button" onClick={() => void signOut()}>
            Wyloguj
          </button>
        </div>
      </header>
      <h1>{me.role === "trainer" ? "Twoi klienci" : "Twój karnet"}</h1>
      {me.role === "trainer" ? <TrainerHome clients={clients} /> : <ClientHome home={home} />}
    </div>
  );
}
