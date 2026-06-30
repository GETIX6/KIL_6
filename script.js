const supabaseUrl = 'https://xtvqfcjezjsqj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYXZmZXVkeHR2cWZjZWp6c3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzc2NDcsImV4cCI6MjA5NzAxMzY0N30._UJ4ThTtQUzjY1bMwdFFTRIwGhaZTqNOh__1mzzw1hw';

const supabase = Supabase.createClient(supabaseUrl, supabaseAnonKey);

let currentUser = null;
let clanMembers = [];
let currentFilteredMembers = [];

function getKpdColor(kpd) {
  if (kpd >= 10) return "#c026d3";
  if (kpd >= 7) return "#00ff88";
  if (kpd >= 4) return "#ffd700";
  return "#ff4444";
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.style.display = 'block';
  setTimeout(() => toast.style.display = 'none', 3200);
}

function launchConfetti() {
  const colors = ['#00ff88', '#ffd700', '#00ccff'];
  for (let i = 0; i < 80; i++) {
    const particle = document.createElement('div');
    particle.style.position = 'fixed';
    particle.style.left = Math.random() * 100 + 'vw';
    particle.style.top = '-20px';
    particle.style.width = '8px';
    particle.style.height = '8px';
    particle.style.background = colors[Math.floor(Math.random()*colors.length)];
    particle.style.borderRadius = '50%';
    particle.style.zIndex = '9999';
    particle.style.pointerEvents = 'none';
    document.body.appendChild(particle);
    const duration = Math.random() * 2500 + 1800;
    particle.animate([{ transform: `translateY(0) rotate(0deg)`, opacity: 1 }, { transform: `translateY(${window.innerHeight + 100}px) rotate(${Math.random()*240}deg)`, opacity: 0 }], { duration, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)' }).onfinish = () => particle.remove();
  }
}

async function loadClanMembers() {
  const loader = document.getElementById('tabLoader');
  if (loader) loader.style.display = 'flex';
  try {
    const { data, error } = await supabase.from('clan_members').select('*').order('nickname');
    if (error) throw error;
    clanMembers = data || [];
    renderMembers(clanMembers);
  } catch (err) {
    console.error(err);
    showToast('Ошибка загрузки состава', 'error');
  } finally {
    if (loader) loader.style.display = 'none';
  }
}

function renderMembers(filtered) {
  currentFilteredMembers = filtered;
  const container = document.getElementById('membersCards');
  if (!container) return;
  container.innerHTML = '';
  filtered.forEach((m, i) => {
    const offset = 385 - (m.kpd / 10) * 385;
    const color = getKpdColor(m.kpd);
    const avatar = m.avatar_url || `https://via.placeholder.com/300x185/111827/00ff88?text=${m.nickname}`;
    const card = document.createElement('div');
    card.className = 'card glass';
    card.style.animationDelay = `${i * 55}ms`;
    card.innerHTML = `
      <img src="${avatar}" alt="${m.nickname}">
      <div class="card-body">
        <h3>${m.nickname}</h3>
        <p style="color:#aaa">${m.role || 'Активный игрок'}</p>
        <div class="kpd-circle">
          <svg width="132" height="132">
            <circle class="background" cx="66" cy="66" r="52"></circle>
            <circle class="progress" cx="66" cy="66" r="52" stroke="${color}" style="--final-offset: ${offset};"></circle>
          </svg>
          <div class="kpd-text">${m.kpd}<span class="kpd-max">/10</span></div>
        </div>
      </div>
    `;
    card.addEventListener('click', () => openPlayerModal(m));
    container.appendChild(card);
  });
}

function filterAndSort() {
  let f = [...clanMembers];
  const term = document.getElementById('searchInput').value.toLowerCase().trim();
  if (term) f = f.filter(m => m.nickname.toLowerCase().includes(term));
  const sort = document.getElementById('sortSelect').value;
  if (sort === 'name-asc') f.sort((a,b) => a.nickname.localeCompare(b.nickname));
  if (sort === 'name-desc') f.sort((a,b) => b.nickname.localeCompare(a.nickname));
  if (sort === 'kpd-desc') f.sort((a,b) => b.kpd - a.kpd);
  if (sort === 'kpd-asc') f.sort((a,b) => a.kpd - a.kpd);
  renderMembers(f);
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const nick = document.getElementById('regNickname').value.trim();
  const pass = document.getElementById('regPassword').value.trim();
  if (!nick || !pass) return showToast('Введите ник и пароль', 'error');

  try {
    const { data: player } = await supabase.from('clan_members').select('*').eq('nickname', nick).single();
    if (!player) return showToast('Игрока нет в составе', 'error');

    const { data: acc } = await supabase.from('user_accounts').select('*').eq('nickname', nick).single();

    if (acc) {
      if (acc.password === pass) {
        currentUser = player;
        localStorage.setItem('currentClanUser', JSON.stringify(currentUser));
        launchConfetti();
        showToast(`Добро пожаловать, ${nick}!`, 'success');
        renderCabinet();
      } else {
        showToast('Неверный пароль', 'error');
      }
    } else {
      await supabase.from('user_accounts').insert({ nickname: nick, password: pass });
      currentUser = player;
      localStorage.setItem('currentClanUser', JSON.stringify(currentUser));
      launchConfetti();
      showToast(`Аккаунт создан! Добро пожаловать, ${nick}!`, 'success');
      renderCabinet();
    }
  } catch (err) {
    console.error(err);
    showToast('Ошибка базы', 'error');
  }
}

function renderCabinet() {
  const c = document.getElementById('cabinetContent');
  if (!c) return;
  if (!currentUser) {
    c.innerHTML = `
      <div class="glass" style="padding:2.8rem;border-radius:22px;border:3px solid var(--primary);max-width:480px;margin:0 auto;">
        <h3 style="text-align:center;color:var(--primary);margin-bottom:1.4rem;">Вход / Регистрация</h3>
        <form id="authForm" class="auth-form">
          <input type="text" id="regNickname" class="auth-input" placeholder="Никнейм" list="list" required>
          <datalist id="list"></datalist>
          <div style="position:relative;margin-bottom:18px;">
            <input type="password" id="regPassword" class="auth-input" placeholder="Пароль" required style="padding-right:48px;">
            <button type="button" onclick="togglePasswordVisibility('regPassword', this)" style="position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;color:#888;font-size:1.3rem;cursor:pointer;">Show</button>
          </div>
          <button type="submit" class="auth-btn">Войти / Зарегистрироваться</button>
        </form>
      </div>
    `;
    setTimeout(() => {
      const f = document.getElementById('authForm');
      if (f) f.addEventListener('submit', handleAuthSubmit);
      const d = document.getElementById('list');
      if (d) {
        d.innerHTML = '';
        clanMembers.forEach(m => {
          const o = document.createElement('option');
          o.value = m.nickname;
          d.appendChild(o);
        });
      }
    }, 100);
  } else {
    c.innerHTML = `<h2 style="color:#00ff88;text-align:center;">Привет, ${currentUser.nickname}!</h2>`;
  }
}

function logoutUser() {
  currentUser = null;
  localStorage.removeItem('currentClanUser');
  renderCabinet();
  showToast('Вы вышли', 'success');
}

function togglePasswordVisibility(id, btn) {
  const i = document.getElementById(id);
  i.type = i.type === 'password' ? 'text' : 'password';
  btn.textContent = i.type === 'password' ? 'Show' : 'Hide';
}

function initTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      const loader = document.getElementById('tabLoader');
      if (loader) loader.style.display = 'flex';
      setTimeout(() => {
        if (loader) loader.style.display = 'none';
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
        document.getElementById(target).classList.add('active');
        if (target === 'members') filterAndSort();
        if (target === 'cabinet') renderCabinet();
      }, 700);
    });
  });
}

function initFilters() {
  const s = document.getElementById('searchInput');
  const o = document.getElementById('sortSelect');
  if (s) s.addEventListener('input', filterAndSort);
  if (o) o.addEventListener('change', filterAndSort);
}

async function initEverything() {
  const saved = localStorage.getItem('currentClanUser');
  if (saved) currentUser = JSON.parse(saved);

  initTabs();
  initFilters();
  await loadClanMembers();

  if (currentUser) {
    const cab = document.querySelector('[data-tab="cabinet"]');
    if (cab) cab.click();
  }
  console.log('%c[KIL_6] Сайт готов с Supabase!', 'color:#00ff88');
}

document.addEventListener('DOMContentLoaded', initEverything);