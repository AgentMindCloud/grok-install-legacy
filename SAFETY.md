# SAFETY.md — grok-install hard limits

This document defines the **non-negotiable safety floor** every agent built with grok-install must satisfy. The `safety-scanner.js` validates every YAML against these rules. Agents failing any check cannot be minted.

## Hard rules (machine-enforced)

### Behavior
1. **Reply-only on mention** — agents never proactively message anyone. No keyword scanning of public posts.
2. **No DMs** — the `send_dm` tool requires explicit owner approval and is disabled by default.
3. **No mass actions** — auto-follow, auto-like, auto-quote are blocked unless explicitly enabled and rate-limited.
4. **Honors opt-out immediately** — agent receives `OPTOUT` mention from any user → never replies to that user again.
5. **No deepfakes** — mascot generation is locked to 8 stylized illustration prompts. No real-person likenesses.

### Identity
6. **Clear AI labeling** — agent's bio must contain one of: `AI`, `Bot`, `Powered by Grok`.
7. **Pretend-human disallowed** — when asked "are you a bot?" the agent must answer truthfully.

### Limits
8. **Rate-limited** — `qps`, `daily_replies`, and `daily_usd_cap` are declared in YAML and enforced by the runtime.
9. **No bypass** — agents cannot dynamically alter their own limits at runtime.

### Security
10. **No hardcoded keys** — scanner rejects any YAML with literal API keys or secrets.
11. **Minimum scopes** — agents request only the tools they actively use.

## Owner consent for updates

Agents do not auto-update. The owner approves every change explicitly. See [README.md → Update Consent Model](README.md#update-consent-model).

## Reporting issues

If you find an agent violating these rules: open an issue at https://github.com/AgentMindCloud/grok-install/issues
