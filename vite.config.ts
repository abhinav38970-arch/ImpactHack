import { defineConfig } from 'vite'
import type { ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'

const GUIDE_BODY_LIMIT = 100_000;

interface GuideMiddlewareServer {
  middlewares: { use: (fn: (req: any, res: any, next: () => void) => void) => void };
  ssrLoadModule: (url: string) => Promise<any>;
}

/**
 * Local /api/guide middleware so `npm run dev` serves the frontend AND the
 * Guide endpoint together (Vite dev never runs Vercel functions on its own).
 * Production uses api/guide.ts. Reads server-side env only — the key is
 * never exposed to client code (no VITE_ prefix anywhere).
 */
function guideApiPlugin() {
  return {
    name: 'liverloop-guide-api',
    configureServer(server: ViteDevServer) {
      attachGuideApi(server as unknown as GuideMiddlewareServer);
    },
  };
}

export function attachGuideApi(server: GuideMiddlewareServer) {
  server.middlewares.use((req: any, res: any, next: () => void) => {
    if (req.url !== '/api/guide' && req.url?.split('?')[0] !== '/api/guide') {
      next();
      return;
    }
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: { code: 'invalid_request', message: 'Use POST.' } }));
      return;
    }
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > GUIDE_BODY_LIMIT) {
        res.statusCode = 413;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: { code: 'invalid_request', message: 'Request too large.' } }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', async () => {
      let body: unknown;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null');
      } catch {
        body = undefined;
      }
      try {
        const mod = await server.ssrLoadModule('/src/lib/guide/handler.ts');
        const result = await mod.handleGuideRequest(
          { fetchImpl: fetch, env: process.env },
          body,
          req.socket?.remoteAddress ?? 'unknown',
        );
        if (result.status !== 200) {
          // Same safe diagnostics as api/guide.ts: category + statuses only.
          const code =
            result.body && typeof result.body === 'object' && 'error' in result.body
              ? (result.body as { error: { code: unknown } }).error.code
              : 'unknown';
          console.log(
            JSON.stringify({
              scope: 'guide',
              httpStatus: result.status,
              code,
              providerStatus: result.log?.providerStatus ?? null,
            }),
          );
        }
        res.statusCode = result.status;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify(result.body));
      } catch {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            error: { code: 'provider_error', message: 'The Guide is temporarily unavailable.' },
          }),
        );
      }
    });
  });
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), guideApiPlugin()],
})
