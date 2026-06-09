import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { fileURLToPath, pathToFileURL } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const UA = { "User-Agent": "Mozilla/5.0", Referer: "https://www.earthcam.com/" };
const SHARE_UA = { "User-Agent": "Mozilla/5.0", Referer: "https://share.earthcam.net/" };

// ── EarthCam stream resolver ────────────────────────────────────────
async function resolve(vid) {
  const embedRes = await fetch(
    `https://www.earthcam.com/js/video/embed.php?vid=${encodeURIComponent(vid)}&type=h264&w=auto&requested_version=current`,
    { headers: UA, redirect: "manual" },
  );

  if (embedRes.status === 200) {
    const html = await embedRes.text();
    const m = html.match(/affPlayerHTML5Config\s*=\s*(\{.*?\});/);
    if (m?.[1]) {
      try {
        const cfg = JSON.parse(m[1]);
        if (cfg.src) return cfg.src;
      } catch {
        /* fallthrough */
      }
    }
    const m2 = html.match(/"(https?:\\\/\\\/[^"]+\.m3u8[^"]*)"/);
    if (m2?.[1]) return m2[1].replace(/\\\//g, "/");
    throw new Error("embed.php returned 200 but no HLS URL found");
  }

  if (embedRes.status === 301 || embedRes.status === 302) {
    const loc = embedRes.headers.get("location") ?? "";
    const tokenMatch = loc.match(/share\.earthcam\.net\/([^?#]+)/);
    if (!tokenMatch) throw new Error(`unexpected redirect target: ${loc.slice(0, 100)}`);
    const token = tokenMatch[1];

    const shareRes = await fetch(`https://share.earthcam.net/api/${token}`, { headers: SHARE_UA });
    if (!shareRes.ok) throw new Error(`share api ${shareRes.status}`);
    const shareData = await shareRes.json();

    let server = null;
    for (const p of shareData.projects ?? []) {
      for (const s of p.servers ?? []) {
        if (s.has_live) { server = s; break; }
      }
      if (server) break;
    }
    if (!server?.api) throw new Error("no live server in share response");

    const srvRes = await fetch(`https://share.earthcam.net${server.api}`, { headers: SHARE_UA });
    if (!srvRes.ok) throw new Error(`server api ${srvRes.status}`);
    const srvData = await srvRes.json();
    const stream = srvData?.views?.[0]?.live?.regular?.stream;
    if (!stream) throw new Error("no stream in server response");
    return stream;
  }

  throw new Error(`embed.php returned status ${embedRes.status}`);
}

// ── Express app ─────────────────────────────────────────────────────
// Factory so the same app can be served standalone (`npm start`) or embedded
// in the Electron main process (see electron/main.cjs).
export function createServer() {
  const app = express();

  // API: resolve EarthCam stream IDs
  app.get("/api/earthcam-resolve", async (req, res) => {
    const vid = req.query.vid;
    res.setHeader("content-type", "application/json");
    if (!vid) {
      return res.status(400).json({ error: "missing vid" });
    }
    try {
      const stream = await resolve(vid);
      res.json({ stream });
    } catch (e) {
      res.status(502).json({ error: e?.message ?? String(e) });
    }
  });

  // Proxy: HLS stream segments (needs Referer header)
  app.use(
    "/api/stream",
    createProxyMiddleware({
      target: "https://videos-3.earthcam.com",
      changeOrigin: true,
      pathRewrite: { "^/api/stream": "" },
      headers: {
        Referer: "https://www.earthcam.com/",
        Origin: "https://www.earthcam.com",
      },
    }),
  );

  // Serve built static files
  app.use(express.static(join(__dirname, "dist")));

  // SPA fallback
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(join(__dirname, "dist", "index.html"));
  });

  return app;
}

// Start the app on a loopback port and resolve the actual bound port. Used by
// the Electron shell with port 0 (ephemeral) so it never clashes with a web
// instance on 3000. Returns { port, close }.
export function listen(port = 0) {
  return new Promise((done) => {
    const srv = createServer().listen(port, "127.0.0.1", () => {
      const addr = srv.address();
      done({ port: addr.port, close: () => srv.close() });
    });
  });
}

// ── Standalone entry (`npm start` / Docker) ─────────────────────────
// Only auto-listen when run directly, so importing this module (Electron)
// doesn't start a second server. Binds all interfaces on PORT, as before.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  createServer().listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
