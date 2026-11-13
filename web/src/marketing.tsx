export function Marketing() {
  return (
    <div className="shell">
      <header className="top">
        <a className="brand" href="/">
          <span className="mark" aria-hidden="true" />
          Karnet
        </a>
        <nav className="nav">
          <a className="solid" href="/app">
            Otwórz aplikację
          </a>
        </nav>
      </header>
      <section className="hero">
        <div>
          <h1>Klienci, lekcje i karnet w jednym miejscu.</h1>
          <p className="lede">
            Trener widzi, komu kończy się pakiet i kto ma zaległą płatność.
            Klient po zalogowaniu widzi swój stan i przypomnienia.
          </p>
          <div className="facts">
            <article>
              <h2>Lista klientów</h2>
              <p>Dodajesz osobę po e-mailu, gdy ma już konto.</p>
            </article>
            <article>
              <h2>Treningi i karnet</h2>
              <p>Zostawiasz liczbę lekcji i datę opłacenia.</p>
            </article>
            <article>
              <h2>Przypomnienie</h2>
              <p>Wiadomość ląduje w aplikacji. E-mail i push mają swój status.</p>
            </article>
          </div>
        </div>
        <aside className="sample">
          <span>Jan Nowak</span>
          <strong>2 treningi</strong>
          <p>Karnet do 20 lis 2026</p>
          <div className="chips">
            <span className="chip warn">Mało treningów</span>
            <span className="chip warn">Karnet kończy się wkrótce</span>
          </div>
        </aside>
      </section>
    </div>
  );
}

export function Setup() {
  return (
    <div className="shell">
      <header className="top">
        <a className="brand" href="/">
          <span className="mark" aria-hidden="true" />
          Karnet
        </a>
      </header>
      <section className="card">
        <h1>Brak adresu bazy</h1>
        <p className="lede">
          Ustaw VITE_CONVEX_URL w web/.env.local na adres z <code>npx convex dev</code>,
          potem odśwież aplikację.
        </p>
      </section>
    </div>
  );
}
