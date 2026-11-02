---
name: Snitch
description: Frame profiler for Schedule I, shown as live race standings on three surfaces.
colors:
  broadcast-navy: "#14213d"
  jersey-yellow: "#f2c200"
  leader-wash: "#fff6cc"
  classification-green: "#137a37"
  classification-red: "#d7262e"
  sheet-white: "#ffffff"
  tarmac-grey: "#e6e9ed"
  slate-ink: "#4a5568"
  on-navy-mist: "#c3cbdc"
  on-navy-rule: "#7a88a8"
  retired-grey: "#8a93a6"
  on-navy-go: "#5fd38a"
  on-navy-alarm: "#ff8a90"
  focus-blue: "#2f6fde"
  unattributed-slate: "#5b6573"
  team-teal: "#0f8b8d"
  team-violet: "#6a4c93"
  team-orange: "#e07a1f"
  team-blue: "#2f6fde"
  team-magenta: "#b5179e"
  team-brown: "#8c5a3c"
  team-cyan: "#3a86a8"
  team-olive: "#6b8e23"
typography:
  display:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.08em"
  headline:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.04em"
  figure:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "tnum"
  title:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1
    fontFeature: "tnum"
  label:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.06em"
  body:
    fontFamily: "Barlow, system-ui, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.35
    fontFeature: "tnum"
  caption:
    fontFamily: "Barlow, system-ui, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.35
rounded:
  bib: "3px"
  sm: "4px"
  switch: "14px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.sheet-white}"
    textColor: "{colors.broadcast-navy}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "9px 16px"
  button-primary-hover:
    backgroundColor: "#dfe5f1"
  button-navy:
    backgroundColor: "{colors.broadcast-navy}"
    textColor: "{colors.sheet-white}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "9px 16px"
  button-navy-hover:
    backgroundColor: "#22345c"
  button-outline:
    backgroundColor: "{colors.sheet-white}"
    textColor: "{colors.broadcast-navy}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "9px 16px"
  button-outline-hover:
    backgroundColor: "{colors.tarmac-grey}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.sheet-white}"
    rounded: "{rounded.sm}"
    padding: "8px"
  window-seg-on:
    backgroundColor: "{colors.sheet-white}"
    textColor: "{colors.broadcast-navy}"
    padding: "7px 14px"
  card-header:
    backgroundColor: "{colors.broadcast-navy}"
    textColor: "{colors.sheet-white}"
    typography: "{typography.headline}"
    padding: "9px 16px"
  card:
    backgroundColor: "{colors.sheet-white}"
    textColor: "{colors.broadcast-navy}"
    rounded: "{rounded.sm}"
  bib:
    textColor: "{colors.sheet-white}"
    rounded: "{rounded.bib}"
    size: "34px"
  standings-row-leader:
    backgroundColor: "{colors.leader-wash}"
    height: "54px"
  leader-tag:
    backgroundColor: "{colors.jersey-yellow}"
    textColor: "{colors.broadcast-navy}"
    rounded: "{rounded.bib}"
    padding: "4px 6px"
  log-chip-on:
    backgroundColor: "{colors.sheet-white}"
    textColor: "{colors.broadcast-navy}"
    rounded: "{rounded.sm}"
    padding: "6px 10px"
---

# Design System: Snitch

## Overview

**Creative North Star: "The Broadcast Classification"**

Snitch reads a frame the way a stage-race broadcast reads a peloton. Every timed section is a rider, every mod is a team with one number and one colour, and the screen is a live classification: who leads, by how much, and who stopped reporting. The page is built from broadcast furniture, not dashboard furniture: navy title bands over white sheets, condensed uppercase figures, a yellow marker that belongs to exactly one row at a time. The culprit is never found by sorting; the standings are already sorted, and the leader sits on top.

The system is dense and flat. Numbers are large, tabular and always carry their unit; prose is short and set in a plain grotesque. Depth comes from the navy-on-white contrast of headers and bars, never from shadows. The same rules hold on three surfaces: the desktop dashboard (depth, chart, every panel), the phone remote (one portrait column, big tap targets, actions pinned to a navy bottom bar) and the in-game overlay (a compact bottom-anchored card rendered through Sideload's CSS subset, with inline hex values instead of custom properties).

PRODUCT.md binds one visual commitment: Snitch has its own identity on all three surfaces, distinct from the shared DooDesch.UI look and from Hotline's IMGUI look.

**Key Characteristics:**
- Navy title bands over white sheets on a cool grey ground.
- Barlow Condensed for every figure, header and button; Barlow for sentences.
- One yellow leader marker, one bib and team colour per mod, everywhere.
- Bars are literal milliseconds on one shared scale.
- Flat surfaces; the only travelling motion is a rank change.

## Colors

A navy-white-grey broadcast palette with one jersey yellow, two classification colours and an eight-colour team set that only ever paints mod identity.

### Primary
- **Broadcast Navy** (#14213d): the system's voice. Top bar, card header bands, phone bottom action bar, chart line and average line, chart hover box, filled toggles and slider thumbs, state-distribution bars. Also the body text colour (`--ink` is the same value), so text and furniture read as one material.

### Secondary
- **Jersey Yellow** (#f2c200): the leader, and nothing else. Appears as the 8px edge bar on the leading row and the "Leader" tag in its gap column.
- **Leader Wash** (#fff6cc): the background tint of the leading row only, so the yellow marker reads as a jersey on a highlighted line rather than a stray stripe.

### Tertiary
- **Classification Green** (#137a37): "OK" marks beside counters and states. Always a word plus an icon, never a colour field. The direction sketch named a brighter green; the build darkened it so the mark holds contrast on white, and the build value is the rule.
- **Classification Red** (#d7262e): "DNF", error log levels, "bad" marks and the chart's spike marker (line, ringed dot, onset tick and the labelled "SPIKE" box). Red always ships with a word.
- **On-Navy Go** (#5fd38a) and **On-Navy Alarm** (#ff8a90): the lighter green and red used only on navy, for the connection icon and the phone-paired dot. Each sits beside a text state ("Connected - sampling", "Searching for the game").

### Team Set
- **Team colours** (teal #0f8b8d, violet #6a4c93, orange #e07a1f, blue #2f6fde, magenta #b5179e, brown #8c5a3c, cyan #3a86a8, olive #6b8e23): a mod's colour, picked by hash. Paints the bib, the rider's bar and the 6px top edge of its panel. Never used for chrome, buttons or status.
- **Unattributed Slate** (#5b6573): the colour of bib 0, the rider that holds the part of the frame no section claimed.

### Neutral
- **Sheet White** (#ffffff): card and row surfaces, primary button on navy, bib inner ring.
- **Tarmac Grey** (#e6e9ed): page ground, row dividers, slider and state tracks, chart grid lines; the overlay card's own ground.
- **Slate Ink** (#4a5568): secondary text, units, axis labels, the p95/p99 reference lines, DNF rows.
- **On-Navy Mist** (#c3cbdc): secondary text on navy (header notes, stat captions).
- **On-Navy Rule** (#7a88a8): hairlines and outlines on navy (window control, ghost buttons, log chips).
- **Retired Grey** (#8a93a6): the hatched DNF bar and the off state of a switch.
- **Focus Blue** (#2f6fde): the 3px keyboard focus ring on light grounds; on navy the ring turns white.

### Named Rules
**The Yellow Jersey Rule.** Jersey yellow and its wash belong to the single leading row. No button, link, chart element or decoration is ever yellow; when the lead changes, the yellow moves with it.

**The Classification Mark Rule.** Green and red are verdicts and always stand next to a word (OK, DNF, SPIKE, ERROR). Colour alone never carries a state.

**The Team Colour Is Identity Rule.** A team colour says "this mod" and nothing more. It is never reused to mean good, bad, selected or primary.

## Typography

**Display Font:** Barlow Condensed (with Arial Narrow, sans-serif)
**Body Font:** Barlow (with system-ui, Segoe UI, sans-serif)

**Character:** a broadcast caption pairing. The condensed face sets every number and every label in tight, upright, uppercase bands; the regular Barlow keeps tooltips, hints and log messages calm and readable. Both are bundled locally (Fontsource on the web, OFL TTFs in the overlay) because the dashboard also runs offline from the mod.

### Hierarchy
- **Display** (700, 26px, line-height 1, 0.08em, uppercase): the "SNITCH" wordmark in the top bar only (22px on the phone and overlay).
- **Headline** (700, 20-22px, line-height 1.1-1.2, 0.04em, uppercase): card header bands, mod panel titles, the "Mod panels" band heading.
- **Figure** (700, 24-26px, line-height 1): rank positions, FPS and frame-ms stats, counter and slider values. 34px for the phone's frame-time figure.
- **Title** (600, 18-20px, line-height 1): gaps ("+0.42 ms"), panel ms readouts.
- **Label** (700, 15-18px, line-height 1, 0.04-0.06em, uppercase): button text, OK/DNF marks, log levels, the "Leader" tag. Window control and log chips use 600.
- **Body** (400, 15px, line-height 1.35): rider names (600), panel text (14px/1.45), notices.
- **Caption** (400, 13px): units, header notes, axis labels, scale legend.

### Named Rules
**The Tabular Figures Rule.** Tabular numerals are on for the whole page, so a changing figure never shifts its neighbours. Every figure carries its unit in the same string ("12.40 ms", "61 FPS avg").

**The Condensed Speaks, The Grotesque Explains Rule.** Anything a modder scans (numbers, headings, buttons, tags) is Barlow Condensed; anything they read as a sentence is Barlow. A third face, including a monospace, has no role.

## Layout

The dashboard is a centred column up to 1760px. Under a full-width navy top bar sits the stage: a two-column grid split 45/55 (standings left, frame chart right) with 16px gaps and 24px side gutters. Below it, bands with 16px top padding stack the mod panels (auto-fill grid, 380px minimum per panel), the lower cards (auto-fit, 320px minimum), the log and the phone pairing card.

Spacing runs on 8, 12, 16 and 24px. Card headers pad 9px by 16px, bodies 12-14px by 16px, control rows 11px by 16px.

The top bar wraps into two deliberate rows below 1100px (identity and numbers above, controls below). The stage collapses to one column at 1000px. At 640px gutters drop to 12px, panels go single column, the frame-ms stat and phone button leave the bar, and the standings grid tightens.

The phone remote is one 520px column on the grey ground with 12px gutters: a sticky navy top bar (52px), a navy frame strip holding the frame figure and window control, a compact standings card (five rows plus every DNF, then a "Show all" row), the panels, and a fixed navy bottom bar with 52px Start/Stop, Reset and Export targets clear of the safe area.

The overlay is a single card anchored to the bottom of its canvas so it never covers the centre of play: navy header with wordmark, summary and window control, a control row, the standings rows, and an expandable scroll area for mod panels.

### Standings geometry
Each standings row is a four-column grid: position (34px), bib (34px), name with bar beneath (flexible), gap (84px), with 10px column gaps and 54px rows on the dashboard. The compact form (phone, narrow screens) is 26 / 30 / flexible / 74px with 8px gaps and moves the ms readout under the bar. A scale legend under the list shows a 1 ms reference bar and the 0 to max range.

### Named Rules
**The One Window Rule.** One control (10 s / 30 s / 2 min) sets the window, and every number on the surface (stats, standings, gaps, panel ms, chart) is computed over it. No card has its own time range.

**The Standings First Rule.** The live standings take the first column of the first viewport on every surface; the chart and panels are secondary.

## Elevation & Depth

Flat. No surface casts a shadow. Separation comes from the tonal step between the grey ground and white sheets, from navy header bands, and from 1px tarmac-grey row dividers. The overlay, which sits over an arbitrary 3D scene, adds a 1px navy border to its card and panels instead of a shadow.

### Shadow Vocabulary
- **Bib ring** (`box-shadow: inset 0 0 0 2px #ffffff, 0 0 0 1px <team colour>`): the only box-shadow in the system. It draws the white inner border and team-colour hairline of a printed race number; it is a ring, not elevation. The overlay builds the same ring from two nested boxes.

### Named Rules
**The Flat Sheet Rule.** Depth is navy over white over grey. If something needs to stand out, it gets a navy band or the leader wash, never a shadow.

## Shapes

Corners are barely softened. Cards, buttons, window controls, chips and inputs share a 4px radius; bibs and the leader tag use 3px; rider bars are square at the origin and 2px-rounded at the tip, so they read as measured lengths starting at zero. The two round forms are functional: the switch track (14px) with its round knob, and the slider thumb. Mod panels carry a 6px top edge in their team colour; the leading row carries an 8px yellow left edge. The DNF bar is a hatched strip (6px dash, 4px gap) in retired grey.

## Components

### Buttons
Broadcast caption buttons: condensed, uppercase, tracked, square-cornered.
- **Shape:** gently squared (4px), 2px border.
- **Primary (on navy):** white fill, navy text, 9px by 16px padding; the single Start/Stop action at the right end of the top bar and the full-width Start/Stop on the phone's bottom bar. Lucide icon before the label.
- **Navy:** navy fill, white text; the phone's "Same Wi-Fi? Connect directly" link.
- **Outline (on white):** white fill, navy border and text; panel actions. Hover tarmac grey, active #d3d8df.
- **Ghost (on navy):** transparent, On-Navy Rule border, white icon, 8px square padding; Reset, Export, Phone.
- **Hover / Focus:** background change only, 120ms when motion is allowed. Focus is a 3px ring with 2px offset, white on navy.
- **Tap size:** 48px minimum on the phone remote, 52px in its bottom bar.

### Window Control
A segmented radio group of three condensed labels inside a 1px On-Navy Rule outline; the selected segment fills white with navy text. Arrow keys move the selection (roving tab stop). It lives in the top bar, the phone frame strip and the overlay header, and nowhere else.

### Cards / Containers
- **Corner Style:** 4px.
- **Background:** white sheet on the tarmac-grey ground.
- **Header:** a navy band, condensed uppercase title in white, a 13px On-Navy Mist note on the right (window coverage, GC rate, attempt count).
- **Shadow Strategy:** none (see Elevation & Depth).
- **Internal Padding:** 12-16px.

### Mod Panel
A white card whose 6px top edge is the mod's team colour. Its header row shows the bib, the panel title in condensed uppercase, the mod's ms over the window and a red DNF mark when the mod's rider has retired. On the dashboard the header collapses the panel. Body rows are separated by tarmac-grey hairlines: free text, counters (figure plus unit plus OK/bad mark), switches with an On/Off word, sliders with a live figure, action buttons, state distributions as navy bars on grey tracks.

### Inputs / Fields
- **Switch:** 48 by 28px track, retired grey when off, navy when on, white 20px knob that slides 20px; the On/Off word sits beside it. The overlay renders the same control as a 4px-cornered box reading ON/OFF with navy fill when on.
- **Slider:** 6px grey track, white thumb with a 3px navy ring. While dragging, the thumb follows the pointer, not the stream; on release the game's value takes over.
- **Copy field:** white, 1px grey border, 4px radius, navy text with a Lucide copy icon.

### Log Chips
Condensed uppercase filters on the navy log header, 1px On-Navy Rule outline; the selected chip fills white. Log lines alternate white and #f4f6f8; warnings set the message in 600, errors also turn the level red.

### Live Standings (signature)
The classification itself.
- **Order:** running riders by mean ms per frame over the window, descending; ties by key. Retired riders follow, most recently silent first.
- **Row:** position figure, bib, rider name (with the mod name in slate when the label does not already contain it), ms readout, a bar in the team colour, and the gap column.
- **Gap column:** the leader shows a yellow "Leader" tag; every other running rider shows "+x.xx ms" behind the leader; a retired rider shows a red "DNF".
- **Leader:** 8px jersey-yellow edge bar plus the leader wash.
- **Bar:** width is the rider's ms divided by the shared scale maximum, capped at 100%, minimum 2px. The scale maximum is the first step of 0.5, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 25, 33, 50, 100, 250, 500, 1000 that reaches the leader's ms. The overlay uses the same ladder.
- **Overtake:** rows stay in stable DOM order and move by translateY over 180ms (cubic-bezier(0.16, 1, 0.3, 1)), so the yellow marker visibly passes to the new leader.
- **Detail:** each row is focusable and carries ms, share of frame, calls per frame and worst frame in its tooltip and accessible name.

### Bib and Team Identity (signature)
One rule set, implemented twice (identity.ts and Standings.cs) and identical across surfaces.
- **Colour:** FNV-1a 32-bit hash over the UTF-8 bytes of the lower-cased mod name, modulo the eight team colours.
- **Number:** the 1-based position of the lower-cased name in the ordinal sort of all mod names known this session. Bib 0 belongs to the unattributed rider only; a name not yet numbered gets the count plus one, never 0.
- **Digit ink:** white or navy, whichever has the higher contrast against the team colour.
- **Form:** a 34px square (30px compact, 24-26px in small contexts), 3px corners, white inner ring and team hairline, condensed 700 digits.

### Frame Chart
SVG drawn at the measured width, 300px tall. The frame line is navy at 2px; the window average is a navy dashed line (7/5) labelled "AVG x ms" in condensed type; p95 and p99 are slate dotted lines (2/4) with labels that step aside from the spike line. The largest excursion, when it clearly exceeds the average, gets a red full-height line, a white dot with a red ring, a red tick at its onset on the time axis and a red label box with peak, onset and worst frame. Hover shows a navy readout box.

### Navigation
There is none beyond the top bar. The dashboard is one scrolling page; the phone pairing card is reached from the top bar's phone button, which scrolls to it.

## Do's and Don'ts

### Do:
- **Do** keep jersey yellow (#f2c200) on the leading row alone: the 8px edge bar, the "Leader" tag and the #fff6cc wash.
- **Do** derive every bib and team colour from the shared identity rules, so a mod looks the same in the overlay, the dashboard and the phone.
- **Do** draw every rider bar on the one shared scale and show the scale legend under the list.
- **Do** keep a rider that stopped reporting on the table as DNF, with the time since its last report.
- **Do** list the unattributed rider as bib 0 in slate (#5b6573) on every surface.
- **Do** put a word beside every green or red mark (OK, DNF, SPIKE, ERROR).
- **Do** set figures, headings, tags and buttons in Barlow Condensed with tabular numerals and an explicit unit.
- **Do** let one window control drive every number on the surface.
- **Do** honour reduced motion: rows jump instead of sliding, controls change without transition.

### Don't:
- **Don't** colour a button, link or chart element jersey yellow or a team colour; buttons are white or navy.
- **Don't** use a team colour to signal state, or green and red to signal identity.
- **Don't** add shadows, glows or gradients to cards or rows; the bib ring is the only box-shadow.
- **Don't** animate anything in the content except a rank change; control feedback stays at 120ms background or knob changes.
- **Don't** hide a retired rider or the unattributed share to make the table look cleaner.
- **Don't** give a card its own time range or a sort control; the standings are already the ranking.
- **Don't** introduce a third typeface, a monospace label style, or pill-shaped buttons.
- **Don't** borrow the DooDesch.UI look or Hotline's IMGUI look.
