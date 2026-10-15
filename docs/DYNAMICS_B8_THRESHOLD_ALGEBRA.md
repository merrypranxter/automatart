# Dynamics B8 — Physical Threshold Algebra (NOR + Three-Input NAE)

## The original challenge: make gates compose

B8 investigates physically composable Wireworld gates. A genuine clocked AND made from routed, independently seeded NAND → NOT stages has **not yet been validated**. In exploratory simulation, nearby bias rails coupled through Moore-8 neighborhoods and emitted incorrect/repeating pulses even when the Boolean algebra looked correct. We do **not** advertise those drawings as working AND gates.

Two additional **physically verified single-shot** operations *do* follow immediately from the authentic Wireworld rule, and offer a more interesting algebraic building block. B8 exposes those and a real alternate-rule fingerprint instrument.

### Original four-state transition — no engine changes
EMPTY (0) stays empty; HEAD (2) becomes TAIL (3); TAIL becomes CONDUCTOR (1); CONDUCTOR becomes HEAD iff exactly **one or two** of its **eight** neighbors are heads. No custom gate rules, paint-only signals, or Boolean arithmetic used to drive future states.

### New NOR · ¬(A ∨ B)
A diagonal conductor runs from (0,0) to (r,-r), with r=7–12. Two fixed, genuine t=0 bias HEAD contacts at (-1,0), (-1,1), plus optional input contacts A=(-1,-1), B=(0,1), make **2+A+B** true neighboring HEADS at the junction. The junction fires only for A=B=0, producing exactly one true HEAD at the remote output at t=r+1. For 01/10/11 the local head count is 3/3/4, and the far output remains dark for the **entire verified evolution window**.

### New three-input NAE · not-all-equal(A,B,C)
Using initial HEAD contacts A=(-1,0), B=(-1,1), C=(0,1), the center sees A+B+C real heads. With 0 heads (000), it never ignites. With 1 or 2 (001/010/011/100/101/110), it sends one real pulse. With 3 (111), the original Wireworld threshold **inhibits** the output. Canonical true output fingerprint, ordered lexicographically 000..111, is **01111110**. NAE is a surprising *nonmonotone* 3-input Boolean function obtained from the actual physics with zero hard-coded truth transitions.

Both circuits place true conductor and optional initial HEAD cells on the current universe via the existing local-safe stamp, have 0°/90°/180°/270° rotations, preserve the running world's generation, and survive exact saved-recipe JSON. All eight NAE combinations and four NOR combinations are measured from the actual stepper.

### NEW — Threshold spectrum

Different Wireworld-style mathematical excitation intervals convert the *same conductor geometry and identical initial input heads* into different truth functions. B8 exposes a compact comparison grid for **five fully simulated** rules, each with a remote-port HEAD record:
- exactly 1 HEAD,
- canonical 1–2 HEADS,
- surge 1–3 HEADS,
- exactly 2 HEADS,
- exactly 3 HEADS.

The spectrum reruns the actual production `stepWireworld` for each row, at the currently chosen radius and gate type. This is not Boolean arithmetic plugged into a decorative matrix. The real measured fingerprint is shown as a colored bit ribbon, with head-arrival ticks available by hovering. Its alternate-law results are demonstrations **only**, and do not silently change live-world physics; the existing B3 controls already let users change live rule thresholds explicitly.

Under canonical NAE, 111 stays silent. Under physically valid generalized **1–3 HEADS**, the same 111 input now triggers an output. That is an actual mutation of the circuit's mathematical operation caused solely by changing the discrete physical law.

### Real collision microscope

The B7 inspector is extended to measure all eight NAE cases (and NOR with 0–4 neighboring HEADS) using exact population counts from the real four-state grid. It displays the true center-cell state at t1, every actual remote output HEAD tick, and fails certification on stray late pulses. Its table reports real observations rather than predicted Boolean results.

### Verification and safety

- For six sizes r=7..12, check all four NOR and all eight NAE cases using the standalone real CA stepper and direct 8-neighbor HEAD census, including exact positive arrival tick r+1 and complete absence of false pulses.
- **288 integrated stage cases**: 6 radii × 4 rotations × (4 NOR + 8 NAE) actual full-world `stepWorld` histories, with a byte-exact snapshot/reload replay and no externally induced heads.
- **Five head-count laws**, tested via independent full-world production `stepWorld` against their measured output spectra. Include explicit proof that NAE 111 becomes HEAD-enabled when maxHeads increases from 2 to 3.
- Atomic stamp rejection on edge clipping, real stage nonmutation by future probe; existing B1–B7 tests, mobile-browser controls, GIF/video and Netlify all stay green.
- **No fictitious AND or insulated crossover**. The verified catalogue at B8 consists of OR, fanout, XOR, NAND, NOT, NOR and three-input NAE; all are **single-shot source-state devices**, not guaranteed composable, clocked computer hardware.
- Physical iPhone Safari acceptance after merge remains worthwhile.

### Next research: B9
A real cascading gate requires temporal alignment of *physical signals*, not merely mathematically correct isolated Boolean functions. B9 should isolate and verify a NAND → synchronised NOT stage with independent bias-signal supplies, prevent Moore-diagonal stray coupling, and exhaustively validate remote output histories for all cases before calling it **AND**. Then explore genuinely isolated 2-lane crossings instead of connected plus signs.

No Copilot credits needed.
