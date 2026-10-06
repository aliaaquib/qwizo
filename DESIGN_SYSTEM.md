# Qwizo Design System

**Status:** Permanent constitution. Source of truth for all Qwizo UI work.

**Rule:** Every new Qwizo page, component, modal, dashboard, editor, form,
empty state, button, card, student screen, teacher screen, and marketing
section MUST follow this system automatically. If a future design conflicts
with this document, this document wins unless explicitly overridden.

**North star:** A modern course-platform reference (soft blue surfaces, lime
accents, generous whitespace, editorial typography). Study it for color
relationships, type scale, whitespace, and restraint — but never clone it.
Qwizo must feel like Qwizo.

---

## 1. Visual Personality

**"Modern education software with personality."**

Qwizo feels: modern, premium, minimal, friendly, confident, educational,
playful in a restrained way, professional enough for teachers, fast,
lightweight, product-led.

Qwizo does NOT feel: like a generic AI SaaS, a children's website, an LMS,
a corporate enterprise dashboard, a template, a neon AI startup, a gaming
website, or a boring admin panel.

---

## 2. Color System

### Qwizo Sky — `#D6E3F2`
Soft blue background. Use for hero backgrounds, large feature sections,
highlight areas, soft page backgrounds. Never saturated blue.

### Qwizo Mist — `#E4ECF9`
Pale blue section wash. The "chapter" color between paper sections —
clearly blue, still light. Never a full saturated fill.

### Qwizo Lime — `#E2EB5D`
Signature accent. Use **sparingly**: primary accent elements, small icon
backgrounds, active states, important highlights, selected controls, key
CTA accents. Lime feels special because it is NOT everywhere. Never a full
section background.

### Qwizo Ink — `#444348`
Primary text: headlines, body, primary buttons, navigation, important UI.
Avoid pure black unless absolutely necessary.

### Qwizo White — `#FBFCFD`
Cards, navigation surfaces, forms, editor panels, content surfaces, modals.

### Qwizo Soft Border — `#DDE1E6`
Card borders, inputs, dividers, tables, UI separation. Borders stay subtle.

### Qwizo Neutral Background — `#F4F5F7` (approx)
Very light neutral for main application surfaces where appropriate.

**Contrast rule:** page → section → card → control must read as distinct
layers without heavy shadows.

### Color Rules

DO: Soft Blue + White + Charcoal + Lime as the primary visual language.

DON'T: purple gradients, pink, orange, red decorative elements, neon blue,
multiple accent colors, rainbow gradients, AI sparkle gradients — unless
required for a functional state (error/warning/success), kept restrained.

### Section Color Rhythm (locked 2026-10-06)

Sections get different colors as *chapters* — one blue family at different
depths, alternating with paper. Never different hues per section.

1. Hero — sky gradient (airy blue)
2. Problem — paper page, sky panel
3. Question types — paper
4. AI creation — mist wash
5. Teacher control — paper
6. Share — neutral gray
7. Results — paper
8. Final CTA — ink panel (the one dramatic dark chapter)
9. Footer — paper

Between sections, melt colors with a top gradient blend
(`.blend-*` utilities in `index.css`) — no hard cuts. Lime appears only as
an accent inside sections, never as a section background.

---

## 3. Typography

Clean modern sans-serif. **Inter** preferred (system fallback stack if
unavailable). Editorial, not dashboard-like.

- Large, clean, high contrast, generously spaced.
- Hero headlines: tight line-height, slightly negative letter-spacing,
  medium/regular weight — elegant, not shouting. Never 800/900 everywhere.

### Type Scale

| Token       | Size    | Usage                          |
|-------------|---------|--------------------------------|
| Display     | 64–76px | Homepage hero (desktop)        |
| H1          | 48–60px | Page heroes                    |
| H2          | 38–48px | Major section headings         |
| H3          | 26–32px | Subsection headings            |
| Body large  | 18–20px | Lead paragraphs                |
| Body        | 15–17px | Default text                   |
| Small       | 13–14px | Secondary text, labels         |
| Caption     | 12–13px | Hints, metadata, eyebrows      |

Large headings get generous whitespace around them. Consistent line-heights.

---

## 4. Layout

- **Max content width:** 1200–1280px. Never stretch endlessly.
- **Horizontal padding:** desktop 32–48px · tablet 24–32px · mobile 16–20px.
- **Section spacing:** 96–160px between major homepage sections (desktop).
  Whitespace is part of the design — do not compress.

---

## 5. Border Radius

- Large surfaces: 24–32px
- Cards: 18–24px
- Inputs: 12–16px
- Buttons: 999px only when a pill is visually appropriate
- Small controls: 10–12px

Soft, rounded geometry — but don't put `rounded-3xl` on literally everything.

---

## 6. Shadows

Extremely soft. Example: `0 8px 30px rgba(40,45,55,0.06)`.

Avoid: heavy shadows, floating cards everywhere, glow, neon, huge blurred
gradients. The interface feels **flat, calm and expensive**.

---

## 7. Navigation

Compact floating/contained surface: white, slightly rounded, thin border,
subtle shadow. Contains: Qwizo wordmark · Product/Features · How it works ·
Pricing · Resources · Log in · Primary CTA. Never a giant navbar.

---

## 8. Buttons

- **Primary:** charcoal (`#444348`) background, white text. Hover: subtle
  lighten/darken transition.
- **Secondary:** white/off-white background, charcoal text, subtle border.
- **Accent (lime):** use selectively — never every CTA.

Padding generally `12–16px 20–24px`.

---

## 9. Cards

Cards must NOT dominate. Use them for product functionality, data,
interactive controls, feature examples — not for every paragraph. Prefer
editorial layouts with large whitespace.

---

## 10. Animation

Subtle only: fade, small translate, scale 0.98→1, smooth hover, product UI
transitions. Never: bouncing, spinning, parallax everywhere, floating
objects, glow, constant movement. Qwizo feels **fast** — animation must
never make it feel slower.

---

## 11. Iconography

One consistent system. Simple line icons: small, clean, functional. Never
mix styles. Never emoji as interface icons.

---

## 12. Product Visuals

Never fill hero/marketing with generic illustrations. **The product itself
is the visual.** Mockups show realistic Qwizo UI: quiz title, question,
answer options, question number, AI generation controls, edit controls,
preview/share controls. White surface + soft border + subtle shadow +
lime accents. Real application, not a fake marketing card.

---

## 13. Responsive

Desktop is the primary teacher experience; mobile must still be excellent.
Nav collapses cleanly, hero type scales down, previews stay readable, cards
go single-column, no horizontal overflow, tappable buttons. **Student quiz
experience is mobile-first.**

---

## 14. Application Continuity

The design system MUST continue inside the teacher app and student
experience. Never: beautiful marketing site + generic admin panel. Same
colors, typography, radius, buttons, inputs, spacing, shadows, icons,
interaction patterns everywhere. Students see a simplified Qwizo:
question, choices, progress, timer, next, submit — same visual identity.

---

## 15. Design Tokens (CSS)

```css
--qwizo-sky: #D6E3F2;
--qwizo-lime: #E2EB5D;
--qwizo-ink: #444348;
--qwizo-white: #FBFCFD;
--qwizo-border: #DDE1E6;
--qwizo-neutral: #F4F5F7;
```

Encoded in `frontend/src/index.css` via Tailwind v4 `@theme`. Tailwind
utilities reference these tokens — no arbitrary values invented per-section.

---

## 16. Content Rules

- No fake metrics. Never "trusted by 50,000 teachers" or similar invented
  numbers. Only real metrics, if we have them.
- No fake functionality, records, AI output, submissions, or success states.
- Copy sounds human. Teacher-focused, product-led, trustworthy.

---

## 17. Quality Gate

Before shipping UI: desktop/tablet/mobile checked, no horizontal overflow,
no console errors, no broken routes, no fake content, no random colors, no
inconsistent typography, no duplicated UI patterns, existing 64 tests green.

---

## 18. The One Question

Before creating any new UI component, ask: **"Does this look like Qwizo?"**
If no, redesign it. Consistency beats novelty.

---

## 19. Brand Identity — The Arc (locked 2026-10-07)

The Qwizo brand is the **Arc** — never redesigned, never replaced.

**The mark** (`frontend/src/components/QwizoLogo.tsx`, `QwizoMark`):
- Lime (`#E2EB5D`) curved arc — thick, round-capped, sweeping bottom-left to top-right.
- Secondary abstract blade + dot — charcoal (`#444348`) on light, white on dark.
- Minimal construction, rounded geometry, no extra elements. Never add
  checkmarks, sparkles, gradients, 3D, shadows, or education symbols.
- Never rotate, distort, or change the proportions.

**The wordmark**: "Qwizo" in Poppins Bold, tight tracking (`-0.02em`),
always paired with the Arc at a balanced gap. Never a random font.

**Tones**:
- `light` — lime arc + charcoal blade/dot/wordmark (light backgrounds)
- `dark` — lime arc + white blade/dot/wordmark (dark backgrounds)
- `mono-black` / `mono-white` — entire lockup in one color

**Component**: one canonical `<QwizoLogo variant="full"|"mark" tone=... markSize=... />`.
`variant="mark"` (standalone Arc) for favicon, app icon, compact nav,
student quiz header, loading states. Sizing via `markSize` only — never
manual sizes; aspect ratio always preserved. Generous clear space always.

**Favicon**: `frontend/public/favicon.svg` (+ PNGs 16/32/48/180/512) —
standalone Arc mark only, never the wordmark.

**Brand assets**: `frontend/brand/` — `qwizo-logo.svg`, `qwizo-logo-dark.svg`,
`qwizo-logo-monochrome.svg`, `qwizo-logo-reverse.svg`, `qwizo-mark.svg`,
`qwizo-mark-dark.svg`, `favicon.svg`. Wordmark stored as vector paths
(Poppins Bold outlines).

**Usage**: marketing nav/footer, auth pages, app sidebar, teacher dashboard,
editor, bank, share, results, settings, student header (mark only, subtle).
One brand everywhere — never a separate marketing vs app logo.

**Motion**: the mark itself stays still. A subtle entrance (fade + scale) is
acceptable on the marketing page; no rotation, bouncing, morphing, or glow.

**Source of truth**: the approved reference (lime arc + blade + dot +
"Qwizo" wordmark). For any new surface, use this identity — do not invent
another logo.

## 20. Motion System (locked 2026-10-06)

Qwizo feels smooth, fast, responsive, precise, quietly alive. Motion supports
the interface — it never performs for its own sake.

### Tokens (index.css)
- Durations: fast `150ms`, standard `250ms`, emphasis `400ms`, reveal `600ms`
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` — utility `ease-qwizo`, duration helpers `.t-fast/.t-standard/.t-emphasis/.t-reveal`
- Animate `opacity` and `transform` only. Never width/height/top/left, large blur, heavy box-shadow, or anything that shifts layout.

### Primitives (components/motion.tsx)
- `<Enter delay y scaleFrom>` — mount entrance (hero sequence). Fades + rises once.
- `<Reveal delay y duration>` — scroll reveal via IntersectionObserver, fires once, never replays.
- `<GrowBar>` pattern — charts/bars grow via `scaleX` with `transform-origin: left` (no layout shift).
- `usePrefersReducedMotion()` — static end-states when reduced motion is preferred.

### Patterns
- **Hero entrance:** nav (fade + slide down, 0ms) → eyebrow (100) → headline (200) → description (300) → CTA (400) → product demo (520, translateY 35px→0, scale 0.98→1). Stagger 80–120ms. Nothing appears all at once.
- **Hero product demo** (ProductDemo.tsx): 14s loop, two believable phases — (1) editor builds: chrome → question → options stagger → correct answer selected → "Saved" pill; (2) AI generation: fields → Generate → "Generating questions…" + progress bar (scaleX) → questions stagger in → "Quiz ready". No sparkles, glows, particles, or spinning icons. It must read as a real tool, not a marketing animation.
- **Scroll reveal:** opacity 0→1, translateY 24px→0, 600ms, once per element.
- **Stagger groups** (cards, chips, steps, stats): 60–80ms between items, small movement.
- **Buttons** (`.btn-interactive` on all Button variants): hover `translateY(-1px)`; press `scale(0.98)`. Arrows: `.btn-arrow` nudges 3px right on group hover.
- **Nav links:** subtle color/opacity transition only; CTA gets the tiny lift. Never animate the whole nav on link hover.
- **Cards** (`.card-interactive`, interactive cards only): hover `translateY(-2px)` + shadow-lift. Never `scale(1.05)`, rotation, or dramatic zoom.
- **App pages:** `.page-enter` on AppShell outlet (keyed by pathname) — 400ms fade + 10px rise.

### Reserved for upcoming phases (editor / student / results)
- Editor: add question collapsed→expanded; delete fade+collapse→remove; select smooth active-state; save "Saving… → Saved ✓" fast + subtle.
- Student: question transitions 200–300ms (current translateX(-20px)+fade out, next translateX(20px)+fade in); progress indicator smooth; answer selection instant feedback.
- Results: score counts quickly (not seconds-long); cards/bars entrance per above.

### Reduced motion
`@media (prefers-reduced-motion: reduce)` collapses all transitions/animations to ~0ms; JS hooks render final states. Experience stays complete and functional.

### Forbidden
Excessive parallax, bouncing, spinning cards, rotating buttons, floating everything, huge scale, neon glows, gradient animation, particles, constant background movement, glassmorphism excess, animation on every element, long loaders.

## 21. Interaction System (locked 2026-10-06)

A coherent interaction language, not scattered hover effects. Every interactive
element feels responsive, smooth, obvious and polished — without the user
noticing individual effects. Built on the motion tokens (§20): same easing,
same calm.

### The one recipe (index.css)
```css
--interact: transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
  background-color 180ms ease, border-color 180ms ease,
  box-shadow 180ms ease, color 180ms ease, opacity 180ms ease;
```
`.interact` applies it. Never invent a per-component transition.

### Philosophy
Responsive → smooth → subtle → intentional. Hover = small changes in color,
border, shadow, or 1–2px movement. Never: exaggerated scale, bounce, rotation,
glow, gradients, large shadows. Never animate font-size, border-width, width
or height on hover — transforms, color and shadow only, so layout never jumps.

### Components (components/ui.tsx)
- **Button** (all variants): hover `translateY(-1px)` + shadow-lift; active
  `scale(0.98)`; `focus-visible` gets a 2px ink outline (never remove focus
  without replacing it). Arrows: `.btn-arrow` nudges 3px right on group hover.
- **AsyncButton**: honest `idle → busy → done` states; labels crossfade in
  place via `.swap-stack` — the button never resizes mid-transition. Use for
  Publish (Publish → Publishing… → Published ✓) and similar.
- **Input/Textarea** (`.input-qwizo`): hover strengthens the border; focus
  darkens the border + adds the Qwizo ring (`0 0 0 3px rgba(226,235,93,.4)`).
  No giant glows.
- **Card** (`interactive` prop): hover `translateY(-2px)`, slightly stronger
  border + shadow-lift. Only genuinely interactive cards — static info cards
  stay static.
- **IconButton**: transparent default → soft neutral hover → darker + `scale(.96)`
  active. Always paired with a delayed **Tooltip** (350ms delay, fade + slide,
  `pointer-events: none`) when the icon's purpose isn't obvious.
- **CopyButton**: Copy → Copied ✓ crossfade, layout-stable.
- **Dropdown/DropdownItem**: panel animates opacity 0→1, scale .98→1,
  translateY(-4px)→0 over 180ms. Escape + outside-click close.
- **ProgressBar**: fill grows via `scaleX` (transform-origin left) — animates
  instead of jumping, never shifts layout.

### Applied patterns
- **Nav links** (marketing + app sidebar): subtle color/opacity change only.
  Active route gets the restrained lime indicator (`bg-lime/50`) — lime marks
  active/selected states, never whole-button hovers.
- **Text links**: slightly darker on hover; `.link-arrow` nudges the arrow.
- **Clickable rows** (`.row-interactive`): subtle hover background. Static rows
  stay static.
- **Quiz cards**: hover lift + border transition; overflow/menu controls may
  become more visible on hover — but stay visible on touch (no hover-only
  functionality).

### Reserved for the editor / student / results phases
- **Question rows** (`.q-row`): hover = slight background; `.selected` = lime
  inset indicator; `.dragging` = elevated + stronger shadow (no rotation);
  `.disabled` = faded, non-interactive.
- **Answer options** (`.opt`): hover = clearer border; `.selected` = lime
  accent; `.correct` = restrained green; `.incorrect` = restrained red.
  Components must render an icon/text state too — never color alone.
- **Student**: tap = selected state (never rely on hover on touch); progress
  animates via ProgressBar; answer feedback is instant.
- **Tables**: clickable rows get `.row-interactive`; static rows don't.

### Touch + accessibility
Mobile has no hover: every hover must have a tap/focus/selected equivalent,
and nothing important hides behind hover. Every interactive element needs
hover, `focus-visible`, active and disabled states where appropriate.

### What never hovers
Headings, paragraphs, decorative elements, backgrounds. Not everything needs
to move — calm is the brand.

## 22. Product story (Teachers / Students)

The landing "Let's find a way" section is an interactive product story, not a
grid of cards. One segmented switch (Teachers | Students) swaps the entire
four-card sequence below it — eyebrow, headline, description, points, CTA,
product visual and stage labels all change together.

- **Stories**: teachers = Create → Edit → Share → Results; students = Join →
  Answer → Progress → Results. Teacher card 1 (AI creation) is the locked
  reference — never redesigned, other cards follow its visual language.
- **Layout rhythm**: cards alternate text→visual / visual→text down the page
  (same rhythm for both audiences). Mobile always stacks text first, visual
  second; the switch stays near the top and tappable; no horizontal overflow.
- **Stage labels**: lime number disc + uppercase stage name + hairline rule
  (`StageLabel` in `components/product-story.tsx`).
- **Switch animation** (`index.css`): on change, the current story exits
  (220ms, fade + slight horizontal slide), then the new story enters (350ms)
  with product visuals staggered 120ms after text. All in the Qwizo easing
  (`cubic-bezier(0.22, 1, 0.36, 1)`). No URL change, no page jump; reduced
  motion swaps instantly with no animation.
- **Product mockups are live demos**, not pictures: editor (select question,
  mark answer, Saved indicator, add question), share (copy code/link with
  Copy→Copied crossfade, QR toggle), results (scaleX bars), join (code+name
  → joining → joined), quiz (select → next), progress (segmented bar
  animates on reveal), result (count-up score, expandable review).
- **Rules**: visuals are always white product surfaces on mist; lime marks
  active/selected; every interactive element keeps its icon+text state (never
  color alone); teacher CTAs → /signup; nothing navigates to placeholder
  routes.
