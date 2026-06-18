'use strict';

import { saveScoreRemote, loadScoresRemote } from './firebase.js';

// ─── 상수 ──────────────────────────────────────
const TIMER_SEC          = 15;
const LS_KEY             = 'cq_leaderboard';
const POINTS_PER_CORRECT = 10;

const DIFFICULTY_PROJECTS = {
  easy:     ['쿠키런 클래식'],
  normal:   ['쿠키런 클래식', '쿠키런 킹덤'],
  hard:     ['쿠키런 클래식', '쿠키런 킹덤', '쿠키런 오븐브레이크'],
  veryhard: ['쿠키런 클래식', '쿠키런 킹덤', '쿠키런 오븐브레이크', '모험의 탑'],
};

const DIFFICULTY_LABEL = { easy: '쉬움', normal: '보통', hard: '어려움', veryhard: '더 어려움' };

const DIFFICULTY_DESC = {
  easy:     '쿠키런 클래식 쿠키만 등장해요',
  normal:   '쿠키런 클래식과 쿠키런 킹덤의 쿠키가 등장해요',
  hard:     '쿠키런 클래식과 쿠키런 킹덤, 쿠키런 오븐브레이크 쿠키가 등장해요',
  veryhard: '쿠키런 클래식, 쿠키런 킹덤, 쿠키런 오븐브레이크, 모험의 탑 쿠키가 등장해요',
};

function gradeMsg(correct, total) {
  const r = correct / total;
  if (r === 1)  return '🏆 완벽해요! 쿠키런 마스터!';
  if (r >= 0.9) return '🌟 대단해요!';
  if (r >= 0.7) return '👍 잘했어요!';
  if (r >= 0.5) return '😊 절반 이상 맞췄어요!';
  if (r >= 0.3) return '📚 쿠키를 더 공부해봐요';
  return '🍪 쿠키런을 즐기다 보면 늘 거예요!';
}

// ─── 상태 ──────────────────────────────────────
let allCookies = [];

let game = {
  questions:  [],
  index:      0,
  correct:    0,
  score:      0,
  wrong:      [],
  timerIds:   [],
  answered:   false,
  settings:   { count: 20, difficulty: 'easy' },
  playerName: '',
};

let lb = { difficulty: 'easy' };

// ─── 초기화 ────────────────────────────────────
function updateVisualViewport() {
  const vv = window.visualViewport;
  if (!vv) return;
  document.documentElement.style.setProperty('--vv-height', `${vv.height}px`);
  document.documentElement.style.setProperty('--vv-offset', `${vv.offsetTop}px`);
}

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', updateVisualViewport);
  window.visualViewport.addEventListener('scroll', updateVisualViewport);
}

const STORE_URL_ANDROID = 'https://play.google.com/store/apps/details?id=com.devsisters.CookieRunForKakao';
const STORE_URL_IOS     = 'https://apps.apple.com/kr/app/%EC%BF%A0%ED%82%A4%EB%9F%B0/id608808713';

function getStoreUrl() {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return STORE_URL_ANDROID;
  if (/iphone|ipad|ipod/i.test(ua)) return STORE_URL_IOS;
  return STORE_URL_ANDROID;
}

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('banner-link').href = getStoreUrl();
  try {
    const res  = await fetch('data/cookies.json');
    const data = await res.json();
    allCookies = data.cookies;
  } catch {
    alert('쿠키 데이터를 불러오지 못했습니다.\n터미널에서 아래 명령어로 실행해주세요:\n\npython3 -m http.server 8000');
    return;
  }

  const btnStart = document.getElementById('btn-start');
  btnStart.disabled = false;
  btnStart.textContent = '게임 시작 →';

  // 저장된 닉네임 복원
  const savedName = localStorage.getItem('cq_player_name') || '';
  document.getElementById('player-name').value = savedName;

  bindMain();
  bindQuiz();
  bindResult();
  bindLeaderboard();
});

// ─── 메인 화면 ────────────────────────────────
function bindMain() {
  document.querySelectorAll('.btn-opt[data-group]').forEach(btn => {
    const group = btn.dataset.group;
    if (group === 'lb-difficulty' || group === 'lb-count') return;
    btn.addEventListener('click', () => {
      document.querySelectorAll(`.btn-opt[data-group="${group}"]`)
        .forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (group === 'count')      game.settings.count = btn.dataset.value === 'all' ? 'all' : parseInt(btn.dataset.value);
      if (group === 'difficulty') {
        game.settings.difficulty = btn.dataset.value;
        document.getElementById('difficulty-desc').textContent =
          DIFFICULTY_DESC[btn.dataset.value];
      }
    });
  });

  document.getElementById('btn-start').addEventListener('click', () => {
    const name = document.getElementById('player-name').value.trim();
    if (!name) {
      document.getElementById('player-name').classList.add('error');
      document.getElementById('player-name').placeholder = '닉네임을 입력해주세요!';
      document.getElementById('player-name').focus();
      return;
    }
    document.getElementById('player-name').classList.remove('error');
    game.playerName = name;
    localStorage.setItem('cq_player_name', name);
    startGame();
  });

  document.getElementById('player-name').addEventListener('input', () => {
    document.getElementById('player-name').classList.remove('error');
  });

  document.getElementById('btn-leaderboard').addEventListener('click', async () => {
    showScreen('leaderboard');
    await renderLeaderboard();
  });
}

// ─── 게임 시작 ────────────────────────────────
function startGame() {
  const { count, difficulty } = game.settings;
  const projects = DIFFICULTY_PROJECTS[difficulty];
  const pool     = allCookies.filter(c => projects.includes(c.project));
  const shuffled = shuffle([...pool]);

  const take     = count === 'all' ? shuffled.length : Math.min(count, shuffled.length);
  game.questions = shuffled.slice(0, take);
  game.pool      = shuffled.slice(take);
  game.index     = 0;
  game.correct   = 0;
  game.score     = 0;
  game.wrong     = [];
  game.answered  = false;

  showScreen('quiz');
  showQuestion();
}

// ─── 문제 표시 ────────────────────────────────
function showQuestion() {
  const q     = game.questions[game.index];
  const total = game.questions.length;

  document.getElementById('quiz-num').textContent     = `${game.index + 1} / ${total}`;
  document.getElementById('quiz-score').textContent   = `${game.score}점`;
  document.getElementById('quiz-correct').textContent = `정답 ${game.correct}개`;

  const img = document.getElementById('cookie-img');
  img.classList.add('loading');
  if (img._blobUrl) { URL.revokeObjectURL(img._blobUrl); img._blobUrl = null; }

  fetch(q.image)
    .then(r => { if (!r.ok) throw new Error(); return r.blob(); })
    .then(blob => {
      const url = URL.createObjectURL(blob);
      img._blobUrl = url;
      img.onload = () => img.classList.remove('loading');
      img.src = url;
    })
    .catch(() => {
      if (game.pool && game.pool.length > 0) {
        game.questions[game.index] = game.pool.shift();
        showQuestion();
      } else {
        game.questions.splice(game.index, 1);
        if (game.index >= game.questions.length) showResult();
        else showQuestion();
      }
    });

  const input = document.getElementById('answer-input');
  input.value = '';
  input.disabled = false;
  input.className = 'answer-input';

  document.getElementById('btn-submit').disabled = false;
  document.getElementById('feedback').className  = 'feedback hidden';

  game.answered = false;
  input.focus();
  startTimer();
}

// ─── 타이머 ───────────────────────────────────
function startTimer() {
  stopTimer();
  const bar = document.getElementById('timer-bar');
  bar.style.transition      = 'none';
  bar.style.width           = '100%';
  bar.style.backgroundColor = '#27AE60';
  void bar.offsetWidth;
  bar.style.transition = `width ${TIMER_SEC}s linear`;
  bar.style.width      = '0%';

  const t1 = setTimeout(() => { bar.style.backgroundColor = '#F39C12'; }, TIMER_SEC * 0.50 * 1000);
  const t2 = setTimeout(() => { bar.style.backgroundColor = '#E74C3C'; }, TIMER_SEC * 0.75 * 1000);
  const t3 = setTimeout(() => submitAnswer(true), TIMER_SEC * 1000);
  game.timerIds = [t1, t2, t3];
}

function stopTimer() {
  game.timerIds.forEach(id => clearTimeout(id));
  game.timerIds = [];
  const bar = document.getElementById('timer-bar');
  bar.style.transition = 'none';
  bar.style.width      = getComputedStyle(bar).width;
}

// ─── 정답 비교 ────────────────────────────────
function normalize(s) { return s.replace(/\s/g, '').toLowerCase(); }

function checkAnswer(input, cookie) {
  if (!input) return false;
  const ans = normalize(input);
  const names = [cookie.name, ...(cookie.aliases || [])];
  return names.some(n => {
    const norm = normalize(n);
    return ans === norm || ans === norm.replace(/쿠키$/, '').replace(/\s+$/, '');
  });
}

// ─── 제출 ─────────────────────────────────────
function submitAnswer(timeout = false) {
  if (game.answered) return;
  game.answered = true;
  stopTimer();

  const input      = document.getElementById('answer-input');
  const userAnswer = input.value.trim();
  const cookie     = game.questions[game.index];
  const correct    = checkAnswer(userAnswer, cookie);

  input.disabled = true;
  document.getElementById('btn-submit').disabled = true;

  const fb = document.getElementById('feedback');
  fb.className = 'feedback';

  if (correct) {
    game.correct++;
    game.score += POINTS_PER_CORRECT;
    input.classList.add('state-correct');
    fb.textContent = `정답! +${POINTS_PER_CORRECT}점`;
    fb.classList.add('correct');
  } else {
    game.wrong.push({ cookie, userAnswer });
    input.classList.add('state-wrong');
    fb.textContent = timeout
      ? `시간 초과 — 정답: ${cookie.name}`
      : `오답 — 정답: ${cookie.name}`;
    fb.classList.add('wrong');
  }

  document.getElementById('quiz-score').textContent   = `${game.score}점`;
  document.getElementById('quiz-correct').textContent = `정답 ${game.correct}개`;

  setTimeout(() => {
    game.index++;
    if (game.index >= game.questions.length) showResult();
    else showQuestion();
  }, 1500);
}

// ─── 결과 화면 ────────────────────────────────
function showResult() {
  const total      = game.questions.length;
  const { difficulty, count } = game.settings;

  document.getElementById('res-correct').textContent = game.correct;
  document.getElementById('res-total').textContent   = total;
  document.getElementById('res-score').textContent   = `${game.score}점`;
  document.getElementById('res-grade').textContent   = gradeMsg(game.correct, total);

  // 점수 저장
  const entry = {
    name:       game.playerName,
    correct:    game.correct,
    score:      game.score,
    total,
    difficulty,
    date:       new Date().toLocaleDateString('ko-KR'),
    ts:         Date.now(),
  };
  saveScore(entry);
  saveScoreRemote(entry);

  // 상위 % 계산
  const all    = loadScores().filter(s => s.difficulty === difficulty && s.total === total);
  const score  = game.correct / total;
  const better = all.filter(s => s.correct / s.total < score).length;
  const el     = document.getElementById('res-percentile');
  if (all.length < 3) {
    el.textContent = `${game.score}점 (상위 % 집계 중)`;
  } else {
    const pct = Math.round((1 - better / all.length) * 100);
    el.textContent = `상위 ${pct}%`;
  }

  // 틀린 문제 목록
  const section = document.getElementById('wrong-section');
  if (game.wrong.length === 0) {
    section.innerHTML = '<p class="all-correct">모두 정답! 🎉</p>';
  } else {
    section.innerHTML = `
      <h3>틀린 문제 (${game.wrong.length}개)</h3>
      ${game.wrong.map(({ cookie, userAnswer }) => `
        <div class="wrong-item">
          <img src="${cookie.image}" alt="${cookie.name}">
          <div>
            <div class="wrong-answer">${userAnswer ? `내 답: ${userAnswer}` : '시간 초과'}</div>
            <div class="correct-name">정답: ${cookie.name}</div>
          </div>
        </div>
      `).join('')}
    `;
  }

  showScreen('result');
}

// ─── 리더보드 ─────────────────────────────────
function bindLeaderboard() {
  document.querySelectorAll('.btn-opt[data-group="lb-difficulty"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.btn-opt[data-group="lb-difficulty"]')
        .forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      lb.difficulty = btn.dataset.value;
      await renderLeaderboard();
    });
  });

  document.getElementById('btn-lb-back').addEventListener('click', () => showScreen('main'));
}

async function renderLeaderboard() {
  const container = document.getElementById('lb-list');
  container.innerHTML = '<p class="lb-empty">불러오는 중...</p>';

  const scores = await loadScoresRemote(lb.difficulty);

  if (scores.length === 0) {
    container.innerHTML = '<p class="lb-empty">아직 기록이 없어요. 게임을 플레이해보세요!</p>';
    return;
  }

  const rankIcon = (i) => {
    if (i === 0) return '<span class="lb-rank top1">🥇</span>';
    if (i === 1) return '<span class="lb-rank top2">🥈</span>';
    if (i === 2) return '<span class="lb-rank top3">🥉</span>';
    return `<span class="lb-rank">${i + 1}</span>`;
  };

  container.innerHTML = scores.map((s, i) => {
    const isMine     = s.name === game.playerName;
    const entryScore = s.score ?? s.correct * POINTS_PER_CORRECT;
    return `
      <div class="lb-item ${isMine ? 'lb-mine' : ''}">
        ${rankIcon(i)}
        <div class="lb-info">
          <div class="lb-name">${escapeHtml(s.name)}</div>
          <div class="lb-meta">${DIFFICULTY_LABEL[s.difficulty]} · ${s.correct}/${s.total}정답 · ${s.date}</div>
        </div>
        <div class="lb-score">${entryScore}점</div>
      </div>
    `;
  }).join('');
}

// ─── 로컬스토리지 ─────────────────────────────
function loadScores() {
  return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
}

function saveScore(entry) {
  const scores = loadScores();
  scores.push(entry);
  localStorage.setItem(LS_KEY, JSON.stringify(scores));
}

// ─── 퀴즈/결과 바인딩 ────────────────────────
function bindQuiz() {
  document.getElementById('btn-submit').addEventListener('click', () => submitAnswer());
  document.getElementById('answer-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') submitAnswer();
  });
}

function bindResult() {
  document.getElementById('btn-retry').addEventListener('click', startGame);
  document.getElementById('btn-main').addEventListener('click', () => showScreen('main'));
}

// ─── 유틸 ─────────────────────────────────────
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(`screen-${name}`).classList.remove('hidden');
  document.body.classList.toggle('quiz-active', name === 'quiz');
  window.scrollTo(0, 0);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2000);
}
