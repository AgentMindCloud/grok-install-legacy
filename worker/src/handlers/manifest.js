import { exchangeManifestCode } from '../lib/github.js';
import { kvPut } from '../lib/kv.js';
import { html, error } from '../lib/response.js';

export async function handleManifestCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (!code) return error('Missing code', 400);

  let creds;
  try {
    creds = await exchangeManifestCode(code);
  } catch (e) {
    return error(`Manifest exchange failed: ${e.message}`, 502);
  }

  const stored = {
    appId: creds.id,
    slug: creds.slug,
    name: creds.name,
    clientId: creds.client_id,
    clientSecret: creds.client_secret,
    privateKey: creds.pem,
    webhookSecret: creds.webhook_secret,
    htmlUrl: creds.html_url,
    storedAt: new Date().toISOString(),
  };
  await kvPut(env, 'gh-app:credentials', stored);

  const body = `<!doctype html>
<html><head><meta charset="utf-8"><title>grok-install — GitHub App created</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; background: #07090d; color: #e8ecf2; padding: 60px 24px; max-width: 640px; margin: 0 auto; line-height: 1.6; }
  h1 { color: #4ade80; }
  code { background: #151b26; padding: 2px 6px; border-radius: 4px; }
  .ok { background: rgba(74, 222, 128, 0.08); border: 1px solid rgba(74, 222, 128, 0.3); padding: 16px; border-radius: 12px; margin: 24px 0; }
</style></head>
<body>
<h1>GitHub App created</h1>
<p>App: <strong>${stored.name}</strong> (<code>${stored.slug}</code>)</p>
<p>App ID: <code>${stored.appId}</code></p>
<div class="ok">Credentials stored in KV under <code>gh-app:credentials</code>. The mint flow is now ready to create user repos.</div>
<p>You can close this tab.</p>
</body></html>`;
  return html(body);
}
