const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

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

// API endpoint that returns a random boss
app.get('/api/v1/bosses/random', (req, res) => {
  const randomIndex = Math.floor(Math.random() * bosses.length);
  res.json(bosses[randomIndex]);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Boss API is running on port ${PORT}.`);
});