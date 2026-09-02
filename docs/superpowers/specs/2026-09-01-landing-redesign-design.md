# Home Landing Redesign - Scan-First Signal Deck

**Date:** 2026-09-01
**Approach:** B - condensed scan-first landing (taste-skill overhaul, Signal Deck preserved)
**Status:** Direction C implemented in `apps/web` with GPT snippet IA (client + language tabs). Superdesign drafts remain visual reference only.
**Route:** `/` (`apps/web/src/app/page.tsx` -> `LandingPage`)

## Goal

Redesign the public home so a developer understands Gemini Proxy in one pass: what it is, that SDKs use a short `/v1` base URL, and where to click next. Visual language stays Signal Deck (IBM Plex, teal `#2bb8a8`, charcoal). Craft follows [taste-skill](https://www.tasteskill.dev/) anti-slop rules. Do not clone tasteskill.dev.

## Design read

Reading this as: B2B developer-tool landing for Gemini Proxy operators, with Signal Deck identity, overhaul toward condensed scan-and-understand UX, leaning toward Primer-like devtool marketing + native CSS, not Inter / purple-gradient SaaS templates.

**Dials:** variance 6 / motion 4 / density 6

## Problem (current UI)

| Issue                                                                                    | Impact                                                                            |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Centered gradient H1, emoji H2s, five rainbow badges                                     | Classic AI-slop landing; fights the console brand                                 |
| Six equal feature cards, each with three tags                                            | Slow to scan; overlapping copy                                                    |
| Examples use `http://localhost:9090/api/gproxy/gemini` (and `/openai`, `/gemini/v1beta`) | Longer than the working canonical `/v1` already in README and core contract tests |
| Tech stack + deployment + architecture + footer all repeat the same facts                | Page feels long without adding information                                        |
| Architecture is three boxes plus two prose columns                                       | Not glanceable; no visual of `/v1`                                                |
| Hero body is a comma-separated feature dump                                              | Does not show how to connect                                                      |

## Approaches considered

1. **A - Targeted restyle.** Keep seven sections, swap colors/type. Fast, still noisy.
2. **B - Condensed scan-first (chosen).** Four beats, `/v1` as the product visual, kill duplicate sections. Matches "look once and understand" and shorter working examples.
3. **C - New brand.** Warm-paper / Manrope / coral like tasteskill.dev. Rejected: that is their product, not ours.

## Design decisions (locked)

1. **Identity:** Signal Deck tokens only. Dark marketing default. Wordmark is the text "Gemini Proxy" (no invented logo).
2. **Canonical example URL:** `{origin}/v1` on the live landing (the origin of the page the visitor opened). README still uses `https://your-proxy-endpoint/v1`. Proven by `packages/core/test/proxy-contract/v1-routing.test.ts`. Legacy `/api/gproxy/{gemini\|openai}` stays in the product, off the landing.
3. **IA:** Top bar, hero, connect (SDK tabs), what-it-does (max four facts), deploy strip, footer. Drop standalone Tech Stack, Architecture essay, Deployment 3-up, Features 6-up.
4. **Hero visual:** real `/v1` snippet or App -> Proxy -> Gemini flow. Not a mesh blob, not a fake dashboard of empty divs.
5. **Anti-slop:** no gradient text, no emoji headings, no three-equal-card row, no em-dash, no "Seamless / Unleash / Next-Gen", no Inter, no purple glow.
6. **Copy:** short, concrete, English in drafts; vi keys stay in scope for implementation.

## Information architecture

```text
[ Gemini Proxy          GitHub    Get started    EN/VI ]
[ Headline + 1 sentence + 2 CTAs | /v1 code or 3-node flow ]
[ SDK tabs: @google/genai | OpenAI | Vercel AI SDK         ]
[ Four facts: keys, failover, logs, deploy                 ]
[ Deploy strip: Next.js | standalone API | edge            ]
[ Footer: blurb, links, muted tech line                    ]
```

### Connect snippets (implementation source of truth)

```ts
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: "YOUR_PROXY_API_KEY",
  httpOptions: { baseUrl: "https://your-proxy-endpoint/v1" },
});
```

```ts
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "YOUR_PROXY_API_KEY",
  baseURL: "https://your-proxy-endpoint/v1",
});
```

```ts
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const google = createGoogleGenerativeAI({
  apiKey: "YOUR_PROXY_API_KEY",
  baseURL: "https://your-proxy-endpoint/v1",
});
```

## Snippet IA (locked)

GPT-5.6 Sol brief, implemented in-app (Superdesign is reference only):

- Hero keeps the ops-dense split: headline + CTAs on the left, **one** code panel on the right.
- Two tab rows on that panel: **client** (`Google GenAI`, `OpenAI SDK`, `Vercel AI SDK`) then **language** (`TypeScript/JavaScript`, `Python`, `curl`).
- Default: Google GenAI + TypeScript/JavaScript.
- Vercel AI SDK is TypeScript-only; Python/curl hide instead of showing an empty panel.
- Every snippet includes the import (or the full curl command) and `{origin}/v1` for the current site.
- Models in demos: `gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.5-flash`, `gemma-4-31b-it`. No `gemini-2.x`.
- Highlighting: Prism `typescript` / `python` / `bash` with Signal Deck token colors, not oneDark purple. The `/v1` line is accent-tinted.

## Superdesign exploration

SOP: existing UI. One pixel-faithful reproduction of current `/`, then three layout branches (same tokens, different composition), each on a different model.

Canvas (live): [Gemini Proxy Landing](https://superdesign.dev/teams/b0873d97-51c3-4835-815f-93500bdd8977/projects/9cee4ed1-dd65-40b7-ac98-6433838ff88d?live=1)

| Branch          | Model             | Skill lens                | Draft                                                                           |
| --------------- | ----------------- | ------------------------- | ------------------------------------------------------------------------------- |
| Reproduction    | `gemini-3.1-pro`  | ground truth              | [preview](https://p.superdesign.dev/draft/9d7474a5-53b4-474a-8c61-ac8708f56b4f) |
| A Scan-first    | `grok-4.5`        | taste-skill v2 + redesign | [preview](https://p.superdesign.dev/draft/405397c1-fbb9-4ae4-83a3-cc4eb15e9049) |
| B Diagram-first | `deepseek-v4-pro` | minimalist-skill          | [preview](https://p.superdesign.dev/draft/65963d64-7fcc-43fe-8ec5-fea4dd5e90e1) |
| C Ops-dense     | `gpt-5.6-luna`    | gpt-tasteskill            | [preview](https://p.superdesign.dev/draft/a8dbc61d-e6f4-4692-a543-75837048a9f1) |

**Selected:** C. Keep the first viewport (headline + `/v1` snippet + four facts). Fold in A's "code is the product visual" by highlighting the `baseUrl` line.

C v2 ([preview](https://p.superdesign.dev/draft/a8dbc61d-e6f4-4692-a543-75837048a9f1)): numbered facts removed, `/v1` line highlighted, three SDK snippets all use `/v1`, Connect heading stacked. `gpt-5.6-sol` generation was blocked (Superdesign team out of credits; Sol is a pro/expensive model). v2 is a credit-free import on the selected draft. Re-run Sol after billing if a second model pass is still wanted.

## Error handling and empty states

Landing is static. No data fetch. Copy button needs a copied state. CTAs: `/dashboard` (auth may redirect to login) and GitHub (new tab). Language switcher remains.

## Testing (when implementing)

1. Visual: desktop + mobile, dark theme, no emoji headings, `/v1` visible above the fold.
2. i18n: `en` / `vi` key parity (`pnpm i18n:check`).
3. Snippets: copy matches README `/v1`; no leftover `/api/gproxy/gemini` on `/`.
4. Links: Get started, GitHub, Issues, language switcher.
5. Regression: protected Signal Deck pages unchanged.

## Out of scope

- Dashboard / request-logs UI
- Changing proxy routing
- New logo asset
- Light-theme-only landing
- Cloning tasteskill.dev visual identity

## References

- Current landing: `apps/web/src/components/landing/`
- Tokens: `.superdesign/init/theme.md`, `apps/web/src/app/globals.css`
- Design system: `.superdesign/design-system.md`
- README usage: `/v1` examples
- Contract: `packages/core/test/proxy-contract/v1-routing.test.ts`
- Taste-skill: https://www.tasteskill.dev/ (craft only)
