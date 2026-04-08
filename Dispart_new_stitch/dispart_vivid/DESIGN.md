```markdown
# Design System Strategy: The Radiant Social

## 1. Overview & Creative North Star
**The Creative North Star: "The Curated Playground"**
The design system is built to bridge the gap between high-end editorial sophistication and a vibrant, energetic social atmosphere. Unlike standard "utility" apps that rely on rigid grids and heavy borders, this system treats the mobile screen as a dynamic canvas of "Physical Light."

To move beyond the "template" look, we leverage **intentional asymmetry** (e.g., varying card heights in a feed) and **tonal depth**. We replace structural lines with breathing room and soft, layered surfaces. The result is a UI that feels premium and "expensive" yet remains approachable, playful, and deeply consumer-focused.

---

## 2. Colors & Surface Philosophy
The palette is centered around **Coral (#FF7F50)** for warmth and energy, balanced by **Teal (#008080)** for moments of action and validation.

### The "No-Line" Rule
Explicitly prohibited: 1px solid borders for sectioning. Boundaries must be defined solely through background color shifts. For example, a `surface-container-low` section sitting on a `surface` background provides all the definition needed without the visual "noise" of a line.

### Surface Hierarchy & Nesting
Treat the UI as stacked sheets of fine, semi-translucent paper.
*   **Base:** `surface` (#fff4f3) — The canvas.
*   **Low-Level Nesting:** `surface-container-low` (#ffedeb) — For grouping secondary content.
*   **High-Level Focus:** `surface-container-highest` (#ffd3ce) — For active elements or prominent cards.

### The "Glass & Gradient" Rule
To add "soul" to the digital interface:
*   **Floating Elements:** Use Glassmorphism (e.g., `surface` at 80% opacity with a 16px backdrop-blur) for navigation bars or floating action buttons.
*   **Signature Textures:** Use a subtle linear gradient (135°) from `primary` (#a03a0f) to `primary-container` (#fe7e4f) for main CTAs to create a sense of internal light and professional polish.

---

## 3. Typography: Editorial Warmth
We utilize two distinct sans-serif families to balance authority with friendliness.

*   **Display & Headlines (Plus Jakarta Sans):** These are our "vibe setters." The wide apertures and geometric shapes feel modern and high-end. Use `headline-lg` (2rem) for page titles to create an editorial impact.
*   **Body & Labels (Be Vietnam Pro):** A highly legible, warm sans-serif. It handles the "trustworthy" aspect of the brand, ensuring that even dense information feels breezy and accessible.

**Hierarchy Strategy:** 
Use `title-lg` (1.375rem) in `on_surface` for card titles, paired with `label-md` (0.75rem) in `on_surface_variant` for metadata. This high contrast in scale—rather than bold weights—creates a signature, premium feel.

---

## 4. Elevation & Depth
Traditional drop shadows are replaced with **Tonal Layering**.

*   **The Layering Principle:** Place a `surface-container-lowest` (#ffffff) card on a `surface-container-low` (#ffedeb) section. This creates a natural "lift" that mimics physical paper.
*   **Ambient Shadows:** For "floating" elements like the `JoinModal`, use a shadow with a blur of 40px and 6% opacity. The shadow color must be a tinted version of `on_surface` (#4e211e), not pure black, to keep the look organic.
*   **The Ghost Border:** If a border is required for accessibility, use `outline-variant` (#e09c95) at **15% opacity**. Never use a 100% opaque border.

---

## 5. Components

### Cards (ActivityCard, SquadCard, PinnedPlanCard)
*   **Style:** No dividers. Use `md` (1.5rem) or `lg` (2rem) corner radius.
*   **Interaction:** On tap, the card should scale down slightly (0.98) and increase its surface tier (e.g., from `surface-container` to `surface-bright`).
*   **PinnedPlanCard:** Use the `primary-container` (#fe7e4f) as the background with white text (`on_primary`) to distinguish it from the standard feed.

### FilterChips & SegmentedTimeFilter
*   **Unselected:** `surface-container-high` (#ffdad6) with no border.
*   **Selected:** `secondary` (#006666) background with `on_secondary` (#bbfffe) text.
*   **Shape:** Always use `full` (9999px) roundedness for chips to emphasize the "playful" vibe.

### ChatComposer
*   **Styling:** A single floating capsule with a `surface-container-lowest` background. 
*   **Shadow:** Use an Ambient Shadow to make it appear as if it's hovering over the chat stream.

### CommunityBadge
*   **Styling:** Use a glassmorphic background with a `tertiary` (#805100) icon. These should feel like "jewelry"—small, polished, and distinct.

### JoinModal
*   **Styling:** Utilize `xl` (3rem) top corner radius. The backdrop must be a heavy blur (20px) with a `surface-dim` (#ffc7c1) tint at 40% opacity, rather than a standard black dimming effect.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use asymmetrical spacing. A 24px left margin and a 16px right margin on card carousels create a "sliding" editorial feel.
*   **Do** use the Teal `secondary` color sparingly—only for success states, active check-ins, or "Action" buttons.
*   **Do** embrace white space. If you think there’s enough room between elements, add 8px more.

### Don’t
*   **Don't** use pure black (#000000) for text. Use `on_surface` (#4e211e) to maintain the warmth of the coral palette.
*   **Don't** use "Default" material shadows. They look muddy and "cheap" against the vibrant coral tones.
*   **Don't** use lines to separate list items. Use a 12px or 16px gap and let the typography provide the structure.