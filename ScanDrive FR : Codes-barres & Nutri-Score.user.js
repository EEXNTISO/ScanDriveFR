// ==UserScript==
// @name         ScanDrive FR : Codes-barres & Nutri-Score
// @namespace    https://github.com/EEXNTISO/
// @version      1.0.0
// @description  Affiche l'EAN et le code-barres de manière non-intrusive sur les fiches produits des supermarchés en ligne (Drives).
// @author       EEXNTISO
// @license      MIT
// @match        *://*.leclercdrive.fr/*fiche-produits*.aspx*
// @match        *://fd2-courses.leclercdrive.fr/*fiche-produits*.aspx*
// @match        *://courses.leclercdrive.fr/*fiche-produits*.aspx*
// @match        *://www.carrefour.fr/p/*
// @match        *://www.coursesu.com/p/*
// @match        *://www.intermarche.com/produit/*
// @match        *://www.auchan.fr/*
// @match        *://www.chronodrive.com/*
// @icon         data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🛒</text></svg>
// @run-at       document-end
// @grant        GM_addStyle
// @require      https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js
// @supportURL   https://github.com/EEXNTISO/ELeclerc-Drive-EAN-Helper/issues
// @homepageURL  https://github.com/EEXNTISO/ELeclerc-Drive-EAN-Helper
// ==/UserScript==

(function () {
  'use strict';

  // Styles portables, non intrusifs
  GM_addStyle(`
    .tm-ean-box {
      position: fixed !important; right: 20px !important; bottom: 120px !important; z-index: 2147483647 !important;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      background: #ffffff; color: #222; box-shadow: 0 8px 24px rgba(0,0,0,.16);
      border: 1px solid rgba(0,0,0,.08); border-radius: 10px; width: 280px; max-width: 90vw;
      overflow: hidden; transition: transform 0.2s ease, opacity 0.2s ease;
    }
    .tm-ean-header {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding: 10px 12px; background: #f6f7f9; border-bottom: 1px solid rgba(0,0,0,.06);
      cursor: grab; user-select: none;
    }
    .tm-ean-header:active { cursor: grabbing; }
    .tm-ean-title { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tm-ean-actions { display: flex; gap: 8px; }
    .tm-btn {
      appearance: none; border: 1px solid rgba(0,0,0,.12); background: #fff; color: #222;
      padding: 6px 8px; border-radius: 8px; font-size: 12px; cursor: pointer; transition: background 0.15s ease;
    }
    .tm-btn:hover { background: #f0f2f5; }
    .tm-ean-body { padding: 10px 12px; display: grid; gap: 8px; }
    .tm-ean-line { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
    .tm-ean-code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 14px; letter-spacing: .6px; }
    .tm-barcode-wrap { display: grid; place-items: center; padding: 6px 0 4px; }
    .tm-scores { display: flex; justify-content: center; gap: 10px; padding: 4px 0 8px; border-top: 1px solid rgba(0,0,0,.04); }
    .tm-score-img { height: 32px; border-radius: 4px; display: none; }
    .tm-muted { color: #666; font-size: 12px; }
    @media (max-width: 480px) {
      .tm-ean-box { right: 12px !important; bottom: 100px !important; width: 220px; border-radius: 9px; }
      .tm-ean-title { font-size: 13px; }
      .tm-ean-code { font-size: 13px; }
    }
    @media (prefers-color-scheme: dark) {
      .tm-ean-box { background: #16181c; color: #e6e6e6; border-color: rgba(255,255,255,.08); }
      .tm-ean-header { background: #1f232a; border-bottom-color: rgba(255,255,255,.06); }
      .tm-btn { background: #1b1f26; color: #e6e6e6; border-color: rgba(255,255,255,.12); }
      .tm-btn:hover { background: #222834; }
      .tm-muted { color: #9aa3ad; }
    }
  `);

  // --- STRATEGIES D'EXTRACTION ---
  // Configuration modulaire pour faciliter l'ajout de nouveaux sites
  const STRATEGIES = [
    {
      name: 'URL (Carrefour, Intermarché)',
      match: () => /carrefour\.fr|intermarche\.com/.test(window.location.hostname),
      extract: () => {
        const m = window.location.pathname.match(/(?:-|\/)(\d{8,14})\/?$/);
        return m ? m[1] : null;
      }
    },
    {
      name: 'Metadata (Courses U, Chronodrive)',
      match: () => /coursesu\.com|chronodrive\.com/.test(window.location.hostname),
      extract: () => {
        const gtinEl = document.querySelector('[itemprop="gtin13"]');
        if (gtinEl?.getAttribute('content')) return gtinEl.getAttribute('content');

        const dataEanEl = document.querySelector('[data-ean]');
        if (dataEanEl) return dataEanEl.getAttribute('data-ean');

        const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const s of ldScripts) {
          const m = s.textContent.match(/"gtin13"\s*:\s*"(\d+)"/);
          if (m && m[1]) return m[1];
        }
        return null;
      }
    },
    {
      name: 'DOM Text (Auchan)',
      match: () => /auchan\.fr/.test(window.location.hostname),
      extract: () => {
        const m = document.body?.textContent?.match(/EAN[^\d]*\d+[^\d]+(\d{8,14})/i);
        return m ? m[1] : null;
      }
    },
    {
      name: 'Script State (Leclerc)',
      match: () => /leclercdrive\.fr/.test(window.location.hostname),
      extract: () => {
        const scripts = document.querySelectorAll('script');
        for (const s of scripts) {
          const text = s.textContent;
          if (text && text.includes('sCodeEAN')) {
            // Supporte les formats "sCodeEAN": "..." et sCodeEAN = "..."
            const m = text.match(/sCodeEAN\s*[:=]\s*['"](\d+)['"]/);
            if (m && m[1]) return m[1];
          }
        }
        return null;
      }
    }
  ];

  function extractEAN() {
    // 1. Essayer les stratégies spécifiques par site
    for (const strategy of STRATEGIES) {
      if (strategy.match()) {
        const ean = strategy.extract();
        if (ean) return ean;
      }
    }

    // 2. Fallbacks globaux (recherche textuelle générique)
    const text = document.body?.textContent || '';
    const mText = text.match(/\bEAN\b\s*[:\-]?\s*(\d{8,14})/i);
    if (mText?.[1]) return mText[1];

    const html = document.body?.innerHTML || '';
    const mHtml = html.match(/EAN[^0-9]{0,10}(\d{8,14})/i);
    if (mHtml?.[1]) return mHtml[1];

    return null;
  }

  function isEAN13(str) { return /^\d{13}$/.test(str); }

  function updateResetVisibility(box) {
    const btn = box.querySelector('.tm-reset');
    if (btn) btn.style.display = localStorage.getItem('tm-ean-pos') ? 'inline-flex' : 'none';
  }

  function makeDraggable(box) {
    const header = box.querySelector('.tm-ean-header');
    let isDragging = false;
    let startPos = { x: 0, y: 0 };

    // Charger la position sauvegardée
    const saved = localStorage.getItem('tm-ean-pos');
    if (saved) {
      const pos = JSON.parse(saved);
      box.style.setProperty('left', pos.left, 'important');
      box.style.setProperty('top', pos.top, 'important');
      box.style.setProperty('bottom', 'auto', 'important');
      box.style.setProperty('right', 'auto', 'important');
      updateResetVisibility(box);
    }

    header.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.tm-btn')) return;
      isDragging = true;
      const rect = box.getBoundingClientRect();
      startPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      header.setPointerCapture(e.pointerId);
    });

    header.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      let x = e.clientX - startPos.x;
      let y = e.clientY - startPos.y;

      // Garder dans l'écran
      x = Math.max(0, Math.min(x, window.innerWidth - box.offsetWidth));
      y = Math.max(0, Math.min(y, window.innerHeight - box.offsetHeight));

      box.style.setProperty('left', x + 'px', 'important');
      box.style.setProperty('top', y + 'px', 'important');
      box.style.setProperty('bottom', 'auto', 'important');
      box.style.setProperty('right', 'auto', 'important');
    });

    header.addEventListener('pointerup', (e) => {
      isDragging = false;
      header.releasePointerCapture(e.pointerId);
      localStorage.setItem('tm-ean-pos', JSON.stringify({
        left: box.style.left,
        top: box.style.top
      }));
      updateResetVisibility(box);
    });
  }

  async function fetchOFFData(ean, box) {
    if (!ean || ean.length < 8) return;
    
    // Réinitialiser l'affichage des scores
    box.querySelectorAll('.tm-score-img').forEach(img => img.style.display = 'none');

    try {
      const resp = await fetch(`https://world.openfoodfacts.org/api/v2/product/${ean}.json?fields=nutriscore_grade,ecoscore_grade,nova_group`);
      const data = await resp.json();

      if (data.status === 1 && data.product) {
        const p = data.product;
        const setScore = (type, val) => {
          const img = box.querySelector(`.tm-${type}`);
          if (!img) return;
          
          // Validation stricte : Nutriscore/Ecoscore = a-e, Nova = 1-4
          const isValid = (type === 'nova') ? /^[1-4]$/.test(val) : /^[a-e]$/i.test(val);

          if (val && isValid) {
            let baseUrl = 'https://static.openfoodfacts.org/images/misc/';
            if (type === 'ecoscore') baseUrl = 'https://static.openfoodfacts.org/images/attributes/dist/';
            
            const fileName = (type === 'nova') ? `nova-group-${val}.svg` : `${type}-${val}.svg`;
            img.src = `${baseUrl}${fileName}`;
            img.style.display = 'block';
            // Sécurité : si l'image ne charge pas, on la cache
            img.onerror = () => { img.style.display = 'none'; };
          } else {
            img.style.display = 'none';
          }
        };
        setScore('nutriscore', p.nutriscore_grade);
        setScore('nova', p.nova_group);
        setScore('ecoscore', p.ecoscore_grade);
      }
    } catch (e) { 
      // Erreur silencieuse en prod
    }
  }

  function render(ean) {
    let box = document.querySelector('.tm-ean-box');
    if (!box) {
      box = document.createElement('section');
      box.className = 'tm-ean-box';
      box.innerHTML = `
        <div class="tm-ean-header">
          <div class="tm-ean-title">EAN du produit</div>
          <div class="tm-ean-actions">
            <button class="tm-btn tm-reset" title="Réinitialiser la position" style="display:none">↺</button>
            <button class="tm-btn tm-copy" title="Copier l'EAN">Copier</button>
          </div>
        </div>
        <div class="tm-ean-body">
          <div class="tm-ean-line">
            <span class="tm-muted">EAN</span>
            <span class="tm-ean-code"></span>
          </div>
          <div class="tm-barcode-wrap">
            <svg class="tm-barcode-svg" width="260" height="90" role="img" aria-label="Code-barres"></svg>
          </div>
          <div class="tm-scores">
            <img class="tm-score-img tm-nutriscore" alt="Nutriscore">
            <img class="tm-score-img tm-nova" alt="Nova">
            <img class="tm-score-img tm-ecoscore" alt="Ecoscore">
          </div>
        </div>
      `;
      document.body.appendChild(box);
      makeDraggable(box);

      // Actions
      box.querySelector('.tm-copy').addEventListener('click', async (e) => {
        const code = box.querySelector('.tm-ean-code')?.textContent?.trim();
        try {
          await navigator.clipboard.writeText(code || '');
          const btn = e.target;
          const originalText = btn.textContent;
          btn.textContent = 'Copié !';
          setTimeout(() => btn.textContent = originalText, 1500);
        } catch { }
      });

      // Reset position
      box.querySelector('.tm-reset').addEventListener('click', (e) => {
        e.stopPropagation();
        localStorage.removeItem('tm-ean-pos');
        box.style.removeProperty('left');
        box.style.removeProperty('top');
        box.style.removeProperty('bottom');
        box.style.removeProperty('right');
        updateResetVisibility(box);
      });
    }

    // Update content
    box.querySelector('.tm-ean-code').textContent = ean || '—';
    // Fetch OFF data (will automatically handle refresh if EAN changed)
    fetchOFFData(ean, box);

    // Update barcode (SVG)
    const svg = box.querySelector('.tm-barcode-svg');
    if (ean) {
      try {
        const data = isEAN13(ean) ? ean : ean.padStart(13, '0');
        JsBarcode(svg, data, {
          format: 'ean13',
          lineColor: '#111',
          width: 2,
          height: 70,
          displayValue: true,
          fontSize: 14,
          margin: 6,
        });
      } catch (e) {
        // Fallback: hide preview if generation fails
        svg.replaceWith(svg.cloneNode(true));
      }
    }
  }

  // Handle SPA partial reloads with smart debouncing for fast initial load
  let debounceTimer;
  let currentEAN = null;

  function boot() {
    currentEAN = extractEAN();
    if (currentEAN) render(currentEAN);
  }

  const mo = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    // Délai très court (50ms) si l'EAN n'est pas encore trouvé, pour l'afficher instantanément dès qu'il apparaît.
    // Délai plus long (400ms) ensuite pour ne pas faire lagger le navigateur pendant la navigation.
    debounceTimer = setTimeout(() => {
      const fresh = extractEAN();
      if (fresh && fresh !== currentEAN) {
        currentEAN = fresh;
        render(fresh);
      }
    }, currentEAN ? 400 : 50);
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  // Boot
  boot();
})();
