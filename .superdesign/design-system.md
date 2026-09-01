# Gemini Proxy - Landing Design System

Product: open-source Gemini API proxy with a Signal Deck ops console (Next.js 15, Ant Design 5, IBM Plex, teal accent).
Audience: developers who already know Gemini / OpenAI SDKs and need key pooling, failover, and logs.
Page: public `/` marketing landing. Not the authenticated dashboard.

**Design read:** B2B developer-tool landing for Gemini Proxy operators, Signal Deck identity (IBM Plex + teal on charcoal), overhaul toward condensed scan-and-understand UX using taste-skill anti-slop craft, not a clone of tasteskill.dev.

**Dials:** `DESIGN_VARIANCE: 6` / `MOTION_INTENSITY: 4` / `VISUAL_DENSITY: 6`

**Taste-skill mode:** Redesign-overhaul of IA and composition. Preserve product name, Signal Deck tokens, GitHub + Get Started CTAs, EN/VI switcher. Do not copy tasteskill.dev (Manrope, Playfair italic, warm paper #F5F4F2, coral #FF6B00, glass pills, tilted photo stack).

---

## Product job

One glance should answer: what it is, how you point an SDK at it, and where to go next.

Canonical public base URL in all examples (matches README and `/v1` contract tests):

```ts
baseUrl: "https://your-proxy-endpoint/v1";
```

Same `/v1` for `@google/genai` (`httpOptions.baseUrl`), OpenAI SDK (`baseURL`), and Vercel AI SDK (`createGoogleGenerativeAI({ baseURL })`). Do not advertise `/api/gproxy/gemini`, `/api/gproxy/openai`, or `/v1beta` on the landing. Legacy paths still work in the product; they are not landing content.

---

## Brand tokens (locked - Signal Deck)

Dark default for marketing (matches the console). Light theme exists in product CSS; landing drafts are dark unless a variation explicitly asks for dual-mode.

| Token | Value |
| --- | --- |
| `--gp-bg-base` | `#0b0e11` |
| `--gp-bg-raised` | `#12161c` |
| `--gp-bg-sunken` | `#07090c` |
| `--gp-border` | `#243040` |
| `--gp-text` | `#e6edf3` |
| `--gp-text-secondary` | `#8b9aab` |
| `--gp-text-muted` | `#5c6b7a` |
| `--gp-accent` | `#2bb8a8` |
| `--gp-success` | `#3ecf8e` |
| `--gp-warn` | `#e3b341` |
| `--gp-error` | `#f07178` |
| `--gp-info` | `#5ba3f5` |
| `--gp-radius` | `4px` |
| Font sans | IBM Plex Sans 400/500/600 |
| Font mono | IBM Plex Mono 400/500 |
| Primary CTA | accent fill, dark text or raised panel, radius 4px, one line |
| Secondary CTA | 1px `--gp-border`, `--gp-text` |

No Inter. No Playfair / Fraunces / Instrument Serif. No Manrope. No purple/lila glow. No rainbow Ant Design tag soup. No gradient-clipped H1. No emoji in headings, nav, or section titles.

---

## Anti-slop craft (from taste-skill, applied to this brand)

Borrow discipline, not palette:

- Asymmetric first screen: copy left, real visual right (working `/v1` snippet or App -> Proxy -> Gemini diagram). Not a centered hero over a mesh blob.
- One accent. Teal is punctuation, not a rainbow of badges.
- Hierarchy by weight and color, not 3.5rem screaming type.
- Feature areas are not six equal cards with three tags each. Use an asymmetric grid or a compact definition list.
- Hero visual is real: a short code block that a developer can copy, or a labeled 3-node flow. No fake dashboard of empty rectangles. No gradient orb.
- Zero em-dashes. Zero section-number eyebrows (`01 / Capabilities`). Zero "Quietly in use at". Zero "Seamless / Unleash / Next-Gen".
- No decorative middle-dot strips. No version footer on marketing. No Lucide-by-default; use simple text/SVG already in the product (Ant / react-icons) or skip icons.
- Motion: hover and one short enter. No infinite float/shimmer/typewriter.

---

## Landing information architecture (condensed)

Replace the current 7 stacked marketing sections with 4 beats. Duplicate facts appear once.

1. **Top bar** - product name "Gemini Proxy", GitHub text link, Get Started (`/dashboard`), language switcher. No icon-only mystery nav.
2. **Hero** - one headline (product job, not a slogan), one sentence of body, two CTAs, MIT as a single quiet text chip (not five tech badges). Right: the `/v1` snippet or the 3-node flow. Tech names (TypeScript, Next.js, Supabase) do not belong in the hero; they live in the deploy strip or footer.
3. **Connect** - three SDK tabs (`@google/genai`, OpenAI, Vercel AI SDK). Each snippet is short (constructor + one call). Highlight `.../v1`. Copy button. One line of helper text, not a paragraph.
4. **What it does** - four facts max, scannable: pool keys, fail over, log every request, deploy web or API. Visual variation between cells (one cell is the flow diagram if it was not in the hero). Not six cards of overlapping copy.
5. **Deploy strip** - one row: Next.js full-stack / standalone API / edge. Platform names as text or small logos, not three tall cards with tags.
6. **Footer** - blurb, Dashboard, GitHub, Issues, copyright. Tech stack as a single muted line, not a tag cloud.

Kill as standalone sections: Tech Stack grid, Architecture essay, Deployment 3-up cards, Features 6-up cards.

---

## Copy voice

Concrete, short, developer-register. English default in drafts (vi exists in i18n).

- Headline direction: "Point any Gemini SDK at one `/v1` URL."
- Body direction: "Pool keys, fail over, log requests. Same OpenAI and Google clients you already use."
- CTA: "Get started" / "GitHub"
- Do not rewrite into poetic agency copy.

Current source copy is verbose and repetitive. Redesign drafts use the condensed voice above, not a paste of `landing.features.*.body`.

---

## Current UI (ground truth for reproduction only)

Existing `/` is Ant Design marketing: centered gradient H1, emoji H2s, MIT + five tech badges, six equal feature cards, long `http://localhost:9090/api/gproxy/...` examples, tech-stack cards, three deployment cards, three-box architecture plus two paragraphs, footer tag cloud. Language switcher top-right. Reproduction drafts must match that structure. Redesign drafts must not.

---

## Motion and density

- Density 6: more information per viewport than a typical SaaS landing; less than the ops console.
- Motion 4: button hover, tab underline, copy-check. No scroll hijack.
- Radius 4px everywhere. Hairline borders, no heavy drop shadows (Ant `boxShadow: none` in the product).

---

## Constraints for Superdesign drafts

- Desktop 1440-wide marketing page, dark Signal Deck.
- Use only fonts, colors, spacing, and component styles in this file. Do not introduce fonts, colors, or visual styles not in this file.
- Logo position: wordmark text "Gemini Proxy" (the product has no uploaded SVG logo; do not invent a mark, initials orb, or key emoji as a logo).
- All example code must use `https://your-proxy-endpoint/v1`.
- Vietnamese and English switcher may appear; default visible copy is English.
