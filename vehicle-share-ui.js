/* Clear, one-tap catalogue & vehicle sharing for all visitors. No customer data in URLs. */
(function () {
  'use strict';

  const state = { data: null, catalogue: null, idsByKey: new Map(), selected: new Set(), ready: false };
  const keyOf = row => JSON.stringify([row.family, row.year, row.trim]);
  const $ = id => document.getElementById(id);
  const DEFAULT_CATALOGUE = 'https://www.mercedes-benz.co.kr/passengercars/models/catalog.html';

  function vehicleUrl(ids) {
    const url = new URL('./share.html', location.href);
    url.searchParams.set('ids', ids.join(','));
    return url.href;
  }

  function catalogueFor(row) {
    const data = state.catalogue || {};
    const key = (data.trimCatalogOverrides || {})[row.trim] || (data.familyToCatalog || {})[row.family];
    const group = (data.catalogs || {})[key] || {};
    let pdf = null;
    try {
      if (typeof group.url === 'string') {
        const url = new URL(group.url);
        if (url.protocol === 'https:' && url.hostname === 'www.mercedes-benz.co.kr' &&
            /\.pdf$/i.test(url.pathname)) pdf = url.href;
      }
    } catch (error) { /* Avoid unsafe or malformed links. */ }
    return { url: pdf || DEFAULT_CATALOGUE, pdf: Boolean(pdf),
      title: group.title || row.family, edition: pdf ? (group.edition || '') : '' };
  }

  function notify(message) {
    for (const id of ['shareToolbarFeedback', 'shareDialogFeedback', 'shareActionFeedback']) {
      const target = $(id);
      if (target) target.textContent = message;
    }
  }

  async function copyUrl(url) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try { await navigator.clipboard.writeText(url); return true; }
      catch (error) { /* Fall back for browsers without clipboard permission. */ }
    }
    const field = document.createElement('textarea');
    field.value = url;
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.focus();
    field.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch (error) { /* Manual fallback. */ }
    field.remove();
    if (!copied) window.prompt('아래 링크를 복사해 카카오톡으로 보내 주세요.', url);
    return copied;
  }

  async function shareOrCopy(url, title) {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url });
        notify('공유창을 열었습니다. 원하는 앱으로 전달해 주세요.');
        return;
      } catch (error) {
        if (error && error.name === 'AbortError') return; // User cancelled.
      }
    }
    const copied = await copyUrl(url);
    notify(copied ? '링크가 복사되었습니다. 카카오톡에 붙여넣어 보내세요.' : '공유창을 지원하지 않아 링크 복사 안내를 표시했습니다.');
  }

  function refresh() {
    if (!state.ready) return;
    const n = state.selected.size;
    const tray = $('shareToolbar');
    if (tray) tray.hidden = n === 0;
    const count = $('shareToolbarCount');
    if (count) count.textContent = '함께 보낼 차량 ' + n + '대';
    const dialogControls = $('shareDialogControls');
    if (dialogControls) dialogControls.hidden = n === 0;
    const dialogCount = $('shareDialogCount');
    if (dialogCount) dialogCount.textContent = n + '대 선택됨 · 링크 하나로 함께 보낼 수 있어요';
    document.querySelectorAll('#dialogTable input[data-share-id]').forEach(input => {
      input.checked = state.selected.has(input.dataset.shareId);
    });
  }

  // Homepage model cards intentionally keep just their original detail button.
  function afterRender() { /* No extra "salesperson selection" button on public cards. */ }

  // Group by the actual link, not the trim or catalog key: several trims
  // (and sometimes several catalogue keys) can point to the same PDF.
  function createCataloguePanel(rows) {
    const unique = new Map();
    for (const row of rows) {
      const catalogue = catalogueFor(row);
      if (!unique.has(catalogue.url)) unique.set(catalogue.url, { ...catalogue, trims: [] });
      unique.get(catalogue.url).trims.push(row.trim);
    }
    const panel = document.createElement('section');
    panel.className = 'share-catalogue-panel';
    panel.setAttribute('aria-label', '차종별 공식 카탈로그');

    const intro = document.createElement('p');
    intro.className = 'share-catalogue-summary';
    intro.textContent = unique.size === 1
      ? '이 차종의 공식 카탈로그는 한 번만 열거나 저장하시면 됩니다.'
      : '차체 유형에 따라 카탈로그가 다릅니다. 해당 자료를 선택해 주세요.';
    panel.appendChild(intro);

    const list = document.createElement('div');
    list.className = 'share-catalogue-list';
    for (const catalogue of unique.values()) {
      const entry = document.createElement('article');
      entry.className = 'share-catalogue-entry';
      const heading = document.createElement('h4');
      heading.textContent = catalogue.title;
      entry.appendChild(heading);

      const meta = document.createElement('p');
      meta.className = 'share-catalogue-meta';
      meta.textContent = (catalogue.pdf ? '공식 PDF' : '공식 카탈로그 목록') +
        ' · ' + catalogue.trims.length + '개 트림' +
        (catalogue.trims.length > 1 ? ' 공통' : '') +
        (catalogue.edition ? ' · ' + catalogue.edition : '');
      entry.appendChild(meta);

      if (unique.size > 1) {
        const applies = document.createElement('p');
        applies.className = 'share-catalogue-applies';
        applies.textContent = '적용 트림: ' + catalogue.trims.join(', ');
        entry.appendChild(applies);
      }
      const actions = document.createElement('div');
      actions.className = 'share-catalogue-actions';
      const pdf = document.createElement('a');
      pdf.className = 'share-catalogue-open';
      pdf.href = catalogue.url;
      pdf.target = '_blank';
      pdf.rel = 'noopener noreferrer';
      pdf.textContent = catalogue.pdf ? '공식 카탈로그 보기·다운로드 ↗' : '공식 카탈로그 목록 보기 ↗';
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.dataset.copyCatalogue = catalogue.url;
      copy.textContent = catalogue.pdf ? '카탈로그 링크 복사' : '목록 링크 복사';
      actions.append(pdf, copy);
      entry.appendChild(actions);
      if (!catalogue.pdf) {
        const note = document.createElement('p');
        note.className = 'share-action-note';
        note.textContent = '개별 PDF 미등록: 공식 카탈로그 목록에서 확인해 주세요.';
        entry.appendChild(note);
      }
      list.appendChild(entry);
    }
    panel.appendChild(list);
    return panel;
  }

  function decorateDialog(family, rows) {
    if (!state.ready) return;
    const holder = $('dialogTable');
    const table = holder && holder.querySelector('table');
    if (!table || table.querySelector('.share-checkbox-head')) return;

    const hint = document.createElement('div');
    hint.className = 'share-dialog-intro';
    hint.innerHTML = '<strong>공식 카탈로그 · 트림별 가격 안내</strong>' +
      '<p>동일한 카탈로그는 한 번만 표시합니다. 차량별 공유와 ‘함께 담기’는 아래 트림 목록에서 이용하세요.</p>';
    holder.prepend(hint);

    const feedback = document.createElement('p');
    feedback.id = 'shareActionFeedback';
    feedback.className = 'share-action-feedback';
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    hint.after(feedback);
    feedback.after(createCataloguePanel(rows));

    const head = document.createElement('th');
    head.scope = 'col';
    head.className = 'share-checkbox-head';
    head.textContent = '함께 담기';
    table.querySelector('thead tr').appendChild(head);

    Array.from(table.querySelectorAll('tbody tr')).forEach((tr, index) => {
      const row = rows[index];
      if (!row) return;
      tr.classList.add('share-data-row');
      const id = state.idsByKey.get(keyOf(row));
      const cell = document.createElement('td');
      cell.className = 'share-select-cell';
      const label = document.createElement('label');
      label.className = 'share-checkbox';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.dataset.shareId = id || '';
      checkbox.disabled = !id;
      checkbox.checked = Boolean(id && state.selected.has(id));
      checkbox.setAttribute('aria-label', row.year + ' ' + row.trim + ' 함께 담기');
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(' 함께 담기'));
      cell.appendChild(label);
      tr.appendChild(cell);

      if (id) {
        const details = document.createElement('tr');
        details.className = 'share-action-row';
        const actionCell = document.createElement('td');
        actionCell.colSpan = 4;
        const actions = document.createElement('div');
        actions.className = 'share-row-actions';
        const single = document.createElement('button');
        single.type = 'button';
        single.className = 'share-single-button';
        single.dataset.shareSingle = id;
        single.textContent = '이 차량 정보 공유';
        actions.appendChild(single);
        actionCell.appendChild(actions);
        details.appendChild(actionCell);
        tr.after(details);
      }
    });

    if (!$('shareDialogControls')) {
      const panel = document.createElement('div');
      panel.id = 'shareDialogControls';
      panel.className = 'share-dialog-controls';
      panel.hidden = true;
      panel.innerHTML = '<strong id="shareDialogCount">0대 선택됨</strong>' +
        '<div class="share-dialog-buttons"><button type="button" data-share-selected-copy>선택 차량 링크 복사</button>' +
        '<button type="button" data-share-selected-send>한 번에 공유</button></div>' +
        '<p id="shareDialogFeedback" role="status" aria-live="polite"></p>';
      holder.appendChild(panel);
    }
    refresh();
  }

  function attachToolbar() {
    if ($('shareToolbar')) return;
    const anchor = $('count');
    if (!anchor) return;
    const bar = document.createElement('div');
    bar.id = 'shareToolbar';
    bar.className = 'share-toolbar';
    bar.hidden = true;
    bar.setAttribute('aria-label', '여러 차량 함께 공유하기');
    bar.innerHTML = '<div class="share-toolbar-heading"><strong id="shareToolbarCount">함께 보낼 차량 0대</strong>' +
      '<span>선택한 차량을 링크 하나로 보낼 수 있어요.</span></div>' +
      '<div class="share-toolbar-actions"><button type="button" id="shareCopy" class="primary">차량 링크 복사</button>' +
      '<button type="button" id="shareDirect">바로 공유</button>' +
      '<button type="button" id="sharePreview">미리 보기</button>' +
      '<button type="button" id="shareClear">초기화</button></div>' +
      '<p id="shareToolbarFeedback" role="status" aria-live="polite"></p>';
    anchor.insertAdjacentElement('afterend', bar);
    $('shareCopy').addEventListener('click', async () => {
      if (!state.selected.size) return;
      const copied = await copyUrl(vehicleUrl([...state.selected]));
      notify(copied ? '링크가 복사되었습니다. 카카오톡에 붙여넣어 보내세요.' : '링크를 직접 복사해 주세요.');
    });
    $('shareDirect').addEventListener('click', () => {
      if (state.selected.size) shareOrCopy(vehicleUrl([...state.selected]), '메르세데스-벤츠 차량 안내');
    });
    $('sharePreview').addEventListener('click', () => {
      if (state.selected.size) window.open(vehicleUrl([...state.selected]), '_blank', 'noopener,noreferrer');
    });
    $('shareClear').addEventListener('click', () => {
      state.selected.clear();
      notify('선택한 차량을 초기화했습니다.');
      refresh();
    });

    $('dialogTable').addEventListener('change', event => {
      const input = event.target.closest('input[data-share-id]');
      if (!input || input.disabled) return;
      if (input.checked) state.selected.add(input.dataset.shareId);
      else state.selected.delete(input.dataset.shareId);
      notify('');
      refresh();
    });

    $('dialogTable').addEventListener('click', async event => {
      const pdfCopy = event.target.closest('button[data-copy-catalogue]');
      if (pdfCopy) {
        const copied = await copyUrl(pdfCopy.dataset.copyCatalogue);
        notify(copied ? '카탈로그 링크가 복사되었습니다. 카카오톡에 붙여넣어 보내세요.' : '카탈로그 링크를 직접 복사해 주세요.');
        return;
      }
      const single = event.target.closest('button[data-share-single]');
      if (single) {
        shareOrCopy(vehicleUrl([single.dataset.shareSingle]), '메르세데스-벤츠 ' + ($('dialogTitle')?.textContent || '차량 안내'));
        return;
      }
      if (event.target.closest('[data-share-selected-copy]') && state.selected.size) {
        const copied = await copyUrl(vehicleUrl([...state.selected]));
        notify(copied ? '선택한 차량 링크가 복사되었습니다. 카카오톡에 붙여넣어 보내세요.' : '링크를 직접 복사해 주세요.');
        return;
      }
      if (event.target.closest('[data-share-selected-send]') && state.selected.size) {
        shareOrCopy(vehicleUrl([...state.selected]), '메르세데스-벤츠 맞춤 차량 안내');
      }
    });
  }

  function init(data) {
    state.data = data;
    Promise.all([
      fetch('./vehicle-ids.json', { cache: 'no-cache' }).then(r => { if (!r.ok) throw Error('Vehicle IDs HTTP ' + r.status); return r.json(); }),
      fetch('./catalog-links.json', { cache: 'no-cache' }).then(r => { if (!r.ok) throw Error('Catalogue HTTP ' + r.status); return r.json(); })
    ]).then(([registry, catalogues]) => {
      if (!registry || registry.version !== 1 || !Array.isArray(registry.vehicles) ||
          !catalogues || catalogues.version !== 1) throw Error('Invalid share registries');
      const keys = new Set(), ids = new Set();
      registry.vehicles.forEach(row => {
        if (!row || typeof row.id !== 'string' || !/^[a-z0-9-]+$/.test(row.id) ||
            !['family', 'year', 'trim'].every(field => typeof row[field] === 'string')) throw Error('Invalid vehicle ID');
        const key = keyOf(row);
        if (ids.has(row.id) || keys.has(key)) throw Error('Duplicate vehicle ID');
        keys.add(key); ids.add(row.id); state.idsByKey.set(key, row.id);
      });
      if (data.models.some(row => !state.idsByKey.has(keyOf(row)))) throw Error('Unregistered vehicle');
      state.catalogue = catalogues;
      state.ready = true;
      attachToolbar();
      refresh();
      const dlg = $('modelDialog');
      if (dlg && dlg.open) {
        const family = $('dialogTitle').textContent;
        decorateDialog(family, data.models.filter(row => row.family === family));
      }
    }).catch(error => {
      console.warn('Vehicle sharing unavailable; original vehicle information remains accessible:', error);
      const anchor = $('count');
      if (anchor) {
        const note = document.createElement('p');
        note.className = 'muted-note';
        note.textContent = '카탈로그 공유 기능을 불러오지 못했습니다. 차량 가격은 정상 확인하실 수 있습니다.';
        anchor.insertAdjacentElement('afterend', note);
      }
    });
  }

  window.VehicleShareUI = { init, afterRender, decorateDialog };
})();
