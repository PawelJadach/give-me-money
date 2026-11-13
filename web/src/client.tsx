import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { deliveryLabel, errorText, formatDate, lessonTone, passTone } from "./format";

type Home = {
  name: string;
  email: string;
  trainerName: string | null;
  lessonsRemaining: number | null;
  paidThrough: number | null;
  notifications: Array<{
    id: Id<"notifications">;
    title: string;
    body: string;
    inAppStatus: "unread" | "read";
    emailStatus: string;
    pushStatus: string;
    createdAt: number;
  }>;
};

export function ClientHome({ home }: { home: Home | undefined }) {
  const markRead = useMutation(api.notifications.markRead);
  if (home === undefined) {
    return <p className="who">Ładowanie stanu…</p>;
  }
  const lessons = lessonTone(home.lessonsRemaining);
  const pass = passTone(home.paidThrough);
  return (
    <div className="panel">
      <p className="who">
        {home.trainerName
          ? `Trener: ${home.trainerName}`
          : "Żaden trener nie dodał Cię jeszcze do listy."}
      </p>
      <div className="stats">
        <article className="stat">
          <span>Zostało treningów</span>
          <b>{home.lessonsRemaining ?? "—"}</b>
          <span className={`chip ${lessons.tone}`}>{lessons.text}</span>
        </article>
        <article className="stat">
          <span>Karnet opłacony do</span>
          <b>{home.paidThrough === null ? "—" : formatDate(home.paidThrough)}</b>
          <span className={`chip ${pass.tone}`}>{pass.text}</span>
        </article>
      </div>
      <section className="list">
        <h2>Powiadomienia</h2>
        {home.notifications.length === 0 ? (
          <p className="empty">Brak wiadomości.</p>
        ) : (
          home.notifications.map((item) => (
            <article className="item" key={item.id}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <div className="meta">
                <span>{formatDate(item.createdAt)}</span>
                <span>{item.inAppStatus === "unread" ? "Nieprzeczytane" : "Przeczytane"}</span>
                <span>{deliveryLabel("email", item.emailStatus)}</span>
                <span>{deliveryLabel("push", item.pushStatus)}</span>
              </div>
              {item.inAppStatus === "unread" ? (
                <button
                  className="texty"
                  type="button"
                  onClick={() =>
                    void markRead({ notificationId: item.id }).catch((error: unknown) => {
                      window.alert(errorText(error));
                    })
                  }
                >
                  Oznacz jako przeczytane
                </button>
              ) : null}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
