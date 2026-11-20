/* Public customer share page: selected trim IDs only, no CRM/customer data. */
(function () {
  'use strict';
  const $ = function (id) { return document.getElementById(id); };
  const validId = /^[a-z0-9-]{3,130}$/;
  const catalogueHomepage = 'https://www.mercedes-benz.co.kr/passengercars/models/catalog.html';

  function node(tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value != null) element.textContent = String(value);
    return element;
  }
  function setStatus(message, visible) {
    const status = $('shareStatus');
    status.textContent = message || '';
    status.hidden = !visible;
  }
  function won(value) {
    return Number.isSafeInteger(value) && value > 0
      ? new Intl.NumberFormat('ko-KR').format(value) + '원'
      : '가격 별도 확인';
  }
  function rowKey(row) {
    return JSON.stringify([row.family, row.year, row.trim]);
  }
  function safeCatalogUrl(value) {
    if (typeof value !== 'string') return null;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.hostname === 'www.mercedes-benz.co.kr' ? url.href : null;
    } catch (error) {
      return null;
    }
  }
  function link(label, href, primary) {
    const a = node('a', primary ? 'share-link-btn' : 'share-link-outline', label);
    a.href = href;
    if (/^https:\/\//.test(href)) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    return a;
  }
  function addSpec(container, label, value) {
    const row = node('div');
    row.appendChild(node('dt', '', label));
    row.appendChild(node('dd', '', value));
    container.appendChild(row);
  }
  function makeCard(row, vehicleId, data, catalogueLinks) {
    const article = node('article', 'share-card');
    article.dataset.vehicleId = vehicleId;
    const photo = node('div', 'share-card-photo');
    const imageName = data.images && data.images[row.family];
    if (typeof imageName === 'string' && /^[a-z0-9-]+$/.test(imageName)) {
      const image = node('img');
      image.src = './images/' + imageName + '.webp';
      image.alt = row.family + ' 차량 참고 이미지';
      image.loading = 'lazy';
      image.addEventListener('error', function () {
        image.remove();
        photo.textContent = '차량 이미지 확인 중';
      }, { once: true });
      photo.appendChild(image);
    } else {
      photo.textContent = '차량 이미지 확인 중';
    }
    article.appendChild(photo);
    const body = node('div', 'share-card-body');
    body.appendChild(node('div', 'share-card-meta', row.category + ' · ' + row.family + ' · ' + row.year));
    body.appendChild(node('h2', '', row.trim));
    body.appendChild(node('p', 'share-card-price', won(row.price)));
    const specs = node('dl', 'share-specs');
    addSpec(specs, '모델군', row.family);
    addSpec(specs, '연식', row.year);
    addSpec(specs, '트림', row.trim);
    addSpec(specs, '가격 기준일', data.source_date || '확인 필요');
    addSpec(specs, '가격 출처', row.source);
    body.appendChild(specs);
    const catalogKey = (catalogueLinks.trimCatalogOverrides || {})[row.trim] ||
      (catalogueLinks.familyToCatalog || {})[row.family];
    const catalog = (catalogueLinks.catalogs || {})[catalogKey] || {};
    const directPdf = safeCatalogUrl(catalog.url);
    const fallback = safeCatalogUrl(catalogueLinks.catalogueIndexUrl) || catalogueHomepage;
    const actionRow = node('div', 'share-card-actions');
    actionRow.appendChild(link(directPdf ? '공식 카탈로그 보기·다운로드 ↗' : '공식 카탈로그 목록 보기 ↗', directPdf || fallback, true));
    const copyPdf = node('button', 'share-link-outline', directPdf ? '카탈로그 링크 복사' : '목록 링크 복사');
    copyPdf.type = 'button';
    copyPdf.dataset.catalogueCopy = directPdf || fallback;
    actionRow.appendChild(copyPdf);
    const colorUrl = new URL('./colors.html', location.href);
    colorUrl.searchParams.set('model', row.family);
    colorUrl.searchParams.set('trim', row.trim);
    colorUrl.searchParams.set('my', row.year);
    actionRow.appendChild(link('컬러·실내 안내 ↗', colorUrl.href, false));
    body.appendChild(actionRow);
    const cardFeedback = node('p', 'share-card-feedback');
    cardFeedback.setAttribute('role', 'status');
    cardFeedback.setAttribute('aria-live', 'polite');
    body.appendChild(cardFeedback);
    body.appendChild(node('p', 'share-card-tip', directPdf ? 'PDF를 열면 브라우저에서 다운로드할 수 있습니다. 링크를 복사해 다른 분께 보낼 수도 있습니다.' : '공식 목록에서 카탈로그를 확인하고 공유할 수 있습니다.'));
    if (directPdf) {
      body.appendChild(node('p', 'share-card-foot',
        '카탈로그: ' + (catalog.title || row.family) +
        (catalog.edition ? ' · ' + catalog.edition : '') +
        ' / 카탈로그의 발행 연식과 현재 판매 연식은 다를 수 있습니다.'));
    } else {
      body.appendChild(node('p', 'share-card-foot',
        '현재 확인된 개별 공식 PDF 링크가 없어 벤츠코리아 공식 카탈로그 목록으로 연결됩니다.'));
    }
    article.appendChild(body);
    return article;
  }
  async function copyLink(text, successMessage) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try { await navigator.clipboard.writeText(text); setStatus(successMessage, true); return true; }
      catch (error) { /* Use fallback below. */ }
    }
    const input = document.createElement('textarea');
    input.value = text;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.focus();
    input.select();
    let okay = false;
    try { okay = document.execCommand('copy'); } catch (error) { /* Manual fallback. */ }
    input.remove();
    if (!okay) window.prompt('아래 링크를 복사해 카카오톡에 보내 주세요.', text);
    setStatus(okay ? successMessage : '주소를 길게 눌러 복사해 주세요.', true);
    return okay;
  }
  function copyCurrentAddress() {
    return copyLink(location.href, '차량 안내 링크가 복사되었습니다. 카카오톡에 붙여넣어 보내세요.');
  }
  async function loadJson(path) {
    const response = await fetch(path, { cache: 'no-cache' });
    if (!response.ok) throw new Error(path + ': HTTP ' + response.status);
    return response.json();
  }
  function showEmpty(message) {
    $('shareCount').textContent = '선택된 차량 0대';
    $('shareResults').appendChild(node('div', 'share-empty', message));
  }

  $('copyShareLink').addEventListener('click', copyCurrentAddress);
  $('shareResults').addEventListener('click', function (event) {
    const button = event.target.closest('button[data-catalogue-copy]');
    if (!button) return;
    copyLink(button.dataset.catalogueCopy, '카탈로그 링크가 복사되었습니다. 카카오톡에 붙여넣어 보내세요.').then(function (copied) {
      const feedback = button.closest('.share-card')?.querySelector('.share-card-feedback');
      if (feedback) feedback.textContent = copied ? '복사되었습니다. 카카오톡에 붙여넣어 보내세요.' : '링크 복사 안내를 확인해 주세요.';
    });
  });
  const search = new URLSearchParams(location.search);
  const raw = search.get('ids') || '';
  const inputIds = raw.split(',').filter(Boolean);
  const unique = Array.from(new Set(inputIds));
  if (!raw || unique.length === 0) {
    setStatus('공유할 차량이 지정되지 않았습니다. 전체 차량 목록에서 원하는 트림을 선택해 주세요.', true);
    showEmpty('차량 정보가 선택되지 않았습니다.');
    $('copyShareLink').disabled = true;
    return;
  }
  if (raw.length > 10000 || unique.length > 100 || unique.some(function (id) { return !validId.test(id); })) {
    setStatus('공유 주소 형식이 올바르지 않습니다. 차량 선택 페이지에서 다시 링크를 만들어 주세요.', true);
    showEmpty('차량 정보를 표시할 수 없습니다.');
    $('copyShareLink').disabled = true;
    return;
  }
  Promise.all([
    loadJson('./content.json'),
    loadJson('./vehicle-ids.json'),
    loadJson('./catalog-links.json')
  ]).then(function (values) {
    const data = values[0], registry = values[1], catalogs = values[2];
    if (!data || !Array.isArray(data.models) || !data.images ||
        !registry || registry.version !== 1 || !Array.isArray(registry.vehicles) ||
        !catalogs || catalogs.version !== 1) throw new Error('Invalid share data');
    // Preserve historical customer links even when the public model gallery lists newer model years.
    const models = new Map([...(data.legacyModels || []),...data.models].map(function (row) { return [rowKey(row), row]; }));
    const ids = new Map(registry.vehicles.map(function (row) { return [row.id, row]; }));
    const target = $('shareResults');
    let found = 0, missing = 0;
    unique.forEach(function (id) {
      const ref = ids.get(id);
      const model = ref && models.get(rowKey(ref));
      if (!model) { missing++; return; }
      target.appendChild(makeCard(model, id, data, catalogs));
      found++;
    });
    $('shareCount').textContent = '선택된 차량 ' + found + '대';
    if (missing > 0) {
      setStatus(missing + '개 차량은 더 이상 조회할 수 없습니다. 최신 차량 목록을 확인해 주세요.', true);
    } else {
      setStatus('', false);
    }
    if (found === 0) {
      showEmpty('요청한 차량의 정보를 찾을 수 없습니다. 전체 차량 목록에서 다시 선택해 주세요.');
      $('copyShareLink').disabled = true;
    }
    if (typeof data.phone === 'string' && /^0\d{8,10}$/.test(data.phone)) {
      $('shareCall').href = 'tel:' + data.phone;
      $('shareSms').href = 'sms:' + data.phone;
    }
  }).catch(function (error) {
    console.error('Vehicle share:', error);
    setStatus('차량 정보를 불러오지 못했습니다. 잠시 후 새로고침하거나 전화·문자로 문의해 주세요.', true);
    showEmpty('지금은 맞춤 차량 정보를 표시할 수 없습니다.');
    $('copyShareLink').disabled = true;
  });
})();
