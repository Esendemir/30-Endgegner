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

const ATTACK = {
  startRate: 1.5,      // başlangıçta saniyede kaç saldırı
  maxRate: 15,         // üst sınır: saniyede en fazla 20 saldırı
  rateGrowth: 0.15,    // her saniye hız artışı (saldırı sayısı/sn)
  startSpeed: 80,      // başlangıç hızı (piksel/sn)
  maxSpeed: 180,       // maksimum hız
  speedGrowth: 1.5,    // her saniye hız artışı
  minOffset: 50,       // kutunun dışından minimum uzaklık
  maxOffset: 70,       // kutunun dışından maksimum uzaklık
  lineChance: 0.4,     // çizgi olma ihtimali (kalanı 1px kare)
  lineLength: [20, 50],
  lineThickness: 3,
  dotSize: 4           // 1px çok küçük görünürse 2 yap
};

const attacks = [];
let attackStartTime = performance.now();
let lastAttackTime = performance.now();
let spawnAccumulator = 0;

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function spawnAttack(speed) {
  const b = battleBox;
  const side = Math.floor(Math.random() * 4);
  const offset = rand(ATTACK.minOffset, ATTACK.maxOffset);
  const isLine = Math.random() < ATTACK.lineChance;
  const length = isLine ? rand(ATTACK.lineLength[0], ATTACK.lineLength[1]) : ATTACK.dotSize;
  const thick = isLine ? ATTACK.lineThickness : ATTACK.dotSize;

  let a;
  if (side === 0 || side === 1) {
    a = { w: thick, h: length };
    a.y = b.y + rand(0, b.height - a.h);
    a.x = side === 0 ? b.x - offset - a.w : b.x + b.width + offset;
    a.vx = side === 0 ? speed : -speed;
    a.vy = 0;
  } else {
    a = { w: length, h: thick };
    a.x = b.x + rand(0, b.width - a.w);
    a.y = side === 2 ? b.y - offset - a.h : b.y + b.height + offset;
    a.vx = 0;
    a.vy = side === 2 ? speed : -speed;
  }
  attacks.push(a);
}

function updateAttacks() {
  const now = performance.now();
  const dt = Math.min((now - lastAttackTime) / 1000, 0.05);
  lastAttackTime = now;

  const elapsed = (now - attackStartTime) / 1000;
  const rate = Math.min(ATTACK.maxRate, ATTACK.startRate + elapsed * ATTACK.rateGrowth);
  const speed = Math.min(ATTACK.maxSpeed, ATTACK.startSpeed + elapsed * ATTACK.speedGrowth);

  spawnAccumulator += rate * dt;
  while (spawnAccumulator >= 1) {
    spawnAttack(speed);
    spawnAccumulator -= 1;
  }

  const b = battleBox;
  const margin = 30;
  for (let i = attacks.length - 1; i >= 0; i--) {
    const a = attacks[i];
    a.x += a.vx * dt;
    a.y += a.vy * dt;

    if (
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
    ctx.fillRect(a.x, a.y, a.w, a.h);
  }
}

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