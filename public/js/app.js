// ============================
// FRONTEND JAVASCRIPT (app.js)
// All UI logic + API calls
// ============================

const API = 'http://localhost:3000/api';
let currentUser = null;
let allDoubts   = [];
let allSeniors  = [];
let selectedStars = 0;

// ── ON LOAD ───────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('pt_user');
  const token = localStorage.getItem('pt_token');
  if (saved && token) {
    currentUser = JSON.parse(saved);
    updateNavForUser();
  }
  showPage('home');
  loadStats();
});

// ── PAGE NAVIGATION ────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');

  if (name === 'doubts')    loadDoubts();
  if (name === 'seniors')   loadSeniors();
  if (name === 'dashboard') loadDashboard();
}

// ── NAV UPDATE ─────────────────────────────────────────
function updateNavForUser() {
  const { name, role } = currentUser;
  document.getElementById('userGreet').textContent = `👤 ${name} (${role})`;
  document.getElementById('userGreet').classList.remove('hidden');
  document.getElementById('btn-login').classList.add('hidden');
  document.getElementById('btn-register').classList.add('hidden');
  document.getElementById('btn-logout').classList.remove('hidden');
  document.getElementById('nav-doubts').classList.remove('hidden');
  document.getElementById('nav-seniors').classList.remove('hidden');
  document.getElementById('nav-dashboard').classList.remove('hidden');

  // Only juniors see "Post Doubt" button
  const postBtn = document.getElementById('postDoubtBtn');
  if (postBtn) {
    if (role === 'junior') postBtn.classList.remove('hidden');
    else postBtn.classList.add('hidden');
  }
}

// ── AUTH: LOGIN ────────────────────────────────────────
async function doLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const res  = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) return showError('loginError', data.error);

    currentUser = data.user;
    localStorage.setItem('pt_token', data.token);
    localStorage.setItem('pt_user', JSON.stringify(data.user));
    updateNavForUser();
    showToast(`Welcome back, ${data.user.name}! 🎉`);
    showPage('doubts');
  } catch {
    showError('loginError', 'Server error, please try again.');
  }
}

// ── AUTH: REGISTER ─────────────────────────────────────
async function doRegister(e) {
  e.preventDefault();
  const body = {
    name:     document.getElementById('regName').value,
    email:    document.getElementById('regEmail').value,
    password: document.getElementById('regPassword').value,
    role:     document.getElementById('regRole').value,
    branch:   document.getElementById('regBranch').value,
    year:     document.getElementById('regYear').value,
    bio:      document.getElementById('regBio').value
  };

  try {
    const res  = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) return showError('regError', data.error);

    currentUser = data.user;
    localStorage.setItem('pt_token', data.token);
    localStorage.setItem('pt_user', JSON.stringify(data.user));
    updateNavForUser();
    showToast(`Account created! Welcome, ${data.user.name}! 🚀`);
    showPage('doubts');
  } catch {
    showError('regError', 'Server error, please try again.');
  }
}

// ── LOGOUT ─────────────────────────────────────────────
function logout() {
  currentUser = null;
  localStorage.removeItem('pt_token');
  localStorage.removeItem('pt_user');
  location.reload();
}

// ── LOAD DOUBTS ────────────────────────────────────────
async function loadDoubts() {
  if (!currentUser) return;
  try {
    const res = await apiGet('/doubts');
    allDoubts = await res.json();
    renderDoubts(allDoubts);
  } catch {
    document.getElementById('doubtsList').innerHTML = '<div class="loading-state">Failed to load doubts.</div>';
  }
}

function renderDoubts(doubts) {
  const el = document.getElementById('doubtsList');
  if (!doubts.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📭</div>
      <h3>No doubts yet!</h3>
      <p>Be the first to post a doubt.</p>
    </div>`;
    return;
  }

  el.innerHTML = doubts.map(d => `
    <div class="doubt-card" onclick="openDoubt(${d.id})">
      <span class="badge badge-${d.status}">${d.status}</span>
      <h4>${escHtml(d.title)}</h4>
      <p>${escHtml(d.description)}</p>
      <div class="doubt-meta">
        <span>👤 ${escHtml(d.junior_name)}</span>
        <span class="subject-tag">${escHtml(d.subject)}</span>
      </div>
    </div>
  `).join('');
}

// ── FILTER DOUBTS ──────────────────────────────────────
function filterDoubts() {
  const q = document.getElementById('searchDoubt').value.toLowerCase();
  renderDoubts(allDoubts.filter(d =>
    d.subject.toLowerCase().includes(q) ||
    d.title.toLowerCase().includes(q)
  ));
}

// ── OPEN DOUBT DETAIL ──────────────────────────────────
async function openDoubt(id) {
  showPage('doubtDetail');
  const container = document.getElementById('doubtDetail');
  container.innerHTML = '<div class="detail-container"><div class="loading-state">Loading...</div></div>';

  const res  = await apiGet(`/doubts/${id}`);
  const data = await res.json();

  const isJunior  = currentUser.role === 'junior';
  const isSenior  = currentUser.role === 'senior';
  const isOwner   = currentUser.id === data.junior_id;
  const isOpen    = data.status === 'open';
  const isAssigned= data.status === 'assigned';
  const canResolve= isOwner && (isOpen || isAssigned);

  const answersHtml = data.answers.length
    ? data.answers.map(a => `
      <div class="answer-card">
        <div class="answer-meta">
          <div class="answer-avatar">👨‍🏫</div>
          <div>
            <strong>${escHtml(a.senior_name)}</strong>
            <span>⭐ ${a.rating || '—'}</span>
          </div>
        </div>
        <div class="answer-content">${escHtml(a.content)}</div>
        ${canResolve ? `
          <div style="margin-top:1rem">
            <p style="color:var(--muted);font-size:.8rem;margin-bottom:.5rem">Rate this senior:</p>
            <div class="star-rating" id="stars-${a.senior_id}">
              ${[1,2,3,4,5].map(n => `
                <button class="star-btn" data-val="${n}" data-sid="${a.senior_id}"
                  onclick="rateSenior(${n},${a.senior_id},${id})">⭐</button>
              `).join('')}
            </div>
          </div>` : ''}
      </div>
    `).join('')
    : `<div class="empty-state"><div class="empty-icon">🤔</div><h3>No answers yet</h3><p>Seniors will answer soon!</p></div>`;

  container.innerHTML = `
    <div class="detail-container">
      <div class="detail-header">
        <span class="badge badge-${data.status}">${data.status}</span>
        <h2>${escHtml(data.title)}</h2>
        <p style="color:var(--muted);margin-top:4px">Subject: <strong style="color:var(--primary)">${escHtml(data.subject)}</strong> | Posted by: ${escHtml(data.junior_name)}</p>
      </div>
      <div class="detail-content">${escHtml(data.description)}</div>

      ${canResolve && data.answers.length ? `
        <div style="margin-bottom:1.5rem">
          <button class="btn btn-accent btn-sm" onclick="resolveDoubt(${id})">✅ Mark as Resolved</button>
        </div>` : ''}

      <div class="answers-section">
        <h3>💬 Answers (${data.answers.length})</h3>
        ${answersHtml}
      </div>

      ${isSenior && isOpen ? `
        <div class="answer-form">
          <h3>✍️ Post Your Answer</h3>
          <div class="form-group">
            <textarea id="answerContent" rows="5" placeholder="Write your detailed answer here..."></textarea>
          </div>
          <button class="btn btn-primary" onclick="postAnswer(${id})">Submit Answer</button>
        </div>` : ''}
    </div>
  `;
}

// ── POST ANSWER (seniors) ──────────────────────────────
async function postAnswer(doubtId) {
  const content = document.getElementById('answerContent').value;
  if (!content.trim()) return showToast('Please write an answer!', true);

  const res = await apiPost(`/doubts/${doubtId}/answer`, { content });
  if (res.ok) { showToast('Answer posted! 🎉'); openDoubt(doubtId); }
  else { const d = await res.json(); showToast(d.error, true); }
}

// ── POST DOUBT (juniors) ──────────────────────────────
async function postDoubt(e) {
  e.preventDefault();
  const body = {
    title:       document.getElementById('doubtTitle').value,
    subject:     document.getElementById('doubtSubject').value,
    description: document.getElementById('doubtDesc').value
  };

  const res = await apiPost('/doubts', body);
  if (res.ok) {
    hideModal('postDoubtModal');
    showToast('Doubt posted! Seniors will answer soon. 🙌');
    document.getElementById('doubtTitle').value = '';
    document.getElementById('doubtSubject').value = '';
    document.getElementById('doubtDesc').value = '';
    loadDoubts();
  } else {
    const d = await res.json();
    showError('postDoubtError', d.error);
  }
}

// ── RESOLVE DOUBT + RATE ──────────────────────────────
async function resolveDoubt(id) {
  const res = await apiPost(`/doubts/${id}/resolve`, {});
  if (res.ok) { showToast('Doubt resolved! 🎊'); loadDoubts(); showPage('doubts'); }
}

async function rateSenior(stars, seniorId, doubtId) {
  // Highlight stars
  const btns = document.querySelectorAll(`[data-sid="${seniorId}"]`);
  btns.forEach(b => b.classList.toggle('active', +b.dataset.val <= stars));

  const res = await apiPost(`/doubts/${doubtId}/resolve`, { stars, senior_id: seniorId });
  if (res.ok) showToast(`Rated ${stars} ⭐ — thanks for the feedback!`);
}

// ── LOAD SENIORS ───────────────────────────────────────
async function loadSeniors() {
  if (!currentUser) return;
  const res = await apiGet('/doubts/list/seniors');
  allSeniors = await res.json();
  renderSeniors(allSeniors);
}

function renderSeniors(seniors) {
  const el = document.getElementById('seniorsList');
  if (!seniors.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">👨‍🏫</div><h3>No seniors yet</h3></div>`;
    return;
  }
  el.innerHTML = seniors.map(s => `
    <div class="senior-card">
      <div class="senior-avatar">👨‍🎓</div>
      <h4>${escHtml(s.name)}</h4>
      <span class="branch-tag">${escHtml(s.branch)} · Year ${s.year}</span>
      <div class="rating">
        <span class="stars">${'⭐'.repeat(Math.round(s.rating || 0))}</span>
        <span class="score">${s.rating ? s.rating.toFixed(1) : 'New'}</span>
      </div>
      <p class="bio">${escHtml(s.bio || 'No bio yet')}</p>
    </div>
  `).join('');
}

function filterSeniors() {
  const q = document.getElementById('searchSenior').value.toLowerCase();
  renderSeniors(allSeniors.filter(s =>
    s.name.toLowerCase().includes(q) || s.branch.toLowerCase().includes(q)
  ));
}

// ── DASHBOARD ──────────────────────────────────────────
async function loadDashboard() {
  if (!currentUser) return;
  const res    = await apiGet('/doubts');
  const doubts = await res.json();

  const myDoubts = currentUser.role === 'junior'
    ? doubts.filter(d => d.junior_id === currentUser.id)
    : doubts.filter(d => d.senior_id === currentUser.id);

  const open     = myDoubts.filter(d => d.status === 'open').length;
  const resolved = myDoubts.filter(d => d.status === 'resolved').length;

  document.getElementById('dashboardContent').innerHTML = `
    <div class="dash-stat">
      <div class="num">${myDoubts.length}</div>
      <div class="label">${currentUser.role === 'junior' ? 'My Doubts' : 'Doubts Answered'}</div>
    </div>
    <div class="dash-stat">
      <div class="num">${open}</div>
      <div class="label">Open</div>
    </div>
    <div class="dash-stat">
      <div class="num">${resolved}</div>
      <div class="label">Resolved</div>
    </div>
    ${currentUser.role === 'senior' ? `
    <div class="dash-stat">
      <div class="num">⭐ ${currentUser.rating || 0}</div>
      <div class="label">Your Rating</div>
    </div>` : ''}

    <div class="dash-list">
      <h3>${currentUser.role === 'junior' ? '📚 My Recent Doubts' : '✍️ Doubts I Helped With'}</h3>
      ${myDoubts.length ? myDoubts.slice(0,5).map(d => `
        <div class="doubt-card" style="margin-bottom:1rem" onclick="openDoubt(${d.id})">
          <span class="badge badge-${d.status}">${d.status}</span>
          <h4>${escHtml(d.title)}</h4>
          <span class="subject-tag">${escHtml(d.subject)}</span>
        </div>
      `).join('') : '<div class="empty-state"><p>Nothing here yet!</p></div>'}
    </div>
  `;
}

// ── HOME STATS ─────────────────────────────────────────
async function loadStats() {
  // Just animated count-up to make it look alive
  animateCount('stat-doubts', 0, 142);
  animateCount('stat-seniors', 0, 38);
  animateCount('stat-users',   0, 210);
}

function animateCount(id, from, to) {
  const el = document.getElementById(id);
  if (!el) return;
  let cur = from;
  const step = Math.ceil((to - from) / 40);
  const timer = setInterval(() => {
    cur = Math.min(cur + step, to);
    el.textContent = cur + '+';
    if (cur >= to) clearInterval(timer);
  }, 40);
}

// ── MODAL HELPERS ──────────────────────────────────────
function showModal(id) {
  if (!currentUser) { showPage('login'); return; }
  document.getElementById(id).classList.remove('hidden');
}
function hideModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// ── TOAST ──────────────────────────────────────────────
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' error' : '');
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3500);
}

// ── ERROR MESSAGE ─────────────────────────────────────
function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}

// ── API HELPERS ────────────────────────────────────────
function getToken() { return localStorage.getItem('pt_token') || ''; }

function apiGet(path) {
  return fetch(API + path, {
    headers: { Authorization: 'Bearer ' + getToken() }
  });
}

function apiPost(path, body) {
  return fetch(API + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + getToken()
    },
    body: JSON.stringify(body)
  });
}

// ── ESCAPE HTML (XSS prevention) ─────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Close modal on outside click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.add('hidden');
  }
});
