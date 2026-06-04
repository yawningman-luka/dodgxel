# Dodgxel — Story Mode Spec

## Overview
A side-scrolling adventure mode using the same pixel-art engine and arenas.  
Solo or 2-player co-op (P1 + P2 on the same keyboard/screen).  
Players walk through connected arena-stages, fight enemies, and talk to NPCs.  
Tone: absurdist comedy apocalypse.

---

## The Story — "The Cure Is Dodgeball"

### Premise
A mysterious plague has turned half the world's population into rampaging dodgeball-obsessed maniacs.  
Governments have collapsed. Scientists are missing. The vending machines only sell energy drinks now.

Jaco & Lucy get a garbled radio message:  
> *"The cure… it was inside us all along… also check the castle."*

What follows is a trek across five zones, each with its own arena-stage, boss, and rescued NPC.  
At the end they discover the truth: **dodgeball cures everything**. It always has. Nobody thought to try.

### Story Beats (5 acts)

| Act | Zone | Goal | NPC rescued | Twist |
|-----|------|------|-------------|-------|
| 1 | City Ruins | Escape the infected neighbourhood | Dr. Wendy (virologist, useless) | The cure isn't in the lab — she locked her keys inside |
| 2 | Jungle Temple | Find the ancient tome of dodgeball prophecy | Professor Biff (archaeologist, coward) | Tome is a menu and the prophecy is a footnote |
| 3 | Snow Base | Recover a stolen vial from the enemy general | General Fluffkins (enemy cat, misunderstood) | Vial contains a sports drink, not the cure |
| 4 | Royal Castle | Save the princess (two princesses, neither asked to be saved) | Princess Dot & Princess Val (very busy) | They already know the cure; nobody thought to ask |
| 5 | Broadcast Tower | Beam the cure signal to the world | Everyone you rescued (chaos) | You throw a dodgeball at the machine and it works |

---

## Gameplay Loop Per Stage

```
[World Map] → [Stage Intro Cutscene] → [Side-scroll Segment] → [Arena Fight] → [NPC Dialogue] → [World Map]
```

### Side-scroll Segment
- Players walk left→right through an extended arena (2–3× canvas width, like Salvo mode).
- Enemy groups block progress — clear them to advance.
- Collectibles: med-kits (restore HP), power tokens (charge SP bar).
- Simple platforming using existing jump/crouch physics.

### Arena Fight (boss / wave)
- Uses existing arena layout (one per act — city, jungle, snow, castle, tower).
- Wave of enemies then a named boss with a larger sprite and more HP.
- Same dodgeball mechanics: throw, catch, shield, superpowers.

### NPC Dialogue
- Post-fight text box with portrait, two or three lines per character.
- Advance with confirm key. No choices needed for V1.
- Each NPC gives a hint/item that unlocks the next zone on the world map.

---

## World Map
- Simple overhead node map (can be a drawn canvas scene, not a full tile engine).
- Five stage nodes connected by dotted paths.
- Completed stages show a star. Current stage pulses.
- Navigate with arrow keys / confirm to enter.

---

## Enemies (reuse Horde assets)

| Name | Behaviour | Notes |
|------|-----------|-------|
| Grunt | Walks toward player, throws at intervals | Base enemy from horde |
| Rusher | Dashes when in range | Faster grunt variant |
| Goalie | Blocks throws, punishes misses | Stationary, high catch rate |
| Mega Grunt | Large, more HP, slow | Boss mob before the real boss |

Boss enemies get a unique name, extra HP bar drawn at screen bottom, and a taunt line.

---

## Player HP System
- Each player has HP (e.g. 5 bars). Getting hit removes 1 bar.
- Getting hit by your own missed throw: no damage (comedy rule).
- Catching an enemy ball: restores 0.5 bar.
- If solo, P2 is absent. If co-op, either player dying ends the stage (retry from stage start).
- HP persists across the side-scroll segment and the arena fight within one stage.
- Full HP restored at world map between acts.

---

## Arenas per Act
For V1, use one existing arena per act (no new arenas needed):

| Act | Arena ID to reuse |
|-----|-------------------|
| 1 | `city` |
| 2 | `jungle` |
| 3 | `snow` |
| 4 | `castle` |
| 5 | `roof` |

If an arena doesn't exist yet, build it in Arena Builder and reference it here.

---

## New State
Add `STORY` to the game state machine:
```js
STATE: { ..., STORY: 'story' }
```
Sub-states managed inside StoryGame class:
- `world_map` — node map view
- `cutscene` — scrolling text / portrait dialogue
- `sidescroll` — walk & fight
- `arena` — reuse existing arena fight logic
- `dialogue` — NPC text box

---

## Files to create / modify

| File | Change |
|------|--------|
| `src/story.js` | New `StoryGame` class — owns all sub-states |
| `src/story_data.js` | Act definitions, dialogue scripts, enemy wave configs |
| `src/game.js` | Add `STORY` state, wire `StoryGame`, add menu entry |
| `src/constants.js` | Add `STATE.STORY` |
| `src/sprites.js` | NPC portrait drawing (simple head + hat variants) |
| `src/horde.js` | Extract enemy AI into shared `EnemyAI` module (or just import logic) |
| `index.html` | Add `<script src="src/story.js">` and `src/story_data.js` |

---

## Phased Delivery

### Phase 1 — Skeleton (playable loop, one act)
- World map with one unlocked node (Act 1).
- Side-scroll: walk right, fight one enemy wave.
- Arena fight: existing `city` arena, 3 grunt waves.
- NPC dialogue box after fight.
- Return to world map. Done.

### Phase 2 — Full five acts
- All five acts with arenas, enemy waves, boss per act.
- All NPC dialogue scripts.
- World map with unlock progression.

### Phase 3 — Polish
- Cutscene intro per act (scrolling text).
- Boss HP bar.
- Sound triggers on dialogue.
- Ending sequence (dodgeball throw, world restored animation).

---

## Estimated Effort

| Phase | Effort |
|-------|--------|
| Phase 1 (skeleton, 1 act) | L (1–2 days) |
| Phase 2 (5 acts) | XL (3–5 days) |
| Phase 3 (polish) | M (1 day) |
| Total | ~1 week focused dev |
