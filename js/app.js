const AL_LABELS   = { voll: 'Übereinstimmung', teil: 'Teilweise', keine: 'Keine' };
const POS_LABELS  = { ja: 'Ja', nein: 'Nein', '–': 'kein Antrag' };
const TOPIC_LABELS = {
  miete: 'Miete', wohnbau: 'Wohnbau', eigentum: 'Eigentum',
  leerstand: 'Leerstand', kassenarzt: 'Kassenärzte',
  psyche: 'Psychotherapie', gesreform: 'Systemreform',
  konsolidierung: 'Konsolidierung', sozialabbau: 'Sozialabbau',
  klima_budget: 'Klimaausgaben', klimabonus: 'Klimabonus/CO₂',
  energie: 'Energie', arbeit: 'Arbeit', armut: 'Armutsbekämpfung',
  asyl: 'Asyl', integration: 'Integration', schule: 'Schule',
  hochschule: 'Hochschule', sicherheit: 'Sicherheit',
  grundrechte: 'Grundrechte', transparenz: 'Transparenz', kontrolle: 'Kontrolle',
};

let selTheme     = 'all';
let selSub       = 'all';
let selParty     = 'fpoe';
let openCards    = new Set();
let openClusters = new Set();
let currentPage  = 'promises';

/* ─────────────────────────────────────
   NAVIGATION
───────────────────────────────────── */
function nav(page) {
  currentPage = page;
  closeMenu();

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');

  // mobile menu items
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
  const mi = document.getElementById('mi-' + page);
  if (mi) mi.classList.add('active');

  // desktop nav buttons
  document.querySelectorAll('.desktop-nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });

  // on votes page, wrap clusters in desktop grid
  if (page === 'votes') applyDesktopClusterGrid();
}

function toggleMenu() {
  document.getElementById('menu-overlay').classList.toggle('open');
}
function closeMenu() {
  document.getElementById('menu-overlay').classList.remove('open');
}

/* ─────────────────────────────────────
   DESKTOP INLINE NAV
───────────────────────────────────── */
function buildDesktopNav() {
  const nav = document.getElementById('desktop-nav');
  nav.innerHTML = [
    { page: 'promises', label: 'Versprechen' },
    { page: 'votes',    label: 'Alle Abstimmungen' },
  ].map(item => `
    <button class="desktop-nav-btn${item.page === currentPage ? ' active' : ''}"
      data-page="${item.page}" onclick="nav('${item.page}')">
      ${item.label}
    </button>`
  ).join('');
}

/* ─────────────────────────────────────
   SIDEBAR VISIBILITY
   On mobile the sidebar is part of the
   page flow; on desktop it's sticky.
   On the "votes" page, hide it on mobile.
───────────────────────────────────── */
function updateSidebarVisibility() {
  const sidebar = document.getElementById('sidebar');
  const isDesktop = window.innerWidth >= 1024;
  if (!isDesktop && currentPage === 'votes') {
    sidebar.style.display = 'none';
  } else {
    sidebar.style.display = '';
  }
}

/* ─────────────────────────────────────
   SCORING
───────────────────────────────────── */
function filteredRows(pid) {
  return PROMISE_DATA.filter(r => {
    if (pid && r.party !== pid) return false;
    if (selTheme !== 'all' && r.theme !== selTheme) return false;
    if (selSub !== 'all' && r.topic !== selSub) return false;
    return true;
  });
}

function scoreFor(pid) {
  const rows  = filteredRows(pid);
  if (!rows.length) return { pct: 0, voll: 0, teil: 0, keine: 0 };
  const voll  = rows.filter(r => r.alignment === 'voll').length;
  const teil  = rows.filter(r => r.alignment === 'teil').length;
  const keine = rows.filter(r => r.alignment === 'keine').length;
  return { pct: Math.round(((voll + teil * 0.5) / rows.length) * 100), voll, teil, keine };
}

/* ─────────────────────────────────────
   RING SVG
───────────────────────────────────── */
function ring(pct, active, size = 42) {
  const r    = (size / 2) - 4;
  const circ = +(2 * Math.PI * r).toFixed(1);
  const off  = +(circ - (pct / 100) * circ).toFixed(1);
  const col  = active ? '#fff' : (pct >= 70 ? '#2D6A4F' : pct >= 40 ? '#8B5E00' : '#8B0000');
  return `<svg viewBox="0 0 ${size} ${size}">
    <circle class="ring-bg" cx="${size/2}" cy="${size/2}" r="${r}"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${col}"
      stroke-width="3.5" stroke-linecap="round"
      stroke-dasharray="${circ}" stroke-dashoffset="${off}"/>
  </svg>`;
}

/* ─────────────────────────────────────
   BUILD: THEME PILLS
───────────────────────────────────── */
function buildThemePills() {
  document.getElementById('theme-pills').innerHTML = THEMES.map(t =>
    `<button class="pill ${t.id === selTheme ? 'active' : 'inactive'}"
      onclick="setTheme('${t.id}')">${t.label}</button>`
  ).join('');
}

/* ─────────────────────────────────────
   BUILD: SUB PILLS
───────────────────────────────────── */
function buildSubPills() {
  const t   = THEMES.find(t => t.id === selTheme);
  const sec = document.getElementById('sub-section');
  if (!t || !t.subs.length) { sec.style.display = 'none'; return; }
  sec.style.display = 'block';
  document.getElementById('sub-pills').innerHTML = t.subs.map(s =>
    `<button class="pill ${s.id === selSub ? 'active' : 'inactive'}"
      onclick="setSub('${s.id}')">${s.label}</button>`
  ).join('');
}

/* ─────────────────────────────────────
   BUILD: PARTY CARDS
───────────────────────────────────── */
function buildParties() {
  const isDesktop = window.innerWidth >= 1024;
  const cardSize  = isDesktop ? 48 : 42;

  document.getElementById('parties').innerHTML = PARTIES.map(p => {
    const s      = scoreFor(p.id);
    const active = p.id === selParty;
    return `<div class="party-card${active ? ' active' : ''}" onclick="setParty('${p.id}')">
      <div class="party-abbr">${p.abbr}</div>
      <div class="party-result">${p.result}</div>
      <div class="score-ring" style="width:${cardSize}px;height:${cardSize}px">
        ${ring(s.pct, active, cardSize)}
        <div class="score-num">${s.pct}%</div>
      </div>
      <div class="party-name">${p.name}</div>
    </div>`;
  }).join('');
}

/* ─────────────────────────────────────
   BUILD: SUMMARY BAR
───────────────────────────────────── */
function buildSummary() {
  const s    = scoreFor(selParty);
  const party = PARTIES.find(p => p.id === selParty);
  document.getElementById('summary').innerHTML = `
    <div class="sum-card">
      <div class="sum-num" style="color:var(--voll)">${s.voll}</div>
      <div class="sum-label">Übereinstimmung</div>
    </div>
    <div class="sum-card">
      <div class="sum-num" style="color:var(--teil)">${s.teil}</div>
      <div class="sum-label">Teilweise</div>
    </div>
    <div class="sum-card">
      <div class="sum-num" style="color:var(--keine)">${s.keine}</div>
      <div class="sum-label">Keine</div>
    </div>
    <div class="sum-card">
      <div class="sum-num">${s.pct}%</div>
      <div class="sum-label">Score</div>
    </div>`;
}

/* ─────────────────────────────────────
   BUILD: PROMISE LIST
───────────────────────────────────── */
function buildList() {
  const rows = filteredRows(selParty);
  document.getElementById('list-count').textContent = rows.length + ' Einträge';

  if (!rows.length) {
    document.getElementById('promise-list').innerHTML =
      '<div class="empty">Keine Einträge für diese Auswahl.</div>';
    return;
  }

  document.getElementById('promise-list').innerHTML = rows.map((r, i) => {
    const id     = `pc-${r.party}-${r.topic}-${i}`;
    const isOpen = openCards.has(id);
    const posCls = r.position === 'ja' ? 'pos-ja'
                 : r.position === 'nein' ? 'pos-nein' : 'pos-none';

    return `<div class="promise-card${isOpen ? ' open' : ''}" id="${id}" onclick="toggleCard('${id}')">
      <div class="pc-top">
        <div class="dot ${r.alignment}"></div>
        <div class="pc-body">
          <div class="pc-promise">${r.promise}</div>
          <div class="pc-meta">
            <span class="pc-topic">${TOPIC_LABELS[r.topic] || r.topic}</span>
            <span class="al-badge ${r.alignment}">${AL_LABELS[r.alignment]}</span>
          </div>
        </div>
        <span class="chevron-s">&#9654;</span>
      </div>
      <div class="pc-expand"><div class="pc-inner">
        <div class="expand-row">
          <div class="expand-label">Wahlversprechen</div>
          <div class="expand-quote">${r.quote}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:5px">${r.src}</div>
        </div>
        <div class="expand-row">
          <div class="expand-label">Abstimmung</div>
          <div class="vote-row">
            <span class="pos-pill ${posCls}">${POS_LABELS[r.position] || '–'}</span>
            <span class="logic-text">${r.vote} &middot; ${r.vote_type}</span>
          </div>
        </div>
        <div class="expand-row">
          <div class="expand-label">Klassifizierung</div>
          <div class="expand-val" style="color:var(--muted)">${r.logic}</div>
        </div>
        <div class="expand-row">
          <div class="expand-label">Anmerkung</div>
          <div class="expand-val">${r.curator}</div>
          ${r.url ? `<a class="parl-link" href="${r.url}" target="_blank" rel="noopener">Parlamentsprotokoll &#8599;</a>` : ''}
        </div>
      </div></div>
    </div>`;
  }).join('');
}

/* ─────────────────────────────────────
   BUILD: CLUSTER LIST
───────────────────────────────────── */
function buildClusters() {
  const clusterHTML = CLUSTERS.map(c => {
    const isOpen = openClusters.has(c.id);
    return `<div class="cluster${isOpen ? ' open' : ''}" id="cl-${c.id}">
      <div class="cluster-head" onclick="toggleCluster('${c.id}')">
        <div class="cl-icon" style="background:${c.iconBg};color:${c.iconColor}">${c.icon}</div>
        <div class="cl-title">${c.label}</div>
        <div class="cl-count">${c.votes.length}</div>
        <div class="cl-chevron">&#9654;</div>
      </div>
      <div class="cluster-body">
        ${c.votes.map(v => `
          <div class="vote-item">
            <div class="v-dot ${v.s}"></div>
            <div class="v-text">
              <div class="v-title">${v.title}</div>
              <div class="v-meta">
                <span class="v-date">${v.date}</span>
                <span class="v-badge ${v.s === 'b' ? 'vb-b' : 'vb-a'}">${v.s === 'b' ? 'Beschlossen' : 'Abgelehnt'}</span>
                <span class="v-note">${v.note}</span>
              </div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
  }).join('');

  document.getElementById('cluster-list').innerHTML = clusterHTML;
  applyDesktopClusterGrid();
}

function applyDesktopClusterGrid() {
  const list = document.getElementById('cluster-list');
  if (!list) return;
  if (window.innerWidth >= 1024) {
    list.classList.add('cluster-grid-desktop');
  } else {
    list.classList.remove('cluster-grid-desktop');
  }
}

/* ─────────────────────────────────────
   STATE SETTERS
───────────────────────────────────── */
function setTheme(id) {
  selTheme = id; selSub = 'all'; openCards.clear();
  buildThemePills(); buildSubPills(); buildParties(); buildSummary(); buildList();
}
function setSub(id) {
  selSub = id; openCards.clear();
  buildSubPills(); buildParties(); buildSummary(); buildList();
}
function setParty(id) {
  selParty = id; openCards.clear();
  buildParties(); buildSummary(); buildList();
}
function toggleCard(id) {
  openCards.has(id) ? openCards.delete(id) : openCards.add(id);
  document.getElementById(id)?.classList.toggle('open', openCards.has(id));
}
function toggleCluster(id) {
  openClusters.has(id) ? openClusters.delete(id) : openClusters.add(id);
  document.getElementById('cl-' + id)?.classList.toggle('open', openClusters.has(id));
}

/* ─────────────────────────────────────
   RESPONSIVE: rebuild on resize
───────────────────────────────────── */
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    buildParties();
    applyDesktopClusterGrid();
    updateSidebarVisibility();
  }, 150);
});

/* ─────────────────────────────────────
   INIT
───────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('mi-promises').classList.add('active');
  buildDesktopNav();
  buildThemePills();
  buildSubPills();
  buildParties();
  buildSummary();
  buildList();
  buildClusters();
  updateSidebarVisibility();
});
