# Dynamics A3 — Species War + Directional Life: territorial forecast

## The issue
The 17-engine audit showed Species War going fully still in all three baseline runs and Directional Life going still in two of three. This is *often a valid absorbing configuration*, not a rendering error. The instrument needed meaningful live operating regimes and a way to tell whether rule changes have any chance to change actual cells.

## Added
- An on-demand-in-React, **pure, side-effect-free next-generation forecast** computed directly from the current canonical cells. It uses the same edge topology, wrap/finite behavior, species tie-breaking, and orientation stencil matcher as the production engine. No RNG, overlays, new cells or palette substitutions.
- Species War: forecast fractions for births on empty sites, takeovers of occupied sites, and deaths, with the number of sampled species. Five pure deterministic presets: Open Borders, Frontier Skirmish, Walled Kingdoms, Territory Erosion, Trench War. The existing attack, ally survival, defense and species-count sliders remain authoritative. Each preset clamps integer votes to the active lattice neighbor count; it never swaps the lattice or resets the world.
- Directional Life: forecast birth-pattern matches at vacant sites, survival of existing sites and expected deaths. Five pure deterministic presets: Strict Axes, Crosshatch Bloom, Diagonal Weave, One-Eye Plague and Chiral Front. They set real eight-direction mask, exact/contains matching, rotations/reflections and survival range; the existing hand-editable stencil controls remain usable.
- Forecast uses all sites on a <=4096-cell board; on larger boards it samples evenly spaced canonical sites, caps computation around 4096 observations per render, and labels *sampled* vs *total* honestly. Percentages are of inspected sites, not promises about next week's evolution.
- Zero projected changes gets an explicit stillness explanation. In a dead all-zero species field, rule changes do not magically spawn cells: users must paint, create a new world, or choose a separately labeled forced rule in a future phase.
- Settings are only existing rule keys, so saved recipes and old imports need no migration. The forecast itself is never saved.

## Check it before merging
`scripts/dynamics-a3-territory-smoke.mjs` compares every predicted cell transition to `stepWorld` over 5 consecutive generations for both engines, each live preset, both wrapped and finite edges, and species' square, 4/8/12/24/stenciled neighbor graphs, hex, triangle and genuine rhombille. It also checks the exact census, a 100-site preview cap, nonmutation of the original board, stillness of an empty board, no world reset from rule updates, and deterministic snapshot/restore.

The existing build and browser GIF/video tests must also pass.

## What this does NOT do
- It does not promise that any preset sustains complex motion indefinitely.
- It does not inject seeded invaders into species territory, invent new oriented births, change fundamental transition rules, or disguise frozen systems with color cycling.
- High-resolution iPhone Safari visual/performance testing still needs a real phone after CI and before release.

## Next dynamics work
B1: Brian's Brain sensitivity and optional explicitly driven stimulation; B2: true reversible Margolus block rules; B3: real Wireworld conductor circuits. More skins remain a later visual phase.
