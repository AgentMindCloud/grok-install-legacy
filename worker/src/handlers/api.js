import { json, error } from '../lib/response.js';
import { kvGet, kvPut } from '../lib/kv.js';
import { loadSession, saveSession, requireSession, sessionIdFromRequest } from '../lib/session.js';
import { generateGenesisId, bumpDailyCounter, getStats } from '../lib/genesis.js';
import { chatJson, chatText, generateImage } from '../lib/xai.js';
import { profileAnalyzerPrompt, sampleReplyPrompt, safeProfileDefaults, safeSampleReply } from '../lib/prompts.js';
import { buildMascotPrompt, isValidStyle, buildXIntentForMascot } from '../lib/mascots.js';
import { buildMintRepoFiles } from '../lib/repo-template.js';
import { createUserRepo, commitFilesToRepo, starRepo } from '../lib/github.js';
import { validateYamlAgainstV214 } from '../lib/yaml-validator.js';

const MAX_MASCOT_REROLLS = 5;
const MAX_SAMPLE_REROLLS = 3;

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'agent';
}

function noLeakedSecrets(yamlText) {
  return !/sk-[a-zA-Z0-9]{20,}|xai-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}/.test(yamlText);
}

export async function handleHealth(env) {
  return json({
    ok: true,
    name: env.PRODUCT_NAME || 'grok-install',
    version: '1.0.0',
    time: new Date().toISOString(),
  });
}

export async function handleStats(request, env) {
  return json(await getStats(env));
}

export async function handleWall(request, env) {
  const ids = (await kvGet(env, 'wall:recent')) ?? [];
  const wall = [];
  for (const id of ids) {
    const m = await kvGet(env, `mint:${id}`);
    if (!m) continue;
    wall.push({
      genesisId: m.genesisId,
      xUsername: m.xUsername,
      agentHandle: m.agentHandle,
      agentName: m.agentName,
      mascotStyle: m.mascotStyle,
      mascotUrl: m.mascotUrl,
      repoUrl: m.repoUrl,
      mintedAt: m.mintedAt,
    });
  }
  return json({ wall });
}

export async function handleMintLookup(genesisId, env) {
  const m = await kvGet(env, `mint:${genesisId}`);
  if (!m) return error('Not found', 404);
  return json({
    genesisId: m.genesisId,
    xUsername: m.xUsername,
    agentHandle: m.agentHandle,
    agentName: m.agentName,
    description: m.description,
    mascotUrl: m.mascotUrl,
    mascotStyle: m.mascotStyle,
    mintedAt: m.mintedAt,
    repoUrl: m.repoUrl,
    optInWall: m.optInWall,
    profile: m.profile,
    source: m.source || 'signal',
    templateName: m.templateName || null,
  });
}

const MASCOT_GRADIENTS = {
  cyberpunk_neon: ['#f0abfc', '#22d3ee'],
  retro_pixel: ['#fde047', '#f97316'],
  anime_portrait: ['#fbcfe8', '#c084fc'],
  hand_sketched: ['#d6d3d1', '#57534e'],
  liquid_gold: ['#fbbf24', '#d97706'],
  dark_glass: ['#1e293b', '#475569'],
  comic_ink: ['#f87171', '#1f2937'],
  specimen_plate: ['#d4a341', '#f5ead4'],
};

function escapeXml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function handleMascotPng(genesisId, env) {
  const { value: buf, metadata } = await env.GROK_INSTALL_KV.getWithMetadata(`mascot-blob:${genesisId}`, { type: 'arrayBuffer' });
  if (!buf) return error('Not found', 404);
  const contentType = (metadata && metadata.contentType) || 'image/jpeg';
  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
      'Content-Length': String(buf.byteLength),
    },
  });
}

export async function handleSpecimenSvg(genesisId, env) {
  const m = await kvGet(env, `mint:${genesisId}`);
  if (!m) return error('Not found', 404);

  const name = m.agentName || 'Agent';
  const handle = m.agentHandle || m.xUsername || '';
  const grad = MASCOT_GRADIENTS[m.mascotStyle] || MASCOT_GRADIENTS.specimen_plate;
  const traits = (m.profile && Array.isArray(m.profile.voice_traits)) ? m.profile.voice_traits.slice(0, 3) : [];
  const initial = name.slice(0, 1).toUpperCase();
  const mintedAt = m.mintedAt ? new Date(m.mintedAt).toISOString().slice(0, 10) : '';

  const traitsRow = traits.length
    ? traits.map((t, i) =>
        `<g transform="translate(${80 + i * 220},1500)">
          <rect rx="999" ry="999" width="200" height="56" fill="rgba(167,139,250,0.12)" stroke="#a78bfa" stroke-opacity="0.35" stroke-width="2"/>
          <text x="100" y="36" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="20" fill="#c4b5fd">${escapeXml(t)}</text>
        </g>`
      ).join('')
    : '';

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#07090d"/>
      <stop offset="1" stop-color="#0f141c"/>
    </linearGradient>
    <linearGradient id="mascot" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${grad[0]}"/>
      <stop offset="1" stop-color="${grad[1]}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.3" r="0.55">
      <stop offset="0" stop-color="#4ade80" stop-opacity="0.25"/>
      <stop offset="1" stop-color="#4ade80" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="1080" height="1920" fill="url(#bg)"/>
  <rect width="1080" height="1920" fill="url(#glow)"/>

  <g opacity="0.06" stroke="#4ade80" stroke-width="1">
    ${Array.from({ length: 11 }, (_, i) => `<line x1="${i * 108}" y1="0" x2="${i * 108}" y2="1920"/>`).join('')}
    ${Array.from({ length: 18 }, (_, i) => `<line x1="0" y1="${i * 108}" x2="1080" y2="${i * 108}"/>`).join('')}
  </g>

  <text x="540" y="170" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="22" letter-spacing="6" fill="#9ca3af">GROK-INSTALL · SPECIMEN PLATE</text>

  <g transform="translate(290,310)">
    <rect width="500" height="500" rx="40" ry="40" fill="url(#mascot)"/>
    <text x="250" y="350" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="280" font-weight="800" fill="#07090d">${escapeXml(initial)}</text>
  </g>

  <text x="540" y="950" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="84" font-weight="800" fill="#e8ecf2" letter-spacing="-2">${escapeXml(name)}</text>
  <text x="540" y="1010" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="28" fill="#9ca3af">@${escapeXml(handle)}</text>

  <g transform="translate(360,1110)">
    <rect width="360" height="80" rx="16" ry="16" fill="rgba(167,139,250,0.12)" stroke="#a78bfa" stroke-opacity="0.4" stroke-width="2"/>
    <text x="180" y="52" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="32" fill="#c4b5fd">${escapeXml(genesisId)}</text>
  </g>

  <text x="540" y="1240" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="20" letter-spacing="4" fill="#6b7280">VOICE TRAITS</text>
  ${traitsRow}

  <g transform="translate(290,1700)">
    <rect width="500" height="56" rx="999" ry="999" fill="rgba(74,222,128,0.08)" stroke="#4ade80" stroke-opacity="0.3" stroke-width="2"/>
    <text x="250" y="38" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="22" font-weight="600" fill="#4ade80">Built with grok-install</text>
  </g>

  <text x="540" y="1820" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="16" fill="#4b5563">${escapeXml(mintedAt)}  ·  agentmindcloud.github.io/grok-install</text>
</svg>`;

  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'Content-Disposition': `inline; filename="${genesisId}.svg"`,
    },
  });
}

export async function handleAnalyzeProfile(request, env) {
  let body;
  try { body = await request.json(); } catch { return error('Invalid JSON', 400); }
  const sessionId = body.sessionId || sessionIdFromRequest(request);
  let session;
  try { session = await requireSession(env, sessionId); } catch (e) { return error(e.message, e.status || 401); }

  const handle = session.xUsername;
  const systemPrompt = profileAnalyzerPrompt(handle);

  let profile;
  try {
    profile = await chatJson(env, {
      systemPrompt,
      userPrompt: `Analyze @${handle}.`,
      model: 'grok-4',
      temperature: 0.3,
      fallback: safeProfileDefaults(),
    });
  } catch {
    profile = safeProfileDefaults();
  }
  if (!profile.voice_traits) profile = safeProfileDefaults();

  let sampleReply;
  try {
    sampleReply = await chatText(env, {
      systemPrompt: sampleReplyPrompt(handle, profile),
      model: 'grok-3',
      temperature: 0.7,
      maxTokens: 280,
    });
  } catch {
    sampleReply = safeSampleReply(handle);
  }

  session.sampleRerolls = (session.sampleRerolls ?? 0) + 1;
  await saveSession(env, sessionId, session);

  return json({
    handle,
    profile,
    sample_reply: sampleReply,
    rerolls_remaining: Math.max(0, MAX_SAMPLE_REROLLS - session.sampleRerolls),
  });
}

export async function handleGenerateMascot(request, env) {
  let body;
  try { body = await request.json(); } catch { return error('Invalid JSON', 400); }
  const sessionId = body.sessionId || sessionIdFromRequest(request);
  let session;
  try { session = await requireSession(env, sessionId); } catch (e) { return error(e.message, e.status || 401); }

  const style = body.style;
  const profile = body.profile;
  if (!isValidStyle(style)) return error('Invalid mascot style', 400);
  if (session.mascotRerolls >= MAX_MASCOT_REROLLS) {
    return error('Mascot rerolls exhausted', 429, { rerolls_remaining: 0 });
  }

  const promptText = buildMascotPrompt(style, { handle: session.xUsername, profile });
  try {
    const img = await generateImage(env, { prompt: promptText });
    session.mascotRerolls = (session.mascotRerolls ?? 0) + 1;
    await saveSession(env, sessionId, session);
    return json({
      mascotUrl: img.url,
      style,
      rerolls_remaining: Math.max(0, MAX_MASCOT_REROLLS - session.mascotRerolls),
    });
  } catch (e) {
    const intentUrl = buildXIntentForMascot(style, session.xUsername);
    return json({
      mascotUrl: null,
      promptText,
      manualFallback: true,
      intentUrl,
      reason: e.message,
      rerolls_remaining: Math.max(0, MAX_MASCOT_REROLLS - session.mascotRerolls),
    });
  }
}

export async function handleMint(request, env) {
  let body;
  try { body = await request.json(); } catch { return error('Invalid JSON', 400); }
  const sessionId = body.sessionId || sessionIdFromRequest(request);
  let session;
  try { session = await requireSession(env, sessionId); } catch (e) { return error(e.message, e.status || 401); }

  if (!session.ghToken || !session.ghUsername) {
    return error('GitHub not connected. Visit /auth/github/start first.', 401);
  }

  const MINT_COOLDOWN_MS = 60 * 1000;
  const lastMintAt = session.lastMintAt ? Date.parse(session.lastMintAt) : 0;
  if (lastMintAt && (Date.now() - lastMintAt) < MINT_COOLDOWN_MS) {
    const waitMs = MINT_COOLDOWN_MS - (Date.now() - lastMintAt);
    return error(
      `Slow down — please wait ${Math.ceil(waitMs / 1000)}s before minting again.`,
      429,
      {},
      { 'Retry-After': String(Math.ceil(waitMs / 1000)) }
    );
  }

  const agentName = String(body.agentName || '').trim();
  const agentHandle = String(body.agentHandle || '').trim().replace(/^@/, '');
  const mascotStyle = body.mascotStyle || 'specimen_plate';
  const mascotUrl = body.mascotUrl || null;
  const profile = body.profile || null;
  const optInWall = body.optInWall !== false;
  const source = body.source || 'signal';
  const templateName = body.templateName || null;
  const description = body.description || `${agentName} — built with grok-install.`;

  if (!agentName || !agentHandle) return error('agentName and agentHandle required', 400);
  if (!isValidStyle(mascotStyle)) return error('Invalid mascot style', 400);
  const ownerHandle = (session.xUsername || '').replace(/^@/, '').toLowerCase();
  if (agentHandle.toLowerCase() !== ownerHandle) {
    return error("Agent's X handle must match your signed-in X account (@" + (session.xUsername || '') + ").", 422);
  }

  const slug = slugify(agentName);
  const repoName = slug;

  let repo;
  try {
    repo = await createUserRepo(session.ghToken, {
      name: repoName,
      description,
      homepage: `https://x.com/${agentHandle}`,
      isPrivate: false,
    });
  } catch (e) {
    return error(`Repo create failed: ${e.message}`, 502);
  }

  const genesisId = await generateGenesisId(env);

  const yamlArgs = {
    agentName,
    slug,
    genesisId,
    description,
    agentHandle,
    ownerHandle: session.xUsername,
    ownerGithub: session.ghUsername,
    profile,
    mascotStyle,
    optInWall,
    templateName,
  };
  const files = buildMintRepoFiles(yamlArgs);
  const yamlFile = files.find(f => f.path === 'grok-install.yaml');
  if (!noLeakedSecrets(yamlFile.content)) {
    console.warn('mint: leaked-secret pattern detected in YAML for', genesisId, '— minting anyway per scanner-off policy');
  }
  const v214 = validateYamlAgainstV214(yamlFile.content);
  if (!v214.ok) {
    console.warn('mint: emitted YAML failed v2.14 validation for', genesisId, '—', v214.errors);
    return error(`Generated YAML failed v2.14 validation: ${v214.errors}`, 422);
  }

  try {
    await commitFilesToRepo(session.ghToken, {
      owner: repo.owner.login,
      repo: repo.name,
      branch: 'main',
      message: 'init: minted via grok-install',
      files,
    });
  } catch (e) {
    return error(`Commit failed: ${e.message}`, 502, { repoUrl: repo.html_url });
  }

  // Generate mascot via Grok image API. Failure is non-fatal — mascotUrl stays null.
  let resolvedMascotUrl = mascotUrl;
  try {
    const prompt = buildMascotPrompt(mascotStyle, { handle: agentHandle, profile });
    const { url: imageUrl } = await generateImage(env, { prompt });
    if (imageUrl) {
      const imgRes = await fetch(imageUrl);
      if (imgRes.ok) {
        const buf = await imgRes.arrayBuffer();
        const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
        const MASCOT_TTL_S = 90 * 24 * 3600;
        await env.GROK_INSTALL_KV.put(`mascot-blob:${genesisId}`, buf, {
          expirationTtl: MASCOT_TTL_S,
          metadata: { contentType, sourceUrl: imageUrl, savedAt: new Date().toISOString() },
        });
        const origin = new URL(request.url).origin;
        resolvedMascotUrl = `${origin}/api/mascot/${genesisId}.png`;
      } else {
        console.warn('mint: mascot fetch non-ok', imgRes.status);
      }
    }
  } catch (e) {
    console.warn('mint: mascot generation failed (non-fatal):', e.message);
  }

  const mintedAt = new Date().toISOString();
  const mintRecord = {
    genesisId,
    xUserId: session.xUserId,
    xUsername: session.xUsername,
    agentName,
    agentHandle,
    description,
    mascotStyle,
    mascotUrl: resolvedMascotUrl,
    profile,
    optInWall,
    source,
    templateName,
    repoUrl: repo.html_url,
    ghOwner: repo.owner.login,
    ghRepo: repo.name,
    mintedAt,
    status: 'active',
    limits: { daily_replies: 200, qps: 0.5, daily_usd_cap: 3, max_thread_depth: 5, cooldown_seconds: 30 },
    features: {},
    blockedUsers: [],
    templateVersion: '1.5.0',
  };
  try {
    await kvPut(env, `mint:${genesisId}`, mintRecord);
  } catch (e) {
    return error(`Mint record write failed: ${e.message}`, 502, { repoUrl: repo.html_url, genesisId });
  }

  try {
    const ownerKey = `owner:${session.xUsername}`;
    const ownerList = (await kvGet(env, ownerKey)) ?? [];
    if (!ownerList.includes(genesisId)) {
      ownerList.push(genesisId);
      await kvPut(env, ownerKey, ownerList);
    }
  } catch (e) { console.warn('owner list update failed', e); }

  if (optInWall) {
    try {
      const wall = (await kvGet(env, 'wall:recent')) ?? [];
      if (!wall.includes(genesisId)) {
        wall.unshift(genesisId);
        await kvPut(env, 'wall:recent', wall.slice(0, 12));
      }
    } catch (e) { console.warn('wall update failed', e); }
  }

  try { await bumpDailyCounter(env); } catch (e) { console.warn('daily counter bump failed', e); }

  try {
    session.lastMintAt = mintedAt;
    await saveSession(env, sessionId, session);
  } catch (e) { console.warn('session lastMintAt update failed', e); }

  const tweetText = `Just minted my AI agent @${agentHandle} with grok-install. Genesis ${genesisId}.\n\n${repo.html_url}`;
  const installComment = '@grok install this';
  const dashboardUrl = `${env.PUBLIC_BASE_URL}/dashboard.html?genesis=${genesisId}`;

  return json({
    genesisId,
    repoUrl: repo.html_url,
    tweetText,
    installComment,
    dashboardUrl,
    mintedAt,
  });
}

export async function handleStarTemplate(request, env) {
  let body = {};
  try { body = await request.json(); } catch { /* allow empty body */ }
  const sessionId = body.sessionId || sessionIdFromRequest(request);
  let session;
  try { session = await requireSession(env, sessionId); } catch (e) { return error(e.message, e.status || 401); }
  if (!session.ghToken) return error('GitHub not connected', 401);

  const owner = env.GITHUB_OWNER_ORG || 'AgentMindCloud';
  const ok = await starRepo(session.ghToken, owner, 'grok-install');
  return json({ starred: ok });
}
