import { defineConfig, type Plugin } from "vite";
import glsl from "vite-plugin-glsl";
import preact from "@preact/preset-vite";

/**
 * Dev-only middleware: GET /api/earthcam-resolve?vid=<id> → { stream: <hlsUrl> }
 *
 * EarthCam has two player systems:
 *   1. Old: embed.php returns HTML containing affPlayerHTML5Config = {"src":"..."}
 *   2. New "share": embed.php 302's to share.earthcam.net/<TOKEN>; the HLS URL is
 *      reachable via two more JSON hops at share.earthcam.net/api/<TOKEN>/<server>.
 *
 * Browser fetch can't read the Location header on a manual redirect, so we resolve
 * the chain server-side here and hand the client a single ready-to-play HLS URL.
 */
function earthcamResolverPlugin(): Plugin {
  const UA = { "User-Agent": "Mozilla/5.0", "Referer": "https://www.earthcam.com/" };
  const SHARE_UA = { "User-Agent": "Mozilla/5.0", "Referer": "https://share.earthcam.net/" };

  async function resolve(vid: string): Promise<string> {
    // 1. Try the old-style embed.php
    const embedRes = await fetch(
      `https://www.earthcam.com/js/video/embed.php?vid=${encodeURIComponent(vid)}&type=h264&w=auto&requested_version=current`,
      { headers: UA, redirect: "manual" }
    );

    if (embedRes.status === 200) {
      const html = await embedRes.text();
      const m = html.match(/affPlayerHTML5Config\s*=\s*(\{.*?\});/);
      if (m?.[1]) {
        try {
          const cfg = JSON.parse(m[1]);
          if (cfg.src) return cfg.src as string;
        } catch {
          /* fallthrough */
        }
      }
      // Last-ditch: a JSON-escaped m3u8
      const m2 = html.match(/"(https?:\\\/\\\/[^"]+\.m3u8[^"]*)"/);
      if (m2?.[1]) return m2[1].replace(/\\\//g, "/");
      throw new Error("embed.php returned 200 but no HLS URL found");
    }

    if (embedRes.status === 301 || embedRes.status === 302) {
      const loc = embedRes.headers.get("location") ?? "";
      const tokenMatch = loc.match(/share\.earthcam\.net\/([^?#]+)/);
      if (!tokenMatch) throw new Error(`unexpected redirect target: ${loc.slice(0, 100)}`);
      const token = tokenMatch[1];

      // 2. Hit the share API to discover the per-server endpoint
      const shareRes = await fetch(`https://share.earthcam.net/api/${token}`, { headers: SHARE_UA });
      if (!shareRes.ok) throw new Error(`share api ${shareRes.status}`);
      const shareData = (await shareRes.json()) as any;

      let server: any = null;
      for (const p of shareData.projects ?? []) {
        for (const s of p.servers ?? []) {
          if (s.has_live) {
            server = s;
            break;
          }
        }
        if (server) break;
      }
      if (!server?.api) throw new Error("no live server in share response");

      // 3. Hit the per-server API to get the actual HLS URL
      const srvRes = await fetch(`https://share.earthcam.net${server.api}`, { headers: SHARE_UA });
      if (!srvRes.ok) throw new Error(`server api ${srvRes.status}`);
      const srvData = (await srvRes.json()) as any;
      const stream = srvData?.views?.[0]?.live?.regular?.stream;
      if (!stream) throw new Error("no stream in server response");
      return stream as string;
    }

    throw new Error(`embed.php returned status ${embedRes.status}`);
  }

  return {
    name: "earthcam-resolver",
    configureServer(server) {
      server.middlewares.use("/api/earthcam-resolve", async (req, res) => {
        const url = new URL(req.url ?? "/", "http://x");
        const vid = url.searchParams.get("vid");
        res.setHeader("content-type", "application/json");
        if (!vid) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "missing vid" }));
          return;
        }
        try {
          const stream = await resolve(vid);
          res.end(JSON.stringify({ stream }));
        } catch (e: any) {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: e?.message ?? String(e) }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [preact(), glsl(), earthcamResolverPlugin()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      "/api/earthcam": {
        target: "https://www.earthcam.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/earthcam/, ""),
      },
      "/api/stream": {
        target: "https://videos-3.earthcam.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/stream/, ""),
        headers: {
          Referer: "https://www.earthcam.com/",
          Origin: "https://www.earthcam.com",
        },
      },
    },
  },
});
