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
})();
