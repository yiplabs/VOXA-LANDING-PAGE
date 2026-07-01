// <voxa-orb> — mounts the REAL Voxa canvas renderer (orb.js) as a custom element.
// Tap cycles the voice state like the app: idle -> listening -> speaking -> idle.
// Attributes: skin, palette, state (all live-updatable).
import { createOrb } from "./orb.js";

class VoxaOrb extends HTMLElement {
  static get observedAttributes() { return ["skin", "palette", "state"]; }

  connectedCallback() {
    if (this._init) return;
    this._init = true;
    this.style.display = "block";
    this.style.cursor = "pointer";
    this.style.width = "100%";
    this.style.height = "100%";
    this.style.overflow = "hidden";
    const c = document.createElement("canvas");
    c.style.cssText = "width:100%;height:100%;display:block";
    this.appendChild(c);
    this._orb = createOrb(c);
    this._state = this.getAttribute("state") || "idle";
    this._apply();

    this.addEventListener("click", () => {
      const order = ["idle", "listening", "speaking"];
      this._state = order[(order.indexOf(this._state) + 1) % order.length];
      this._orb.setOrbState(this._state);
      this.dispatchEvent(new CustomEvent("orbstate", { detail: this._state, bubbles: true }));
    });

    // Synthetic voice level while listening/speaking (the app feeds real audio here).
    const tick = (now) => {
      if (!this.isConnected) return;
      requestAnimationFrame(tick);
      if (this._state === "listening" || this._state === "speaking") {
        const t = now / 1000;
        const lvl = Math.abs(0.4 + 0.32 * Math.sin(t * 3.1) * Math.sin(t * 7.7) + 0.2 * Math.sin(t * 13.3 + 1.7));
        this._orb.setAudioLevel(Math.min(1, lvl));
      } else {
        this._orb.setAudioLevel(0);
      }
    };
    requestAnimationFrame(tick);
  }

  attributeChangedCallback() { if (this._init) this._apply(); }

  _apply() {
    if (!this._orb) return;
    const skin = this.getAttribute("skin");
    const pal = this.getAttribute("palette");
    const st = this.getAttribute("state");
    if (skin) this._orb.setSkin(skin);
    if (pal) this._orb.setPalette(pal);
    if (st && st !== this._state) { this._state = st; this._orb.setOrbState(st); }
  }
}

customElements.define("voxa-orb", VoxaOrb);
