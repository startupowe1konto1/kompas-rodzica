# Animated pitch deck: playbook for Claude

Give this file to Claude at the start of a new project. It describes how to build a short, animated, data-backed pitch deck as a static web page, plus a PDF of the same slides. It is topic-neutral: everything specific to a project goes into the brief (section 1) and the data file (section 6).

The method was proven on a 7-slide, 3-minute pitch with a 3D camera that travels through one continuous scene, built overnight by one lead session and parallel subagents. A 3D scene is optional: the same structure works with a map, a diagram or plain layouts.

---

## 0. How Claude works with this file

- Read the whole file before doing anything. Then ask for the brief (section 1) in one message, listing only what is missing.
- Do not write slide code before the story (section 2) and the prototype direction (section 3) are agreed with the deck owner.
- The deck owner decides wording, order and what stays. Claude proposes, builds, checks and shows; it does not ship a slide the owner has not seen.
- Answer the owner in their language. Slide text is in the language the brief names.

## 1. The brief (ask for it first)

| Item | Example of an answer |
|---|---|
| Audience and setting | Jury of five, live, 3 min talk + 2 min questions; also read later as a PDF |
| Hard limits | Max 7 slides incl. title; slides in English; names of team members on a slide; no logos of X |
| Spoken vs. slide language | We speak Polish, slides are English |
| The one sentence | What the audience must remember |
| The protagonist | One real case: a person, a place, a customer, shown through an object (a notebook, a dashboard), not as a stock figure |
| The evidence | Which numbers prove the point, and which code or dataset produces them |
| The product | Real screenshots available? From which build, at what size? |
| Look | Mood words, references, brand colours and fonts if any |
| Deadlines | Slides frozen at, PDF public at, presented at |
| Hosting | Where the PDF and the animated page will live; must the link work without login? |

Write the answers into `SPEC.md` (section 4) as a table of limits and a table of decisions, each with who decided it.

## 2. The story

- One idea per slide. If a slide needs two sentences to explain, it is two slides or one cut.
- Default arc for 5 to 7 slides: **title → problem (the protagonist) → what data/know-how exists → how we combine it → evidence from elsewhere → the product → sources and team.** Adjust, but keep the protagonist on screen early.
- Give every slide a time budget; they must add up to the talk length.
- For every slide write its **final state**: what the PDF page shows. It must make sense without the speaker.
- The slides carry no speaker notes in the repo. The speaker talks freely.

## 3. Prototype before spec

- Build one throwaway HTML file with the two or three slides that carry the look (usually the title and the most visual one). If there are two plausible directions, build both and let the team pick on screen, not from a description.
- Record what the team rejects and why (for example "no decorative icons, tables instead of badges"). Those lines become design rules in the spec.
- Keep the chosen prototype in `prototype/` as the reference the scaffold is ported from.

## 4. Spec and plan

`SPEC.md`: limits, decisions, story, and per slide: scene, text (eyebrow, title, lede), steps, final state, rules (what must never appear).

`PLAN.md`: tasks with an ID, the files each task may write, the model, a time estimate and a "done when" line that can be checked. Draw the dependency order. Typical tasks:

| ID | Task | Model |
|---|---|---|
| P0 | Questions only the owner can answer (names, the real case, hosting) | person |
| P1 | Scaffold: stage, scene, tokens, empty slide modules, port the prototype | Sonnet |
| P2 | Fetch imagery and assets, check they are not blank | Haiku |
| P3…P7 | One slide each, in parallel once P1 and P2 are in | Sonnet; Opus for a slide with no prototype to copy |
| P8 | Product screenshots, by script, after the product's UI freeze | Sonnet |
| P10 | Review of the whole deck against the spec | Opus |
| P11 | PDF and backup video | Haiku |
| P12 | Final checks (section 9) | Haiku |
| P13 | People: timed read-through, test on the real laptop and projector | person |

Model rule: **Opus** where the task needs design judgment with nothing to copy; **Sonnet** where the spec or prototype already says what to build; **Haiku** for fetching, running, counting and checking. A Haiku task that meets a decision stops and reports.

## 5. Architecture (static page, no framework)

```
deck/
  index.html           stage, import map, loads src/stage.js
  package.json         only the deck's own dependencies (e.g. three, fonts, playwright)
  src/stage.js         1920x1080 stage scaled to the window, slide/step control, keys, URL hash, print mode
  src/scene.js         the one renderer and camera (if there is a 3D or map scene); the only file that moves the camera
  src/tokens.css       colour tokens, type scale, text block, facts row, tables, wash
  src/constants.js     text that is not a number: names, project name, URLs, external figures with their source
  src/slides/NN-name.js  one module per slide
  data/deck.json       every number the deck shows, written by a script (section 6)
  scripts/             export-data, export-pdf, record, walk, shoot, serve-nocache
  prototype/           the approved prototype, kept for reference
  out/deck.pdf         the PDF (decide with the owner whether it is committed)
```

**Slide interface** (document it at the top of `stage.js`):

```js
export default {
  steps: 5,                        // steps after the slide appears; step 0 = the slide appearing
  stepMs: [700, 900, 700, 1000, 2400, 1500],  // one number, or one entry per step: that step's own animation time
  mount(ctx) {},                   // once: build the DOM inside ctx.el
  enter(step, ctx) {},             // leave the slide in the final state of `step`; safe to call again, from any state
  final(ctx) { this.enter(this.steps, ctx); },  // print mode and reduced motion
};
```

- Elements appear with `data-from="n"`: the stage adds `.on` to every element whose `n` ≤ current step. CSS fades and lifts them in.
- **One key press plays a whole slide**: the stage runs step 0 → last step in a row, waiting `max(camera move, stepMs[step])` between steps. A press during the sequence jumps to its end. Left arrow goes back instantly.
- URL hash `#slide.step` opens any state directly; `?print=1` shows the final state with no motion; `prefers-reduced-motion` does the same.
- Expose `window.deckBusy()` (true while a sequence or animation runs) so scripts can wait for a slide to finish.
- A slide that cannot make the time can be parked behind a flag in `constants.js` (for example `SHOW_SLIDE_4 = false`) instead of being patched at the last minute. Slide numbers then shift; scripts find slides by `data-name`, never by number.

**Animation order, the same on every slide:**

1. Step 0: the camera (or background) moves. No text.
2. Then the left text column, block by block from the top: eyebrow and title together, then each supporting block (facts row, key number, comparison rows).
3. Then the right-hand panel (table, notebook, screenshot), rows one after another if they tell a sequence.
4. Then the footnote.

The title slide may show everything at once, since it is on screen when the deck opens.

## 6. Data integrity

- Every number on a slide comes from one generated file (`data/deck.json`), written by a script that calls the product's own code. Never type a number into a slide.
- Each slide checks its data in `mount` and **throws** if a table and the data disagree (wrong unit, missing id, count mismatch), so a stale slide cannot ship.
- A number from outside the product (market size, population) goes into `constants.js` with its source: title, publisher, year, and the exact sentence it comes from. Check it against the primary source, not a press summary: they can differ (a paper counts all companies, the press release about it says "small companies").
- Before a slide claims "we do X and others don't", check the product's code does X today and check what the others really do. If the code does less than the plan said, the slide says what the code does.
- Words that over-promise ("forecast", "guaranteed", "AI predicts") are banned unless true; write the honest version ("a replay of past years, not a forecast").
- Rerun the data export after the product's last change before the freeze.

## 7. Design rules

- Stage 1920 × 1080, scaled to fit; design and check at that size.
- One typeface (plus at most one accent face for one object, e.g. handwriting in a notebook). A fixed type scale in tokens.
- **One meaning per colour**, used for nothing else: e.g. our product, comparison cases, data layers, risk.
- Text block top-left, at most ~640 px wide; tables right, ~580 px. A dark gradient wash behind each text column instead of boxes.
- Tables instead of badges and chips; no decorative icons; tabular digits only in number columns.
- Titles with hand-set line breaks (`<br>`) and `white-space: nowrap`; check no line wraps by accident and nothing touches the scene's focal object.
- No logos you are not allowed to use; images made by an AI tool carry a visible watermark (or are not used).
- Slide text goes through an anti-AI-writing pass: plain words, no "pivotal", no "not just X but Y", no rule-of-three padding.

## 8. How the build runs

- **One lead session** owns the shared files (`index.html`, `stage.js`, `scene.js`, `tokens.css`, `constants.js`) and talks to the owner.
- **Each task is a subagent in its own git worktree**, writing only its listed files. If it needs a shared-file change, it says so and the lead makes it. The lead merges task branches into the deck branch after reviewing each against the spec.
- Commit after each finished task. One PR for the deck when the owner says yes.
- When the owner must choose between versions, build both and put them **side by side** on one comparison page (screenshots of the same slides at 1920 × 1080, one line under each pair saying what differs and what is factually weaker). The owner can pick per slide ("slide 2 from B, content of A in B's layout").
- Before a long break, write `HANDOFF.md`: state per slide, owner's newer rules, open decisions with defaults, what is left.

## 9. Checks (run them, look at every image)

| Check | How |
|---|---|
| No console errors | every slide, live and `?print=1` |
| Order of animation | a walk script: from slide 1, press once per slide; log `slide.step` and how many `[data-from].on` elements over time; every slide must start with 0 visible text blocks and add them in order |
| Final states | screenshot every slide with `?print=1#n.0` after a **full reload** (a hash change alone does not reload, so the page shows the slide mid-animation) |
| Size | screenshots at exactly 1920 × 1080; a 4:3 preview window crops the stage and hides problems |
| Line breaks | measure that one-line elements are one line high |
| Numbers | every number on the stills equals the data file |
| Banned words | `grep` the slide sources for the words section 6 bans |
| Parallel load | four browser pages load the deck at once; zero failed requests |
| PDF | exactly N pages, each opened and looked at, not blank, not a loading state |
| Secrets | secret scan of the repo history before anything becomes public |
| People | timed read-through within the talk length; the deck once on the real laptop and projector |

## 10. Export, serving and hosting

- **PDF:** a script starts its own static server, opens each slide with `?print=1`, saves a still per slide and assembles the PDF. JPEG pages keep it around 3 MB. It refuses to run if screenshots are missing, unless a rehearsal flag is passed.
- **Backup video:** a script plays the deck with one press per slide, waits for `deckBusy()` to be false, holds a few seconds, records.
- **Local serving:** a static server with `Cache-Control: no-store` (otherwise the browser keeps old modules). Raise the listen backlog (Python: `ThreadingHTTPServer.request_queue_size = 128`): with the default of 5, Windows refuses part of the ~30 parallel module requests when two browsers load the deck, a module fails and the page stays black.
- **For the live talk**, run the server from a normal terminal, not from a tool that may stop it (IDE preview panes and agent terminals close with their app). Better still, host it.
- **Hosting:** copy the deck, its vendored libraries and the PDF into the site's build output (e.g. `/pitch/` and `/pitch/deck.pdf`) with a build script that stops on a missing file. Check the hosted page loads every resource and the PDF returns `application/pdf`.

## 11. Pitfalls seen in practice

- The preview server dies when the preview pane closes or the app restarts; the deck "suddenly" does not load. Check the port before debugging the code.
- A black page with a dark rectangle in one corner means `stage.js` never ran: a module failed to load. Look at the network tab, not the slide code.
- Comparing versions only in words wastes rounds; show them side by side.
- A slide the owner calls "too complex" twice is not fixed by a third variant of the same idea. Park it and move on.
- Headless and software-WebGL renders differ slightly from the presenter's browser; export the final PDF on a machine like the one used on stage when possible.
- On Windows, scripts that rewrite files can switch line endings to CRLF; let git normalise them and check the diff is small.

## 12. Definition of done

- [ ] The owner has seen and approved every slide, live, with one key press per slide.
- [ ] Every slide follows the animation order of section 5.
- [ ] Every number comes from the data file or from `constants.js` with a checked source.
- [ ] No claim on a slide goes beyond what the product does today.
- [ ] All checks of section 9 pass; the PDF has exactly N pages.
- [ ] The animated page and the PDF are reachable at their final links without login.
- [ ] `HANDOFF.md` and `README.md` of the deck say how to run, export and change it.

---

## Starter prompt

Paste this together with the file:

> Read `DECK-PLAYBOOK.md`. We are building a pitch deck for [project] for [audience], [N] slides, [M] minutes. The product's code is in [path]; the numbers should come from [module or dataset]. Ask me for whatever is missing from the brief in section 1, then propose the story (section 2) with a final state per slide. Do not write deck code until I approve the story and a prototype direction.
