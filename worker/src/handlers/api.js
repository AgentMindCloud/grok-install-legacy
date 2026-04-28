import { json, error } from '../lib/response.js';
import { kvGet, kvPut } from '../lib/kv.js';
import { loadSession, saveSession, requireSession, sessionIdFromRequest } from '../lib/session.js';
import { generateGenesisId, bumpDailyCounter, getStats } from '../lib/genesis.js';
import { chatJson, chatText, generateImage } from '../lib/xai.js';
import { profileAnalyzerPrompt, sampleReplyPrompt, safeProfileDefaults, safeSampleReply } from '../lib/prompts.js';
import { buildMascotPrompt, isValidStyle, buildXIntentForMascot } from '../lib/mascots.js';
import { buildMintRepoFiles } from '../lib/repo-template.js';
import { createUserRepo, commitFilesToRepo, starRepo } from '../lib/github.js';

const MAX_MASCOT_REROLLS = 5;
const MAX_SAMPLE_REROLLS = 3;

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'agent';
}

function isInlineSafe(yamlText) {
  if (/sk-[a-zA-Z0-9]{20,}|xai-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}/.test(yamlText)) return false;
  if (!/mention_only:\s*true/.test(yamlText)) return false;
  if (!/clear_ai_labeling:\s*true/.test(yamlText)) return false;
  if (!/audit_log:\s*true/.test(yamlText)) return false;
  return true;
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
      mascotUrl: m.mascotUrl,
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
    const img = await generateImage(env, { prompt: promptText, model: 'grok-2-image' });
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
    return error(`Slow down — please wait ${Math.ceil(waitMs / 1000)}s before minting again.`, 429);
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
  if (!isInlineSafe(yamlFile.content)) {
    return error('Inline safety check failed; agent NOT minted.', 422, { repoUrl: repo.html_url });
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

  const mintedAt = new Date().toISOString();
  const mintRecord = {
    genesisId,
    xUserId: session.xUserId,
    xUsername: session.xUsername,
    agentName,
    agentHandle,
    description,
    mascotStyle,
    mascotUrl,
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

  const tweetText = `Just minted my AI agent @${agentHandle} with grok-install. Genesis ${genesisId}.\n\n@grok install ${repo.html_url}`;
  const dashboardUrl = `${env.PUBLIC_BASE_URL}/dashboard.html?genesis=${genesisId}`;

  return json({
    genesisId,
    repoUrl: repo.html_url,
    tweetText,
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
