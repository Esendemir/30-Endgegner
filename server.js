const express = require('express');
const cors = require('cors');
const path = require('path')
const app = express();

app.use(cors());
app.use(express.json());

app.use('/img', express.static(path.join(__dirname, 'img')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/game.js', (req, res) => res.sendFile(path.join(__dirname, 'game.js')));
app.get('/style.css', (req, res) => res.sendFile(path.join(__dirname, 'style.css')));

// 30 Boss Data (Stored in RAM, responds in milliseconds)
const bosses = [
  { id: 1, name: "Gollum-Wächter", duration_seconds: 60 },
  { id: 2, name: "Felsriese", duration_seconds: 60 },
  { id: 3, name: "Schattenjäger", duration_seconds: 60 },
  { id: 4, name: "Lava-Prinzen", duration_seconds: 60 },
  { id: 5, name: "Eiswächter", duration_seconds: 60 },
  { id: 6, name: "Sturmmonster", duration_seconds: 60 },
  { id: 7, name: "Giftiger Efeu", duration_seconds: 60 },
  { id: 8, name: "Eiserner Golem", duration_seconds: 60 },
  { id: 9, name: "Dunkler Magier", duration_seconds: 60 },
  { id: 10, name: "Drachenjunge", duration_seconds: 60 },
  { id: 11, name: "Sandsturm", duration_seconds: 60 },
  { id: 12, name: "Sumpfmonster", duration_seconds: 60 },
  { id: 13, name: "Roter Wächter", duration_seconds: 60 },
  { id: 14, name: "Geisterreiter", duration_seconds: 60 },
  { id: 15, name: "Katakomben-Lord", duration_seconds: 60 },
  { id: 16, name: "Albtraum-Treiber", duration_seconds: 60 },
  { id: 17, name: "Magnetischer Roboter", duration_seconds: 60 },
  { id: 18, name: "Giftiger Skorpion", duration_seconds: 60 },
  { id: 19, name: "Feuerkönigin", duration_seconds: 60 },
  { id: 20, name: "Dunkler Arm", duration_seconds: 60 },
  { id: 21, name: "Gletscherriese", duration_seconds: 60 },
  { id: 22, name: "Cyber-Krieger", duration_seconds: 60 },
  { id: 23, name: "Waldgeist", duration_seconds: 60 },
  { id: 24, name: "Labyrinth-Monster", duration_seconds: 60 },
  { id: 25, name: "Blitzwächter", duration_seconds: 60 },
  { id: 26, name: "Dunkler Mönch", duration_seconds: 60 },
  { id: 27, name: "Säurespucker", duration_seconds: 60 },
  { id: 28, name: "Zeitverzerrer", duration_seconds: 60 },
  { id: 29, name: "Schattenkönig", duration_seconds: 60 },
  { id: 30, name: "Endgegner", duration_seconds: 120 }
];

const BOSS_INTERVAL_MS = 5 * 60 * 1000; // 5 dakika

function getCurrentBoss(req, res) {
  const now = Date.now();
  const slot = Math.floor(now / BOSS_INTERVAL_MS);

  const boss = bosses[(slot * 7) % bosses.length];

  const nextChangeSeconds = Math.ceil(((slot + 1) * BOSS_INTERVAL_MS - now) / 1000);

  res.json({
    ...boss,
    image: `/img/${boss.id}.png`,
    next_change_seconds: nextChangeSeconds
  });
}

// API endpoints that return a random boss
app.get('/api/v1/bosses/random', getCurrentBoss);
app.get('/api/boss', getCurrentBoss);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Boss API is running on port ${PORT}.`);
});