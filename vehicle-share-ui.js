/* Vehicle selection UI for the existing homepage. Price/promo rendering is unchanged. */
(function () {
  'use strict';
  const state = { data: null, idsByKey: new Map(), selected: new Set(), ready: false };
  const keyOf = function (row) { return JSON.stringify([row.family, row.year, row.trim]); };
  const get = function (id) { return document.getElementById(id); };

  function selectedForFamily(family) {
    if (!state.ready) return 0;
    return state.data.models.filter(function (row) {
      const id = state.idsByKey.get(keyOf(row));
      return row.family === family && id && state.selected.has(id);
    }).length;
  }

  function buildShareUrl() {
    const url = new URL('./share.html', window.location.href);
    url.searchParams.set('ids', Array.from(state.selected).join(','));
    return url.href;
  }

  function flash(message) {
    const target = get('shareToolbarFeedback');
    if (target) target.textContent = message;
  }

  function refresh() {
    if (!state.ready) return;
    const n = state.selected.size;
    const count = get('shareToolbarCount');
    if (count) count.textContent = '선택한 차량 ' + n + '대';
    const copy = get('shareCopy');
    const preview = get('sharePreview');
    const clear = get('shareClear');
    if (copy) copy.disabled = n === 0;
    if (preview) preview.disabled = n === 0;
    if (clear) clear.disabled = n === 0;
    document.querySelectorAll('[data-share-family]').forEach(function (button) {
      const amount = selectedForFamily(button.dataset.shareFamily);
      button.textContent = amount ? '상담용 차량 선택 · ' + amount + '대 선택됨' : '상담용 차량 선택 ＋';
      button.classList.toggle('selected', amount > 0);
    });
    document.querySelectorAll('#dialogTable input[data-share-id]').forEach(function (input) {
      input.checked = state.selected.has(input.dataset.shareId);
    });
  }

  function afterRender() {
    if (!state.ready) return;
    document.querySelectorAll('#modelGrid .model').forEach(function (card) {
      if (card.querySelector('[data-share-family]')) return;
      const existing = card.querySelector('[data-family]');
      if (!existing) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'share-pick';
      button.dataset.shareFamily = existing.dataset.family;
      button.textContent = '상담용 차량 선택 ＋';
      existing.insertAdjacentElement('afterend', button);
    });
    refresh();
  }

  function decorateDialog(family, rows) {
    if (!state.ready) return;
    const holder = get('dialogTable');
    const table = holder && holder.querySelector('table');
    if (!table || table.querySelector('.share-checkbox-head')) return;
    const header = document.createElement('th');
    header.scope = 'col';
    header.className = 'share-checkbox-head';
    header.textContent = '공유 선택';
    const headRow = table.querySelector('thead tr');
    if (headRow) headRow.appendChild(header);
    const trs = table.querySelectorAll('tbody tr');
    rows.forEach(function (row, index) {
      const tr = trs[index];
      if (!tr) return;
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
      checkbox.setAttribute('aria-label', row.year + ' ' + row.trim + ' 고객 안내 공유 선택');
      label.appendChild(checkbox);
      cell.appendChild(label);
      tr.appendChild(cell);
    });
    const hint = document.createElement('p');
    hint.className = 'share-dialog-hint';
    hint.textContent = '고객에게 안내할 트림을 체크해 주세요. 여러 모델에서 선택한 차량을 하나의 링크로 전달할 수 있습니다.';
    holder.appendChild(hint);
  }

  async function copyUrl(url) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try { await navigator.clipboard.writeText(url); return true; }
      catch (error) { /* Use local fallback. */ }
    }
    const field = document.createElement('textarea');
    field.value = url;
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.focus();
    field.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch (error) { /* Show manual fallback. */ }
    field.remove();
    if (!copied) window.prompt('아래 링크를 길게 눌러 복사해 주세요.', url);
    return copied;
  }

  function attachToolbar() {
    if (get('shareToolbar')) return;
    const anchor = get('count');
    if (!anchor) return;
    const bar = document.createElement('div');
    bar.id = 'shareToolbar';
    bar.className = 'share-toolbar';
    bar.setAttribute('aria-label', '맞춤 차량 안내 링크 만들기');
    bar.innerHTML = '<div><p id="shareToolbarCount" class="share-toolbar-title">선택한 차량 0대</p><p class="share-toolbar-detail">원하는 모델의 트림을 여러 개 선택해 고객에게 공유하세요.</p></div>' +
      '<div class="share-toolbar-actions"><button type="button" id="shareClear" disabled>선택 초기화</button><button type="button" id="sharePreview" disabled>안내 페이지 보기</button><button type="button" id="shareCopy" class="primary" disabled>공유 링크 복사</button></div>' +
      '<p id="shareToolbarFeedback" class="share-toolbar-feedback" role="status" aria-live="polite"></p>';
    anchor.insertAdjacentElement('afterend', bar);
    get('shareClear').addEventListener('click', function () {
      state.selected.clear();
      flash('차량 선택을 초기화했습니다.');
      refresh();
    });
    get('sharePreview').addEventListener('click', function () {
      if (!state.selected.size) return;
      window.open(buildShareUrl(), '_blank', 'noopener,noreferrer');
    });
    get('shareCopy').addEventListener('click', async function () {
      if (!state.selected.size) return;
      const copied = await copyUrl(buildShareUrl());
      flash(copied ? '링크가 복사되었습니다. 카카오톡 대화창에 붙여넣어 전달하세요.' : '링크 복사를 허용한 뒤 다시 시도해 주세요.');
    });
    get('modelGrid').addEventListener('click', function (event) {
      const button = event.target.closest('[data-share-family]');
      if (!button) return;
      const card = button.closest('.model');
      const details = card && card.querySelector('[data-family]');
      if (details) details.click();
    });
    get('dialogTable').addEventListener('change', function (event) {
      const input = event.target.closest('input[data-share-id]');
      if (!input || input.disabled) return;
      const id = input.dataset.shareId;
      if (input.checked) state.selected.add(id);
      else state.selected.delete(id);
      flash('');
      refresh();
    });
  }

  function init(data) {
    state.data = data;
    fetch('./vehicle-ids.json', { cache: 'no-cache' })
      .then(function (response) {
        if (!response.ok) throw new Error('Vehicle IDs HTTP ' + response.status);
        return response.json();
      })
      .then(function (registry) {
        if (!registry || registry.version !== 1 || !Array.isArray(registry.vehicles)) throw new Error('Invalid vehicle IDs');
        const keys = new Set(), ids = new Set();
        registry.vehicles.forEach(function (row) {
          if (!row || typeof row.id !== 'string' || !/^[a-z0-9-]+$/.test(row.id) ||
              !['family', 'year', 'trim'].every(function (field) { return typeof row[field] === 'string'; }))
            throw new Error('Invalid registry row');
          const key = keyOf(row);
          if (ids.has(row.id) || keys.has(key)) throw new Error('Duplicate vehicle share ID');
          ids.add(row.id); keys.add(key);
          state.idsByKey.set(key, row.id);
        });
        const missing = data.models.filter(function (row) { return !state.idsByKey.has(keyOf(row)); });
        if (missing.length) throw new Error('Unregistered vehicle count ' + missing.length);
        state.ready = true;
        attachToolbar();
        afterRender();
        const dialog = get('modelDialog');
        if (dialog && dialog.open) {
          const family = get('dialogTitle').textContent;
          decorateDialog(family, data.models.filter(function (row) { return row.family === family; }));
        }
      })
      .catch(function (error) {
        console.warn('Vehicle sharing unavailable; existing site remains available:', error);
        const anchor = get('count');
        if (anchor) {
          const message = document.createElement('p');
          message.className = 'muted-note';
          message.textContent = '맞춤 차량 공유 기능을 불러오지 못했습니다. 일반 차량 안내는 정상 이용하실 수 있습니다.';
          anchor.insertAdjacentElement('afterend', message);
        }
      });
  }

  window.VehicleShareUI = { init: init, afterRender: afterRender, decorateDialog: decorateDialog };
})();
