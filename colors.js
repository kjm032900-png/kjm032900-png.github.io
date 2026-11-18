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

  function expandPhoto(item) {
    const dlg = byId('photoDialog');
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
    if (localApprovedImage(item)) {
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
    if (item.material) info.appendChild(textNode('p', 'meta', '소재: ' + item.material));
    if (item.priceStatus) info.appendChild(textNode('p', 'meta', optionPriceStatus(item.priceStatus)));
    if (item.applicability) info.appendChild(textNode('p', 'meta', '카탈로그 적용: ' + item.applicability));
    if (item.notes) info.appendChild(textNode('p', 'meta', item.notes));
    if (item.sourcePage) info.appendChild(textNode('p', 'meta', '출처: 카탈로그 ' + item.sourcePage + '쪽'));
    card.appendChild(info);
    return card;
  }

  function render() {
    const catalog = getCatalog();
    const title = catalog && catalog.title ? catalog.title : family;
    byId('guideTitle').textContent = title;
    const subtitle = catalog && catalog.sourceEdition
      ? '자료 판본: ' + catalog.sourceEdition + (catalog.reviewStatus === 'text_verified' ? ' · 이미지 미등록' : '')
      : '카탈로그 판본·컬러 자료 대조 중';
    byId('guideSubtitle').textContent = subtitle;

    sourceLink.href = catalog && catalog.sourceDocumentUrl ? catalog.sourceDocumentUrl : officialCatalog;
    sourceLink.textContent = catalog && catalog.sourceDocumentUrl
      ? '확인된 공식 카탈로그 ↗' : '벤츠코리아 공식 카탈로그 목록 ↗';

    const trims = vehicleData.models.filter((m) => m.family === family).map((m) => m.trim);
    const hasRequestedTrim = requestedTrim && trims.includes(requestedTrim);
    byId('modelDetails').textContent = (hasRequestedTrim ? '선택한 트림: ' + requestedTrim + ' · ' : '')
      + '같은 모델군은 카탈로그 색상 목록을 공유합니다. 트림별 실제 주문 가능 여부는 별도 확인이 필요합니다.';

    tabs.forEach((tab) => {
      const selected = tab.dataset.tab === activeTab;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', String(selected));
    });
    byId('colorPanel').setAttribute('aria-labelledby', 'tab-' + activeTab);

    grid.replaceChildren();
    if (catalogData.familyCatalogChoices?.[family] && !selectedCatalogKey) {
      renderStatus('이 모델군은 공식 카탈로그가 둘 이상입니다. 위에서 쿠페·카브리올레 또는 GT 쿠페·4도어 중 해당 카탈로그를 선택해 주세요.', true);
      return;
    }
    if (!catalog || !['verified','text_verified'].includes(catalog.reviewStatus) || !catalog.sourceEdition || !(catalog.sourceDocumentUrl || catalog.sourceLibraryFileId)) {
      renderStatus('공식 카탈로그의 해당 판본·정식 명칭·사진 사용 권한을 확인 중입니다. 검증 전에는 임의 색상이나 유사 사진을 표시하지 않습니다.', true);
      return;
    }
    const items = Array.isArray(catalog[activeTab]) ? catalog[activeTab] : [];
    if (!items.length) {
      renderStatus(supportedTabs[activeTab] + ' 자료가 아직 검증되지 않았습니다. 확인된 항목만 등록됩니다.', true);
      return;
    }
    if (catalog.reviewStatus === 'text_verified') {
      renderStatus('공식 카탈로그의 정식 명칭·코드·적용 조건만 먼저 등록했습니다. 컬러별 차량·시트 이미지는 재게시 권한과 원본 검증 후 추가합니다. 카탈로그 판본(' + catalog.sourceEdition + ')을 확인해 주세요.', true);
    } else renderStatus('', false);
    items.filter((it) => it && typeof it.name === 'string' && it.name.trim()).forEach((it) => grid.appendChild(createColorCard(it)));
  }

  function selectFamily(next, resetTrim) {
    if (!vehicleData.models.some((model) => model.family === next)) return;
    family = next;
    familySelect.value = next;
    if (resetTrim) requestedTrim = '';
    configureCatalogChoice();
    render();
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
      const requestedFamily = params.get('model') || '';
      selectFamily(list.includes(requestedFamily) ? requestedFamily : list[0], false);
      familySelect.addEventListener('change', () => selectFamily(familySelect.value, true));
    });
  }

  byId('catalogKind').addEventListener('change', (event) => {
    selectedCatalogKey = event.target.value;
    render();
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
