# Design System: The Empathetic AI

## 1. Overview & Creative North Star
The "Creative North Star" for this design system is **The Digital Sanctuary**. 

In the high-stakes world of medical AI, the UI must act as a calming agent. We are moving beyond the cold, clinical grids of traditional medical software. This system leverages "Organic Sophistication"—a blend of deep, obsidian-like voids (`surface-lowest`) and soft, bioluminescent accents (`primary`). By utilizing intentional asymmetry, expansive negative space, and tonal layering, we create an editorial experience that feels premium and authoritative yet deeply human.

We reject the "template" look. Instead of boxing content into rigid rows, we use floating layers and soft glows to suggest that information is being "synthesized" rather than just stored.

---

## 2. Colors: Tonal Depth & Luminescence
Our palette is rooted in deep slates and blacks, designed to reduce eye strain and establish a focused environment for medical analysis.

### The "No-Line" Rule
**Explicit Instruction:** Traditional 1px solid borders are strictly prohibited for sectioning or containment. Boundaries must be defined solely through:
- **Background Color Shifts:** Use `surface-container-low` for a section sitting on a `surface` background.
- **Tonal Transitions:** Contrast the `surface-container-highest` of an active card against the `surface-dim` of the main canvas.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers, similar to stacked sheets of dark, frosted glass.
- **Base Layer:** `surface` (#131313) or `surface-container-lowest` (#0e0e0e).
- **Secondary Containers:** `surface-container` (#201f1f) for persistent sidebars or headers.
- **Interaction Layer:** `surface-bright` (#3a3939) for floating elements that require immediate attention.

### The "Glass & Gradient" Rule
To mimic the "Empathetic AI" aesthetic, floating elements (like the bottom-aligned action bar) should utilize a backdrop-blur effect.
- **Glassmorphism:** Use `surface-variant` at 60% opacity with a `20px` backdrop-blur.
- **Signature Textures:** For primary CTAs, use a subtle linear gradient from `primary` (#3cddc7) to `primary-container` (#00af9c). This adds "soul" and depth to the interface, avoiding the flatness of standard Material designs.

---

## 3. Typography: The Editorial Voice
We use **Manrope** for its technical precision and humanist warmth. The typography scale is aggressive to ensure a clear information hierarchy in a minimalist environment.

*   **Display (Large/Medium):** Reserved for low-density "Hero" moments, such as welcoming a physician or stating a high-level diagnosis.
*   **Headline (Small/Medium):** Used for primary section headers. These should have generous tracking (-0.02em) to feel high-end.
*   **Body (Large/Medium):** The workhorse for medical data. `body-lg` (1rem) is the default for chat interactions to maintain readability.
*   **Labels:** `label-md` and `label-sm` are used for metadata and status indicators. They should always be in `on-surface-variant` to maintain a calm hierarchy.

---

## 4. Elevation & Depth: Tonal Layering
In this system, height is expressed through light, not shadows.

*   **The Layering Principle:** Place a `surface-container-low` card on a `surface-container-lowest` background. This "soft lift" feels more modern than a drop shadow.
*   **Ambient Shadows:** When an element must "float" (e.g., the Slide-out Drawer), use an extra-diffused shadow: `box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4)`. The shadow should feel like an ambient occlusion, not a hard line.
*   **The "Ghost Border" Fallback:** If a container requires further definition for accessibility, use the `outline-variant` token at **15% opacity**. This creates a "barely-there" guide that disappears into the background.

---

## 5. Components: Precision & Softness

### Pill-Shaped Buttons
All interactive triggers use the `full` (9999px) roundedness scale.
- **Primary:** Gradient fill (`primary` to `primary-container`) with `on-primary` text.
- **Secondary:** `surface-container-highest` background with a subtle icon in `primary`.
- **Tertiary:** No background; `on-surface` text with a `primary` icon.

### The Bottom-Aligned Action Bar
This is the heart of the "Empathetic AI." 
- **Style:** A wide, pill-shaped container using `surface-container-high` and a glassmorphism blur. 
- **The '+' Expander:** A circular button on the far left with a `surface-variant` fill. 
- **Visual Feedback:** When the AI is "thinking," apply a soft, pulsing outer glow using the `primary` color at 20% opacity.

### Slide-Out Drawer (History)
- **Transition:** Soft horizontal slide from the left.
- **Design:** Uses `surface-container-low`. Forbid the use of dividers between history items; use `1.5rem` (md) vertical padding to separate entries.

### Cards & Lists
- **Rule:** No divider lines. Separate items using a subtle background shift (e.g., hover state shifts to `surface-container-high`).
- **Input Fields:** Minimalist containers. The "border" only appears on focus as a `primary` glow, not a solid line.

---

## 6. Do's and Don'ts

### Do
- **Do** use `primary` (#3cddc7) sparingly for accents; let the black and slate provide the calm.
- **Do** maximize white space. If you think there is enough space, add 20% more.
- **Do** use Manrope's medium weight for headings to ensure they feel "authoritative."

### Don't
- **Don't** use pure white (#FFFFFF) for text. Use `on-surface` (#e5e2e1) to prevent glare in dark mode.
- **Don't** use 100% opaque borders. They break the "Sanctuary" feel.
- **Don't** use standard Material Design blue. Stick to the curated Teal/Blue tones (`primary` and `secondary`) which feel more medical/technical.
- **Don't** use sharp corners. Everything must feel "approachable," using at least the `DEFAULT` (1rem) corner radius.