# Y.O.U.R. v2.1 · Football hero art prompts (PROPOSAL_HOLD)

The owner hero is playable on the Elemental Gridiron field in v2.1. Every football pose is built **only from the existing owner hero sheet**
(`your/assets/hero/hero_sheet_96.png`, ChatGPT art 18–27 plus the run, jump and dash frames). No new art was invented.

Where no football-specific frame exists, the game uses a **stand-in**: the closest existing frame. On-field stand-ins are labelled in the HUD chip
("pose X: stand-in art", pink), counted in `window.__V21.standin`, and listed in the `si` field of the `POSE` table in `your/v21/eg_hero.js`.

Paste one prompt per ChatGPT image request. **Attach the current `hero_sheet_96.png` (or `hero_portrait_256.png` plus 2–3 cells from
`your/assets/hero/hero_cells/`) as the style and likeness reference every time.**

## Shared rules (add these to every prompt)

> Pixel-art game sprite of the SAME character as the attached reference: same face, skin tone, hair, body proportions, outline weight, shading and palette.
> Wearing the same teal outfit as the reference, worn as a football kit. Keep the teal: the game recolours teal pixels to the team jersey at runtime.
> Transparent background. A horizontal strip of N frames, each frame exactly 96×96 px, with the character centred and the feet on the same baseline
> (about 6 px above the bottom edge), facing RIGHT (side view, slightly 3/4). No text, no numbers, no logos, no team names, no shadows on the background.
> An original character. Not based on any existing anime, manga, game or sports franchise.

Drop finished strips into `your/assets/hero/football/` and map them in the `POSE` table (`eg_hero.js`). Remove the `si` label on each pose that gets real art.

## Prompts (stand-in in use → wanted art)

| # | Pose key(s) | Stand-in now (sheet row, col) | Frames | Prompt (after the shared rules) |
|---|---|---|---|---|
| 1 | `throwWind`, `throwRel`, `throwFollow` | fight windup (4,2), punch (4,3), step (4,1) | 4 | "Quarterback overhand pass holding a brown American football: 1 ball held high by the ear, elbow up; 2 step forward, arm cocked back; 3 release with the arm extended forward and the ball leaving the hand; 4 follow-through with the arm across the body." |
| 2 | `carry`, `carryIdle` | plain run (7,0–3) / idle (3,0–3) | 4 run + 2 idle | "Running back carrying a football tucked high and tight under the right arm, left arm pumping. 4-frame run cycle, then 2 idle frames standing and holding the ball tucked." |
| 3 | `ready` (pre-snap stance) | fight step (4,1) | 2 | "Football stance: 1 quarterback under centre, knees bent, hands together low in front; 2 three-point stance, one hand on the ground, back flat, eyes up." |
| 4 | `catchHigh`, `catchLow` | jump (7,6) / block (4,5) | 3 + 2 | "Receiver catching a football: high catch, 3 frames (reach up with both hands, ball arriving, ball secured to the chest); low catch, 2 frames (scoop at knee height, secure)." |
| 5 | `hit` (tackle) | dash (7,9) | 3 | "Defender form tackle: 1 lowered shoulder, arms open; 2 wrap with both arms around an unseen ball carrier at waist height; 3 driving forward. Show the tackler only." |
| 6 | `dive` | slide (7,10) | 2 | "Full-length dive forward reaching for the goal line, football held out in both hands; then landing on the chest." |
| 7 | `td1`, `td2`, `dunk`, `backflip`, `hype`, `moonwalk`, `worm` | power-up (9,12)/(9,13) | 4 | "Touchdown celebration: 1 both arms raised; 2 spiking the football; 3 fist pump; 4 point to the sky. Joyful, sportsmanlike." |
| 8 | `kneel` | down (4,15) | 1 | "Taking a knee on the field, one knee down, holding the football, helmet off and held at the side." |
| 9 | `helmetoff` | power-up (9,12) | 2 | "Holding a plain teal football helmet in one hand at the side, then raising it overhead. The face is fully visible." |

Note on the helmet: the owner hero is drawn **without** a helmet, as in the reference art. That is intentional so the hero is recognisable.
If the owner wants a helmeted version, add "wearing a plain teal football helmet with a clear visor so the face is visible" to prompts 1–7.
