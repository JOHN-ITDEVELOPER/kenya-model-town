import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const DEV_API_ROUTES = {
  '/api/mpesa/stkpush': '/api/mpesa/stkpush.js',
  '/api/mpesa/callback': '/api/mpesa/callback.js',
  '/api/mpesa/query': '/api/mpesa/query.js'
};

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 262144) {
        reject(new Error('Request payload too large'));
      }
    });
    req.on('end', () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON request body'));
      }
    });
    req.on('error', reject);
  });
}

function localApiMiddlewarePlugin(env) {
  return {
    name: 'local-vercel-api-middleware',
    configureServer(server) {
      // Populate server-side env vars (Daraja, Firebase Admin) during local `npm run dev`
      for (const [key, value] of Object.entries(env)) {
        if (process.env[key] === undefined) {
          process.env[key] = value;
        }
      }

      server.middlewares.use(async (req, res, next) => {
        const parsedUrl = new URL(req.url || '/', 'http://localhost');
        const targetModule = DEV_API_ROUTES[parsedUrl.pathname];
        if (!targetModule) return next();

        try {
          req.query = Object.fromEntries(parsedUrl.searchParams.entries());
          req.body = await readJsonBody(req);

          res.status = (code) => {
            res.statusCode = code;
            return res;
          };
          res.json = (payload) => {
            if (!res.headersSent) {
              res.setHeader('Content-Type', 'application/json');
            }
            res.end(JSON.stringify(payload));
            return res;
          };

          const mod = await server.ssrLoadModule(targetModule);
          await mod.default(req, res);
        } catch (err) {
          console.error(`Local API error [${parsedUrl.pathname}]:`, err);
          if (!res.headersSent) {
            res.statusCode = err.statusCode || 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Internal dev API error' }));
          }
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables from OS/Vercel environment and local files
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), localApiMiddlewarePlugin(env)],
    // Expose ONLY VITE_* vars to client bundles so server secrets (DARAJA_*, FIREBASE_SERVICE_ACCOUNT_JSON) never leak
    envPrefix: 'VITE_',
    // Bake public Firebase config fallback replacements directly into client bundle for Vercel production builds
    define: {
      'import.meta.env.FIREBASE_API_KEY': JSON.stringify(env.FIREBASE_API_KEY || env.VITE_FIREBASE_API_KEY || ''),
      'import.meta.env.FIREBASE_AUTH_DOMAIN': JSON.stringify(env.FIREBASE_AUTH_DOMAIN || env.VITE_FIREBASE_AUTH_DOMAIN || ''),
      'import.meta.env.FIREBASE_PROJECT_ID': JSON.stringify(env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID || ''),
      'import.meta.env.FIREBASE_STORAGE_BUCKET': JSON.stringify(env.FIREBASE_STORAGE_BUCKET || env.VITE_FIREBASE_STORAGE_BUCKET || ''),
      'import.meta.env.FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.FIREBASE_MESSAGING_SENDER_ID || env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''),
      'import.meta.env.FIREBASE_APP_ID': JSON.stringify(env.FIREBASE_APP_ID || env.VITE_FIREBASE_APP_ID || ''),
      'import.meta.env.ADMIN_EMAIL': JSON.stringify(env.ADMIN_EMAIL || env.VITE_ADMIN_EMAIL || '')
    }
  };
});
