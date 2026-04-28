#!/usr/bin/env node
/**
 * grok-install safety-scanner
 * Validates a grok-install.yaml against the non-negotiable safety floor.
 *
 * Usage:
 *   node safety-scanner.js path/to/grok-install.yaml
 *   exit 0 = pass, exit 1 = fail
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const RULES = [
  { id: 'safety-block-required', check: (d) => d.safety && typeof d.safety === 'object', message: 'Missing required safety: block.' },
  { id: 'mention-only-true', check: (d) => d.safety?.mention_only === true, message: 'safety.mention_only must be true.' },
  { id: 'clear-ai-labeling', check: (d) => d.safety?.clear_ai_labeling === true, message: 'safety.clear_ai_labeling must be true.' },
  { id: 'audit-log-on', check: (d) => d.safety?.audit_log === true, message: 'safety.audit_log must be true.' },
  { id: 'optout-honored', check: (d) => d.safety?.optout_honored !== false, message: 'safety.optout_honored cannot be false.' },
  { id: 'rate-limit-strict', check: (d) => ['strict', 'moderate'].includes(d.safety?.rate_limit_strategy), message: 'safety.rate_limit_strategy must be "strict" or "moderate".' },
  { id: 'limits-declared', check: (d) => d.limits && typeof d.limits.daily_replies === 'number' && typeof d.limits.qps === 'number' && typeof d.limits.daily_usd_cap === 'number', message: 'limits.daily_replies, limits.qps, limits.daily_usd_cap all required as numbers.' },
  { id: 'limits-within-ceiling', check: (d) => (d.limits?.daily_replies ?? 0) <= 1000 && (d.limits?.qps ?? 0) <= 5 && (d.limits?.daily_usd_cap ?? 0) <= 50, message: 'limits exceed maximum allowed: daily_replies<=1000, qps<=5, daily_usd_cap<=50.' },
  { id: 'tools-list-valid', check: (d) => Array.isArray(d.tools) && d.tools.length > 0, message: 'tools must be a non-empty array.' },
  {
    id: 'tools-allowlist',
    check: (d) => {
      const allowed = ['read_mentions','reply_to_mentions','post_text','post_image','like_posts','repost','follow_users','send_dm'];
      return (d.tools || []).every(t => allowed.includes(t));
    },
    message: 'tools contains an unrecognized name. Allowed: read_mentions, reply_to_mentions, post_text, post_image, like_posts, repost, follow_users, send_dm.'
  },
  {
    id: 'sensitive-tools-need-approval',
    check: (d) => {
      const sensitive = ['send_dm', 'follow_users'];
      const tools = d.tools || [];
      const approval = d.safety?.approval_required || [];
      return sensitive.every(s => !tools.includes(s) || approval.includes(s));
    },
    message: 'send_dm and follow_users require safety.approval_required entry.'
  },
  {
    id: 'no-hardcoded-keys',
    check: (d) => {
      const json = JSON.stringify(d);
      const patterns = [/sk-[a-zA-Z0-9]{20,}/, /xai-[a-zA-Z0-9]{20,}/, /ghp_[a-zA-Z0-9]{20,}/, /AIza[0-9A-Za-z_-]{20,}/];
      return !patterns.some(p => p.test(json));
    },
    message: 'Hardcoded API key detected in YAML. Never commit secrets.'
  },
  { id: 'brain-required', check: (d) => d.brain?.provider && d.brain?.model, message: 'brain.provider and brain.model are required.' },
  { id: 'brain-xai-only', check: (d) => d.brain?.provider === 'xai', message: 'brain.provider must be "xai".' },
  { id: 'brain-model-allowlist', check: (d) => ['grok-4', 'grok-3', 'grok-4-heavy'].includes(d.brain?.model), message: 'brain.model must be one of: grok-4, grok-3, grok-4-heavy.' },
  { id: 'commands-universal-present', check: (d) => d.commands && d.commands.help && d.commands.whatsnew && d.commands.update, message: 'commands.help, commands.whatsnew, commands.update are required (universal commands).' },
  { id: 'features-block-shape', check: (d) => !d.features || typeof d.features === 'object', message: 'features must be an object if present.' },
  { id: 'manifest-url-present', check: (d) => typeof d.manifest_url === 'string' && d.manifest_url.startsWith('https://'), message: 'manifest_url required and must be https.' },
  { id: 'genesis-id-format', check: (d) => typeof d.genesis_id === 'string' && /^GA-[A-Z0-9]{8}$/.test(d.genesis_id || ''), message: 'genesis_id must match format GA-XXXXXXXX (8 uppercase alphanumeric).' },
  { id: 'x-account-bio-words', check: (d) => Array.isArray(d.x_account?.bio_required_words) && d.x_account.bio_required_words.length > 0, message: 'x_account.bio_required_words required (at least one of: AI, Bot, Powered by Grok).' }
];

function scan(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(2);
  }
  let doc;
  try {
    doc = yaml.load(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`YAML parse error: ${err.message}`);
    process.exit(2);
  }
  let passed = 0, failed = 0;
  for (const rule of RULES) {
    const ok = rule.check(doc);
    if (ok) { console.log(`  PASS  ${rule.id}`); passed++; }
    else { console.log(`  FAIL  ${rule.id} — ${rule.message}`); failed++; }
  }
  console.log('');
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    console.log('\nAgent CANNOT be minted until all rules pass.');
    process.exit(1);
  } else {
    console.log('Agent passes the grok-install safety floor. Ready to mint.');
    process.exit(0);
  }
}

const arg = process.argv[2];
if (!arg) {
  console.log('Usage: node safety-scanner.js <path-to-grok-install.yaml>');
  process.exit(2);
}
scan(path.resolve(arg));
