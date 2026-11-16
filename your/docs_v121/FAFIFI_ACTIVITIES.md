# FaFiFi for the job, skate and arena — OWNER-DELEGATED DESIGN v1 (PROPOSAL_HOLD)

The owner said "You Decide with good algorithms" (t56u), so this design is mine. It comes from the FaFiFi law and the four roles in the Phatom rulebook (§5).
Code: `modules/your_fafifi_act.js` (`YOUR.fafifi`) and `modules/your_v1_activities.js` (wiring). All numbers here are **PROPOSED** and need playtests to calibrate.
The approved values (payouts, energy costs, 90 s shift, 45 s run, Reality gate 75) are **not changed**.

> **Law:** "Do not make the players equal. Make the road fair."
> Mella's stats, pay and the clock never move. What adapts is the *road*: the layout, the attack order and how long attacks telegraph.

## 1. Rolling performance (EWMA)
After each run, the outcome o ∈ [0,1] updates a per-activity estimate:
`e ← (1 − α)·e + α·o` with α = 0.3, e₀ = TARGET = 0.62.

| Activity | Outcome o |
|---|---|
| job | 1 when finished, else 0.6·crates/5 |
| skate | 1 when complete, else 0.6·rings/8 |
| arena | 1 for a win, else 0.6·(1 − enemy hp fraction) |

Stored in `profile.fafifi[act] = {e, n, hist}`.

## 2. Bounded rubber band
`d = clamp(1 + K·(e − TARGET), 1 − BAND, 1 + BAND)` with K = 0.6 and BAND = 0.18, so d ∈ [0.82, 1.18].
- At target, d = 1.
- A player who keeps winning gets a road up to 18% denser.
- A player who keeps struggling gets a road up to 18% lighter.
- d is shown in the FaFiFi panel and on the results screen, so the change is never hidden.

## 3. Adaptive road generation (rejection sampling to a time budget)
The clock T is fixed (job 90 s, skate 45 s). The generator draws layouts from a seeded RNG (mulberry32; seed = hash(act | day | run-count | name)) until the layout's ideal completion time hits a target.

- Ideal completion time: `T_req = path / (v·speedMul) + handling + equity extra`.
- Target: `T_req = ρ·T ± 4%`, with `ρ = ρ₀·d`.
  - job ρ₀ = 0.34: 5 crates, nearest-neighbour crate→slot path, v = 119 px/s, 0.6 s handling each
  - skate ρ₀ = 0.25: 8 Y.O.U.R. rings jittered ±95 px, nearest-neighbour path, v = 150 px/s, +0.8 s per air ring
- The generator keeps the best of up to 3000 draws. A layout outside the band counts as "unsatisfied" in the audit.

**Arena (12-attack cycle):**
- Slams = round(clamp(0.33 + 0.9·(d − 1) [+0.08 for low ceiling], 0.1, 0.6)·12).
- The order is a Fisher–Yates shuffle, redrawn until there are at most 2 slams in a row.
- Telegraph multiplier = clamp(1/√d, 0.8, 1.25).
- Wind-up floor = 0.45 s.
- Threat: lunge 1.0, slam 1.3.

## 4. Shared completion model + seeded fairness audit
`E(x) = 1 / (1 + exp(β(x − 1) + c))`, with β = 4 and c = ln(1/TARGET − 1), so E(1) = TARGET.

| Activity | x |
|---|---|
| job / skate | (T_req/T)/ρ₀ |
| arena | (Θ/Θ₀)/telegraph |

The audit is evaluated as E(x/d), meaning "how fair is this road for the player it was built for".

**Audit (`YOUR.fafifi.audit(act, 200, d)`):** 200 seeds at each d ∈ {0.82, 1, 1.18}.
- It passes only when every layout meets its budget (0 unsatisfied) and max|E − mean| ≤ TOL = 0.05.
- QA result, max deviation:

| | d = 0.82 | d = 1 | d = 1.18 |
|---|---|---|---|
| job | 0.0383 | 0.0433 | 0.0492 |
| skate | 0.0389 | 0.0430 | 0.0445 |
| arena | 0.0164 | 0.0143 | 0.0127 |

0 unsatisfied in every case.

## 5. The four roles in each activity

| Role | Job (Corner Store) | Skate | Arena (drone / SIKEE) |
|---|---|---|---|
| **Route Attack** (reveal → read → finish; the reward is information, never money) | One crate is revealed as priority. If you pick it first (read), its slot is highlighted for 15 s; stocking it in time finishes the route. Otherwise a forced checkdown. | A line of 3 rings is revealed. Hitting ring 1 first is the read; then rings 2 and 3 in order finish it. | The first 3 attacks are revealed. Taking the first strike without a full hit is the read; then the next recover gives +0.3 s of opening, and landing a hit in it finishes the route. |
| **Dependency Attack** (a broken bond costs the next linked action +120 ms if Reality ≥ 50, else +2 energy, once; a counter restores it) | A wrong drop breaks it: the next pick is locked for 120 ms. | A bail breaks it: the next ollie charge starts 120 ms late. 1 s of clean riding counters it. | A guard broken by blocking at 0 stamina breaks it: the next strike is delayed 120 ms. A dodge-stagger counters it. |
| **Equity Line** (one visible unequal road for both sides; the budget absorbs it; payout unchanged) | Wet aisle (speed ×0.85), stuck back door (crates far from the door) or tall slot (+1.5 s) | Cracked lane (VMAX ×0.9), cross-wind (air turning ×0.8, +1 s budget) or loose gravel (friction ×1.15, +0.5 s); all reset after the run | Leans left or right (that side telegraphs +120 ms) or low ceiling (slam share +0.08, telegraph unchanged) |
| **Fixed Finish / Perfect 30** (B12 Meter, same table as football; "Q4" = last 25% of the clock, or enemy hp ≤ 25% in the arena; Reality ≥ 75 to arm; finish window +180 ms) | crate in order = line to gain; priority read = shell read; clean drop = positive secure; 2-drop chain = bond exchange; wrong drop = TFL; timeout = turnover | ring in line, line read, clean land, grind chain; bail = sack; timeout = turnover | opening hit, pattern read, clean block, dodge chain; guard broken = sack; knocked down = turnover |

## 6. SIKEE boss under FaFiFi
- SIKEE (Authority Form) uses the same arena road: the d-scaled slam count, the telegraph and the equity line all apply.
- His fight numbers are **PROPOSED v1**: hp 160, chase +10.5 px/s, damage ×1.15.
- The FaFiFi panel is shown during the fight.

## 7. v1.1 — Mella companion assists (still FaFiFi-fair)
The owner hero is the player, and Mella is a companion. Her assists change **information** or give one **counter**. They never change the road.
- **Job, spotter:** while the hero carries a crate, she highlights the next in-order empty shelf slot (first empty slot index, the one scored as crate_in_order). The same Route-Attack and Perfect-30 events still apply, so in-order drops remain the player's action.
- **Skate, line caller:** she draws a pointer to the next ring of the revealed line. **Once per run**, right after a bail breaks the bond, she applies the existing `protect_bond` counter, cancelling one +120 ms / +2 energy delay. A second break in the same run is not cancelled (QA checks this).
- **Arena:** no assist. She watches.

**Why it stays fair:**
- The approved clocks, pay, energy costs, the rubber band d, the road generator, the equity line and the seeded audit are unchanged; the audit still passes at 3 × 200 seeds × 3 d values.
- Every player gets exactly the same assist, and it is visible on screen.
