# nowjp Design System — Competitor Analysis

## Emotional Target
Users are foreigners in Japan — lonely, overwhelmed, navigating an unfamiliar country.
The design must say: **"You're not alone. We've got you."**

---

## App Group Analysis

### Airbnb — Trust + Warmth
**Colors:** Warm coral (#FF5A5F) primary, soft cream backgrounds, generous white space
**Typography:** Circular (rounded humanist sans), large headlines, generous line-height
**Psychology:** Round shapes = approachable. Warm tones = human. Big photos = aspiration.
**Takeaway for nowjp:** Use warm undertones in neutrals. Round everything (border-radius: 20px+). Hero sections should feel inviting.

### Duolingo — Encouragement + Progress
**Colors:** Green (#58CC02) for success, yellow for streaks, soft backgrounds
**Typography:** Nunito (very round), bold weights, playful but readable
**Psychology:** Progress bars = dopamine. Streaks = habit formation. Celebration moments = retention.
**Takeaway for nowjp:** Survival checklist should feel like a game. Every completed item = mini-celebration. Progress bars everywhere.

### LINE — Japanese Mobile Native
**Colors:** Green (#06C755) accent, white backgrounds, soft grays for separation
**Typography:** Small, compact, dense — optimized for Japanese characters
**Psychology:** Sticker-like UI elements feel friendly. Bottom navigation = thumb-friendly.
**Takeaway for nowjp:** Bottom nav must be thumb-friendly. Cards should feel like LINE bubbles — soft, rounded.

### Revolut — Premium Trust
**Colors:** Black/dark navy + bright accent, minimal color palette
**Typography:** Inter — clean, technical trust
**Psychology:** Dark premium sections convert better for paid tiers. Clean hierarchy = credibility.
**Takeaway for nowjp:** Premium sections should go dark/gradient — signals value. Keep free sections bright/white.

### Notion — Organized Clarity
**Colors:** Pure white, very light gray (#F7F6F3), black text
**Typography:** Inter, generous font-size, lots of breathing room
**Psychology:** Whitespace = intelligence. No clutter = trust. Simple = competent.
**Takeaway for nowjp:** Information-heavy pages (guides, survive) need Notion-like spacing and hierarchy.

---

## nowjp Design System

### Color Palette

```
Primary (Brand)
--brand-50:  #FAF5FF   (backgrounds, hover states)
--brand-100: #F3E8FF   (light badges, tags)
--brand-200: #E9D5FF   (borders, dividers)
--brand-300: #D8B4FE   (disabled states)
--brand-400: #A855F7   (secondary actions)
--brand-500: #8B5CF6   (← shift to warmer violet, primary actions)
--brand-600: #7C3AED   (hover, pressed)
--brand-700: #6D28D9   (dark variant)

Warm Neutrals (Airbnb-inspired)
--warm-50:  #FAFAF9   (page background — warmer than pure white)
--warm-100: #F5F5F4   (card background)
--warm-200: #E7E5E4   (borders)
--warm-400: #A8A29E   (secondary text)
--warm-600: #57534E   (body text)
--warm-900: #1C1917   (headings)

Functional Colors
--success:  #22C55E   (green — checklist completion, matches)
--warning:  #F59E0B   (amber — premium, streaks)
--danger:   #EF4444   (red — SOS, urgent, errors)
--info:     #3B82F6   (blue — tips, info badges)

Arrival Stage Colors
--stage-new:      #DBEAFE / #1D4ED8   (blue — Just Arrived)
--stage-settling: #DCFCE7 / #15803D   (green — Getting Settled)
--stage-local:    #FED7AA / #C2410C   (orange — Japan Local)
```

### Typography

```
Font Stack: "Inter", "Noto Sans JP", system-ui, sans-serif
(Inter for Latin, Noto Sans JP for Japanese — both free on Google Fonts)

Scale:
--text-xs:   11px / line-height: 1.5   (timestamps, badges)
--text-sm:   13px / line-height: 1.6   (body, descriptions)
--text-base: 15px / line-height: 1.6   (primary body)
--text-lg:   18px / line-height: 1.4   (section headers)
--text-xl:   22px / line-height: 1.3   (page titles)
--text-2xl:  28px / line-height: 1.2   (hero headlines)
--text-3xl:  36px / line-height: 1.1   (landing hero)

Weights:
400 — body text
500 — labels, secondary headings
600 — emphasized body, card titles
700 — section headers, important labels
800 — page titles
900 — hero headlines, brand moments
```

### Spacing System (8px base)

```
--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px
--space-5:  20px
--space-6:  24px
--space-8:  32px
--space-10: 40px
--space-12: 48px

Page padding: 20px horizontal (px-5)
Card padding: 16px (p-4)
Section gap: 32px (gap-8)
```

### Border Radius (round everything)

```
--radius-sm:  8px    (badges, small buttons)
--radius-md:  12px   (inputs, small cards)
--radius-lg:  16px   (cards)
--radius-xl:  20px   (large cards, modals)
--radius-2xl: 24px   (hero cards, bottom sheets)
--radius-full: 9999px (pills, avatars, tags)
```

### Shadows (soft, layered)

```
--shadow-xs: 0 1px 2px rgba(0,0,0,0.04)
--shadow-sm: 0 2px 8px rgba(0,0,0,0.06)
--shadow-md: 0 4px 16px rgba(0,0,0,0.08)
--shadow-lg: 0 8px 32px rgba(0,0,0,0.10)
--shadow-brand: 0 4px 16px rgba(139,92,246,0.20)
--shadow-danger: 0 4px 16px rgba(239,68,68,0.25)
```

### Component Specs

#### Buttons
```
Primary:   h-12 (48px), px-6, rounded-2xl, font-bold, bg-brand-500, shadow-brand
Secondary: h-12, px-6, rounded-2xl, font-semibold, border-2 border-brand-200, text-brand-600
Ghost:     h-10, px-4, rounded-xl, font-medium, text-warm-600, hover:bg-warm-100
Danger:    h-12, px-6, rounded-2xl, font-bold, bg-red-500, shadow-danger
Size SM:   h-9 (36px), text-sm
```

#### Cards
```
Default:   bg-white, rounded-2xl, border border-warm-200, shadow-sm, p-4
Elevated:  bg-white, rounded-2xl, shadow-md, p-4 (no border)
Colored:   bg-brand-50, rounded-2xl, border border-brand-100, p-4
Premium:   bg-gradient-to-br from-amber-400 to-orange-400, rounded-2xl, p-4, text-white
SOS:       bg-red-50, rounded-2xl, border-2 border-red-200, p-4
```

#### Inputs
```
Height: 48px
Border: 2px border-warm-200, focus:border-brand-400
Radius: rounded-2xl
Padding: px-4
Font: text-sm
Background: bg-warm-50, focus:bg-white
```

#### Arrival Stage Badges
```
Just Arrived  (✈️): bg-blue-50  border-blue-200  text-blue-700  — "New to Japan"
Getting Settled(🏠): bg-green-50 border-green-200 text-green-700 — "Finding my feet"
Japan Local   (🗾): bg-orange-50 border-orange-200 text-orange-700 — "Been here a while"
```

#### Navigation
```
Bottom Nav: bg-white, border-t border-warm-200, h-16, safe-area-pb
Active: text-brand-600, icon filled
Inactive: text-warm-400, icon outlined
```

---

## Page-by-Page Design Direction

### Landing Page (/)
- Hero: Warm gradient or bold emoji clusters, NOT stock photo
- Headline: Black, 36px, font-black, 2 lines max
- Social proof: Avatar stack + count, green pulse dot
- Value props: 3 concrete items with checkmarks, bg-brand-50 card
- Testimonials: White cards, small, real-feeling names + flags
- Primary CTA: Full-width, 56px height, rounded-2xl, brand-500
- Feel: Airbnb landing × Duolingo onboarding

### Home / Discover (/home)
- Profile cards: 2-per-row grid, tall cards (aspect-[3/4])
- Card design: Full avatar image top, info bottom, arrival stage badge top-right
- Like button: Bottom-right of card, heart icon, animated
- Filters: Horizontal scroll pills, rounded-full
- Feel: Bumble BFF meets LINE

### Survive (/survive)
- Tab bar: 4 tabs, segmented control style
- Checklist items: Left checkbox (animated), right category tag
- Progress bar: Thicker (8px), brand-500, animated
- SOS section: RED gradient background, white text, pulse animation
- Feel: Duolingo gamification + emergency clarity

### Chat (/chat/[id])
- My messages: brand-500 bubble, right-aligned, no tail
- Their messages: white card, subtle shadow, left-aligned
- Reactions: Small pill below bubble
- Input: Floating bar, rounded-full, soft shadow
- Feel: iMessage clarity + LINE warmth

### Profile/Mypage (/mypage)
- Cover: Brand gradient, subtle pattern
- Avatar: Large (96px), border-4 border-white, shadow-lg, rounded-3xl
- Stats row: 4 columns, colored numbers
- ID card: Mono font, copy button, premium feel
- Feel: Revolut profile + Airbnb host page

---

## Design Tokens for Tailwind

Add to tailwind.config.js:
```js
colors: {
  warm: {
    50:  '#FAFAF9',
    100: '#F5F5F4',
    200: '#E7E5E4',
    400: '#A8A29E',
    600: '#57534E',
    900: '#1C1917',
  }
}
```
