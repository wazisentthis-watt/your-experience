# WIR Y.O.U.R. HANDOFF — 2026-11-21

**For:** Claude, ChatGPT, MU-SE, and anyone picking up Y.O.U.R. / WIR studio work.
**Written:** Saturday, 21 November 2026, 9:01 AM ET (America/New_York).
**Author role:** BRANTACLE Digital Archaeologist for the WIR studio.
**Repo (public):** [github.com/wazisentthis-watt/your-experience](https://github.com/wazisentthis-watt/your-experience)
**Play (GitHub Pages, from `main` root):** [wazisentthis-watt.github.io/your-experience](https://wazisentthis-watt.github.io/your-experience/)
**Y.O.U.R. Drive folder:** [1yiVnN8mvvJ4n7VJRajHgSAbc0yeiUW9c](https://drive.google.com/drive/folders/1yiVnN8mvvJ4n7VJRajHgSAbc0yeiUW9c)
**General WIR recovery Drive folder (other work stays on hold):** [1nJaZTIGOUybtTLyJXbdZDT5KRevCB0Jd](https://drive.google.com/drive/folders/1nJaZTIGOUybtTLyJXbdZDT5KRevCB0Jd)
**New assets from 16 November 2026:** Drive subfolder [`new-assets-2026-11-16`](https://drive.google.com/drive/folders/1-hFFpwCxBvNFFZZ5Bz88IJrIv0lcI9Qw).
**Studio repo (private, not the public Y.O.U.R. site):** wazisentthis-watt/wir-100-studio.

This document records what was finished, how the work was done, and where each project should be picked up. Nothing here invents counts, names, or links. Missing or unread sources are listed as gaps.

This is the **public-safe** collaborator handoff (no flagged-lore details, no photos, no secrets). The fuller internal copy is the Google Doc **WIR Y.O.U.R. HANDOFF — 2026-11-21** in the owner's Y.O.U.R. Drive folder.

---

## Latest builds

**Update this section when a new verified build lands.** As of 21 November 2026, 9:01 AM ET (updated after a fetch of `origin/main` the same morning): the public README still labels the repo **v2.3**, but `main` is not frozen at the 16 Nov v2.3 commit. The two local v2.4 copies (Living City, Morrow City) are **in progress** — see the Y.O.U.R. Drive folder for whatever was uploaded most recently. Do not treat a local folder as finished if Drive has a newer zip or report. Do not treat `/workspace/game-recovery/your-build-v23/` as current `main`.

**Public `main` since v2.3 (`9895df6` → `641e934`, 49 commits, last merge 18 Nov 2026, 1:35 PM ET).** This handoff did not audit those commits line by line. From the commit subjects and merged PRs, `main` already includes: KAW Living Brain driving Veyru (v24 proposal, PRs #1–#2 and follow-up relays), Muse Living Neighborhood v1 (PR #3), home door/sofa/spawn fixes (PRs #4–#5), live Sikee villains/boss and home plants, Orbital Origins opener, villain pose sheets, road crimes / exits / arrivals (PRs #9–#14), and PHATOM / RIFFT Courier Pages audio work (PRs #15–#16). Open branches still on the remote at fetch (not assumed merged) include `feature/muse-living-neighborhood-v2` and several `brantacle/*` / `agent/*` branches. Collaborators should `git pull` and read current `main` before starting work.

| Build | Status | Local folder (box) | Drive | QA (last local snapshot) | Public git / Pages |
|---|---|---|---|---|---|
| **Y.O.U.R. v2.3 + later main** (live) | Public repo + Pages (owner approved Y.O.U.R. publish only). README and the page title still say **v2.3**. | `/workspace/game-recovery/your-build-v23/` is the 16 Nov v2.3 copy. **Current public `main` is ahead of that folder — pull the repo, do not treat the 16 Nov folder as `main`.** | v2.3 zips: [part 1](https://drive.google.com/file/d/1OllwAfYXQ1vLBxhHlkKeDYQXlG9odmGk/view?usp=drivesdk), [part 2](https://drive.google.com/file/d/1NE7JAC-oRzd3itsWwm_sltDKQhEw99y7/view?usp=drivesdk), [part 3](https://drive.google.com/file/d/10vxPhwvDdafuKLPHWiCbhc5Q0Y9-zKUE/view?usp=drivesdk), [PDF report](https://drive.google.com/file/d/1iX6iXJvVdfj2HSuXRkKh8PoRk9l7IWk-/view?usp=drivesdk). Later main may also have newer Drive drops — check the folder. | v2.3 new suite was **91/91** on 16 Nov 2026, about 3:40 PM ET. This handoff did not re-run QA on later `main`. | `main` HEAD at handoff write (after fetch): `641e934` (18 Nov 2026, 1:35 PM ET), **49 commits** after v2.3 `9895df6`. See the note under this table. |
| **Y.O.U.R. v2.2** | Previous public build; still on Drive; v2.3 is a copy of it plus combat | `/workspace/game-recovery/your-build-v22/` | [part 1](https://drive.google.com/file/d/1xGSg9m0BISayu1_UvOgTwkQaE3gd0DmO/view?usp=drivesdk), [part 2](https://drive.google.com/file/d/1F3CEvgwcFeLZhosyFHbm5GhXrQUX4es_/view?usp=drivesdk), [PDF report](https://drive.google.com/file/d/1oapdR66Db8h8NAV8y1Ggp1fZmXvWvMTp/view?usp=drivesdk) | 95/95 new tests, 16 Nov 2026, 12:22 PM ET | `main` commit `523ed6f` (16 Nov 2026, 3:35 PM ET) |
| **v2.4-living — Living City / CCE 2.0** | **IN PROGRESS as of 21 Nov 2026.** Other workers are finishing it. See the Y.O.U.R. Drive folder for the latest upload. | `/workspace/game-recovery/your-build-v24-living/` | *No zip or report was in the Y.O.U.R. Drive folder when this handoff was written. Check the folder again.* | Local snapshot 21 Nov 2026, 8:57 AM ET: **112/112** in `qa/qa_v24_results.json` (39 s). This is a snapshot, not a published release. | Not on public `main`. Do not push until the owner reviews. |
| **v2.4-metal — Morrow City** | **IN PROGRESS as of 21 Nov 2026.** Other workers are finishing it (library assets were still being written this morning). See the Y.O.U.R. Drive folder for the latest upload. | `/workspace/game-recovery/your-build-v24-metal/` | *No zip or report was in the Y.O.U.R. Drive folder when this handoff was written. Check the folder again.* | Last local QA on 16 Nov 2026: desktop **23/23** at 4:40 PM ET (`qa/qa_v24m_results_desktop.json`); phones **32/32** at 4:36 PM ET (`qa/qa_v24m_results_phones.json`). That run is older than today's asset work. | Not on public `main`. Do not push until the owner reviews. |

---

## 1. Standing rules

- Never overwrite or delete originals. Work in copies. Working copies live under `/workspace/game-recovery/`.
- Never assume a higher version number is better. Record provenance. Label new numbers **PROPOSED** until the owner signs off.
- Never invent data, names, or counts. If a source is missing or unreadable, report it as a gap.
- Deliverables go to Google Drive (the owner cannot open Canvas). Split zips into parts under 95 MB.
- Report times in ET (America/New_York).
- **PUBLISH HOLD is lifted for Y.O.U.R. only.** The owner approved a public GitHub repo with a public GitHub Pages site. All other WIR work stays on hold. Do not push Living City, Morrow City, the Passport, or the KAW brain to Pages until the owner says so.
- Exclusions (do not add, recover into the public game, or treat as required canon): no real photos; no Fusion War; no Dragon Ball / DBZ / Goku; Static Shock is reference-only. Standing IP holds remain on flagged lore and other held properties — do not reintroduce them. Strip them if they appear in a source you absorb.
- The Nimbus combat module (`wir_mella_combat.js`) must stay byte-identical.
- Paused routines stay paused.

---

## 2. Design decisions so far

**Confirmed by the owner (do not reverse without asking):**

- The playable hero is the owner's likeness. The hero **is** the MELLA, with First Wish V7 powers. Mella is not a sidekick.
- The KAW sidekick is **Veyru** (Rainroot Lynx, `kaw-veyru-001`, Water + Plant). Chosen by the owner.
- The hero's name is still the placeholder **"Hero"** until the owner names them.
- The hero is a superpowered person who fights villains and survives raids.
- WIR is a whole universe (films via Microwave Movies, mythology, education, robotics, business), not just games.
- The Mella Passport is an event-ledger shared save across all games (schema `wir.passport/1`). It is designed, not wired into the live game yet.
- Y.O.U.R. should become a **living city**: the world does not wait for the player. Situations have consequences even if the player ignores them. Ordinary life (skate, drive, talk, work) must stay fun when nothing is going wrong. (Owner brief, 16 Nov 2026, t83u, "YOUR: Living City Chaos Engine / CCE 2.0".)
- Morrow City must be a **real district** of Y.O.U.R., not a portal that leaves METAL as a separate game. Absorb METAL assets. The hero and METAL fight side by side on Morrow City missions. (Owner brief, 16 Nov 2026, t84u.)
- Veyru must have a **real behavior set**, not be dragged from map to map. Sometimes follow, sometimes stay, leave the house or come only when asked, and may refuse. Inspired by whole-organism "virtual brain" research, implemented lightly for a browser game.

**Unconfirmed — still waiting on the owner:**

- Brand wording. The owner said "Y O U R Experience, Experience Wonders". Builds render it as **"Y.O.U.R. Experience — Experience Wonders"**. Punctuation and casing need confirmation. Change it in one place: the `brand` block in `your/v23/your_v23_config.js` (and the matching block in any later version).
- Hero name (still "Hero").
- Whether to turn on GitHub branch protection.
- Passport questions (section 8).
- Equity Line (CH-06): three rule options were requested; the job was skipped until the owner chooses.
- The six Living City antagonists in the t83u brief are **proposed original characters, not confirmed canon:** Dr. Iteron, Vault Vesper, Dr. Sprawl, Commander Vorax, Rampage, The Divider. Only Iteron is active in the first slice.
- WishBorn / METAL gate: whether the gate always uses one METAL version or offers a choice, and whether to ship an IP-cleared hub.
- Clearing ChatGPT's file library (it was full on 16 Nov 2026; later art was made without attachments when uploads were blocked).

---

## 3. What is live now (public `main`)

The public README and `index.html` title still say **v2.3**. The v2.3 release commit is `9895df6` (16 Nov 2026, 3:45 PM ET). After a fetch on 21 Nov 2026, `origin/main` was **`641e934`** (18 Nov 2026, 1:35 PM ET), 49 commits later — see **Latest builds**. Offline-first HTML/JS. No server, no CDN, no account. An optional AI dialogue key stays in that browser only.

The 16 Nov v2.3 description below is still the baseline. Later `main` commits added more (KAW brain wiring, living-neighborhood pieces, roads, Sikee/villain art, opener, Courier Pages). Confirm against the current tree before changing those systems.

- You play as the MELLA (First Wish V7: jump, dash, hit, blast, calm, transform, ROOT / CORE / CROWN, Living Circuit). Veyru follows and fights beside you. On the 16 Nov v2.3 baseline, Veyru used a simple follow trail (right-facing frames mirrored for left) — the "dragged" feel the owner reported. A KAW Living Brain wiring (v24 proposal) was later merged to public `main` (see Latest builds). Confirm the current follow/brain behavior on `main` before changing it. The standalone prototype and owner sign-off items in section 7 still apply.
- City life from WIR Valence Life v3 (jobs, skate, arena, dialogue, day cycle).
- Villains and raids (new in v2.3): METAL City Siege machines Ghosted Loader, Ghosted Lifter, Walker, Scout Bot, Breacher, with 28 real extracted sprites. Raids are 4 waves, then boss **BALLAST**. **GLASSJAW** unlocks afterwards. Both bosses still used labelled placeholder art in v2.3; new ChatGPT sheets for them now exist (see section 5) and are not sliced into the live build yet.
- Combat progress saves as `games.your_combat` on the shared hero profile `wir.hero/1` (v1.2 adds an optional `kaw` field).
- Elemental Gridiron football in `football.html`.
- QA: Playwright at 1280×800, 390×844, and 844×390. v2.3 new suite **91/91**.

**Still not treated as a finished published v2.4 release:** the local Living City (`v24-living`) and Morrow City (`v24-metal`) copies described in sections 9–10; the Mella Passport (not wired as of the 16 Nov design); the 23 new art sheets from 16 Nov and the 10 Claude Haiku outputs (unless a later `main` commit already added some of them — check the tree). KAW living-brain *code* has been merged to `main` as a v24 proposal; do not assume owner sign-off on house-gate / refusal rules is done.

---

## 4. Earlier Y.O.U.R. builds (Drive)

All of these are in the Y.O.U.R. Drive folder. Later builds were copied forward; earlier folders were left untouched.

| Build | What it is | Drive |
|---|---|---|
| Teardown / needs map | Copies only, under `/workspace/game-recovery/your-teardown/` | [YOUR_TEARDOWN_PLAN_PACK](https://drive.google.com/file/d/1jIZ7DcvT_r7Apaczfabt3-is-uOZGjsc/view?usp=drivesdk), [YOUR_NEEDS_MAP.md](https://docs.google.com/document/d/1Y45vW6fwWyIxeGjiZGAWN7X-zlFYCKqr/edit?usp=drivesdk) |
| B01–B15 | Early one-system builds | [zip](https://drive.google.com/file/d/1URyOwT4bjeFlgb9KpnBJF0ul1HS3yRZF/view?usp=drivesdk) |
| v1 / v1.1 / v1.2 / v1.2.1 | Pre-Valence integrated builds + reports | In the same folder (`YOUR_V1_*`, `YOUR_V1_1_*`, `YOUR_V1_2_*`, `YOUR_V1_2_1_*`) |
| v2.0 | Valence Life v3 + Y.O.U.R. v1.2.1 systems | [part 1](https://drive.google.com/file/d/1USbn45kHZPgDGEis3AZXGHe22aR_IG1w/view?usp=drivesdk), [part 2](https://drive.google.com/file/d/1uP0T8AIB2mtNSB-GcNzSWdQZK1WZwH45/view?usp=drivesdk), [report](https://docs.google.com/document/d/1WP7MSZlY187Q87Ke8kMBPZ5ZqN1bqkEe/edit?usp=drivesdk) |
| v2.1 | Hero on the football field | [part 1](https://drive.google.com/file/d/1CDxNfDchXGozHQWU1i4NQp5GqC6wGzZc/view?usp=drivesdk), [part 2](https://drive.google.com/file/d/1bLufeiAdL-21p1nhh6aB4hWnH-pMl6Hd/view?usp=drivesdk), [report](https://docs.google.com/document/d/1lO7gTBdV8FLCJb2cbqvwJJIeQj-CxWFH/edit?usp=drivesdk) |
| Asset checklist v1 | 130 rows: **60 found, 26 partial, 44 missing** (counts from 16 Nov, before the new art and Claude jobs) | [Sheet](https://docs.google.com/spreadsheets/d/11mUFDGGkZLqoFnMRKH6TuqoPZofIl7h38mIiaCOMyo4/edit?usp=drivesdk), [CSV](https://drive.google.com/file/d/1DimmekoFvCZn_FWdZilgma9SxYJni6np/view?usp=drivesdk), [prompt pack](https://docs.google.com/document/d/1AV4XBCV6vcILuwhqxewx0ztetvrh_hJuDQA9-LBiBrI/edit?usp=drivesdk), [ChatGPT prompts](https://docs.google.com/document/d/1-XoWziB2ZOTpF5tIhCZLIUVAg0jvfpHw/edit?usp=drivesdk), [Claude Haiku prompts](https://docs.google.com/document/d/1dpElEW5Bw0rhioeCwCeXgoYfyL1KAi8g/edit?usp=drivesdk) |

Local checklist copy: `/workspace/game-recovery/your-asset-checklist/`.

---

## 5. New art (16 Nov 2026) — 23 sheets

ChatGPT drew these on 16 Nov 2026 (P1 / top-priority missing art). They live on the box at `/workspace/game-recovery/your-art/chatgpt/` and are uploaded to Drive folder `new-assets-2026-11-16`. They are **not** sliced into v2.3.

**Skipped (do not use):** `36_CG-12_SLIPLINE_REJECTED_GRADIENT.png`. The keeper is `45_CG-12_SLIPLINE.png`.

Review notes from the session that made them: a couple of the football sheets came out in a different shape than asked, and the tackle arm wrap on `52_CG-FB5_FB_TACKLE.png` is weak. Check those when cutting frames. Helmet is off by default except `56_CG-FB9_FB_HELMET.png`.

Also already on disk, **not** in this 33–56 upload batch: `32_VEYRU_4DIR_WALK.png` (needed to stop mirroring Veyru's right-facing walk).

| File | Prompt | Subject |
|---|---|---|
| 33_CG-15_FOREMAN.png | CG-15 | The Foreman (Labor Ghosting raid boss) |
| 34_CG-10_BALLAST.png | CG-10 | Ballast |
| 35_CG-11_GLASSJAW.png | CG-11 | Glassjaw |
| 37_CG-13_NYAXI.png | CG-13 | Nyaxi |
| 38_CG-14_RATTLE.png | CG-14 | Rattle |
| 39_CG-02_HIT_HURT.png | CG-02 | Hero hit and hurt poses |
| 40_CG-03_CAST_UP_DOWN.png | CG-03 | Blast / cast facing up and down |
| 41_CG-04_CALM.png | CG-04 | Calm pose |
| 42_CG-05_LIVING_REFRACTION.png | CG-05 | Living Refraction transform |
| 43_CG-07_POWER_SYSTEM_ICONS.png | CG-07 | Power-pad icons |
| 44_CG-06_MELLA_POWER_VFX.png | CG-06 | MELLA power effects |
| 45_CG-12_SLIPLINE.png | CG-12 | Slipline (replacement for rejected sheet 36) |
| 46_CG-08_VEYRU_SNARE_CALM.png | CG-08 | Veyru snare and calm effects |
| 47_CG-09_VEYRU_PORTRAITS.png | CG-09 | Veyru portraits |
| 48_CG-FB1_FB_PASS.png | CG-FB1 | Football: pass |
| 49_CG-FB2_FB_CARRY.png | CG-FB2 | Football: carry |
| 50_CG-FB3_FB_STANCE.png | CG-FB3 | Football: stance |
| 51_CG-FB4_FB_CATCH.png | CG-FB4 | Football: catch |
| 52_CG-FB5_FB_TACKLE.png | CG-FB5 | Football: tackle |
| 53_CG-FB6_FB_DIVE.png | CG-FB6 | Football: dive |
| 54_CG-FB7_FB_CELEBRATE.png | CG-FB7 | Football: celebrate |
| 55_CG-FB8_FB_KNEEL.png | CG-FB8 | Football: kneel |
| 56_CG-FB9_FB_HELMET.png | CG-FB9 | Football: helmet on |

---

## 6. Claude Haiku outputs (16 Nov 2026) — 10 jobs, 12 files

All jobs were run on **Claude Haiku at the lowest / Low setting**, per standing permission. **CH-06 (Equity Line rule draft) was skipped** so the owner can choose later.

Local path: `/workspace/game-recovery/your-asset-checklist/claude-outputs/`. Also uploaded to `new-assets-2026-11-16`.

Re-checked on 21 Nov 2026: every `.json` parses as JSON; every `.js` file parses as a Function body. Status on each file is **PROPOSED**.

| File | Job | What it is |
|---|---|---|
| CH-01.js | Boss configs | Slipline, Nyaxi, Rattle, The Foreman (numbers PROPOSED; some text marked canon in the file) |
| CH-02.js | WishBorn gate adapter | Y.O.U.R. → WishBorn adapter (PROPOSED; comments note an existing traveller label that needs an owner-approved edit to change) |
| CH-03.js | School results | School results → hero profile |
| CH-04.js + CH-04.json | FaFiFi evidence | SHANGO / DRAY evidence record (`wir.fafifi-evidence/1`). Measurements only; no verdict. |
| CH-05.js | StoryStorm | Verdict presenter |
| CH-07.js | Audio | Procedural SFX presets (`MORE_RECIPES`) |
| CH-08.js | Audio | Procedural boss music loop (original composition, PROPOSED) |
| CH-09.js + CH-09.json | Microwave Movies | Game event → episode seed (`wir.mm-episode-seed/1`). Import format not yet confirmed. |
| CH-10.json | Passport world rules | Six proposed rule sheets (`wir.world-rules/1`, v0.1.0-proposed): valence-life, wishborn, metal-in-da-rifft, wir-school-apps-campus, fafifi, wir-microwave-movies |
| CH-11.js | PHATOM | Bay sync bridge (PROPOSED) |

---

## 7. KAW living brain (proposal, not wired)

The owner's request (16 Nov 2026): Veyru should move on its own, not be dragged. Sometimes come, sometimes stay. You ask it to leave the house or to come here. A real behavior set. Look at fly-brain simulations and similar work.

**What already existed (do not rebuild from scratch):** WishBorn Living Behavior v1.2 already has needs, personality traits, a KAW choosing its own actions, and a recall the KAW can refuse. Living World MELLA'z already has companions that wander, nap, chase, and eat. Y.O.U.R. v2.3 never used that. Veyru follows a simple trail and is dropped onto every new map.

**Research (verified papers only, in the design doc):** the fly whole-brain simulation is Shiu et al., *Nature* 2024, [s41586-024-07763-9](https://www.nature.com/articles/s41586-024-07763-9). The design doc also lists related whole-organism work (including the DeepMind / Janelia fly body model, a virtual rat, OpenWorm, and the Creatures games). A full brain simulation is too heavy for a browser game. v0.1 uses the same idea in light form: sense → needs shift → pick an action → move. Player commands are requests that can be refused.

**Delivered 16 Nov 2026 (PROPOSAL / not published):**

- Research + design: [KAW Living Brain v0.1 — Research and Design](https://docs.google.com/document/d/1Il8fejqyHLsOGN10qPV-W5KFpdGjUBE_uQzfMKBI4-s/edit?usp=drivesdk)
- Prototype zip (21/21 Node tests passed in that pass): [KAW_LIVING_BRAIN_v0.1_PROPOSAL.zip](https://drive.google.com/file/d/1udHUtqxSE-DY33v4Kias1ukt8yY0El1r/view?usp=drivesdk)
- File registry, **144 rows**: [WishBorn / KAW File Registry v0.1](https://docs.google.com/spreadsheets/d/1_1utftTjDbr5LU8JRfgW6W7FEdTeVjxLqzs95QT5F9U/edit?usp=drivesdk)
- Local: `/workspace/game-recovery/kaw-living-brain/` (`src/wir_kaw_living_brain.js`, tests, v1.2 working copies). Run `node tests/brain.test.cjs`.
- Inventory note: 615 matching paths were listed on `wir-100-studio` main that day (`inventory/GITHUB_wir-100-studio_wishborn_kaw_paths_2026-11-16.txt`).

**Do not hook this into v2.3 or push it** until the owner signs off on the house-gate and command decisions in the design doc.

---

## 8. Mella Passport (proposal, not wired)

Schema `wir.passport/1`. Event ledger, idempotent event IDs, merge-not-replace, conflict branches, sandbox copies, capacity limits, play-minute clocks, world rule sheets.

- Doc: [Mella Passport Schema v1 (PROPOSAL)](https://docs.google.com/document/d/1iiGUnIndtU_WzKTqIcVN1pAbrTvSItEASauSsNN2XjM/edit?usp=drivesdk)
- Zip: [mella-passport-v1-PROPOSAL.zip](https://drive.google.com/file/d/1-xt0FiuxWukNBADJxQ4pYGyIBgpZsyPf/view?usp=drivesdk)
- Local: `/workspace/game-recovery/mella-passport/`

**Do not integrate until the owner decides:**

1. Remaining IP holds — whether flagged worlds or events are cleared or must stay refused. The module currently refuses excluded world ids.
2. Gridiron power rule — today every power not tagged `sport-legal` is suppressed on the field; the owner's brief only said city-destroying abilities are suppressed.
3. Who tags abilities (`scale:city`, `sport-legal`, etc.). Proposed Y.O.U.R. keys from First Wish V7 are untagged.
4. Whether some story consequences may be permanent. The current draft never permanently subtracts: every downgrade has a duration or an "until recovered" path with a signpost.
5. Who resolves conflict / review branches: the player in game, or only the owner in a review tool.
6. Proposed numbers (need sign-off): active slots abilities 4, equipment 3, transformations 1; longest temporary effect 600 play minutes; largest single change ±50; overload threshold 60 strain; optional offline rest 15 play minutes per hour away, capped at 24 hours; longest single `tick` 240 minutes.
7. Whether every world must have an approved rule sheet before it can write events.
8. Transition plan: keep writing `wir-hero-profile-v1` with a re-sync, or switch the next integration to `applyEvent`.
9. Other open items are listed in the Passport README (legacy XP, sandbox retention, second-legacy-hero linking, world-id slugs).

---

## 9. Living City (v24-living) — IN PROGRESS

**As of 21 November 2026: in progress, being finished by other workers. See the Y.O.U.R. Drive folder for the latest. Do not overwrite their work.**

- **Local folder:** `/workspace/game-recovery/your-build-v24-living/`
- **Play entry (local):** `living.html` plus a patched `index.html`. New code is under `your/v24/` (`cce_config.js`, `cce_core.js`, `living.js`, `your_v24_link.js`). Build script: `tools/build_v24.py`.
- **Status in the config:** `PROPOSAL_HOLD`. Save key `wir-your-living-v24`, schema `wir.your-living/1`.
- This is a **separate copy of v2.3**. The live public game was not modified.

**Spec (from the owner's t83u brief and the local config):**

- One living district (not the whole six-villain city). City clock: 1 real second = 0.25 game minutes in the config; start is 2:14 PM Tuesday (the "ordinary Tuesday" in the brief).
- Event director modes (intervals are real play minutes). **Living City** column is the owner's proposed tuning: minor incidents every 3–7 min, major events every 20–40 min, robot patrols 2–4, intensity 55%. **Relaxed** and **Chaos** columns in the config are marked PROPOSED (Relaxed 6–12 / 45–75 / 1–2 / 30%; Chaos 1–3 / 8–15 / 4–6 / 85%).
- Events must not spawn beside the player just because a timer expired. Config: minimum 15 tiles from Mella, type and zone cooldowns, anti-repetition weights, a grace period after a fresh city.
- 20 persistent civilian NPCs with needs, routines, and memory (names in `cce_config.js` are **proposed originals**, not canon).
- 5 superpowered NPCs who act on their own (proposed names in the config: Kestrel Ray, Anvil Mae, Mendwell, Quillshot, Riotgale). Their objectives can conflict with the player's.
- Dr. Iteron with three robot classes: Iteron Scout, Iteron Interceptor, Iteron Shield Commander. Weekly generation calendar. Vault Vesper is a partial off-screen 7-day heist plan that can use Iteron robots. The other four proposed villains are data only in this slice.
- Set-pieces: bank robbery, vehicle chase, robot ambush (plus scout sightings). Ignored events still resolve and enter city history.
- Neighborhood damage, closure, repair, and persistent saves.
- Multiple win conditions (protect civilians, stop the commander, capture a prototype, save an injured hero, prevent infrastructure damage, track the robot signal).
- Built so Morrow City can later mount as a district without this file owning Morrow's code.

**Local QA snapshot (not a release):** 21 Nov 2026, 8:57 AM ET, **112/112** in 39 seconds (`qa/run_v24_qa.js`). Suites cover determinism, save/reload, a compressed week, director modes, spawn distance, civilians, supers, Iteron roles, damage/repair, desktop / phone portrait / phone landscape, gamepad, Passport + hero profile hooks, and "originals untouched." If a later Drive report disagrees, trust the later report.

---

## 10. Morrow City (v24-metal) — IN PROGRESS

**As of 21 November 2026: in progress, being finished by other workers. Library asset files under this folder were still being written this morning. See the Y.O.U.R. Drive folder for the latest. Do not overwrite their work.**

- **Local folder:** `/workspace/game-recovery/your-build-v24-metal/`
- **New code:** `your/morrow/morrow_district.js`, `your/morrow/district/morrow_coop.js`, `your/morrow/district/morrow_v17.html`, `your/morrow/library.html`, `your/morrow/assets/`. Build script: `tools/build_v24m.py`.
- **Status:** `PROPOSAL_HOLD`, version `2.4m`. Also a separate copy of v2.3. Modular on purpose so Living City can later mount Morrow as a district.

**Spec (from the local district module, owner brief t84u):**

- Morrow City becomes an enterable Y.O.U.R. district through a WishBorn Gate on the Savannah city map.
- Engine source cited in the module: METAL: IN DA RIFFT · MORROW ALIVE v17 · UNIFIED CAMPAIGN, Drive id `1CJy__25KfIpMJGI9AR7gqTbZYWxt-p1Y`, file `METAL_IN_DA_RIFFT_UNIFIED_v17_OFFLINE.html`. (The sha256 in the source is truncated; do not invent the rest.)
- Arrival: Lighthouse Yard (safe zone / save point).
- Eight zones named in the module: Market Zone, Transit Hub, Fabrication Zone, Rooftops, Lighthouse Yard, The Gyre, Flood Tunnels, Old Bowls.
- Missions: BRANTACLE 03 · METAL STORY · THE CITY THAT CARRIES US, **10** missions. Co-op: METAL as an AI ally (follow, fight nearby, cover when the hero is down, share Galaxy Gallium, RIFFT combos). The player can swap and play as METAL with the hero as ally. Lil Heavy, Gallium / Haulframe and other forms, Rail / Ramp / Ward build tools, and Frame bosses are in the absorbed set described by the module.
- Saves: engine `your_morrow_v17_save`, coop `your_morrow_coop_v1`, profile `wir-hero-profile-v1` → `games.your_morrow`.
- Flagged third-party IP and flagged lore must stay stripped (the build script already applies some neutralisations and hides a visitor overlay). Do not put them back.

**Asset library (local count at 9:01 AM ET, 21 Nov 2026 — this number will change if workers are still copying files):** `your/morrow/assets/library/` had **1985** files; `LIBRARY.json` had **1983** entries. By folder: city_tiles_env 787, metal_rider 535, fx_vfx 309, machines_villains 127, npc_people 102, lil_heavy 84, bosses_frames 25, ui_icons 12, audio 2, plus 2 files at the library root (`LIBRARY.js`, `LIBRARY.json`). Hero sheets also sit in `your/morrow/assets/hero/`.

**Gap:** `morrow_district.js` points at `your/morrow/METAL_ABSORPTION_MANIFEST.csv`, and that file was **not present** in the folder when this handoff was written. Rebuild or restore it if it is still missing.

**Local QA snapshot (older than today's asset work):** 16 Nov 2026, phones 32/32 at 4:36 PM ET, desktop 23/23 at 4:40 PM ET (gate, enter Morrow, ally follow, missions, ally combat, revive, orders/swap, save/reload, exit, touch, console). Re-run QA after the in-progress asset work settles.

---

## 11. How the work has been done (methods)

Use the same methods unless the owner changes them.

1. **Copies only.** Never overwrite originals. New versions are fresh folders (`your-build-v23`, `your-build-v24-living`, `your-build-v24-metal`, …). QA checks sha256 of originals.
2. **Search first.** Standing permission to search ChatGPT (box browser), Claude, Google Drive, GitHub, and Dropbox for WIR assets. Do not invent replacements when a recovered original exists.
3. **Art.** Missing images are made with ChatGPT in the box browser, from the prompt pack, in priority order. If ChatGPT's file library is full, skip attachments and still run the prompt. Do not use excluded photo-reference sheets.
4. **JSON, configs, and game-build drafts.** Ask Claude. **Always Haiku, lowest / Low setting**, to preserve usage. One computer-use task at a time when driving the Claude site. Skip jobs that need an owner choice (CH-06).
5. **QA.** Headless Playwright at **1280×800**, **390×844**, and **844×390**, plus keyboard / touch / injected gamepad where the suite covers it. Zero console-error runs are required before calling a build verified. Keep Nimbus byte-identical.
6. **Saves.** Shared hero profile `wir.hero/1`. Do not rename `localStorage` keys or the schema. Passport is the future event ledger; it is not live.
7. **Delivery.** Upload to the Y.O.U.R. Drive folder (or the general recovery folder for non-Y.O.U.R. work). Split zips under 95 MB. The owner cannot open Canvas, so do not leave deliverables only on a Canvas.
8. **Publish.** Only Y.O.U.R. may go to the public repo and Pages, and only after a scrub (no excluded IP, no real photos, no secrets). GitHub Pages serves from `main` root. Box `gh` login is `wazisentthis-watt`. Public-safe collaborator notes belong in the public repo (`README.md`, `CONTRIBUTING.md`, `AI_COLLABORATOR_GUIDE.md`, `HANDOFF.md`). Current `CONTRIBUTING.md` on `main` asks collaborators to **branch and open a pull request** rather than push to `main` directly. Always `git pull` first — `main` moved 49 commits past the 16 Nov v2.3 commit.
9. **Labels.** Tag values as OWNER, METAL (copied from a named source), V23, or PROPOSED. Keep those tags.
10. **Usage.** When the owner's weekly usage is nearly full, pause large builds, write the handoff, and stop. Do not start new heavy computer-use or model jobs just to polish.

---

## 12. Next steps, in order

1. **Check Drive first.** Living City and Morrow City may have newer zips or reports than the local folders described here. Update the **Latest builds** table.
2. **Review and slice the 23 new art sheets** (skip the rejected Slipline). Start with Foreman, Ballast, Glassjaw, then the other villains, then hero hit/blast/calm/transform and Veyru effects. Re-check the football sheets, especially the tackle. Wire approved frames into a **new copy** of the game, not into the live v2.3 folder in place.
3. **Slice and wire `32_VEYRU_4DIR_WALK.png`** (mirror the left row from a real left-facing strip if the sheet includes one; do not keep the old "mirror the right row" shortcut once a real sheet exists).
4. **Drop in the validated Claude files** where they fit (CH-01 boss configs with the new boss art; world rule sheets stay proposed). Do not run CH-06 until the owner chooses.
5. **Pick up Living City (v24-living)** if the other workers have not already finished and uploaded it. Keep it a separate copy. Re-run Playwright if you change anything after the 8:57 AM ET snapshot.
6. **Pick up Morrow City (v24-metal)** the same way. Restore the absorption manifest if it is still missing. Re-run desktop and phone QA after the in-progress library copy finishes. Keep flagged IP out.
7. **After the owner answers the open decisions:** wire the KAW living brain (house gate + COME / STAY / LEAVE_HOUSE / AT_EASE / FEED, refusals allowed); then integrate the Passport; then any remaining ChatGPT prompts after P1.
8. **Do not publish v2.4 (living or metal) to GitHub or Pages** until the owner reviews the build.

---

## 13. Open decisions (waiting on the owner)

- Confirm or correct the brand wording "Y.O.U.R. Experience — Experience Wonders".
- Hero name (still "Hero").
- GitHub branch protection: on or off.
- Clear or keep the standing IP holds, and say whether the WishBorn gate should always use one METAL version, offer a choice, and/or ship an IP-cleared hub.
- Passport: IP-clearance, Gridiron power rule, ability tags, permanent vs recoverable consequences, who resolves conflicts, the proposed slot and limit numbers, rule-sheet-before-write, and the transition plan (section 8).
- Equity Line (CH-06): choose among three drafted fairness-rule options, once someone is asked to draft them.
- KAW living brain: sign off on house-gate and command / refusal rules in the design doc.
- Confirm the six Living City antagonists as canon, or replace them. Iteron is the only one built in the first slice.
- ChatGPT file library: the owner was asked to clear it so reference sheets can be attached again.

---

## 14. Gaps and unread sources

These were still unread or inaccessible when earlier work was recorded. Do not pretend they were reviewed.

- 16 PHATOM ChatGPT chats, and 12 WishBorn / KAW ChatGPT chats (inventoried, not opened).
- Research zips; the Film Bible; 40 Episode Library sheets; the WishBorn Google Site.
- Gmail was not accessible (the registry has a Gmail gap row).
- CCE 2.0 was going to be saved as its own Drive design doc after the owner's t83u brief. **No CCE / Living City design doc or v24 zip was in the Y.O.U.R. Drive folder when this handoff was written.** The living config itself is the written spec until a later doc appears.
- `METAL_ABSORPTION_MANIFEST.csv` was referenced by Morrow City code and was missing from the local folder.
- Asset checklist counts (60 / 26 / 44) are from **before** the 23 new sheets and the 10 Claude jobs. They have not been re-tallied in this handoff.
- BALLAST and GLASSJAW art now exists as sheets, but is not in the live v2.3 build. GLASSJAW phase-2 fake platforms were still unbuilt in v2.3 (`AI_COLLABORATOR_GUIDE.md`).
- Raids in v2.3 exist in one district only (the starter flat block).

---

## 15. Don'ts (for every collaborator)

- Don't add third-party IP, real photos, secrets, CDNs, analytics, or files over 95 MB.
- Don't rename `localStorage` keys or the `wir.hero/1` schema.
- Don't remove PROPOSED / V7 / OWNER tags, or change owner-approved values, without saying so.
- Don't edit `wir_mella_combat.js` (Nimbus must stay byte-identical).
- Don't delete originals, sandbox copies, or unpublished working folders to "clean up."
- Don't publish anything except owner-approved Y.O.U.R. releases.
- Don't spend heavy model usage on polish when the owner's weekly cap is nearly full — update the handoff and stop.
