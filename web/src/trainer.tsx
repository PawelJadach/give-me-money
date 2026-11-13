import { useMutation } from "convex/react";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { errorText, formatDate, lessonTone, passTone, toInputDate } from "./format";

type ClientRow = {
  clientId: Id<"users">;
  name: string;
  email: string;
  lessonsRemaining: number | null;
  paidThrough: number | null;
};

export function TrainerHome({
  clients,
}: {
  clients: ClientRow[] | undefined;
}) {
  const addClient = useMutation(api.crm.addClient);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const attention = (clients ?? []).filter((client) => {
    const lessons = lessonTone(client.lessonsRemaining).tone;
    const pass = passTone(client.paidThrough).tone;
    return lessons === "warn" || lessons === "bad" || pass === "warn" || pass === "bad";
  }).length;

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await addClient({ email });
      setEmail("");
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="panel">
      <p className="who">
        {clients === undefined
          ? "Ładowanie listy…"
          : `Klientów: ${clients.length}. Do przypomnienia: ${attention}.`}
      </p>
      <form className="card" onSubmit={onAdd}>
        <h2>Dodaj klienta</h2>
        <div className="row">
          <label>
            E-mail klienta
            <input
              id="client-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <button className="solid" type="submit" disabled={pending}>
            Dodaj klienta
          </button>
        </div>
        {error ? (
          <p className="alert" role="alert">
            {error}
          </p>
        ) : null}
      </form>
      {clients !== undefined && clients.length === 0 ? (
        <p className="empty">
          Nie masz jeszcze klientów. Osoba zakłada konto jako klient, a potem
          dodajesz ją tym e-mailem.
        </p>
      ) : null}
      <div className="list">
        {(clients ?? []).map((client) => (
          <ClientCard key={client.clientId} client={client} />
        ))}
      </div>
    </div>
  );
}

function ClientCard({ client }: { client: ClientRow }) {
  const setLessons = useMutation(api.crm.setLessons);
  const setPass = useMutation(api.crm.setPass);
  const sendReminder = useMutation(api.crm.sendReminder);
  const [lessons, setLessonsValue] = useState(
    client.lessonsRemaining === null ? "" : String(client.lessonsRemaining),
  );
  const [date, setDate] = useState(toInputDate(client.paidThrough));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const lessonsChip = lessonTone(client.lessonsRemaining);
  const passChip = passTone(client.paidThrough);

  useEffect(() => {
    setLessonsValue(
      client.lessonsRemaining === null ? "" : String(client.lessonsRemaining),
    );
    setDate(toInputDate(client.paidThrough));
  }, [client.lessonsRemaining, client.paidThrough]);

  async function saveLessons() {
    setError(null);
    try {
      await setLessons({
        clientId: client.clientId,
        lessonsRemaining: Number(lessons),
      });
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  async function savePass() {
    setError(null);
    try {
      await setPass({ clientId: client.clientId, paidThrough: date });
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  async function remind() {
    setError(null);
    setSent(false);
    try {
      await sendReminder({
        clientId: client.clientId,
        note: note.trim() ? note.trim() : undefined,
      });
      setSent(true);
      setNote("");
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  return (
    <article className="card" data-client={client.email}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0 }}>{client.name}</h2>
          <p className="who">{client.email}</p>
        </div>
        <div className="chips">
          <span className={`chip ${lessonsChip.tone}`}>{lessonsChip.text}</span>
          <span className={`chip ${passChip.tone}`}>{passChip.text}</span>
        </div>
      </div>
      <p className="who">
        Zostało: {client.lessonsRemaining ?? "—"}. Karnet:{" "}
        {client.paidThrough === null ? "brak daty" : formatDate(client.paidThrough)}.
      </p>
      <div className="row">
        <label>
          Treningi
          <input
            aria-label={`Treningi ${client.name}`}
            inputMode="numeric"
            value={lessons}
            onChange={(event) => setLessonsValue(event.target.value)}
          />
        </label>
        <button className="ghost" type="button" onClick={() => void saveLessons()}>
          Zapisz treningi
        </button>
        <label>
          Karnet do
          <input
            aria-label={`Karnet ${client.name}`}
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <button className="ghost" type="button" onClick={() => void savePass()}>
          Zapisz karnet
        </button>
      </div>
      <div className="row">
        <label className="note">
          Notatka do przypomnienia
          <input
            aria-label={`Notatka ${client.name}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <button className="solid" type="button" onClick={() => void remind()}>
          Wyślij przypomnienie
        </button>
      </div>
      {sent ? <p className="who">Przypomnienie zapisane. Klient zobaczy je po zalogowaniu.</p> : null}
      {error ? (
        <p className="alert" role="alert">
          {error}
        </p>
      ) : null}
    </article>
  );
}
