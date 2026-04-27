/* ──────────────────────────────────────────────────────────────
 *  Mermaid click-to-zoom
 *  ------------------------------------------------------------
 *  The site uses glightbox for <img> figures, but mermaid
 *  diagrams render as inline <svg> after page load and are
 *  invisible to glightbox. This adds a small zoom affordance to
 *  every mermaid block: click anywhere on the diagram to open it
 *  full-viewport in a modal with wheel-zoom + drag-pan.
 * ────────────────────────────────────────────────────────────── */
(function () {
  const MODAL_ID = "mh-mermaid-modal";

  function ensureModal() {
    let modal = document.getElementById(MODAL_ID);
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.className = "mh-mermaid-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <button type="button" class="mh-mermaid-modal__close" aria-label="Close">×</button>
      <div class="mh-mermaid-modal__stage">
        <div class="mh-mermaid-modal__canvas"></div>
      </div>
      <div class="mh-mermaid-modal__hint">scroll to zoom · drag to pan · esc to close</div>
    `;
    document.body.appendChild(modal);

    const canvas = modal.querySelector(".mh-mermaid-modal__canvas");
    const stage = modal.querySelector(".mh-mermaid-modal__stage");
    const close = () => closeModal(modal);

    modal.querySelector(".mh-mermaid-modal__close").addEventListener("click", close);
    modal.addEventListener("click", (e) => {
      if (e.target === modal || e.target === stage) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("is-open")) close();
    });

    /* wheel-zoom + drag-pan on the canvas */
    let scale = 1, tx = 0, ty = 0, dragging = false, lastX = 0, lastY = 0;
    const apply = () => {
      canvas.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    };
    modal._reset = () => { scale = 1; tx = 0; ty = 0; apply(); };

    stage.addEventListener("wheel", (e) => {
      e.preventDefault();
      const delta = -Math.sign(e.deltaY) * 0.15;
      const next = Math.min(6, Math.max(0.3, scale * (1 + delta)));
      scale = next;
      apply();
    }, { passive: false });

    stage.addEventListener("mousedown", (e) => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      stage.classList.add("is-dragging");
    });
    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      tx += e.clientX - lastX;
      ty += e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      apply();
    });
    window.addEventListener("mouseup", () => {
      dragging = false;
      stage.classList.remove("is-dragging");
    });

    return modal;
  }

  function openModal(svgNode) {
    const modal = ensureModal();
    const canvas = modal.querySelector(".mh-mermaid-modal__canvas");
    canvas.innerHTML = "";
    const clone = svgNode.cloneNode(true);
    clone.removeAttribute("style");
    clone.setAttribute("width", "100%");
    clone.setAttribute("height", "100%");
    clone.style.maxWidth = "100%";
    clone.style.maxHeight = "100%";
    canvas.appendChild(clone);
    modal._reset && modal._reset();
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("mh-mermaid-modal-lock");
  }

  function closeModal(modal) {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("mh-mermaid-modal-lock");
  }

  function wireUp(block) {
    if (block.__mhZoomWired) return;
    const svg = block.querySelector("svg");
    if (!svg) return;
    block.__mhZoomWired = true;
    block.classList.add("mh-mermaid-zoomable");
    block.setAttribute("tabindex", "0");
    block.setAttribute("role", "button");
    block.setAttribute("aria-label", "Open diagram — click to zoom");
    block.addEventListener("click", () => openModal(svg));
    block.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openModal(svg);
      }
    });
  }

  function scan() {
    document.querySelectorAll(".mermaid").forEach(wireUp);
  }

  /* Mermaid renders asynchronously; observe until svg shows up. */
  const observer = new MutationObserver(() => scan());
  function start() {
    scan();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
