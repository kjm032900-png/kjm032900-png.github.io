/* Real public videos from @movenzz/shorts, verified 2026-11-20.
   This array is intentionally editable: add/remove an entry when a new clip is published.
   No YouTube API key or autoplaying background videos are required. */
(() => {
  'use strict';
  const channel = 'https://www.youtube.com/@movenzz/shorts';
  const videos = [
    {id:'VdWMJMJkFaQ',title:'CLE 450 4MATIC Cabriolet',kind:'카브리올레 출고'},
    {id:'nOIVVeJiwIQ',title:'GLA 250 4MATIC',kind:'SUV 출고'},
    {id:'dJiVrs1WSG4',title:'GLE 450 4MATIC Coupé',kind:'140주년 에디션 출고'},
    {id:'HD3CIRRhvEI',title:'CLE 200 Cabriolet',kind:'140주년 카브리올레'},
    {id:'_kqgw027fCw',title:'AMG CLE 53 4MATIC+ Coupé',kind:'AMG 출고'},
    {id:'jabtnNAVAHs',title:'E 200 AMG Line',kind:'E-Class 출고'},
    {id:'qztIzy37ueE',title:'E 200 EXCLUSIVE',kind:'E-Class 출고'},
    {id:'D3FU7wVV-KQ',title:'EQS 450 SUV',kind:'전기 SUV 출고'},
    {id:'-UUtvYO0yT4',title:'S 500 4MATIC',kind:'S-Class 출고'},
    {id:'Zt-IzDLAivU',title:'GLE 450 4MATIC',kind:'SUV 출고'},
    {id:'7nonyw5PT3o',title:'GLE 450 d',kind:'디젤 SUV 출고'},
    {id:'Togbq5vGQEM',title:'E 300 4MATIC',kind:'E-Class 출고'},
    {id:'fkxcFwgYViE',title:'E 200 EXCLUSIVE',kind:'E-Class 출고'},
    {id:'gvlCjh5QgTs',title:'EQB 300 4MATIC',kind:'전기 SUV 출고'},
    {id:'xwZosDw6lgw',title:'AMG GLE 53',kind:'AMG SUV 출고'}
  ];
  const grid = document.getElementById('shortsGrid');
  const more = document.getElementById('shortsMore');
  const dialog = document.getElementById('shortsDialog');
  if (!grid || !more || !dialog) return;

  const safe = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const byId = id => document.getElementById(id);
  const firstCount = 10;
  let expanded = false;

  function render() {
    grid.innerHTML = videos.map((video, i) => `
      <article class="shorts-card" data-short-id="${safe(video.id)}" ${i >= firstCount && !expanded ? 'hidden' : ''}>
        <button type="button" class="shorts-card-button" data-play-short="${safe(video.id)}" aria-label="${safe(video.title)} 출고 쇼츠 영상 재생">
          <span class="shorts-image">
            <img src="https://i.ytimg.com/vi/${safe(video.id)}/oar2.jpg" loading="lazy" decoding="async" alt="${safe(video.title)} 출고 영상 썸네일">
            <span class="shorts-play-icon" aria-hidden="true">▶</span>
            <span class="shorts-film-label" aria-hidden="true">SHORTS</span>
          </span>
          <span class="shorts-card-copy">
            <span class="shorts-car-title">${safe(video.title)}</span>
            <span class="shorts-car-type">${safe(video.kind)}</span>
          </span>
        </button>
      </article>`).join('');
    byId('shortsCount').textContent = videos.length + '개 출고 영상';
    more.hidden = videos.length <= firstCount;
    more.textContent = expanded ? '간략히 보기 ↑' : '출고 영상 ' + (videos.length - firstCount) + '개 더 보기 ↓';
    more.setAttribute('aria-expanded', String(expanded));
    grid.querySelectorAll('img').forEach(img => img.addEventListener('error', () => {
      if (img.dataset.fallback) { img.closest('.shorts-image')?.classList.add('shorts-image-unavailable'); img.remove(); return; }
      img.dataset.fallback = '1';
      img.src = img.src.replace('/oar2.jpg', '/hqdefault.jpg');
    }));
  }

  function play(id) {
    const video = videos.find(item => item.id === id);
    if (!video) return;
    byId('shortsDialogTitle').textContent = video.title + ' · 출고 쇼츠';
    const url = 'https://www.youtube.com/shorts/' + encodeURIComponent(video.id);
    const external = byId('shortsExternal');
    external.href = url;
    byId('shortsFrame').src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(video.id) + '?autoplay=1&playsinline=1&rel=0';
    dialog.showModal();
  }

  more.addEventListener('click', () => {expanded=!expanded;render();});
  grid.addEventListener('click', event => {
    const button=event.target.closest('button[data-play-short]');
    if (button) play(button.dataset.playShort);
  });
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  byId('shortsClose').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {byId('shortsFrame').removeAttribute('src');});
  // Never initiate a YouTube player until an explicit click on a Shorts card.
  render();
})();