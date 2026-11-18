<!-- glassbox:start -->
<!-- Generated from glassbox.json by the Glassbox hub (npm run readme -- parachuteclear). Edit glassbox.json, not this block. -->

<h1 align="center">ParachuteClear</h1>

<p align="center"><b>How does a parachute work?</b><br>A skydiver falls at 200 km/h. Under a canopy, the same person lands at the speed of a jog. Nothing about gravity changed: only the air's grip did.</p>

<p align="center"><a href="https://glassbox.how/parachuteclear/"><b>▶ Play with it</b></a> &nbsp;·&nbsp; <a href="https://glassbox.how/e/parachuteclear/">Read the 60-second explainer</a></p>

<p align="center">
  <a href="https://glassbox.how/e/parachuteclear/"><img alt="Glassbox No. 231" src="https://img.shields.io/badge/Glassbox-No.%20231-8ef0ff"></a>
  <a href="https://glassbox.how/e/parachuteclear/"><img alt="Physics" src="https://img.shields.io/badge/field-Physics-7aa2ff"></a>
  <a href="LICENSE"><img alt="Code: MIT" src="https://img.shields.io/badge/code-MIT-3fb950"></a>
  <a href="LICENSE-CONTENT.md"><img alt="Content: CC BY 4.0" src="https://img.shields.io/badge/content-CC%20BY%204.0-ef9421"></a>
  <a href="#privacy"><img alt="Privacy: explained" src="https://img.shields.io/badge/privacy-explained-555"></a>
</p>

## In 60 seconds

1. **Gravity against drag.** A falling body speeds up until drag, which grows with the square of speed, equals its weight. That steady speed is terminal velocity: about 55 m/s (200 km/h) belly to earth, faster head down.
2. **Drag area is the trick.** A parachute does not cancel gravity. It adds a huge drag area, so drag balances weight at only 5 to 7 m/s. Bigger canopy, slower fall; heavier load, faster fall.
3. **Round canopies and the vent.** A round canopy is a blunt dome that spills air from its rim and can rock. A small hole at the top lets air escape steadily, which calms the swing.
4. **The canopy that flies.** A square ram-air canopy is an inflatable wing. Air rams into the open cells and puffs up an aerofoil, which glides about 3 m forward for each metre it sinks. Toggles turn it, and a flare softens the landing.
5. **One stage hands to the next.** A pilot chute drags out the bag, the lines stretch, the canopy fills and a slider slows the opening. If the main fails there is a reserve, and an automatic device fires it for a jumper who cannot act.
6. **Thin air up high.** Air density falls with height, so the same jumper falls much faster up high. Baumgartner passed the speed of sound from about 39 km in 2012, then slowed as the air thickened.

## Words worth knowing

| Term | Meaning |
|---|---|
| **Terminal velocity** | The steady speed at which drag equals weight, so a falling body stops speeding up. |
| **Drag area** | The drag coefficient times the frontal area: how much air a shape grabs. |
| **Air density** | The mass of air per cubic metre. It is about 1.2 kg/m³ at sea level and falls with height. |
| **Canopy vent** | A hole at the top of a round canopy that lets air out steadily and reduces rocking. |
| **Ram air** | Air forced into the open front of a canopy's cells by its forward motion, which keeps it inflated. |
| **Glide ratio** | Distance moved forward for each unit of height lost. 3:1 means three metres on for one down. |
| **Flare** | A smooth, strong pull of both toggles just before landing that trades speed for lift. |
| **Slider** | A small rectangle of fabric on the lines that slides down slowly and slows the canopy's opening. |
| **Reserve** | A separately packed second canopy used if the main fails. |
| **AAD** | An automatic activation device that fires the reserve if a jumper is too low and still falling fast. |

## A short history

**From Leonardo's cloth pyramid to a jump from 41 km and a parachute on Mars.**

- **1485** · Leonardo draws a pyramid parachute (Leonardo da Vinci, Italy)
- **1783** · Lenormand jumps from a tower (Louis-Sébastien Lenormand, Montpellier, France)
- **1797** · Garnerin drops over Paris (André-Jacques Garnerin, Parc Monceau, Paris, France)
- **1799** · Jeanne Geneviève Garnerin is the first woman to parachute (Jeanne Geneviève Garnerin, Paris, France)
- **1913** · Tiny Broadwick jumps from a plane (Georgia "Tiny" Broadwick, Los Angeles, USA)
- **1919** · Irvin pulls his own ripcord (Leslie Irvin, McCook Field, Ohio, USA)
- **1960** · Kittinger falls from 31 km (Joseph Kittinger, New Mexico, USA)
- **1963** · Jalbert's ram-air wing (Domina Jalbert, United States)

The full story, with 30 moments, charts, people and 38 sources: [glassbox.how/e/parachuteclear/history](https://glassbox.how/e/parachuteclear/history/). The data lives in [`history.json`](history.json).

## Privacy

This box has no accounts and no ads, and it ships its own fonts and libraries. When you run it yourself it sends nothing anywhere. On glassbox.how, the site's `/bar.js` also loads Glassbox's analytics: **Google Analytics** to count visits (it asks first in the EU, UK and Switzerland, and stays off when your browser sends Global Privacy Control or Do Not Track) and **ClickTrust** to detect bots.

It remembers a few things **in your own browser only**, and never sends them anywhere:

| Browser storage key | What it holds |
|---|---|
| `parachuteclear.v1` | Which chapters you have opened, your best quiz scores, and sound on or off. |

Exactly what each one sees is at [glassbox.how/privacy](https://glassbox.how/privacy/).

## Licences

- **Code:** [MIT](LICENSE). Use it, change it, ship it.
- **Explanations, text, images and videos** (`glassbox.json`, `glassbox/`): [CC BY 4.0](LICENSE-CONTENT.md). Credit “Glassbox, glassbox.how/e/parachuteclear”.
- **Third-party parts** keep their own licences: [three.js](https://threejs.org) (MIT), [Geist, Instrument Serif](https://openfontlicense.org) (SIL OFL 1.1).
- The Glassbox name and logo aren't covered by either licence. See the [terms](https://glassbox.how/terms/).

Found a mistake? [Open an issue](https://github.com/bdeeps/parachuteclear/issues). Corrections happen in public.
<!-- glassbox:end -->

## Run it

It's plain HTML, CSS and JavaScript. No build step and no dependencies. Run locally, it contacts no other website.

```bash
python3 -m http.server 8000
```

Three.js and the fonts ship in `vendor/` and `fonts/`, so it also works offline.

Then open http://localhost:8000.

## How it's built

| File | What |
|---|---|
| `index.html`, `css/app.css` | The page and its styles |
| `js/app.js`, `js/stage.js`, `js/ui.js`, `js/kit.js` | The shared Glassbox 3D engine: chapters, 3D stage, controls, quiz, video director |
| `js/chapters/*.js` | One file per chapter: the 3D model, controls, text, key terms, quiz and video scenes |
| `glassbox.json` | Title, question, explainer beats, key terms, browser storage and credits shown on glassbox.how |
| `reel` in each chapter | The storyboard the Glassbox studio records into short videos |
| `glassbox/` | The published video, slides, thumbnail and post copy |
| `fonts/`, `vendor/three/` | Self-hosted Geist and Instrument Serif (SIL OFL 1.1) and three.js (MIT) |
