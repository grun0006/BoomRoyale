import express from "express";
import { Server } from "socket.io";
import http from "http";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const TROOP_SIZE = 100;
const TOWER_SIZE = 50;

let troops = [];
let towers = [
  { id: 1, x: 325, y: 100, hp: 500, team: "red" },
  { id: 2, x: 325, y: 700, hp: 500, team: "blue" },
];

let playerCount = 0;

io.on("connection", (socket) => {
  console.log(socket.id);

  const team = playerCount % 2 === 0 ? "blue" : "red";
  socket.team = team;
  playerCount++;

  socket.emit("init", { troops, towers, team });

  socket.on("spawn", ({ x, y }) => {
    const troop = {
      id: Date.now() + Math.random(),
      x,
      y,
      team: socket.team,
      state: "moving",
      targetId: null,
      attackCooldown: 0,
    };
    troops.push(troop);
    io.emit("update", { troops, towers });
  });

  socket.on("attack", ({ troopId, targetId }) => {
    const tower = towers.find((t) => t.id === targetId);
    if (!tower) return;

    tower.hp -= 20;
    if (tower.hp < 0){
      tower.hp = 0;

      resetGame();
    }

    io.emit("update", { troops, towers });
  });
});

setInterval(() => {
  const TROOP_SPEED = 2;
  const ATTACK_RANGE = 120;

  troops.forEach((troop) => {
    if (troop.state === "moving") {
      const targetTowerObj = towers
        .filter((t) => t.team !== troop.team)
        .map((t) => ({
          tower: t,
          dist: Math.hypot(
            t.x + TOWER_SIZE / 2 - (troop.x + TROOP_SIZE / 2),
            t.y + TOWER_SIZE / 2 - (troop.y + TROOP_SIZE / 2)
          ),
        }))
        .sort((a, b) => a.dist - b.dist)[0];

      if (!targetTowerObj) return;

      if (targetTowerObj.dist <= ATTACK_RANGE) {
        troop.state = "attacking";
        troop.targetId = targetTowerObj.tower.id;
        troop.attackCooldown = 0;
      } else {
        const dx = targetTowerObj.tower.x + TOWER_SIZE / 2 - (troop.x + TROOP_SIZE / 2);
        const dy = targetTowerObj.tower.y + TOWER_SIZE / 2 - (troop.y + TROOP_SIZE / 2);
        const angle = Math.atan2(dy, dx);
        troop.x += Math.cos(angle) * TROOP_SPEED;
        troop.y += Math.sin(angle) * TROOP_SPEED;
      }
    }
  });

  io.emit("update", { troops, towers });
}, 50);

function resetGame() {
  troops = [];

  towers = [
    { id: 1, x: 325, y: 100, hp: 500, team: "red" },
    { id: 2, x: 325, y: 700, hp: 500, team: "blue" },
  ];

  io.emit("reset", { troops, towers });
}

server.listen(3000, () => console.log("Server running on 3000"));
