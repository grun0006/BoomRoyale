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
let projectiles = [];

let playerCount = 0;

io.on("connection", (socket) => {
  console.log(socket.id);

  const team = playerCount % 2 === 0 ? "blue" : "red";
  socket.team = team;
  playerCount++;

  socket.emit("init", { troops, towers, projectiles, team });

  socket.on("spawn", ({ x, y }) => {
    const troop = {
      id: Date.now() + Math.random(),
      x,
      y,
      team: socket.team,
      state: "moving",
      targetId: null,
      attackCooldown: 40,
      hp: 100,
    };
    troops.push(troop);
    io.emit("update", { troops, towers, projectiles });
  });

  socket.on("attack", ({ troopId, targetId }) => {
    const tower = towers.find((t) => t.id === targetId);
    if (!tower) return;

    tower.hp -= 20;
    if (tower.hp < 0){
      tower.hp = 0;

      resetGame();
    }

    io.emit("update", { troops, towers, projectiles });
  });
});

setInterval(() => {
  const TROOP_SPEED = 2;
  const ATTACK_RANGE = 120;
  const TROOP_DAMANGE = 10

  troops.forEach((troop) => {
    const enemyTroops = troops.filter((t) => t.team !== troop.team)

    const nearbyEnemy = enemyTroops
      .map((enemy) => ({
        enemy,
        dist: Math.hypot(
          enemy.x + TROOP_SIZE / 2 - (troop.x + TROOP_SIZE / 2),
          enemy.y + TROOP_SIZE / 2 - (troop.y + TROOP_SIZE / 2)
        ),
      }))
      .sort((a, b) => a.dist - b.dist)[0];

    if (troop.state === "moving") {
      if (nearbyEnemy && nearbyEnemy.dist <= ATTACK_RANGE) {
        troop.state = "attacking";
        troop.targetId = nearbyEnemy.enemy.id;

        projectiles.push({
          troopId: troop.id,
          targetId: troop.targetId,
          x: troop.x + TROOP_SIZE / 2,
          y: troop.y + TROOP_SIZE / 2,
          targetX: nearbyEnemy.enemy.x + TROOP_SIZE / 2,
          targetY: nearbyEnemy.enemy.y + TROOP_SIZE / 2,
        });
      }

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

    if (troop.state === "attacking") {
      if (troop.attackCooldown > 0) {
        troop.attackCooldown -= 1;
      }

      if (troop.attackCooldown <= 0) {
        if (nearbyEnemy) {
          projectiles.push({
            troopId: troop.id,
            targetId: nearbyEnemy.enemy.id,
            x: troop.x + TROOP_SIZE / 2,
            y: troop.y + TROOP_SIZE / 2,
            targetX: nearbyEnemy.enemy.x + TROOP_SIZE / 2,
            targetY: nearbyEnemy.enemy.y + TROOP_SIZE / 2,
          });
        }

        if (targetTowerObj) {
          projectiles.push({
            troopId: troop.id,
            targetId: targetTowerObj.enemy.id,
            x: troop.x + TROOP_SIZE / 2,
            y: troop.y + TROOP_SIZE / 2,
            targetX: targetTowerObj.enemy.x + TOWER_SIZE / 2,
            targetY: targetTowerObj.enemy.y + TOWER_SIZE / 2,
          });
        }

        troop.attackCooldown = 40;
      }
    }
  });

  projectiles.forEach((projectile) => {
    const dx = projectile.targetX - projectile.x;
    const dy = projectile.targetY - projectile.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 4) {
      const enemy = troops.find((t) => t.id === projectile.targetId);

      if (enemy) {
        enemy.hp -= 10;

        if (enemy.hp <= 0) {
          troops.splice(troops.indexOf(enemy), 1);
        }

        console.log(enemy.hp)
      }

      const troop = troops.find((t) => t.id === projectile.troopId);

      if (troop) {
        troop.state = "moving";
      }

      projectiles.splice(projectiles.indexOf(projectile), 1);
    } else {
      projectile.x += (dx / dist) * 4;
      projectile.y += (dy / dist) * 4;
    }
  });

  io.emit("update", { troops, towers, projectiles });
}, 50);

function resetGame() {
  troops = [];

  towers = [
    { id: 1, x: 325, y: 100, hp: 500, team: "red" },
    { id: 2, x: 325, y: 700, hp: 500, team: "blue" },
  ];

  io.emit("reset", { troops, towers });
}

server.listen(process.env.PORT || 10000, () => console.log("Server running on 3000"));
