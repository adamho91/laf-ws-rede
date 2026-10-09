/* Shared visual enhancement for existing Webflow typewriters. No layout or timing ownership. */
(function () {
  'use strict';
  if (window.FalTypewriterHighlight || document.documentElement.classList.contains('wf-design-mode')) return;
  const chars = '.tw-letter,.tab-click-type-char,.customer-type-char,.case-type-char,[data-typewriter-char]';
  const words = '.hero-typewriter-word,.home-worlds-label,[data-typewriter-word]';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const groups = new WeakMap(), live = new Set();
  const style = document.createElement('style');
  style.id = 'fal-typewriter-highlight-style';
  style.textContent = `
    .fal-tw-ink { background-color:#000; color:#fff; }
    .fal-tw-ink.fal-tw-clear { background-color:transparent; color:var(--fal-tw-color); transition:background-color 120ms ease-out,color 120ms ease-out; }
    @media(prefers-reduced-motion:reduce) { .fal-tw-ink { background-color:transparent; color:var(--fal-tw-color); transition:none; } }
  `;
  document.head.appendChild(style);

  function clear(state) {
    clearTimeout(state.timer);
    state.nodes.forEach(node => {
      node.classList.remove('fal-tw-ink', 'fal-tw-clear');
      node.style.removeProperty('--fal-tw-color');
    });
    state.nodes.clear();
    state.settling = false;
  }
  function ink(state, node) {
    if (state.nodes.has(node)) return;
    const color = getComputedStyle(node).color;
    node.style.setProperty('--fal-tw-color', color);
    node.classList.add('fal-tw-ink');
    state.nodes.add(node);
  }
  function settle(state) {
    if (state.settling || !state.nodes.size) return;
    state.settling = true;
    state.nodes.forEach(node => node.classList.add('fal-tw-clear'));
    state.timer = setTimeout(() => clear(state), 140);
  }
  function bind(root, word) {
    if (groups.has(root)) return;
    const state = { root, word, nodes:new Set(), seen:new WeakSet(), timer:0, settling:false };
    groups.set(root, state);
    live.add(state);
    function update(records) {
      if (!root.isConnected || motion.matches || document.hidden) { clear(state); return; }
      if (word) {
        if (!records || !records.some(r => r.type === 'childList' || r.type === 'characterData')) return;
        clearTimeout(state.timer);
        if (!root.textContent) { clear(state); return; }
        state.settling = false;
        ink(state, root);
        root.classList.remove('fal-tw-clear');
        state.timer = setTimeout(() => settle(state), 100);
        return;
      }
      const letters = [...root.querySelectorAll(chars)];
      if (!letters.length) { clear(state); return; }
      if (letters.some(node => !state.seen.has(node))) {
        clear(state);
        letters.forEach(node => state.seen.add(node));
      }
      // Only newly visible letters get ink; already settled text stays settled.
      letters.forEach(node => {
        if (node.style.opacity === '1' && !node.dataset.falTwShown) {
          node.dataset.falTwShown = 'true';
          ink(state, node);
        }
      });
      if (letters.every(node => node.style.opacity === '1')) settle(state);
    }
    state.observer = new MutationObserver(update);
    state.observer.observe(root, { childList:true, subtree:true, characterData:word, attributes:!word, attributeFilter:word ? undefined : ['style'] });
    update();
  }
  function discover(node) {
    if (node.nodeType !== 1) return;
    const found = [];
    if (node.matches(chars + ',' + words)) found.push(node);
    found.push(...node.querySelectorAll(chars + ',' + words));
    found.forEach(el => {
      const word = el.matches(words);
      const root = word ? el : el.closest('h1,h2,h3,h4,h5,h6,.tab-heading') || el.parentElement;
      if (root) bind(root, word);
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
