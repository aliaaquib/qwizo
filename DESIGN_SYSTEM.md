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

### Qwizo Lime — `#E2EB5D`
Signature accent. Use **sparingly**: primary accent elements, small icon
backgrounds, active states, important highlights, selected controls, key
CTA accents. Lime feels special because it is NOT everywhere.

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
