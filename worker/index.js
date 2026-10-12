const DEFAULT_REPO = "https://raw.githubusercontent.com/phisher98/cloudstream-extensions-phisher/refs/heads/builds/repo.json";
const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type,authorization"
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });
function allowed(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && u.hostname === "raw.githubusercontent.com" && u.pathname.endsWith(".json");
  } catch { return false; }
}
async function savedRepository(env) {
  if (!env.DB) return DEFAULT_REPO;
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key=?").bind("repository_url").first();
  return row?.value || DEFAULT_REPO;
}
async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json" }, cf: { cacheTtl: 300 } });
  if (!response.ok) throw new Error(`Upstream returned ${response.status}`);
  const text = await response.text();
  if (text.length > 2000000) throw new Error("Repository JSON is too large");
  try { return JSON.parse(text); } catch { throw new Error("Repository returned invalid JSON"); }
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers });
    if (url.pathname === "/api/health") return json({ ok: true });
    if (url.pathname === "/api/repository" && request.method === "GET") {
      try { return json({ repositoryUrl: await savedRepository(env) }); }
      catch { return json({ repositoryUrl: DEFAULT_REPO, warning: "Database unavailable; using default repository." }); }
    }
    if (url.pathname === "/api/admin/repository" && request.method === "POST") {
      if (!env.ADMIN_BEARER_TOKEN || request.headers.get("authorization") !== `Bearer ${env.ADMIN_BEARER_TOKEN}`) return json({ error: "Unauthorized" }, 401);
      if (!env.DB) return json({ error: "D1 database is not configured" }, 503);
      const body = await request.json().catch(() => null);
      if (!body || !allowed(body.repositoryUrl)) return json({ error: "Invalid raw GitHub JSON URL" }, 400);
      await env.DB.prepare("INSERT INTO settings(key,value,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP").bind("repository_url", body.repositoryUrl).run();
      return json({ ok: true });
    }
    if (url.pathname === "/api/manifest" && request.method === "GET") {
      let repo;
      try { repo = await savedRepository(env); }
      catch { repo = DEFAULT_REPO; }
      if (!allowed(repo)) return json({ error: "Repository URL rejected" }, 400);
      let manifest;
      try { manifest = await fetchJson(repo); }
      catch (error) { return json({ error: "Repository unavailable", detail: error.message }, 502); }

      // CloudStream repo.json points to pluginLists JSON files. Fetch those
      // metadata lists, but never download or execute the .cs3 plugin binaries.
      const listUrls = Array.isArray(manifest?.pluginLists) ? manifest.pluginLists : [];
      const providers = [];
      const errors = [];
      for (const listUrl of listUrls.slice(0, 5)) {
        if (!allowed(listUrl)) { errors.push("A plugin list URL was rejected."); continue; }
        try {
          const list = await fetchJson(listUrl);
          if (Array.isArray(list)) providers.push(...list);
          else if (Array.isArray(list?.plugins)) providers.push(...list.plugins);
          else errors.push("A plugin list had an unsupported format.");
        } catch (error) { errors.push(error.message); }
      }
      return json({
        manifest,
        providers,
        source: "github",
        note: "Repository and plugin metadata only. Kotlin/JVM .cs3 extensions are not executed in the browser.",
        providerListCount: listUrls.length,
        errors
      });
    }
    return json({ error: "Not found" }, 404);
  }
};
