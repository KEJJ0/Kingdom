/* ==========================================
   🌸 مملكة هنودة - Game Logic 🌸
   ========================================== */

// ============ GAME STATE ============
const state = {
  totalScore: 0,
  levelScores: [0, 0, 0, 0],
  levelStars: [0, 0, 0, 0],
  unlockedLevel: 1,
  currentLevel: 0,
};

// ============ UTILS ============
function $(id) { return document.getElementById(id); }
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active', 'screen-enter'));
  const el = $(id);
  el.classList.add('active', 'screen-enter');
}

function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === 'flip')  { osc.frequency.value = 440; osc.type = 'sine'; gain.gain.setValueAtTime(0.15, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.12); }
    if (type === 'match') { osc.frequency.value = 660; osc.type = 'triangle'; gain.gain.setValueAtTime(0.2, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.25); }
    if (type === 'wrong') { osc.frequency.value = 200; osc.type = 'square'; gain.gain.setValueAtTime(0.1, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.2); }
    if (type === 'catch') { osc.frequency.value = 880; osc.type = 'sine'; gain.gain.setValueAtTime(0.18, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.15); }
    if (type === 'win')   { 
      [523,659,784,1047].forEach((f,i) => {
        const o2 = ctx.createOscillator(); o2.connect(gain);
        o2.frequency.value = f; o2.type = 'sine';
        o2.start(ctx.currentTime + i*0.12);
        o2.stop(ctx.currentTime + i*0.12 + 0.2);
      });
    }
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch(e) {}
}

// ============ PARTICLES ============
function initParticles() {
  const container = $('particles-bg');
  const colors = ['#ff3d8b','#ffd700','#ff80b5','#ffe566','#c4006a'];
  for (let i = 0; i < 25; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 8 + 3;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const duration = Math.random() * 8 + 6;
    const delay = Math.random() * 10;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      background:${color};
      left:${left}%;
      animation-duration:${duration}s;
      animation-delay:${delay}s;
      filter: blur(${size > 7 ? 1 : 0}px);
      box-shadow: 0 0 ${size*2}px ${color};
    `;
    container.appendChild(p);
  }
}

// ============ WELCOME ============
$('btn-start').addEventListener('click', () => {
  showScreen('screen-map');
  refreshMap();
});

function goToMap() {
  clearAllTimers();
  showScreen('screen-map');
  refreshMap();
}

function refreshMap() {
  $('total-score').textContent = state.totalScore;
  for (let i = 1; i <= 4; i++) {
    const el = $(`map-lv${i}`);
    const starsEl = $(`stars-lv${i}`);
    el.classList.remove('unlocked','locked','completed');
    if (i < state.unlockedLevel) {
      el.classList.add('completed');
      starsEl.textContent = getStarStr(state.levelStars[i-1]);
    } else if (i === state.unlockedLevel) {
      el.classList.add('unlocked');
      starsEl.textContent = '☆☆☆';
    } else {
      el.classList.add('locked');
      starsEl.textContent = '☆☆☆';
    }
  }
}

function getStarStr(n) {
  const gold = '⭐'; const empty = '☆';
  return gold.repeat(n) + empty.repeat(3-n);
}

document.querySelectorAll('.map-level').forEach(el => {
  el.addEventListener('click', () => {
    const lv = parseInt(el.dataset.level);
    if (lv <= state.unlockedLevel) startLevel(lv);
  });
});

// ============ LEVEL TIMERS CLEANUP ============
let activeTimers = [];
function clearAllTimers() {
  activeTimers.forEach(t => clearInterval(t));
  activeTimers = [];
  // Level 2 cleanup
  if (gemInterval) { clearInterval(gemInterval); gemInterval = null; }
  if (basketDragActive) basketDragActive = false;
  // Level 3 cleanup
  stopButterflies();
}

// ============ LEVEL COMPLETE HANDLER ============
function completeLevelScreen(levelIdx, score, starsEarned, msgs) {
  const titles = ['أحسنتِ! 🌸','رائعة! 💎','مذهلة! 🦋','الملكة! 👑'];
  $('lc-stars-display').textContent = getStarStr(starsEarned);
  $('lc-title').textContent = titles[levelIdx] || 'رائعة!';
  $('lc-score-val').textContent = score;
  $('lc-msg').textContent = msgs || '';

  state.levelScores[levelIdx] = score;
  if (starsEarned > state.levelStars[levelIdx]) state.levelStars[levelIdx] = starsEarned;
  state.totalScore = state.levelScores.reduce((a,b)=>a+b,0);
  if (state.unlockedLevel === levelIdx + 1) state.unlockedLevel = Math.min(levelIdx + 2, 5);

  playSound('win');
  showScreen('screen-level-complete');

  const btnNext = $('btn-next-level');
  btnNext.onclick = () => {
    if (levelIdx >= 3) {
      showFinalScreen();
    } else {
      goToMap();
    }
  };
  btnNext.querySelector('span').textContent = levelIdx >= 3 ? '🏆 النهاية' : 'التالي ➡';
}

function startLevel(lv) {
  clearAllTimers();
  state.currentLevel = lv;
  if (lv === 1) initLevel1();
  if (lv === 2) initLevel2();
  if (lv === 3) initLevel3();
  if (lv === 4) initLevel4();
}

// ==========================================
// LEVEL 1: MEMORY MATCH 🌸
// ==========================================
const flowerEmojis = ['🌸','🌺','🌼','🌻','💐','🌹','🌷','🍀'];
let lv1Flipped = [], lv1Matched = 0, lv1Timer, lv1Seconds, lv1Lives, lv1CanFlip;

function initLevel1() {
  showScreen('screen-level1');
  lv1Matched = 0; lv1Flipped = []; lv1Seconds = 100; lv1Lives = 200; lv1CanFlip = true;
  $('lv1-timer').textContent = lv1Seconds;
  $('lv1-lives').textContent = lv1Lives;
  $('lv1-result').classList.add('hidden');

  // Build 4x4 = 8 pairs
  let emojis = [...flowerEmojis, ...flowerEmojis];
  emojis.sort(() => Math.random() - 0.5);

  const board = $('flower-board');
  board.innerHTML = '';
  emojis.forEach((emoji, i) => {
    const card = document.createElement('div');
    card.className = 'mem-card';
    card.dataset.emoji = emoji;
    card.dataset.index = i;
    card.innerHTML = `
      <div class="mem-card-inner">
        <div class="mem-card-front">✨</div>
        <div class="mem-card-back">${emoji}</div>
      </div>`;
    card.addEventListener('click', () => flipCard(card));
    board.appendChild(card);
  });

  // Show all cards briefly
  lv1CanFlip = false;
  document.querySelectorAll('.mem-card').forEach(c => c.classList.add('flipped'));
  setTimeout(() => {
    document.querySelectorAll('.mem-card').forEach(c => c.classList.remove('flipped'));
    lv1CanFlip = true;
    startLv1Timer();
  }, 1200);
}

function flipCard(card) {
  if (!lv1CanFlip) return;
  if (card.classList.contains('flipped') || card.classList.contains('matched')) return;
  if (lv1Flipped.length >= 2) return;

  playSound('flip');
  card.classList.add('flipped');
  lv1Flipped.push(card);

  if (lv1Flipped.length === 2) {
    lv1CanFlip = false;
    const [a, b] = lv1Flipped;
    if (a.dataset.emoji === b.dataset.emoji) {
      // Match!
      playSound('match');
      a.classList.add('matched'); b.classList.add('matched');
      lv1Flipped = []; lv1CanFlip = true;
      lv1Matched++;
      if (lv1Matched === 8) {
        clearInterval(lv1Timer);
        setTimeout(() => endLevel1(true), 400);
      }
    } else {
      // Wrong
      playSound('wrong');
      lv1Lives--;
      $('lv1-lives').textContent = lv1Lives;
      a.classList.add('wrong'); b.classList.add('wrong');
      setTimeout(() => {
        a.classList.remove('flipped','wrong');
        b.classList.remove('flipped','wrong');
        lv1Flipped = []; lv1CanFlip = true;
        if (lv1Lives <= 0) { clearInterval(lv1Timer); endLevel1(false); }
      }, 700);
    }
  }
}

function startLv1Timer() {
  lv1Timer = setInterval(() => {
    lv1Seconds--;
    $('lv1-timer').textContent = lv1Seconds;
    if (lv1Seconds <= 8) $('lv1-timer').classList.add('timer-warn');
    if (lv1Seconds <= 0) { clearInterval(lv1Timer); endLevel1(lv1Matched === 8); }
  }, 1000);
  activeTimers.push(lv1Timer);
}

function endLevel1(won) {
  const score = won ? Math.max(0, lv1Seconds * 5 + lv1Lives * 20 + 50) : Math.max(0, lv1Matched * 15);
  const stars = won ? (lv1Seconds > 20 ? 3 : lv1Seconds > 10 ? 2 : 1) : (lv1Matched >= 6 ? 1 : 0);
  showResultOverlay('lv1-result', won, () => completeLevelScreen(0, score, stars, won ? '✨   عاشت الذكية ثنّش!' : '💪 حاولي مرة أخرى'));
}

function showResultOverlay(id, won, then) {
  const el = $(id);
  el.classList.remove('hidden');
  el.innerHTML = `
    <div class="result-emoji">${won ? '🎉' : '💔'}</div>
    <div class="result-text">${won ? 'عفية!' : 'حاولي مجدداً'}</div>
    <div class="result-sub">${won ? ' شطورة بنتي !' : 'لا بأس، المرة القادمة!'}</div>
  `;
  setTimeout(then, 1400);
}

// ==========================================
// LEVEL 2: GEM CATCHER 💎
// ==========================================
let lv2Score = 0, lv2Seconds, lv2Timer, gemInterval;
let basketX = 50, isDragging = false, dragStartX = 0, basketDragActive = false;

const gems = ['💎','💍','✨','⭐','🌟'];
const bombs = ['💣','🔥'];

function initLevel2() {
  showScreen('screen-level2');
  lv2Score = 0; lv2Seconds = 30;
  $('lv2-score').textContent = 0;
  $('lv2-timer').textContent = lv2Seconds;
  $('lv2-result').classList.add('hidden');
  basketX = 50;
  
  const arena = $('gem-arena');
  const basket = $('gem-basket');
  // Clear old falling items
  arena.querySelectorAll('.falling-item, .catch-effect').forEach(e => e.remove());
  basket.style.left = '50%';
  
  setupBasketDrag(arena, basket);
  startLv2Timer();

  // Spawn gems every 800ms
  gemInterval = setInterval(() => spawnGemItem(), 800);
  activeTimers.push(gemInterval);
}

function setupBasketDrag(arena, basket) {
  basketDragActive = true;

  function getX(e) {
    return e.touches ? e.touches[0].clientX : e.clientX;
  }

  arena.addEventListener('touchstart', onDragStart, { passive: true });
  arena.addEventListener('touchmove', onDragMove, { passive: false });
  arena.addEventListener('mousedown', onDragStart);
  window.addEventListener('mousemove', onDragMove);
  window.addEventListener('mouseup', () => isDragging = false);

  function onDragStart(e) {
    if (!basketDragActive) return;
    isDragging = true;
    dragStartX = getX(e);
  }
  function onDragMove(e) {
    if (!isDragging || !basketDragActive) return;
    if (e.cancelable) e.preventDefault();
    const rect = arena.getBoundingClientRect();
    const x = getX(e) - rect.left;
    const pct = Math.max(5, Math.min(95, (x / rect.width) * 100));
    basketX = pct;
    basket.style.left = pct + '%';
  }
}

function spawnGemItem() {
  const arena = $('gem-arena');
  if (!arena) return;
  const isBomb = Math.random() < 0.28;
  const emoji = isBomb ? bombs[Math.floor(Math.random()*bombs.length)] : gems[Math.floor(Math.random()*gems.length)];
  const left = Math.random() * 80 + 5;
  const speed = Math.random() * 1.5 + 2;
  
  const item = document.createElement('div');
  item.className = 'falling-item';
  item.textContent = emoji;
  item.dataset.bomb = isBomb ? '1' : '0';
  item.style.left = left + '%';
  item.style.animationDuration = speed + 's';
  arena.appendChild(item);

  // Check collision with basket
  const interval = setInterval(() => {
    if (!item.parentNode) { clearInterval(interval); return; }
    const itemRect = item.getBoundingClientRect();
    const basket = $('gem-basket');
    if (!basket) { clearInterval(interval); return; }
    const bRect = basket.getBoundingClientRect();
    
    if (itemRect.bottom > bRect.top && itemRect.bottom < bRect.bottom + 30 &&
        itemRect.left < bRect.right && itemRect.right > bRect.left) {
      clearInterval(interval);
      item.remove();
      if (isBomb) {
        lv2Score = Math.max(0, lv2Score - 8);
        playSound('wrong');
        showArenaEffect(arena, '💥', item.style.left, '-5');
      } else {
        lv2Score += 10;
        playSound('catch');
        showArenaEffect(arena, '+10 💎', item.style.left, '+10');
      }
      $('lv2-score').textContent = lv2Score;
    }
  }, 60);

  // Auto remove when fallen
  item.addEventListener('animationend', () => {
    clearInterval(interval);
    item.remove();
  });
  setTimeout(() => { clearInterval(interval); if (item.parentNode) item.remove(); }, (speed+0.5)*1000);
}

function showArenaEffect(arena, text, left, val) {
  const ef = document.createElement('div');
  ef.className = 'catch-effect';
  ef.textContent = text;
  ef.style.left = left;
  ef.style.bottom = '70px';
  ef.style.color = val.startsWith('+') ? '#ffd700' : '#ff4444';
  ef.style.fontWeight = '900';
  ef.style.fontSize = '18px';
  arena.appendChild(ef);
  setTimeout(() => ef.remove(), 700);
}

function startLv2Timer() {
  lv2Timer = setInterval(() => {
    lv2Seconds--;
    $('lv2-timer').textContent = lv2Seconds;
    if (lv2Seconds <= 8) $('lv2-timer').classList.add('timer-warn');
    if (lv2Seconds <= 0) {
      clearInterval(lv2Timer);
      clearInterval(gemInterval);
      basketDragActive = false;
      endLevel2();
    }
  }, 1000);
  activeTimers.push(lv2Timer);
}

function endLevel2() {
  const score = lv2Score;
  const stars = score >= 80 ? 3 : score >= 40 ? 2 : score >= 10 ? 1 : 0;
  showResultOverlay('lv2-result', score >= 10, () =>
    completeLevelScreen(1, score, stars, score >= 80 ? '💎 صائدة جواهر محترفة!' : score >= 40 ? '✨ كفو على بنيتي !' : '💪 جربي مجدداً!'));
}

// ==========================================
// LEVEL 3: BUTTERFLY TAP 🦋
// ==========================================
let lv3Score = 0, lv3Seconds, lv3Timer, butterflyIntervalId = null, butterflyTimeouts = [];

const butterflies = ['🦋','🌸','💖','🌟','✨','🎀','💕'];

function initLevel3() {
  showScreen('screen-level3');
  lv3Score = 0; lv3Seconds = 25;
  $('lv3-score').textContent = 0;
  $('lv3-timer').textContent = lv3Seconds;
  $('lv3-result').classList.add('hidden');
  $('butterfly-arena').innerHTML = '';
  startLv3Timer();
  spawnButterfly();
  butterflyIntervalId = setInterval(spawnButterfly, 1100);
  activeTimers.push(butterflyIntervalId);
}

function stopButterflies() {
  if (butterflyIntervalId) { clearInterval(butterflyIntervalId); butterflyIntervalId = null; }
  butterflyTimeouts.forEach(t => clearTimeout(t));
  butterflyTimeouts = [];
}

function spawnButterfly() {
  const arena = $('butterfly-arena');
  if (!arena || arena.querySelectorAll('.butterfly').length >= 7) return;
  const emoji = butterflies[Math.floor(Math.random() * butterflies.length)];
  const left = Math.random() * 75 + 5;
  const top  = Math.random() * 70 + 5;
  const life = Math.random() * 1800 + 1400;
  const animDur = Math.random() * 1.5 + 1 + 's';

  const b = document.createElement('div');
  b.className = 'butterfly';
  b.textContent = emoji;
  b.style.left = left + '%';
  b.style.top  = top + '%';
  b.style.animationDuration = animDur;
  b.style.fontSize = (28 + Math.random() * 14) + 'px';

  b.addEventListener('click', () => tapButterfly(b, arena));
  b.addEventListener('touchstart', (e) => { e.preventDefault(); tapButterfly(b, arena); }, { passive: false });
  arena.appendChild(b);

  const t = setTimeout(() => { if (b.parentNode) b.remove(); }, life);
  butterflyTimeouts.push(t);
}

function tapButterfly(b, arena) {
  if (!b.parentNode) return;
  playSound('catch');
  lv3Score++;
  $('lv3-score').textContent = lv3Score;
  
  const pop = document.createElement('div');
  pop.className = 'butterfly-pop';
  pop.textContent = '+1 ✨';
  pop.style.left = b.style.left;
  pop.style.top  = b.style.top;
  pop.style.color = '#ffd700';
  pop.style.fontWeight = '900';
  arena.appendChild(pop);
  setTimeout(() => pop.remove(), 600);
  
  b.style.transform = 'scale(1.6)';
  setTimeout(() => b.remove(), 100);
}

function startLv3Timer() {
  lv3Timer = setInterval(() => {
    lv3Seconds--;
    $('lv3-timer').textContent = lv3Seconds;
    if (lv3Seconds <= 7) $('lv3-timer').classList.add('timer-warn');
    if (lv3Seconds <= 0) {
      clearInterval(lv3Timer);
      stopButterflies();
      endLevel3();
    }
  }, 1000);
  activeTimers.push(lv3Timer);
}

function endLevel3() {
  const score = lv3Score * 8;
  const stars = lv3Score >= 18 ? 3 : lv3Score >= 10 ? 2 : lv3Score >= 4 ? 1 : 0;
  showResultOverlay('lv3-result', lv3Score >= 4, () =>
    completeLevelScreen(2, score, stars, lv3Score >= 18 ? '🦋   فديت السريع أنا!' : lv3Score >= 10 ? '✨   فراشاتك في أمان يافراشتي!' : '💕 جربي أسرع!'));
}

// ==========================================
// LEVEL 4: QUIZ 🏰
// ==========================================
const quizData = [
  {
    q: 'من هو أجمل شخص في العالم؟ 💖',
    emoji: '💝',
    opts: ['نودة','كلهن','قنّش','هنّودة'],
    ans: 1
  },
  {
    q: 'ما هو لون الورد المفضل للملكة قنّش؟',
    emoji: '🌹',
    opts: ['أزرق','أخضر','أصفر','وردي'],
    ans: 2
  },
  {
    q: 'من تسكن في القصور الذهبية؟',
    emoji: '👑',
    opts: ['الأميرة قنّش','الساحرة','التنينة','الجنية'],
    ans: 0
  },
  {
    q: 'ما عدد أجنحة الفراشة؟',
    emoji: '🦋',
    opts: ['2','6','4','8'],
    ans: 2
  },
  {
    q: 'هنودة هي...',
    emoji: '🌟',
    opts: ['مزة','شيخة','ملكة','كلها صح! 💖'],
    ans: 3
  },
];

let lv4Score = 0, lv4Qnum = 0, lv4CanAnswer = true;

function initLevel4() {
  showScreen('screen-level4');
  lv4Score = 0; lv4Qnum = 0; lv4CanAnswer = true;
  $('lv4-score').textContent = 0;
  $('lv4-qnum').textContent = 1;
  $('lv4-result').classList.add('hidden');
  renderQuizQuestion();
}

function renderQuizQuestion() {
  if (lv4Qnum >= quizData.length) { endLevel4(); return; }
  lv4CanAnswer = true;
  const q = quizData[lv4Qnum];
  $('lv4-qnum').textContent = lv4Qnum + 1;

  const container = $('quiz-container');
  container.innerHTML = `
    <div class="quiz-progress">
      <div class="quiz-progress-bar" style="width:${(lv4Qnum/quizData.length)*100}%"></div>
    </div>
    <div class="quiz-question">
      <div class="quiz-emoji">${q.emoji}</div>
      ${q.q}
    </div>
    <div class="quiz-options">
      ${q.opts.map((opt, i) => `
        <button class="quiz-opt" data-idx="${i}" onclick="answerQuiz(${i})">${opt}</button>
      `).join('')}
    </div>
  `;
}

function answerQuiz(idx) {
  if (!lv4CanAnswer) return;
  lv4CanAnswer = false;
  const q = quizData[lv4Qnum];
  const opts = document.querySelectorAll('.quiz-opt');
  opts[idx].classList.add(idx === q.ans ? 'correct' : 'wrong');
  if (idx === q.ans) {
    playSound('match');
    lv4Score += 20;
    $('lv4-score').textContent = lv4Score;
    if (idx !== q.ans) opts[q.ans].classList.add('correct');
  } else {
    playSound('wrong');
    opts[q.ans].classList.add('correct');
  }
  setTimeout(() => {
    lv4Qnum++;
    renderQuizQuestion();
  }, 900);
}

function endLevel4() {
  const stars = lv4Score >= 100 ? 3 : lv4Score >= 60 ? 2 : lv4Score >= 20 ? 1 : 0;
  showResultOverlay('lv4-result', true, () =>
    completeLevelScreen(3, lv4Score, stars, lv4Score === 100 ? '👑 أجبتِ بكل صحة!' : '✨ أداء رائع!'));
}

// ==========================================
// FINAL SCREEN
// ==========================================
function showFinalScreen() {
  showScreen('screen-final');
  $('final-total').textContent = state.totalScore;
  const totalStars = state.levelStars.reduce((a,b) => a+b, 0);
  $('final-stars').textContent = '⭐'.repeat(totalStars) + '☆'.repeat(12 - totalStars);
  launchFireworks();
}

function launchFireworks() {
  const container = $('fireworks');
  const colors = ['#ff3d8b','#ffd700','#ff80b5','#ffe566','#ffffff','#c4006a'];
  for (let burst = 0; burst < 8; burst++) {
    setTimeout(() => {
      const cx = Math.random() * 100;
      const cy = Math.random() * 60 + 10;
      for (let i = 0; i < 16; i++) {
        const dot = document.createElement('div');
        dot.className = 'firework-dot';
        const angle = (i / 16) * Math.PI * 2;
        const dist = 60 + Math.random() * 60;
        const tx = `translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist}px)`;
        dot.style.cssText = `
          left:${cx}%; top:${cy}%;
          background:${colors[Math.floor(Math.random()*colors.length)]};
          --tx:${tx};
          animation-duration:${0.6 + Math.random()*0.4}s;
          box-shadow: 0 0 6px ${colors[0]};
        `;
        container.appendChild(dot);
        setTimeout(() => dot.remove(), 1200);
      }
    }, burst * 400);
  }
}

function restartGame() {
  state.totalScore = 0;
  state.levelScores = [0,0,0,0];
  state.levelStars  = [0,0,0,0];
  state.unlockedLevel = 1;
  showScreen('screen-welcome');
}

// ============ INIT ============
initParticles();
