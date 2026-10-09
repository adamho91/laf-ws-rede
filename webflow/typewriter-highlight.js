/* Phrase scramble only for product tabs and shared Enterprise customer transitions. */
(function () {
  'use strict';
  if (window.FalTypewriterHighlight || document.documentElement.classList.contains('wf-design-mode')) return;
  const chars = '.tab-pane-content-1 .tab-click-type-char,.tab-pane-content-2 .tab-click-type-char,.tab-pane-content-3 .tab-click-type-char,.customers-tab .customer-type-char';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const groups = new WeakMap(), live = new Set();
  const metrics = document.createElement('canvas').getContext('2d');
  const slots = new WeakMap();
  const style = document.createElement('style');
  style.id = 'fal-typewriter-highlight-style';
  style.textContent = `
    .fal-tw-ink { background-color:#000; color:#fff; margin:0; padding:0; box-shadow:none; }
    .fal-tw-scramble { position:relative; opacity:1!important; color:transparent!important; }
    .fal-tw-scramble::before { content:attr(data-fal-tw-glyph); position:absolute; inset:0; color:#fff; text-align:inherit; pointer-events:none; transform:scaleX(var(--fal-tw-scale,1)); transform-origin:left center; }
    .fal-tw-ink.fal-tw-clear { background-color:transparent; color:var(--fal-tw-color); transition:background-color 120ms ease-out,color 120ms ease-out; }
    @media(prefers-reduced-motion:reduce) { .fal-tw-ink { background-color:transparent; color:var(--fal-tw-color); transition:none; } }
  `;
  document.head.appendChild(style);

  // Permute only letters already present in the phrase; spaces and punctuation stay put.
  function shuffle(text) {
    const output = Array.from(text), indices = [];
    output.forEach((letter, i) => { if (/\p{L}/u.test(letter)) indices.push(i); });
    const pool = indices.map(i => output[i]);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    if (pool.join('') === indices.map(i => output[i]).join('') && new Set(pool).size > 1) pool.push(pool.shift());
    indices.forEach((index, i) => { output[index] = pool[i]; });
    return output.join('');
  }
  function clear(state) {
    clearTimeout(state.timer);
    state.nodes.forEach(node => {
      node.classList.remove('fal-tw-ink', 'fal-tw-clear', 'fal-tw-scramble');
      node.style.removeProperty('--fal-tw-color');
      node.style.removeProperty('--fal-tw-scale');
      slots.delete(node);
      node.removeAttribute('data-fal-tw-glyph');
    });
    state.nodes.clear();
    state.settling = false;
  }
  function glyph(node, value) {
    node.dataset.falTwGlyph = value;
    if (!node.matches(chars)) return;
    let slot = slots.get(node);
    if (!slot) {
      const css = getComputedStyle(node);
      slot = { width:node.getBoundingClientRect().width, font:css.font || `${css.fontWeight} ${css.fontSize} ${css.fontFamily}`, spacing:parseFloat(css.letterSpacing) || 0 };
      slots.set(node, slot);
    }
    metrics.font = slot.font;
    const width = metrics.measureText(value).width + slot.spacing;
    node.style.setProperty('--fal-tw-scale', String(width > 0 ? Math.min(1, slot.width / width) : 1));
  }
  function ink(state, node, value) {
    if (!state.nodes.has(node)) {
      node.style.setProperty('--fal-tw-color', getComputedStyle(node).color);
      node.classList.add('fal-tw-ink');
      state.nodes.add(node);
    }
    glyph(node, value);
    node.classList.add('fal-tw-scramble');
  }
  function settle(state) {
    if (state.settling || !state.nodes.size) return;
    state.settling = true;
    state.nodes.forEach(node => {
      node.classList.remove('fal-tw-scramble');
      node.classList.add('fal-tw-clear');
    });
    state.timer = setTimeout(() => clear(state), 140);
  }
  function bind(root) {
    if (groups.has(root)) return;
    const state = { root, nodes:new Set(), letters:[], timer:0, settling:false, started:false, done:false, resolved:0 };
    groups.set(root, state);
    live.add(state);
    function update() {
      if (!root.isConnected || motion.matches || document.hidden) { clear(state); return; }
      const letters = [...root.querySelectorAll(chars)];
      if (!letters.length) { clear(state); state.letters = []; return; }
      if (letters.length !== state.letters.length || letters.some((node, i) => node !== state.letters[i])) {
        clear(state);
        state.letters = letters;
        state.started = state.done = false;
        state.resolved = 0;
      }
      const revealed = letters.filter(node => node.style.opacity === '1').length;
      if (state.done || !revealed) return;
      if (!state.started) {
        state.started = true;
        const scrambled = Array.from(shuffle(letters.map(node => node.textContent).join('')));
        // Keep original glyphs in flow and scramble only their visual overlays: no rewrap.
        letters.forEach((node, i) => ink(state, node, scrambled[i]));
        state.resolved = revealed;
        if (revealed === letters.length) { state.done = true; state.timer = setTimeout(() => settle(state), 100); }
        return;
      }
      if (revealed <= state.resolved) return;
      state.resolved = revealed;
      letters.forEach(node => { if (node.style.opacity === '1' && node.dataset.falTwGlyph !== node.textContent) glyph(node, node.textContent); });
      if (revealed === letters.length) { state.done = true; settle(state); }
    }
    state.observer = new MutationObserver(update);
    state.observer.observe(root, { childList:true, subtree:true, attributes:true, attributeFilter:['style'] });
    update();
  }
  function discover(node) {
    if (node.nodeType !== 1) return;
    const found = [];
    if (node.matches(chars)) found.push(node);
    found.push(...node.querySelectorAll(chars));
    found.forEach(el => {
      const root = el.closest('.tab-heading');
      if (root) bind(root);
    });
  }
  const discovery = new MutationObserver(records => {
    records.forEach(r => r.addedNodes.forEach(discover));
    live.forEach(state => {
      if (!state.root.isConnected) {
        clear(state);
        state.observer.disconnect();
        groups.delete(state.root);
        live.delete(state);
      }
    });
  });
  function reset() { live.forEach(clear); }
  function init() {
    discover(document.body);
    discovery.observe(document.body, { childList:true, subtree:true });
  }
  motion.addEventListener('change', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  window.FalTypewriterHighlight = { refresh:() => discover(document.body) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
