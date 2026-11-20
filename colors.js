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

  function syncGuideUrl() {
    if (!vehicleData || !family) return;
    const url = new URL(window.location.href);
    url.searchParams.set('model', family);
    url.searchParams.delete('trim');
    url.searchParams.delete('my');
    if (requestedTrim) url.searchParams.set('trim', requestedTrim);
    if (requestedMY) url.searchParams.set('my', requestedMY);
    if (activeTab !== 'exterior') url.searchParams.set('tab', activeTab);
    else url.searchParams.delete('tab');
    if (selectedCatalogKey) url.searchParams.set('catalog', selectedCatalogKey);
    else url.searchParams.delete('catalog');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    byId('returnToModel').href = './index.html?openModel=' + encodeURIComponent(family) + '#models';
    byId('returnToModel').textContent = '← ' + family + ' 상세로';
  }

  function showShareFeedback(message) {
    const feedback = byId('shareFeedback');
    feedback.hidden = false;
    feedback.textContent = message;
  }

  async function copyGuideLink() {
    const url = window.location.href;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement('textarea');
        input.value = url;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand('copy');
        input.remove();
        if (!copied) throw new Error('clipboard unavailable');
      }
      showShareFeedback('현재 선택한 ' + family + ' 컬러 안내 링크를 복사했습니다. 카카오톡 등에 붙여넣어 보내세요.');
    } catch (_) {
      showShareFeedback('링크 자동 복사가 지원되지 않습니다. 주소창의 URL을 복사해 전달해 주세요.');
    }
  }

  async function shareGuideLink() {
    if (!navigator.share) { await copyGuideLink(); return; }
    try {
      await navigator.share({title: family + ' 외장·실내 컬러 안내', text: family + ' 공식 카탈로그 컬러 안내', url: window.location.href});
    } catch (error) {
      if (error?.name !== 'AbortError') showShareFeedback('공유창을 열지 못했습니다. 링크 복사 버튼으로 전달해 주세요.');
    }
  }

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
      && (item.image.startsWith('images/catalog-colors/') || item.image.startsWith('images/catalog-originals/'))
      && !item.image.includes('..') && !item.image.includes('?')
      && ['.webp', '.jpg', '.jpeg', '.png'].some((ext) => item.image.toLowerCase().endsWith(ext));
  }

  const PHOTO_GROUPS = new Set(["a-class","c-class","cla","s-class","gla","glb","glc","gle","gls","g-class","electric-cla","electric-glb","electric-glc","eqa","eqb","eqe","eqe-suv","eqs","eqs-suv","electric-g-class","amg-a-class","amg-cla","amg-e-class","amg-glb","amg-glc","amg-gle","amg-sl","amg-cle-coupe","amg-cle-cabriolet","amg-gt-coupe","amg-gt-4door","maybach-gls","maybach-sl","v-class","cle","maybach-s-class","maybach-eqs-suv"]);
  const ORIGINAL_PAGE_GROUPS = new Set(["a-class","c-class","cla","e-class","s-class","gla","glb","glc","gle","gls","g-class","electric-cla","electric-glb","electric-glc","eqa","eqb","eqe","eqe-suv","eqs","eqs-suv","electric-g-class","amg-a-class","amg-cla","amg-e-class","amg-glb","amg-glc","amg-gle","amg-g-class","amg-sl","amg-cle-coupe","amg-cle-cabriolet","amg-gt-coupe","amg-gt-4door","maybach-gls","maybach-sl","v-class","cle","maybach-s-class","maybach-eqs-suv"]);
  const pendingOriginalGroups = new Set();
  const pendingPhotoGroups = new Set();
  const ORIGINAL_BUNDLE_GROUPS = new Set(['a-class','amg-a-class','amg-cla','amg-cle-cabriolet','amg-cle-coupe','amg-e-class','amg-glb']);
  const ORIGINAL_PART_COUNTS = {'amg-glb': 5};
  const originalLoading = new Set();
  const originalLoaded = new Set();
  function requestOriginalBundle() {
    const key = selectedCatalogKey;
    if (!ORIGINAL_BUNDLE_GROUPS.has(key) || originalLoading.has(key) || originalLoaded.has(key)) return;
    originalLoading.add(key);
    const partCount = ORIGINAL_PART_COUNTS[key] || 1;
    function loadPart(number) {
      const script = document.createElement('script');
      const filename = partCount > 1 ? key + '-part' + number : key;
      script.src = './catalog-originals-bundles/' + encodeURIComponent(filename) + '.js?v=20261119';
      script.onload = () => {
        if (selectedCatalogKey === key) render();
        if (number < partCount) loadPart(number+1);
        else { originalLoading.delete(key); originalLoaded.add(key); }
      };
      script.onerror = () => {originalLoading.delete(key);console.warn('Could not load original PDF page image:', filename);};
      document.head.appendChild(script);
    }
    loadPart(1);
  }
  function embeddedOriginal(item){return window.CATALOG_ORIGINAL_PAGES?.[selectedCatalogKey]?.[String(item.sourcePage)] || null;}

  const ORIGINAL_PAGE_COUNTS = {"amg-gt-4door":5,"amg-gt-coupe":1,"amg-sl":4,"c-class":8,"cle":8,"e-class":11,"eqa":4,"eqb":4,"eqe":5,"eqe-suv":8,"eqs":7,"eqs-suv":10,"electric-g-class":5,"g-class":3,"gla":2,"glb":4,"glc":9,"maybach-eqs-suv":2,"maybach-gls":5,"maybach-s-class":3};
  const ORIGINAL_STAGES = {"amg-sl":[3,4],"c-class":[4,5,6],"cle":[6,7,8],"e-class":[9,10,11,12],"eqa":[12,13],"eqb":["13b",14],"eqe":[14,15],"eqe-suv":["15b",16,17,"17b"],"eqs":[18,19,20],"eqs-suv":[20,21,"21b",22,"22b"],"electric-g-class":[23,24],"g-class":["24b"],"gla":[25],"glb":[25,26],"glc":["26b",27,28,29],"maybach-eqs-suv":[29],"maybach-gls":[30,31],"maybach-s-class":[31,32]};
  const loadedOriginalStages=new Set();
  const completedOriginalGroups = new Set();
  function requestOriginalPages() {
    const key=selectedCatalogKey;
    if (!key || ORIGINAL_BUNDLE_GROUPS.has(key) || !ORIGINAL_PAGE_GROUPS.has(key) || pendingOriginalGroups.has(key) || completedOriginalGroups.has(key)) return;
    const stages=ORIGINAL_STAGES[key];
    if(!stages && window.CATALOG_ORIGINAL_PAGES?.[key]){completedOriginalGroups.add(key);return;}
    pendingOriginalGroups.add(key);
    const files=stages ? stages.map(n=>'stage-'+String(n).padStart(2,'0')) :
      Array.from({length:ORIGINAL_PAGE_COUNTS[key]||1},(_,i)=>(ORIGINAL_PAGE_COUNTS[key]||1)>1?key+'-part'+(i+1):key);
    function next(i){
      if(i>=files.length){pendingOriginalGroups.delete(key);completedOriginalGroups.add(key);if(selectedCatalogKey===key)render();return;}
      const filename=files[i];
      if(loadedOriginalStages.has(filename)){next(i+1);return;}
      const script=document.createElement('script');
      script.src='./catalog-original-pages/'+encodeURIComponent(filename)+'.js?v=20261119-all-originals4';
      script.async=true;
      script.onload=()=>{loadedOriginalStages.add(filename);if(selectedCatalogKey===key)render();next(i+1);};
      script.onerror=()=>{pendingOriginalGroups.delete(key);script.remove();renderStatus('고해상도 원본 이미지를 불러오지 못했습니다. 새로고침해 주세요.',true);console.warn('Original catalogue image missing:',filename);};
      document.head.appendChild(script);
    }
    next(0);
  }

  function requestPhotoGroup() {
    const key = selectedCatalogKey;
    if (!key || ORIGINAL_PAGE_GROUPS.has(key) || !PHOTO_GROUPS.has(key) || pendingPhotoGroups.has(key) || window.CATALOG_IMAGE_ATLASES?.[key]) return;
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

  function setOriginalPdfLink(item) {
    const link = byId('openOriginalPage');
    const group = getCatalog();
    const base = group && group.sourceDocumentUrl;
    link.hidden = !base;
    if (base) link.href = base + (item.sourcePage ? '#page=' + encodeURIComponent(item.sourcePage) : '');
  }

  function expandSprite(item, sprite) {
    const dlg = byId('photoDialog');
    byId('photo').hidden = true;
    const el = byId('spriteZoom');
    el.hidden = false;
    el.setAttribute('aria-label', item.code + ' ' + item.name + ' 공식 카탈로그 이미지');
    setSpriteBackground(el, sprite);
    byId('photoName').textContent = item.code + ' · ' + item.name;
    byId('photoMeta').textContent = item.applicability || '';
    setOriginalPdfLink(item);
    dlg.showModal();
  }

  function expandPhoto(item) {
    const dlg = byId('photoDialog');
    byId('spriteZoom').hidden = true;
    byId('photo').hidden = false;
    byId('photo').src = item.image;
    byId('photo').classList.toggle('catalog-original', item.originalApproved === true);
    byId('photo').alt = item.name + ' 공식 카탈로그 참고 이미지';
    byId('photoName').textContent = (item.code ? item.code + ' · ' : '') + item.name;
    byId('photoMeta').textContent = item.applicability || '';
    setOriginalPdfLink(item);
    dlg.showModal();
  }

  function createColorCard(item, imageLabel = '') {
    const card = textNode('article', 'color-card', '');
    // A combined card uses a neutral caption instead of labelling the whole
    // PDF page as if it were a photo of just the first option.
    const displayItem = imageLabel ? {...item, code: '', name: imageLabel, applicability: ''} : item;
    const displayName = imageLabel || ((item.code ? item.code + ' ' : '') + item.name);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'photo-trigger';
    const sprite = getPhotoSprite(item);
    const embeddedOriginal = window.CATALOG_ORIGINAL_PAGES?.[selectedCatalogKey]?.[String(item.sourcePage || '')];
    if (embeddedOriginal) {
      const img = document.createElement('img');
      img.src = embeddedOriginal;
      img.className = 'catalog-original';
      img.alt = displayName + ' 공식 카탈로그 전체 원본';
      img.loading = 'lazy';
      button.appendChild(img);
      button.addEventListener('click', () => expandPhoto({...displayItem, image: embeddedOriginal, originalApproved:true}));
    } else if (sprite && !ORIGINAL_PAGE_GROUPS.has(selectedCatalogKey)) {
      const swatch = document.createElement('div');
      swatch.className = 'photo-sprite';
      swatch.setAttribute('role', 'img');
      swatch.setAttribute('aria-label', displayName + ' 공식 카탈로그 이미지');
      setSpriteBackground(swatch, sprite);
      button.appendChild(swatch);
      button.setAttribute('aria-label', displayName + ' 사진 확대');
      button.addEventListener('click', () => expandSprite(displayItem, sprite));
    } else if (localApprovedImage(item)) {
      const img = document.createElement('img');
      img.src = item.image;
      img.alt = displayName + ' 공식 카탈로그 이미지';
      img.loading = 'lazy';
      button.appendChild(img);
      button.setAttribute('aria-label', displayName + ' 이미지 확대');
      button.addEventListener('click', () => expandPhoto(imageLabel ? displayItem : item));
    } else {
      button.disabled = true;
      button.appendChild(textNode('div', 'photo-placeholder', ORIGINAL_PAGE_GROUPS.has(selectedCatalogKey) ? '공식 고해상도 원본 불러오는 중' : '공식 이미지 검증 대기'));
    }
    if (imageLabel) button.setAttribute('aria-label', displayName + ' 확대');
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

    card.appendChild(info);
    return card;
  }

  // Multiple options on the same source PDF page share one original image.
  // Consolidate that image, never the options or their official annotations.
  function groupVisibleItemsByPage(items) {
    const groups = new Map();
    items.forEach((item, index) => {
      const page = item.sourcePage == null ? '' : String(item.sourcePage);
      const key = ORIGINAL_PAGE_GROUPS.has(selectedCatalogKey) && page
        ? 'page:' + page
        : 'single:' + index;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    return Array.from(groups.values());
  }

  function createCombinedCard(items) {
    const first = items[0];
    const kind = supportedTabs[activeTab];
    const imageLabel = kind + ' ' + items.length + '개 항목 통합 이미지';
    const card = createColorCard(first, imageLabel);
    card.classList.add('color-card--combined');

    const imageButton = card.querySelector('.photo-trigger');
    const head = textNode('div', 'combined-head', '');
    const titleBox = textNode('div', '', '');
    titleBox.appendChild(textNode('h3', 'combined-title', '공식 카탈로그 통합 이미지'));
    titleBox.appendChild(textNode('p', 'combined-caption',
      kind + ' ' + items.length + '개 항목이 원본 ' + first.sourcePage + '페이지에 함께 수록되어 있습니다.'));
    head.appendChild(titleBox);
    head.appendChild(textNode('span', 'combined-count', items.length + '개 항목'));

    const body = textNode('div', 'combined-body', '');
    const photo = textNode('div', 'combined-media', '');
    photo.appendChild(imageButton);
    body.appendChild(photo);

    const options = textNode('div', 'combined-options', '');
    options.setAttribute('role', 'list');
    options.setAttribute('aria-label', kind + ' 항목별 정식 명칭');
    options.appendChild(textNode('p', 'combined-options-title', '컬러·사양 코드와 정식 명칭'));
    for (const item of items) {
      const option = textNode('div', 'combined-option', '');
      option.setAttribute('role', 'listitem');
      if (item.code) option.appendChild(textNode('span', 'color-code', item.code));
      option.appendChild(textNode('strong', 'combined-option-name', item.name));
      if (item.category) option.appendChild(textNode('p', 'meta', '구분: ' + item.category));
      if (item.bodyStyle) option.appendChild(textNode('p', 'meta', '차체: ' + item.bodyStyle));
      if (item.material) option.appendChild(textNode('p', 'meta', '소재: ' + item.material));
      if (item.priceStatus) option.appendChild(textNode('p', 'meta', optionPriceStatus(item.priceStatus)));
      if (item.applicability) option.appendChild(textNode('p', 'meta', '카탈로그 적용: ' + item.applicability));
      if (item.notes) option.appendChild(textNode('p', 'meta', item.notes));
      options.appendChild(option);
    }
    body.appendChild(options);
    card.replaceChildren(head, body);
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

      if (item.notes) element.appendChild(textNode('p', 'meta', item.notes));
      container.appendChild(element);
    }
    container.hidden = false;
  }

  function matchesSelectedBodyStyle(item) {
    if (!item || !item.bodyStyle) return true;
    const isCoupe = (v) => /Coupé|Coupe/i.test(v);
    const isCabriolet = (v) => /Cabriolet/i.test(v);
    if (/CLE/i.test(family)) return isCabriolet(family) === isCabriolet(item.bodyStyle);
    if (/GLC|GLE/i.test(family)) return isCoupe(family) === isCoupe(item.bodyStyle);
    return true;
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
    const items = (Array.isArray(catalog[activeTab]) ? catalog[activeTab] : []).filter(matchesSelectedBodyStyle);
    if (!items.length) {
      renderStatus(supportedTabs[activeTab] + ' 자료가 아직 검증되지 않았습니다. 확인된 항목만 등록됩니다.', true);
      return;
    }
    const availablePhotos = items.filter((item) => Boolean(embeddedOriginal(item) || getPhotoSprite(item) || localApprovedImage(item))).length;
    if (ORIGINAL_PAGE_GROUPS.has(selectedCatalogKey) && availablePhotos < items.length && (pendingOriginalGroups.has(selectedCatalogKey) || originalLoading.has(selectedCatalogKey))) {
      renderStatus('공식 카탈로그의 고해상도 원본 이미지를 불러오는 중입니다.', true);
    } else if (catalog.reviewStatus === 'text_verified' && availablePhotos < items.length) {
      renderStatus('공식 카탈로그의 ' + items.length + '개 항목 중 이미지 연결 항목 ' + availablePhotos + '개를 확인할 수 있습니다. 사진이 없는 항목은 원문 명칭·옵션 코드로 안내합니다. 선택 가능 여부는 연식·트림에 따라 달라질 수 있습니다.', true);
    } else renderStatus('', false);
    const visibleItems = items.filter((it) => it && typeof it.name === 'string' && it.name.trim());
    for (const group of groupVisibleItemsByPage(visibleItems)) {
      grid.appendChild(group.length > 1 ? createCombinedCard(group) : createColorCard(group[0]));
    }
    renderExteriorExtras(catalog);
  }

  function selectFamily(next, resetTrim) {
    if (!vehicleData.models.some((model) => model.family === next)) return;
    family = next;
    familySelect.value = next;
    if (resetTrim) { requestedTrim = ''; requestedMY = ''; }
    configureCatalogChoice();
    syncGuideUrl();
    render();
    requestPhotoGroup();
    requestOriginalBundle();
    requestOriginalPages();
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
      const requestedTab = params.get('tab') || '';
      activeTab = Object.hasOwn(supportedTabs, requestedTab) ? requestedTab : 'exterior';
      const requestedCatalog = params.get('catalog') || '';
      const requestedFamily = params.get('model') || '';
      selectFamily(list.includes(requestedFamily) ? requestedFamily : list[0], false);
      if (requestedCatalog && (catalogData.familyCatalogChoices?.[family] || []).includes(requestedCatalog)) {
        selectedCatalogKey = requestedCatalog;
        byId('catalogKind').value = requestedCatalog;
        syncGuideUrl();
        render();
        requestPhotoGroup();
        requestOriginalBundle();
        requestOriginalPages();
      }
      familySelect.addEventListener('change', () => selectFamily(familySelect.value, true));
    });
  }

  byId('catalogKind').addEventListener('change', (event) => {
    selectedCatalogKey = event.target.value;
    syncGuideUrl();
    render();
    requestPhotoGroup();
    requestOriginalBundle();
    requestOriginalPages();
  });

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => { activeTab = tab.dataset.tab; if (vehicleData) { syncGuideUrl(); render(); } });
  });
  byId('copyColorLink').addEventListener('click', copyGuideLink);
  byId('shareColorLink').addEventListener('click', shareGuideLink);
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
