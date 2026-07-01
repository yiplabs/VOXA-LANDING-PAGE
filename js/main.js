// Voxa landing page behaviour: soul voice previews (browser speech synthesis),
// live orb skin/palette switching, and platform-aware download labels.
import { SKINS, SKIN_ORDER, PALETTES, PALETTE_ORDER } from "../orb/skins.js";

/* ── Platform-aware download label ─────────────────────────────── */
(() => {
  const ua = navigator.userAgent || "";
  let suffix = "";
  if (/Mac/i.test(ua)) suffix = " for macOS";
  else if (/Win/i.test(ua)) suffix = " for Windows";
  else if (/Linux|X11/i.test(ua)) suffix = " for Linux";
  document.querySelectorAll("[data-platform-suffix]").forEach((el) => { el.textContent = suffix; });
})();

/* ── Hero orb: state readout, keyboard access, skin/palette chips ── */
(() => {
  const orb = document.getElementById("hero-orb");
  if (!orb) return;

  const stateLabel = document.getElementById("orb-state-label");
  orb.addEventListener("orbstate", (e) => {
    if (stateLabel) stateLabel.textContent = String(e.detail || "idle").toUpperCase();
  });
  orb.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); orb.click(); }
  });

  const controls = document.getElementById("orb-controls");
  const skinChips = document.getElementById("skin-chips");
  const paletteChips = document.getElementById("palette-chips");
  if (!controls || !skinChips || !paletteChips) return;

  function buildChips(container, order, defs, attr, initial) {
    for (const id of order) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = defs[id].name.toUpperCase();
      if (defs[id].blurb) chip.title = defs[id].blurb;
      chip.setAttribute("aria-pressed", String(id === initial));
      chip.addEventListener("click", () => {
        orb.setAttribute(attr, id);
        container.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", "false"));
        chip.setAttribute("aria-pressed", "true");
      });
      container.appendChild(chip);
    }
  }
  buildChips(skinChips, SKIN_ORDER, SKINS, "skin", orb.getAttribute("skin") || "orbit");
  buildChips(paletteChips, PALETTE_ORDER, PALETTES, "palette", orb.getAttribute("palette") || "ember");
  controls.hidden = false;
})();

/* ── Soul voice previews ─────────────────────────────── */
// The shipped app speaks with the realtime model's voices (Leda, Charon, …).
// On the page we stand in with the browser's speech engine: each soul gets a
// distinct local voice where the platform offers enough of them, plus the
// soul's own pitch/rate so the personalities read even on a single voice.
(() => {
  const synth = window.speechSynthesis;
  const souls = Array.from(document.querySelectorAll(".soul"));
  const note = document.getElementById("souls-note");

  if (!synth || typeof SpeechSynthesisUtterance === "undefined") {
    souls.forEach((s) => { const b = s.querySelector(".play-btn"); if (b) b.disabled = true; });
    if (note) note.textContent = "VOICE PREVIEWS NEED A BROWSER WITH SPEECH SYNTHESIS — THE SHIPPED VOICES ARE THE REALTIME MODEL'S (LEDA, CHARON, AOEDE, KORE, FENRIR, PUCK).";
    return;
  }

  // Low-quality novelty voices (mostly macOS) that would sabotage the preview.
  const NOVELTY = /albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|grandma|grandpa|rocko|shelley|eddy|flo\b|reed|sandy|junior|ralph|kathy|fred/i;

  // Per-soul preferred stand-in voices, by common platform voice names.
  const HINT_PREFS = {
    "female":      [/samantha/i, /\bzira\b/i, /\baria\b/i, /jenny/i, /\bava\b/i, /google us english/i],
    "male-uk":     [/daniel/i, /george/i, /\bryan\b/i, /google uk english male/i, /sonia/i],
    "female-low":  [/moira/i, /tessa/i, /serena/i, /libby/i, /catherine/i],
    "male-us":     [/\balex\b/i, /david/i, /\bguy\b/i, /christopher/i, /google us english/i],
    "female-warm": [/allison/i, /susan/i, /natasha/i, /karen/i, /michelle/i],
    "impish":      [/\bmark\b/i, /\bsam\b/i, /google uk english male/i, /maged/i],
  };

  let assigned = new Map(); // soul element -> SpeechSynthesisVoice

  function rankedVoices() {
    const all = synth.getVoices();
    let en = all.filter((v) => /^en[-_]?/i.test(v.lang) && !NOVELTY.test(v.name));
    if (!en.length) en = all.filter((v) => !NOVELTY.test(v.name));
    const score = (v) =>
      (/natural|neural|premium|enhanced/i.test(v.name) ? 8 : 0) +
      (/google|microsoft/i.test(v.name) ? 4 : 0) +
      (v.default ? 2 : 0) +
      (v.localService ? 1 : 0);
    return en.sort((a, b) => score(b) - score(a));
  }

  function assignVoices() {
    const pool = rankedVoices();
    assigned = new Map();
    if (!pool.length) return;
    const used = new Set();
    for (const soul of souls) {
      const prefs = HINT_PREFS[soul.dataset.hint] || [];
      let pick = null;
      for (const re of prefs) {
        pick = pool.find((v) => re.test(v.name) && !used.has(v)) || null;
        if (pick) break;
      }
      if (!pick) pick = pool.find((v) => !used.has(v)) || pool[0];
      used.add(pick);
      assigned.set(soul, pick);
    }
  }
  assignVoices();
  if ("onvoiceschanged" in synth) synth.addEventListener("voiceschanged", assignVoices);

  let current = null; // { soul, btn, utterance }

  function stop() {
    if (current) {
      current.btn.textContent = "▶ HEAR IT";
      current.btn.classList.remove("playing");
      current = null;
    }
    synth.cancel();
  }

  for (const soul of souls) {
    const btn = soul.querySelector(".play-btn");
    if (!btn) continue;
    btn.addEventListener("click", () => {
      if (current && current.soul === soul) { stop(); return; }
      stop();

      const u = new SpeechSynthesisUtterance(soul.dataset.line || "");
      const voice = assigned.get(soul);
      if (voice) { u.voice = voice; u.lang = voice.lang; }
      u.pitch = parseFloat(soul.dataset.pitch) || 1;
      u.rate = parseFloat(soul.dataset.rate) || 1;

      const mine = { soul, btn, utterance: u }; // keep a ref — Chrome GCs live utterances
      const done = () => { if (current === mine) { btn.textContent = "▶ HEAR IT"; btn.classList.remove("playing"); current = null; } };
      u.addEventListener("end", done);
      u.addEventListener("error", (e) => {
        done();
        if (note && e.error !== "interrupted" && e.error !== "canceled" && !synth.getVoices().length) {
          note.textContent = "NO SPEECH-SYNTHESIS VOICES ARE INSTALLED IN THIS BROWSER, SO PREVIEWS STAY SILENT — THE SHIPPED VOICES ARE THE REALTIME MODEL'S (LEDA, CHARON, AOEDE, KORE, FENRIR, PUCK).";
        }
      });

      current = mine;
      btn.textContent = "■ STOP";
      btn.classList.add("playing");
      synth.speak(u);
    });
  }

  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });
  window.addEventListener("pagehide", stop);
})();
