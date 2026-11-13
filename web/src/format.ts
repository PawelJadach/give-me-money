export type Tone = "ok" | "warn" | "bad" | "muted";

export function formatDate(stamp: number): string {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(stamp);
}

export function toInputDate(stamp: number | null): string {
  if (stamp === null) return "";
  const date = new Date(stamp);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

export function lessonTone(lessons: number | null): { tone: Tone; text: string } {
  if (lessons === null) return { tone: "muted", text: "Brak pakietu" };
  if (lessons === 0) return { tone: "bad", text: "Brak treningów" };
  if (lessons <= 2) return { tone: "warn", text: "Mało treningów" };
  return { tone: "ok", text: "Pakiet w porządku" };
}

export function passTone(paidThrough: number | null, now = Date.now()): {
  tone: Tone;
  text: string;
} {
  if (paidThrough === null) return { tone: "muted", text: "Brak karnetu" };
  if (paidThrough < now) return { tone: "bad", text: "Karnet po terminie" };
  if (paidThrough < now + 7 * 86_400_000) {
    return { tone: "warn", text: "Karnet kończy się wkrótce" };
  }
  return { tone: "ok", text: "Karnet aktualny" };
}

export function deliveryLabel(channel: "email" | "push", status: string): string {
  const prefix = channel === "email" ? "E-mail" : "Push";
  switch (status) {
    case "sent":
      return `${prefix}: wysłany`;
    case "recorded":
      return `${prefix}: zapisany`;
    case "skipped":
      return channel === "email" ? "E-mail: pominięty" : "Push: brak urządzenia";
    case "failed":
      return `${prefix}: nie wyszedł`;
    default:
      return `${prefix}: w drodze`;
  }
}

export function errorText(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof error.data === "string"
  ) {
    return error.data;
  }
  return "Coś poszło nie tak.";
}

export function authError(code: string): string {
  switch (code) {
    case "INVALID_CREDENTIALS":
      return "Złe hasło.";
    case "USER_NOT_FOUND":
      return "Nie ma konta z tym e-mailem.";
    case "USERNAME_TAKEN":
      return "Ten e-mail jest już zajęty.";
    case "PASSWORD_TOO_SHORT":
      return "Hasło musi mieć co najmniej 10 znaków.";
    case "PASSWORD_TOO_LONG":
      return "Hasło jest za długie.";
    case "PASSWORD_TOO_COMMON":
      return "To hasło jest zbyt popularne. Wybierz inne.";
    case "PASSWORD_HAS_SURROUNDING_WHITESPACE":
      return "Hasło nie może zaczynać ani kończyć się spacją.";
    case "USERNAME_HAS_INVALID_CHARACTERS":
      return "E-mail zawiera niedozwolone znaki.";
    case "RATE_LIMITED":
      return "Za dużo prób. Odczekaj chwilę.";
    default:
      return "Nie udało się zalogować.";
  }
}
