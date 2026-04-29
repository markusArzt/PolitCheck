const AL_LABELS   = { voll: 'Übereinstimmung', teil: 'Teilweise', keine: 'Keine' };
const POS_LABELS  = { ja: 'Ja', nein: 'Nein', '–': 'kein Antrag' };
const TOPIC_LABELS = {
  miete: 'Miete', wohnbau: 'Wohnbau', eigentum: 'Eigentum',
  leerstand: 'Leerstand', kassenarzt: 'Kassenärzte',
  psyche: 'Psychotherapie', gesreform: 'Systemreform',
};

let selTheme    = 'all';
let selSub      = 'all';
let selParty    = 'fpoe';
let openCards   = new Set();
let openClusters = new Set();

/* ── Navigation ── */
function nav(page) {
  closeMenu();
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
  document.getElementById('mi-' + page).classList.add('active');
}

function toggleMenu() {
  document.getElementById('menu-overlay').classList.toggle('open');
}
function closeMenu() {
  document.getElementById('menu-overlay').classList.remove('open');
}

/* ── Scoring ── */
function filteredRows(pid) {
  return PROMISE_DATA.filter(r => {
    if (pid && r.party !== pid) return false;
    if (selTheme !== 'all' && r.theme !== selTheme) return false;
    if (selSub !== 'all' && r.topic !== selSub) return false;
    return true;
  });
}

function scoreFor(pid) {
  const rows = filteredRows(pid);
  if (!rows.length) return { pct: 0, voll: 0, teil: 0, keine: 0 };
  const voll  = rows.filter(r => r.alignment === 'voll').length;
  const teil  = rows.filter(r => r.alignment === 'teil').length;
  const keine = rows.filter(r => r.alignment === 'keine').length;
  return { pct: Math.round(((voll + teil * 0.5) / rows.length) * 100), voll, teil, keine };
}

/* ── Ring SVG ── */
function ring(pct, active) {
  const r    = 15;
  const circ = +(2 * Math.PI * r).toFixed(1);
  const off  = +(circ - (pct / 100) * circ).toFixed(1);
  const col  = active ? '#fff' : (pct >= 70 ? '#2D6A4F' : pct >= 40 ? '#8B5E00' : '#8B0000');
  return `<svg viewBox="0 0 42 42">
    <circle class="ring-bg" cx="21" cy="21" r="${r}"/>
    <circle cx="21" cy="21" r="${r}" fill="none" stroke="${col}"
      stroke-width="3.5" stroke-linecap="round"
      stroke-dasharray="${circ}" stroke-dashoffset="${off}"/>
  </svg>`;
}

/* ── Build: theme pills ── */
function buildThemePills() {
  document.getElementById('theme-pills').innerHTML = THEMES.map(t =>
    `<button class="pill ${t.id === selTheme ? 'active' : 'inactive'}"
      onclick="setTheme('${t.id}')">${t.label}</button>`
  ).join('');
}

/* ── Build: sub pills ── */
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

/* ── Build: party cards ── */
function buildParties() {
  document.getElementById('parties').innerHTML = PARTIES.map(p => {
    const s      = scoreFor(p.id);
    const active = p.id === selParty;
    return `<div class="party-card${active ? ' active' : ''}" onclick="setParty('${p.id}')">
      <div class="party-abbr">${p.abbr}</div>
      <div class="party-result">${p.result}</div>
      <div class="score-ring">${ring(s.pct, active)}<div class="score-num">${s.pct}%</div></div>
      <div class="party-name">${p.name}</div>
    </div>`;
  }).join('');
}

/* ── Build: summary bar ── */
function buildSummary() {
  const s = scoreFor(selParty);
  document.getElementById('summary').innerHTML = `
    <div class="sum-card"><div class="sum-num" style="color:var(--voll)">${s.voll}</div><div class="sum-label">Übereinstimmung</div></div>
    <div class="sum-card"><div class="sum-num" style="color:var(--teil)">${s.teil}</div><div class="sum-label">Teilweise</div></div>
    <div class="sum-card"><div class="sum-num" style="color:var(--keine)">${s.keine}</div><div class="sum-label">Keine</div></div>
    <div class="sum-card"><div class="sum-num">${s.pct}%</div><div class="sum-label">Score</div></div>`;
}

/* ── Build: promise list ── */
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
    const posCls = r.position === 'ja' ? 'pos-ja' : r.position === 'nein' ? 'pos-nein' : 'pos-none';
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
          <div style="font-size:10px;color:var(--muted);margin-top:4px">${r.src}</div>
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
          <div class="expand-val" style="font-size:11px;color:var(--muted)">${r.logic}</div>
        </div>
        <div class="expand-row" style="margin-bottom:0">
          <div class="expand-label">Anmerkung</div>
          <div class="expand-val" style="font-size:12px">${r.curator}</div>
          ${r.url ? `<a class="parl-link" href="${r.url}" target="_blank" rel="noopener">Parlamentsprotokoll &#8599;</a>` : ''}
        </div>
      </div></div>
    </div>`;
  }).join('');
}

/* ── Build: cluster list ── */
function buildClusters() {
  document.getElementById('cluster-list').innerHTML = CLUSTERS.map(c => {
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
}

/* ── State setters ── */
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

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('mi-promises').classList.add('active');
  buildThemePills();
  buildSubPills();
  buildParties();
  buildSummary();
  buildList();
  buildClusters();
});
