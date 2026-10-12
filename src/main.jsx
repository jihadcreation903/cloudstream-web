import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Search, Play, Settings2, X, Radio, RefreshCw } from "lucide-react";
import { loadRepositoryManifest, normalizeRepositoryProviders, DEFAULT_REPOSITORY_URL } from "./providers/cloudStreamWebAdapter.js";
import "./styles.css";

const movies = [
  { title: "The Last Horizon", year: 2025, genre: "Sci-Fi", rating: "8.4", image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=700&q=80", desc: "A crew follows a signal beyond the edge of known space." },
  { title: "Midnight City", year: 2024, genre: "Thriller", rating: "7.9", image: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=700&q=80", desc: "One night. One city. A secret that changes everything." },
  { title: "Wild Frontier", year: 2025, genre: "Adventure", rating: "8.1", image: "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=700&q=80", desc: "A remote expedition discovers a world left untouched." },
  { title: "Blue Depths", year: 2024, genre: "Drama", rating: "8.6", image: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=700&q=80", desc: "A quiet coastal town faces a season of change." },
  { title: "Echoes of Earth", year: 2022, genre: "Documentary", rating: "8.8", image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=700&q=80", desc: "A visual journey through the planet’s wild places." },
  { title: "After the Rain", year: 2023, genre: "Romance", rating: "7.6", image: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=700&q=80", desc: "Two old friends reconnect in a town they barely know." }
];

function App() {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("All");
  const [selected, setSelected] = useState(null);
  const [admin, setAdmin] = useState(false);
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [repo, setRepo] = useState(DEFAULT_REPOSITORY_URL);
  const [message, setMessage] = useState("");
  const [providers, setProviders] = useState([]);
  const [manifestState, setManifestState] = useState("loading");
  const [manifestError, setManifestError] = useState("");
  const [manifestNote, setManifestNote] = useState("");

  const list = useMemo(() => movies.filter((m) =>
    (genre === "All" || m.genre === genre) && m.title.toLowerCase().includes(query.toLowerCase())
  ), [query, genre]);

  const refreshProviders = async () => {
    setManifestState("loading");
    setManifestError("");
    try {
      const result = await loadRepositoryManifest();
      setProviders(normalizeRepositoryProviders(result.manifest));
      setManifestNote(result.note);
      setManifestState("ready");
    } catch (error) {
      setManifestError(error.message || "Could not load repository metadata.");
      setManifestState("error");
    }
  };

  useEffect(() => { refreshProviders(); }, []);

  return <div className="app">
    <header>
      <a className="brand" href="#" onClick={(e) => e.preventDefault()}><span className="mark"><Play size={18} fill="currentColor" /></span>Stream<span>XBD</span></a>
      <nav><button onClick={() => setGenre("All")}>Discover</button><button onClick={() => setGenre("Adventure")}>Movies</button><button onClick={() => setGenre("Documentary")}>Documentaries</button></nav>
      <label className="search"><Search size={17} /><input placeholder="Search demo titles..." value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      <button className="icon" onClick={() => { setAdmin(true); setMessage(""); }} aria-label="Admin panel"><Settings2 /></button>
    </header>

    <main>
      <section className="hero">
        <p className="eyebrow">● YOUR NEXT WATCH STARTS HERE</p>
        <h1>Stories worth<br /><em>staying up for.</em></h1>
        <p className="intro">Discover something extraordinary. A world of cinema, curated for your next movie night.</p>
        <button className="primary" onClick={() => setSelected(movies[0])}><Play size={16} fill="currentColor" /> Explore featured</button>
        <div className="hero-image"><img src={movies[0].image} alt="Featured cinematic landscape" /></div>
      </section>

      <section className="catalog">
        <div className="section-title"><div><p className="eyebrow">DEMO CONTENT</p><h2>Explore the collection</h2></div><span>{list.length} titles</span></div>
        <div className="filters">{["All", "Action", "Adventure", "Sci-Fi", "Thriller", "Drama", "Documentary", "Romance"].map((g) =>
          <button className={genre === g ? "chosen" : ""} onClick={() => setGenre(g)} key={g}>{g}</button>
        )}</div>
        <div className="grid">{list.map((m) =>
          <button className="movie" key={m.title} onClick={() => setSelected(m)}>
            <div className="poster"><img src={m.image} alt={m.title} /><span>★ {m.rating}</span></div>
            <div className="movie-meta"><strong>{m.title}</strong><small>{m.year} · {m.genre}</small></div>
          </button>
        )}</div>
        <p className="warning">These are placeholder titles, not a live movie catalogue.</p>
      </section>

      <section className="provider-section">
        <div className="section-title">
          <div><p className="eyebrow">REPOSITORY CONNECTION</p><h2><Radio size={22} /> CloudStream providers</h2></div>
          <button className="refresh-button" onClick={refreshProviders} aria-label="Refresh providers"><RefreshCw size={15} /> Refresh</button>
        </div>
        <p className="provider-intro">StreamXBD reads the repository manifest and displays extension metadata. Kotlin/JVM plugins are not executed in the browser; a compatible web adapter must be implemented for each provider before it can search for streams.</p>
        {manifestState === "loading" && <p className="provider-status">Loading repository manifest…</p>}
        {manifestState === "error" && <div className="provider-error"><strong>Repository could not be loaded.</strong><p>{manifestError}</p><button onClick={refreshProviders}>Try again</button><small>Check that the Worker is deployed with its D1 database binding.</small></div>}
        {manifestState === "ready" && <>
          <div className="provider-summary"><strong>{providers.length}</strong><span>provider entries detected</span><span className="metadata-badge">Metadata only</span></div>
          {providers.length === 0
            ? <div className="provider-empty">The manifest loaded, but this adapter did not find a recognised provider list. The repository may use a different manifest format.</div>
            : <div className="provider-grid">{providers.slice(0, 24).map((provider) =>
              <article className="provider-card" key={provider.id}>
                <div className="provider-card-top"><Radio size={17} /><span>{provider.compatibilityLabel}</span></div>
                <h3>{provider.name}</h3>
                <p>{provider.description}</p>
                <small>Version {provider.version} · {provider.language}</small>
                <small>Author: {provider.authors}</small>
              </article>
            )}</div>}
          <p className="provider-note">{manifestNote} {providers.length > 24 ? `Showing 24 of ${providers.length} entries.` : ""}</p>
        </>}
      </section>
    </main>

    <footer>StreamXBD · Web provider adapter foundation</footer>

    {selected && <div className="overlay" onClick={() => setSelected(null)}>
      <section className="detail" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={() => setSelected(null)}><X /></button>
        <img src={selected.image} alt="" />
        <div><p className="eyebrow">{selected.year} · {selected.genre} · ★ {selected.rating}</p><h2>{selected.title}</h2><p>{selected.desc}</p><p className="warning">Demo catalogue only — no video source is connected yet. Repository entries are metadata, not playable streams.</p></div>
      </section>
    </div>}

    {admin && <div className="overlay" onClick={() => setAdmin(false)}>
      <section className="admin" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={() => setAdmin(false)}><X /></button><p className="eyebrow">CONTROL CENTER</p><h2>Admin panel</h2>
        {!unlocked ? <form onSubmit={(e) => { e.preventDefault(); if (password.length >= 8) { setUnlocked(true); setMessage("Demo panel unlocked. This is not secure authentication."); } else setMessage("Enter at least 8 characters."); }}>
          <label>Demo passphrase<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8+ characters" /></label><button className="primary">Unlock demo</button>
        </form> : <>
          <label>CloudStream repository URL<input value={repo} onChange={(e) => setRepo(e.target.value)} /></label>
          <p className="warning">Repository URL changes are not saved from this demo panel. Configure the Worker admin token and D1 database to enable secure saving.</p>
          <button className="primary" onClick={() => setMessage("This setting is not connected to the backend yet.")}>Save repository</button>
        </>}
        {message && <p className="notice">{message}</p>}
      </section>
    </div>}
  </div>;
}

createRoot(document.getElementById("root")).render(<App />);
