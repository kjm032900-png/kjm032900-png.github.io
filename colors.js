(() => {
  'use strict';

  const byId = (id) => document.getElementById(id);
  const familySelect = byId('family');
  const grid = byId('colorGrid');
  const tabs = Array.from(document.querySelectorAll('[data-tab]'));
  const sourceLink = byId('catalogSource');
  const supportedTabs = {
    exterior: '외장 컬러',
    seats: '실내 시트',
    interiorTrims: '인테리어 트림'
  };
  let vehicleData;
  let catalogData;
  let family = '';
  let activeTab = 'exterior';
  let requestedTrim = '';
  let requestedMY = '';
  let selectedCatalogKey = '';
  const officialCatalog = 'https://www.mercedes-benz.co.kr/passengercars/models/catalog.html';

  function textNode(tag, cssClass, value) {
    const el = document.createElement(tag);
    if (cssClass) el.className = cssClass;
    el.textContent = value;
    return el;
  }

  function renderStatus(message, visible) {
    const el = byId('status');
    el.textContent = message;
    el.hidden = !visible;
  }

  function getCatalog() {
    const key = selectedCatalogKey || catalogData.familyToCatalog[family];
    if (catalogData.familyCatalogChoices?.[family] && !selectedCatalogKey) return null;
    return key ? catalogData.catalogGroups[key] : null;
  }

  function configureCatalogChoice() {
    const choices = catalogData.familyCatalogChoices?.[family] || [];
    const wrapper = byId('catalogChooser');
    const select = byId('catalogKind');
    wrapper.hidden = !choices.length;
    select.replaceChildren();
    if (!choices.length) {
      selectedCatalogKey = catalogData.familyToCatalog[family] || '';
      return;
    }
    const hint = document.createElement('option');
    hint.value = '';
    hint.textContent = '차체 유형을 선택해 주세요';
    select.appendChild(hint);
    for (const id of choices) {
      const group = catalogData.catalogGroups[id];
      if (!group) continue;
      const option = document.createElement('option');
      option.value = id;
      option.textContent = group.title;
      select.appendChild(option);
    }
    const override = catalogData.trimCatalogOverrides?.[requestedTrim];
    selectedCatalogKey = choices.includes(override) ? override : '';
    select.value = selectedCatalogKey;
  }

  function optionPriceStatus(value) {
    return {
      standard: '기본사양',
      optional: '선택사양',
      paid: '유료옵션',
      unknown: '카탈로그에 비용 구분 없음',
      varies: '트림별 기본·선택·유료 조건 상이'
    }[value] || '카탈로그 표기 확인';
  }

  function localApprovedImage(item) {
    return item && item.assetApproved === true && typeof item.image === 'string'
      && item.image.startsWith('images/catalog-colors/')
      && !item.image.includes('..') && !item.image.includes('?')
      && ['.webp', '.jpg', '.jpeg', '.png'].some((ext) => item.image.toLowerCase().endsWith(ext));
  }

  const PHOTO_GROUPS = new Set(["a-class","c-class","cla","s-class","gla","glb","glc","gle","gls","g-class","electric-cla","electric-glb","electric-glc","eqa","eqb","eqe","eqe-suv","eqs","eqs-suv","electric-g-class","amg-a-class","amg-cla","amg-e-class","amg-glb","amg-glc","amg-gle","amg-sl","amg-cle-coupe","amg-cle-cabriolet","amg-gt-coupe","amg-gt-4door","maybach-gls","maybach-sl","v-class","cle","maybach-s-class","maybach-eqs-suv"]);
  const pendingPhotoGroups = new Set();

  function requestPhotoGroup() {
    const key = selectedCatalogKey;
    if (!key || !PHOTO_GROUPS.has(key) || pendingPhotoGroups.has(key) || window.CATALOG_IMAGE_ATLASES?.[key]) return;
    pendingPhotoGroups.add(key);
    const script = document.createElement('script');
    script.src = './catalog-photo-atlases/' + encodeURIComponent(key) + '.js?v=20261118-photo-fix6';
    script.async = true;
    script.onload = () => {
      pendingPhotoGroups.delete(key);
      if (selectedCatalogKey === key) render();
    };
    script.onerror = () => {
      pendingPhotoGroups.delete(key);
      script.remove();
      if (selectedCatalogKey === key) renderStatus('차량 이미지 파일을 불러오지 못했습니다. 새로고침해 주세요.', true);
    };
    document.head.appendChild(script);
  }

  function getPhotoSprite(item) {
    const group = window.CATALOG_IMAGE_ATLASES?.[selectedCatalogKey]?.[activeTab];
    const idx = group?.keys ? group.keys.indexOf(item.sourcePage + '|' + item.code) : group?.codes?.indexOf(item.code);
    return idx >= 0 ? { group, idx } : null;
  }

  function setSpriteBackground(el, sprite) {
    const { group, idx } = sprite;
    const col = idx % group.cols;
    const row = Math.floor(idx / group.cols);
    el.style.backgroundImage = 'url("' + group.url + '")';
    el.style.backgroundSize = (group.cols * 100) + '% ' + (group.rows * 100) + '%';
    el.style.backgroundPosition = (group.cols > 1 ? col * 100 / (group.cols - 1) : 0) + '% ' + (group.rows > 1 ? row * 100 / (group.rows - 1) : 0) + '%';
    el.style.backgroundRepeat = 'no-repeat';
  }

  function expandSprite(item, sprite) {
    const dlg = byId('photoDialog');
    byId('photo').hidden = true;
    const el = byId('spriteZoom');
    el.hidden = false;
    el.setAttribute('aria-label', item.code + ' ' + item.name + ' 공식 E-Class 카탈로그 이미지');
    setSpriteBackground(el, sprite);
    byId('photoName').textContent = item.code + ' · ' + item.name;
    byId('photoMeta').textContent = '공식 E-Class 26MY 카탈로그 ' + (item.sourcePage || '') + '쪽';
    dlg.showModal();
  }

  function expandPhoto(item) {
    const dlg = byId('photoDialog');
    byId('spriteZoom').hidden = true;
    byId('photo').hidden = false;
    byId('photo').src = item.image;
    byId('photo').alt = item.name + ' 공식 카탈로그 참고 이미지';
    byId('photoName').textContent = (item.code ? item.code + ' · ' : '') + item.name;
    byId('photoMeta').textContent = item.applicability || '';
    dlg.showModal();
  }

  function createColorCard(item) {
    const card = textNode('article', 'color-card', '');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'photo-trigger';
    const sprite = getPhotoSprite(item);
    if (sprite) {
      const swatch = document.createElement('div');
      swatch.className = 'photo-sprite';
      swatch.setAttribute('role', 'img');
      swatch.setAttribute('aria-label', item.code + ' ' + item.name + ' 공식 카탈로그 이미지');
      setSpriteBackground(swatch, sprite);
      button.appendChild(swatch);
      button.setAttribute('aria-label', item.code + ' ' + item.name + ' 사진 확대');
      button.addEventListener('click', () => expandSprite(item, sprite));
    } else if (localApprovedImage(item)) {
      const img = document.createElement('img');
      img.src = item.image;
      img.alt = item.name + ' 공식 카탈로그 이미지';
      img.loading = 'lazy';
      button.appendChild(img);
      button.setAttribute('aria-label', item.name + ' 이미지 확대');
      button.addEventListener('click', () => expandPhoto(item));
    } else {
      button.disabled = true;
      button.appendChild(textNode('div', 'photo-placeholder', '공식 이미지 검증 대기'));
    }
    card.appendChild(button);

    const info = textNode('div', 'color-info', '');
    if (item.code) info.appendChild(textNode('div', 'color-code', item.code));
    info.appendChild(textNode('h3', '', item.name));
    if (item.category) info.appendChild(textNode('p', 'meta', '구분: ' + item.category));
    if (item.bodyStyle) info.appendChild(textNode('p', 'meta', '차체: ' + item.bodyStyle));
    if (item.material) info.appendChild(textNode('p', 'meta', '소재: ' + item.material));
    if (item.priceStatus) info.appendChild(textNode('p', 'meta', optionPriceStatus(item.priceStatus)));
    if (item.applicability) info.appendChild(textNode('p', 'meta', '카탈로그 적용: ' + item.applicability));
    if (item.notes) info.appendChild(textNode('p', 'meta', item.notes));
    if (item.sourcePage) info.appendChild(textNode('p', 'meta', '출처: 카탈로그 ' + item.sourcePage + '쪽'));
    card.appendChild(info);
    return card;
  }

  function renderExteriorExtras(catalog) {
    const container = byId('exteriorExtras');
    container.replaceChildren();
    container.hidden = true;
    if (activeTab !== 'exterior' || !Array.isArray(catalog?.exteriorDetails) || !catalog.exteriorDetails.length) return;
    container.appendChild(textNode('h3', 'extras-heading', '외장 추가 구성'));
    for (const item of catalog.exteriorDetails) {
      const element = textNode('div', 'exterior-extra', '');
      element.appendChild(textNode('strong', '', (item.code ? item.code + ' · ' : '') + item.name));
      if (item.applicability) element.appendChild(textNode('span', '', ' · ' + item.applicability));
      if (item.sourcePage) element.appendChild(textNode('span', '', ' (카탈로그 ' + item.sourcePage + '쪽)'));
      if (item.notes) element.appendChild(textNode('p', 'meta', item.notes));
      container.appendChild(element);
    }
    container.hidden = false;
  }

  function render() {
    const catalog = getCatalog();
    const title = catalog && catalog.title ? catalog.title : family;
    byId('guideTitle').textContent = title;
    const subtitle = catalog && catalog.sourceEdition
      ? '자료 판본: ' + catalog.sourceEdition + (catalog.reviewStatus === 'text_verified' && !window.CATALOG_IMAGE_ATLASES?.[selectedCatalogKey] ? ' · 사진 등록 대기' : '')
      : '카탈로그 판본·컬러 자료 대조 중';
    byId('guideSubtitle').textContent = subtitle;

    sourceLink.href = catalog && catalog.sourceDocumentUrl ? catalog.sourceDocumentUrl : officialCatalog;
    sourceLink.textContent = catalog && catalog.sourceDocumentUrl
      ? '확인된 공식 카탈로그 ↗' : '벤츠코리아 공식 카탈로그 목록 ↗';

    const trims = vehicleData.models.filter((m) => m.family === family).map((m) => m.trim);
    const hasRequestedTrim = requestedTrim && trims.includes(requestedTrim);
    const sourceMY = (catalog?.sourceEdition?.match(/(\d{2})년식/) || [])[1];
    const mismatch = requestedMY && sourceMY && requestedMY.slice(0, 2) !== sourceMY;
    const selectedLabel = (hasRequestedTrim ? '선택한 트림: ' + requestedTrim + ' · ' : '')
      + (requestedMY ? '차량 ' + requestedMY + ' · ' : '');
    byId('modelDetails').textContent = (mismatch
      ? '⚠ 차량 ' + requestedMY + '와 색상 카탈로그 ' + sourceMY + 'MY의 연식이 다릅니다. 현재 연식의 적용 조건을 반드시 확인하세요. · ' : '')
      + selectedLabel + '카탈로그의 전체 색상을 안내합니다. 트림별 실제 주문 가능 여부는 별도 확인이 필요합니다.';

    tabs.forEach((tab) => {
      const selected = tab.dataset.tab === activeTab;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', String(selected));
    });
    byId('colorPanel').setAttribute('aria-labelledby', 'tab-' + activeTab);

    grid.replaceChildren();
    byId('exteriorExtras').replaceChildren();
    byId('exteriorExtras').hidden = true;
    if (catalogData.familyCatalogChoices?.[family] && !selectedCatalogKey) {
      renderStatus('이 모델군은 공식 카탈로그가 둘 이상입니다. 위에서 쿠페·카브리올레 또는 GT 쿠페·4도어 중 해당 카탈로그를 선택해 주세요.', true);
      return;
    }
    if (!catalog || !['verified','text_verified'].includes(catalog.reviewStatus) || !catalog.sourceEdition || !(catalog.sourceDocumentUrl || catalog.sourceFileName)) {
      renderStatus('공식 카탈로그의 해당 판본·정식 명칭·사진 사용 권한을 확인 중입니다. 검증 전에는 임의 색상이나 유사 사진을 표시하지 않습니다.', true);
      return;
    }
    const items = Array.isArray(catalog[activeTab]) ? catalog[activeTab] : [];
    if (!items.length) {
      renderStatus(supportedTabs[activeTab] + ' 자료가 아직 검증되지 않았습니다. 확인된 항목만 등록됩니다.', true);
      return;
    }
    const availablePhotos = items.filter((item) => Boolean(getPhotoSprite(item) || localApprovedImage(item))).length;
    if (catalog.reviewStatus === 'text_verified' && availablePhotos < items.length) {
      renderStatus('공식 카탈로그의 ' + items.length + '개 항목 중 사진 ' + availablePhotos + '개를 확인할 수 있습니다. 사진이 없는 항목은 원문 명칭·옵션 코드로 안내합니다. 선택 가능 여부는 연식·트림에 따라 달라질 수 있습니다.', true);
    } else renderStatus('', false);
    items.filter((it) => it && typeof it.name === 'string' && it.name.trim()).forEach((it) => grid.appendChild(createColorCard(it)));
    renderExteriorExtras(catalog);
  }

  function selectFamily(next, resetTrim) {
    if (!vehicleData.models.some((model) => model.family === next)) return;
    family = next;
    familySelect.value = next;
    if (resetTrim) { requestedTrim = ''; requestedMY = ''; }
    configureCatalogChoice();
    render();
    requestPhotoGroup();
  }

  function boot() {
    return Promise.all([
      fetch('./content.json', {cache: 'no-cache'}).then((r) => {if (!r.ok) throw new Error('차량 데이터 ' + r.status);return r.json();}),
      fetch('./catalog-colors.json', {cache: 'no-cache'}).then((r) => {if (!r.ok) throw new Error('카탈로그 데이터 ' + r.status);return r.json();})
    ]).then(([vehicles, catalogs]) => {
      if (!Array.isArray(vehicles.models) || !catalogs.familyToCatalog || !catalogs.catalogGroups) {
        throw new Error('컬러 데이터 구조를 확인할 수 없습니다.');
      }
      vehicleData = vehicles;
      catalogData = catalogs;
      familySelect.replaceChildren();
      const list = [...new Set(vehicles.models.map((m) => m.family))];
      const grouped = new Map();
      vehicles.models.forEach((model) => {
        if (!grouped.has(model.category)) grouped.set(model.category, []);
        if (!grouped.get(model.category).includes(model.family)) grouped.get(model.category).push(model.family);
      });
      grouped.forEach((names, category) => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = category;
        names.forEach((name) => {
          const option = document.createElement('option');
          option.value = name;
          option.textContent = name;
          optgroup.appendChild(option);
        });
        familySelect.appendChild(optgroup);
      });
      const params = new URLSearchParams(location.search);
      requestedTrim = params.get('trim') || '';
      requestedMY = /^\d{2}MY$/.test(params.get('my') || '') ? params.get('my') : '';
      const requestedFamily = params.get('model') || '';
      selectFamily(list.includes(requestedFamily) ? requestedFamily : list[0], false);
      familySelect.addEventListener('change', () => selectFamily(familySelect.value, true));
    });
  }

  byId('catalogKind').addEventListener('change', (event) => {
    selectedCatalogKey = event.target.value;
    render();
    requestPhotoGroup();
  });

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => { activeTab = tab.dataset.tab; if (vehicleData) render(); });
  });
  byId('photoClose').addEventListener('click', () => byId('photoDialog').close());
  byId('photoDialog').addEventListener('click', (event) => {
    if (event.target === byId('photoDialog')) byId('photoDialog').close();
  });
  boot().catch((error) => {
    familySelect.replaceChildren(textNode('option', '', '차량 목록을 불러올 수 없습니다.'));
    renderStatus('정보를 불러오는 중 오류가 발생했습니다. 새로고침하거나 차량 목록으로 돌아가 주세요.', true);
    console.error('Catalogue colour guide:', error);
  });
})();
