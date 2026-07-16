(function () {
  const deck = document.querySelector('.deck');
  const slides = Array.from(deck.querySelectorAll('.slide'));
  const dotsWrap = document.getElementById('dots');
  const prog = document.getElementById('prog');
  const curEl = document.getElementById('cur');
  const hint = document.getElementById('hint');
  let current = 0;

  // build dots
  slides.forEach((s, i) => {
    const b = document.createElement('button');
    b.setAttribute('aria-label', 'Go to slide ' + (i + 1) + (s.dataset.label ? ' — ' + s.dataset.label : ''));
    b.addEventListener('click', () => go(i));
    dotsWrap.appendChild(b);
  });
  const dots = Array.from(dotsWrap.children);

  function setActive(i) {
    if (i === current) return;
    const prevSlide = slides[current];
    current = i;
    slides.forEach((s, n) => s.classList.toggle('is-active', n === i));
    dots.forEach((d, n) => d.classList.toggle('on', n === i));
    curEl.textContent = String(i + 1).padStart(2, '0');
    prog.style.width = ((i + 1) / slides.length) * 100 + '%';
    // adapt fixed chrome to dark (teal) grounds; keep the cover uncluttered
    const s = slides[i];
    const dark = s.classList.contains('blue') || s.classList.contains('cover');
    deck.classList.toggle('dark-chrome', dark);
    deck.classList.toggle('on-cover', s.classList.contains('cover'));
    // leaving the map slide: stop the "animate all" loop so it doesn't run off-screen
    if (prevSlide && prevSlide.classList.contains('map-slide') && prevSlide !== s) {
      const svg = prevSlide.querySelector('#mapSvg');
      const playBtn = prevSlide.querySelector('#mapPlay');
      if (svg) svg.classList.remove('playing-all');
      if (playBtn) playBtn.innerHTML = '&#9654; Animate all flows';
    }
  }

  // observe which slide fills the viewport
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && e.intersectionRatio >= 0.55) {
          setActive(slides.indexOf(e.target));
        }
      });
    },
    { root: deck, threshold: [0.55] }
  );
  slides.forEach((s) => io.observe(s));

  function go(i) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    slides[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // keyboard
  window.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(current + 1); }
    else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); go(current - 1); }
    else if (e.key === 'Home') { e.preventDefault(); go(0); }
    else if (e.key === 'End') { e.preventDefault(); go(slides.length - 1); }
    else if (e.key === 'f' || e.key === 'F') {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.();
    }
  });

  // hide the hint after first navigation / a few seconds
  let hidden = false;
  const hideHint = () => { if (!hidden) { hidden = true; hint.classList.add('hide'); } };
  deck.addEventListener('scroll', () => { if (current > 0) hideHint(); }, { passive: true });
  setTimeout(hideHint, 6000);

  // init
  slides[0].classList.add('is-active');
  dots[0].classList.add('on');
  prog.style.width = (1 / slides.length) * 100 + '%';
  const first = slides[0];
  if (first.classList.contains('blue') || first.classList.contains('cover')) deck.classList.add('dark-chrome');
  if (first.classList.contains('cover')) deck.classList.add('on-cover');

  // download-as-PDF: the browser's native print pipeline, styled by the @media print rules in deck.css
  document.getElementById('pdfBtn')?.addEventListener('click', () => window.print());

  // ---- trade-origins map: click-to-inspect + size-by toggle + animate-all ----
  const mapSvg = document.getElementById('mapSvg');
  if (mapSvg) {
    const mapPanel = document.getElementById('mapPanel');
    const mapScale = document.getElementById('mapScale');
    const mapDataEl = document.getElementById('mapData');
    const mapData = mapDataEl ? JSON.parse(mapDataEl.textContent) : [];
    const byCode = Object.fromEntries(mapData.map((p) => [p.code, p]));

    function renderPanel(p) {
      if (!mapPanel || !p) return;
      mapPanel.innerHTML =
        '<div class="map-panel-code">' + p.code + '</div>' +
        '<h3 class="map-panel-name">' + p.name + '</h3>' +
        '<div class="map-panel-stat"><span class="mp-v">€' + p.valueBn + ' bn</span>' +
        '<span class="mp-l">extra-EU manufacturing imports, 2023</span></div>' +
        '<div class="map-panel-stat"><span class="mp-v">' + p.pctOfExtra + '%</span>' +
        '<span class="mp-l">of total extra-EU manufacturing imports</span></div>' +
        '<div class="map-panel-stat"><span class="mp-v">' + p.ratioPct + '%</span>' +
        '<span class="mp-l">of ' + p.name + '’s own GDP (World Bank, latest est.)</span></div>';
    }

    function selectCountry(code) {
      const p = byCode[code];
      if (!p) return;
      mapSvg.querySelectorAll('.node-g.selected, .arc.selected').forEach((el) => el.classList.remove('selected'));
      const node = mapSvg.querySelector('.node-g[data-code="' + code + '"]');
      const arc = mapSvg.querySelector('.arc[data-code="' + code + '"]');
      if (node) node.classList.add('selected');
      if (arc) arc.classList.add('selected');
      const dot = mapSvg.querySelector('.flow-dot[data-code="' + code + '"]');
      if (dot) {
        dot.classList.remove('playing-one');
        void dot.getBBox(); // restart the one-shot animation
        dot.classList.add('playing-one');
      }
      renderPanel(p);
    }

    mapSvg.querySelectorAll('.node-g, .arc').forEach((el) => {
      el.addEventListener('click', () => selectCountry(el.dataset.code));
    });
    mapSvg.querySelectorAll('.node-g').forEach((el) => {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectCountry(el.dataset.code); }
      });
    });

    const mapSlideEl = mapSvg.closest('.map-slide');
    const segBtns = mapSlideEl ? Array.from(mapSlideEl.querySelectorAll('.seg-btn')) : [];
    segBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        segBtns.forEach((b) => b.classList.remove('on'));
        btn.classList.add('on');
        const gdpMode = btn.dataset.mode === 'gdp';
        mapSvg.querySelectorAll('.node').forEach((n) => {
          n.setAttribute('r', n.dataset[gdpMode ? 'rGdp' : 'rValue']);
        });
        mapSvg.querySelectorAll('.arc').forEach((a) => {
          a.setAttribute('stroke-width', a.dataset[gdpMode ? 'swGdp' : 'swValue']);
        });
        if (mapScale) mapScale.classList.toggle('mode-gdp', gdpMode);
      });
    });

    const playBtn = document.getElementById('mapPlay');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        const playing = mapSvg.classList.toggle('playing-all');
        playBtn.innerHTML = playing ? '&#9632; Stop' : '&#9654; Animate all flows';
      });
    }
  }
})();
