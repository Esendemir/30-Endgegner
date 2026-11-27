const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let bossName = 'BOSS';
const bossImage = new Image();
let bossImageLoaded = false;

let changeAt = 0;
let bossTimer;

bossImage.onload = () => {
  bossImageLoaded = true;
};

function setBossImage(src) {
  bossImageLoaded = false;
  bossImage.src = src;
}

async function loadBossData() {
  try {
    const response = await fetch('/api/v1/bosses/random');
    const data = await response.json();

    if (data && data.name) {
      bossName = data.name;
    }

    if (data && data.image) {
      setBossImage(data.image);
    }
    const waitMs = (Number(data.next_change_seconds) || 300) * 1000;
    changeAt = Date.now() + waitMs;
    clearTimeout(bossTimer);
    bossTimer = setTimeout(loadBossData, waitMs + 500);
  } catch (err) {
    console.error('Boss verisi alınamadı:', err);
  }
}

loadBossData();

const battleBox = {
  x: 185,
  y: 170,
  width: 270,
  height: 245,
  borderWidth: 4
};

const player = {
  x: battleBox.x + battleBox.width / 2 - 8,
  y: battleBox.y + battleBox.height / 2 - 8,
  size: 9,
  speed: 4
};

const keys = {};

document.addEventListener('keydown', (e) => {
  keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

// ===== SALDIRI SİSTEMİ (yönlendirmeli) =====
const ATTACK = {
  startRate: 1.5,       // başlangıçta saniyede saldırı sayısı
  maxRate: 8,          // üst sınır
  rateGrowth: 0.15,     // her saniye artış
  startSpeed: 80,
  maxSpeed: 155,
  speedGrowth: 1.5,
  minOffset: 10,
  maxOffset: 20,
  lineChance: 0.6,
  lineLength: [20, 50],
  lineThickness: 3,
  dotSize: 3,
  rampSeconds: 180,     // zorluk 3 dakikada maksimuma ulaşır
  roundStart: 8,        // ilk tur süresi (sn)
  roundEnd: 4.5,        // en zor turun süresi (sn)
  safeHalfStart: 45,    // güvenli bölge yarı genişliği (başta)
  safeHalfEnd: 22       // güvenli bölge yarı genişliği (sonda)
};

const attacks = [];
const attackStartTime = performance.now();
let lastAttackTime = attackStartTime;
let spawnAccumulator = 0;

function rand(min, max) { return min + Math.random() * (max - min); }
function lerp(a, b, t) { return a + (b - a) * t; }
function safeHalf(d) { return lerp(ATTACK.safeHalfStart, ATTACK.safeHalfEnd, d); }

// [min, max] aralığında, uzunluğu len olan parçayı [ex1, ex2] bandının DIŞINDA seçer
function pickOutside(min, max, len, ex1, ex2) {
  const hiA = Math.min(max - len, ex1 - len);
  const loB = Math.max(min, ex2);
  const hiB = max - len;
  const lenA = Math.max(0, hiA - min);
  const lenB = Math.max(0, hiB - loB);
  const total = lenA + lenB;
  if (total <= 0) return null;
  const r = Math.random() * total;
  return r < lenA ? min + r : loB + (r - lenA);
}

// dir > 0: aralığın üst kısmı, dir < 0: alt kısmı, 0: her yer
function pickAxis(lo, hi, dir) {
  if (hi < lo) return (lo + hi) / 2;
  if (dir > 0) return rand(lo + (hi - lo) * 0.6, hi);
  if (dir < 0) return rand(lo, lo + (hi - lo) * 0.4);
  return rand(lo, hi);
}

// Bir tur planı: hangi yönlerden saldırı gelecek + gizli güvenli nokta
function makePlan(d) {
  const all = [0, 1, 2, 3]; // 0 sol, 1 sağ, 2 üst, 3 alt
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  let n = d < 0.15 ? 1 : d < 0.4 ? 2 : 3;
  if (d > 0.8 && Math.random() < 0.4) n = 4;
  const sides = all.slice(0, n);

  // Saldırıların iteceği yön (oyuncunun kaçması gereken taraf)
  let px = 0, py = 0;
  for (const s of sides) {
    if (s === 0) px++;
    if (s === 1) px--;
    if (s === 2) py++;
    if (s === 3) py--;
  }

  if (round) {
    const maxJump = 110;
    x = Math.max(round.cur.x - maxJump, Math.min(round.cur.x + maxJump, x));
    y = Math.max(round.cur.y - maxJump, Math.min(round.cur.y + maxJump, y));
  }
  return { sides, x, y };
  return { sides, x, y };
}

let round = null;
round = { cur: makePlan(0), next: null, end: 0 };
round.next = makePlan(0);
round.end = performance.now() / 1000 + ATTACK.roundStart;

// Oyuncuyu güvenli bölgeye doğru iten yönü ağırlıklı seçer
function pickSide(d) {
  const px = player.x + player.size / 2;
  const py = player.y + player.size / 2;
  const dx = round.cur.x - px;   // + ise güvenli bölge sağda
  const dy = round.cur.y - py;   // + ise güvenli bölge aşağıda

  // Her yön için ağırlık: 0 sol, 1 sağ, 2 üst, 3 alt
  // Güvenli bölge solda ise oyuncuyu sola itmek için SAĞdan saldırı gelir
  const strength = 1 + 3 * d;          // oyun ilerledikçe yönlendirme güçlenir
  const w = [0.4, 0.4, 0.4, 0.4];      // taban: her yönden az da olsa gelir
  const ax = Math.abs(dx), ay = Math.abs(dy);
  const total = ax + ay + 1;

  if (dx < 0) w[1] += strength * (ax / total) * 2;  // bölge solda -> sağdan saldır
  if (dx > 0) w[0] += strength * (ax / total) * 2;  // bölge sağda -> soldan saldır
  if (dy < 0) w[3] += strength * (ay / total) * 2;  // bölge yukarıda -> alttan saldır
  if (dy > 0) w[2] += strength * (ay / total) * 2;  // bölge aşağıda -> yukarıdan saldır

  // Sadece bu turda izin verilen yönleri kullan
  let sum = 0;
  const ws = round.cur.sides.map(s => { sum += w[s]; return w[s]; });
  let r = Math.random() * sum;
  for (let i = 0; i < ws.length; i++) {
    r -= ws[i];
    if (r <= 0) return round.cur.sides[i];
  }
  return round.cur.sides[0];
}

function spawnAttack(speed, d, t) {
  const b = battleBox;
  const side = pickSide(d);
  const offset = rand(ATTACK.minOffset, ATTACK.maxOffset);
  const isLine = Math.random() < ATTACK.lineChance;
  const length = isLine ? rand(ATTACK.lineLength[0], ATTACK.lineLength[1]) : ATTACK.dotSize;
  const thick = isLine ? ATTACK.lineThickness : ATTACK.dotSize;
  const horizontalMove = side < 2; // sol/sağdan gelenler yatay hareket eder

  const w = horizontalMove ? thick : length;
  const h = horizontalMove ? length : thick;
  const half = safeHalf(d);

  let x, y, vx = 0, vy = 0, dist;
  if (horizontalMove) {
    x = side === 0 ? b.x - offset - w : b.x + b.width + offset;
    vx = side === 0 ? speed : -speed;
    dist = Math.abs(round.cur.x - x);
  } else {
    y = side === 2 ? b.y - offset - h : b.y + b.height + offset;
    vy = side === 2 ? speed : -speed;
    dist = Math.abs(round.cur.y - y);
  }

  // Saldırı güvenli noktaya ne zaman ulaşır? Ona göre hangi turun bölgesi korunacak
  const ta = t + dist / speed;
  const pad = 0.6 + 140 / speed;
  const A = round.cur, B = round.next;
  let R;
  if (ta < round.end - pad) {
    R = { x1: A.x - half, x2: A.x + half, y1: A.y - half, y2: A.y + half };
  } else if (ta > round.end + pad) {
    R = { x1: B.x - half, x2: B.x + half, y1: B.y - half, y2: B.y + half };
  } else {
    // Geçiş: iki nokta arasındaki tüm alan boş kalır
    R = {
      x1: Math.min(A.x, B.x) - half, x2: Math.max(A.x, B.x) + half,
      y1: Math.min(A.y, B.y) - half, y2: Math.max(A.y, B.y) + half
    };
  }

  if (horizontalMove) {
    y = pickOutside(b.y, b.y + b.height, h, R.y1, R.y2);
    if (y === null) return;
  } else {
    x = pickOutside(b.x, b.x + b.width, w, R.x1, R.x2);
    if (x === null) return;
  }

  // Saldırı kutuya ne kadar girer? Başta kısa (oyuncu kaçar), sonra tam geçer
  const span = offset + (horizontalMove ? b.width + w : b.height + h) + 30;
  const frac = Math.min(1, rand(lerp(0.35, 1, d), lerp(0.6, 1.25, d)));

  attacks.push({ x, y, w, h, vx, vy, travel: frac * span, fade: frac < 1 });
}

function updateAttacks() {
  const now = performance.now();
  const t = now / 1000;
  const dt = Math.min((now - lastAttackTime) / 1000, 0.05);
  lastAttackTime = now;

  const elapsed = (now - attackStartTime) / 1000;
  const d = Math.min(1, elapsed / ATTACK.rampSeconds);
  const rate = Math.min(ATTACK.maxRate, ATTACK.startRate + elapsed * ATTACK.rateGrowth);
  const speed = Math.min(ATTACK.maxSpeed, ATTACK.startSpeed + elapsed * ATTACK.speedGrowth);

  // Yeni tur
  if (t >= round.end) {
    round.cur = round.next;
    round.next = makePlan(d);
    round.end = t + lerp(ATTACK.roundStart, ATTACK.roundEnd, d);
  }

  spawnAccumulator += rate * dt;
  while (spawnAccumulator >= 1) {
    spawnAttack(speed, d, t);
    spawnAccumulator -= 1;
  }

  const b = battleBox;
  const margin = 30;
  for (let i = attacks.length - 1; i >= 0; i--) {
    const a = attacks[i];
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.travel -= Math.hypot(a.vx, a.vy) * dt;

    if (
      a.travel <= 0 ||
      a.x > b.x + b.width + margin || a.x + a.w < b.x - margin ||
      a.y > b.y + b.height + margin || a.y + a.h < b.y - margin
    ) {
      attacks.splice(i, 1);
    }
  }
}

function drawAttacks() {
  ctx.fillStyle = 'white';
  for (const a of attacks) {
    ctx.globalAlpha = a.fade ? Math.max(0, Math.min(1, a.travel / 25)) : 1;
    ctx.fillRect(a.x, a.y, a.w, a.h);
  }
  ctx.globalAlpha = 1;
  const hh = safeHalf(Math.min(1, (performance.now() - attackStartTime) / 1000 / ATTACK.rampSeconds));
  ctx.strokeStyle = 'rgba(0,255,0,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(round.cur.x - hh, round.cur.y - hh, hh * 2, hh * 2);
}
// ===== SALDIRI SİSTEMİ SONU =====

function update() {
  if (keys['ArrowLeft']) player.x -= player.speed;
  if (keys['ArrowRight']) player.x += player.speed;
  if (keys['ArrowUp']) player.y -= player.speed;
  if (keys['ArrowDown']) player.y += player.speed;

  const minX = battleBox.x + battleBox.borderWidth;
  const maxX = battleBox.x + battleBox.width - battleBox.borderWidth - player.size;
  const minY = battleBox.y + battleBox.borderWidth;
  const maxY = battleBox.y + battleBox.height - battleBox.borderWidth - player.size;

  if (player.x < minX) player.x = minX;
  if (player.x > maxX) player.x = maxX;
  if (player.y < minY) player.y = minY;
  if (player.y > maxY) player.y = maxY;

  updateAttacks();
}

function draw() {
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Üst kısma basit bir Boss alanı temsili
  ctx.fillStyle = 'white';
  ctx.font = '20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(bossName, canvas.width / 2, 100);

  const remaining = Math.max(0, Math.ceil((changeAt - Date.now()) / 1000));
  const min = Math.floor(remaining / 60);
  const sec = String(remaining % 60).padStart(2, '0');
  ctx.font = '14px monospace';
  ctx.fillText(`Nächster Boss in ${min}:${sec}`, canvas.width / 2, 40);
  ctx.font = '20px monospace';

  if (bossImageLoaded) {
  const imgWidth = 64;
  const imgHeight = 64;
  const imgX = (canvas.width - imgWidth) / 2; 
  const imgY = 90; // Yazının altında, battleBox'ın (y: 220) üstünde

  ctx.drawImage(bossImage, imgX, imgY, imgWidth, imgHeight);
}
  ctx.strokeStyle = 'white';
  ctx.lineWidth = battleBox.borderWidth;
  ctx.strokeRect(battleBox.x, battleBox.y, battleBox.width, battleBox.height);

  drawAttacks();

  ctx.fillStyle = 'red';
  ctx.fillRect(player.x, player.y, player.size, player.size);
}


function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();