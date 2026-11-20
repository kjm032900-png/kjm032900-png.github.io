/* Model-level official catalogue and colour guide. No per-trim share UI.
   Historic share.html links and vehicle ID data remain available unchanged. */
(function () {
  'use strict';

  const DEFAULT_CATALOGUE = 'https://www.mercedes-benz.co.kr/passengercars/models/catalog.html';
  const state = { data: null, catalogues: null, error: false };
  const $ = id => document.getElementById(id);

  function catalogueFor(row) {
    const registry = state.catalogues || {};
    const key = (registry.trimCatalogOverrides || {})[row.trim] ||
      (registry.familyToCatalog || {})[row.family];
    const entry = (registry.catalogs || {})[key] || {};
    let pdf = null;
    try {
      if (typeof entry.url === 'string') {
        const url = new URL(entry.url);
        if (url.protocol === 'https:' && url.hostname === 'www.mercedes-benz.co.kr' &&
            /\.pdf$/i.test(url.pathname)) pdf = url.href;
      }
    } catch (error) { /* Invalid catalogue URL: use the official catalogue index. */ }
    return {
      url: pdf || DEFAULT_CATALOGUE,
      pdf: Boolean(pdf),
      title: entry.title || row.family,
      edition: pdf ? (entry.edition || '') : ''
    };
  }

  async function copyUrl(url) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try { await navigator.clipboard.writeText(url); return true; }
      catch (error) { /* Use the selection fallback where clipboard access is restricted. */ }
    }
    const input = document.createElement('textarea');
    input.value = url;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.focus();
    input.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch (error) { /* Unsupported browser. */ }
    input.remove();
    if (!copied) window.prompt('아래 링크를 복사해 카카오톡으로 보내 주세요.', url);
    return copied;
  }

  // Deduplicate by the actual resolved PDF URL. AMG CLE and AMG GT keep two
  // different catalogues; many regular models keep one despite many trims.
  function createCataloguePanel(rows) {
    const unique = new Map();
    for (const row of rows) {
      const doc = catalogueFor(row);
      if (!unique.has(doc.url)) unique.set(doc.url, { ...doc, trims: [] });
      unique.get(doc.url).trims.push(row.trim);
    }
    const panel = document.createElement('section');
    panel.className = 'share-catalogue-panel';
    panel.setAttribute('aria-label', '차종별 공식 카탈로그');

    const caption = document.createElement('p');
    caption.className = 'share-catalogue-summary';
    caption.textContent = state.error
      ? '카탈로그 연결 정보를 불러오지 못했습니다. 아래 공식 목록에서 확인해 주세요.'
      : unique.size > 1
        ? '차체 유형에 따라 다른 카탈로그를 제공합니다.'
        : '트림에 관계없이 공통 카탈로그를 한 번만 열거나 저장하세요.';
    panel.appendChild(caption);

    const list = document.createElement('div');
    list.className = 'share-catalogue-list';
    for (const doc of unique.values()) {
      const entry = document.createElement('article');
      entry.className = 'share-catalogue-entry';
      const heading = document.createElement('h4');
      heading.textContent = doc.title;
      entry.appendChild(heading);

      const meta = document.createElement('p');
      meta.className = 'share-catalogue-meta';
      meta.textContent = (doc.pdf ? '공식 PDF' : '공식 카탈로그 목록') +
        ' · ' + doc.trims.length + '개 트림' +
        (doc.trims.length > 1 ? ' 공통' : '') +
        (doc.edition ? ' · ' + doc.edition : '');
      entry.appendChild(meta);

      if (unique.size > 1) {
        const apply = document.createElement('p');
        apply.className = 'share-catalogue-applies';
        apply.textContent = '해당 트림: ' + doc.trims.join(', ');
        entry.appendChild(apply);
      }
      const actions = document.createElement('div');
      actions.className = 'share-catalogue-actions';
      const open = document.createElement('a');
      open.className = 'share-catalogue-open';
      open.href = doc.url;
      open.target = '_blank';
      open.rel = 'noopener noreferrer';
      open.textContent = doc.pdf ? '공식 카탈로그 보기·다운로드 ↗' : '공식 카탈로그 목록 보기 ↗';
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.dataset.copyCatalogue = doc.url;
      copy.textContent = doc.pdf ? '카탈로그 링크 복사' : '목록 링크 복사';
      actions.append(open, copy);
      entry.appendChild(actions);
      if (!doc.pdf) {
        const note = document.createElement('p');
        note.className = 'share-action-note';
        note.textContent = '현재 직접 연결된 개별 PDF가 없어 공식 카탈로그 목록으로 안내합니다.';
        entry.appendChild(note);
      }
      list.appendChild(entry);
    }
    panel.appendChild(list);
    const feedback = document.createElement('p');
    feedback.id = 'catalogCopyFeedback';
    feedback.className = 'catalog-copy-feedback';
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    panel.appendChild(feedback);
    return panel;
  }

  function decorateDialog(family, rows) {
    const holder = $('dialogCatalogues');
    if (!holder) return;
    if (!state.catalogues && !state.error) {
      holder.textContent = '공식 카탈로그를 불러오는 중입니다.';
      return;
    }
    holder.replaceChildren(createCataloguePanel(rows));
  }

  function init(data) {
    state.data = data;
    const holder = $('dialogCatalogues');
    if (holder) {
      holder.addEventListener('click', async (event) => {
        const button = event.target.closest('button[data-copy-catalogue]');
        if (!button) return;
        const copied = await copyUrl(button.dataset.copyCatalogue);
        const feedback = $('catalogCopyFeedback');
        if (feedback) feedback.textContent = copied
          ? '카탈로그 링크가 복사되었습니다. 카카오톡에 붙여넣어 보내세요.'
          : '복사창에서 카탈로그 링크를 확인해 주세요.';
      });
    }
    fetch('./catalog-links.json', { cache: 'no-cache' })
      .then(response => { if (!response.ok) throw Error('Catalogue HTTP ' + response.status); return response.json(); })
      .then(registry => {
        if (!registry || registry.version !== 1 || !registry.catalogs || !registry.familyToCatalog)
          throw Error('Invalid catalogue registry');
        state.catalogues = registry;
      })
      .catch(error => {
        state.error = true;
        console.warn('Catalogue registry unavailable: showing the official catalogue index.', error);
      })
      .finally(() => {
        const dlg = $('modelDialog');
        if (dlg && dlg.open && state.data) {
          const family = $('dialogTitle').textContent;
          decorateDialog(family, state.data.models.filter(row => row.family === family));
        }
      });
  }

  // Kept for the existing homepage card-rendering hook.
  function afterRender() {}
  window.VehicleShareUI = { init, afterRender, decorateDialog };
})();
