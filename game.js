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
    const waitMs= data.next_chamge_seconds * 1000;
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
  x: 312,
  y: 292,
  size: 16,
  speed: 4
};

const keys = {};

document.addEventListener('keydown', (e) => {
  keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

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


  ctx.fillStyle = 'red';
  ctx.fillRect(player.x, player.y, player.size, player.size);
}


function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();