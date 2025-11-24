import express from "express";
import { Server } from "socket.io";
import http from "http";
import { getPlayer, createPlayer, updatePlayer } from "./playerModel.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const lobbies = {};

const TROOP_SIZE = 100;
const TOWER_SIZE = 50;

const bowlerSound = "/BowlingSound.mp3";

let troops = [];
let towers = [
  { id: 1, x: 325, y: 100, hp: 500, team: "red" },
  { id: 2, x: 325, y: 700, hp: 500, team: "blue" },
];
let projectiles = [];

let playerCount = 0;

io.on("connection", (socket) => {
  io.emit("lobbyList", Object.keys(lobbies));

  socket.on("login", async (username) => {
    let player = await getPlayer(username);

    if (!player) {
      player = await createPlayer(username);
    }

    socket.player = player;

    socket.emit("playerData", player);
  });

  socket.on("buyChest", async (player) => {
    player.chests.push("chest");
    await updatePlayer(player);
    socket.emit("playerData", player);
  });

  socket.on("openChest", async (data) => {
    const player = data[0];
    const cardWon = data[1];

    player.chests.pop();
    player.ownedCards.push(cardWon.name);
    await updatePlayer(player);
    socket.emit("playerData", player);
  });

  socket.on("joinLobby", (lobbyId) => {
    console.log(socket.id);

    socket.join(lobbyId);
    socket.lobbyId = lobbyId;

    if (!lobbies[lobbyId]) {
      lobbies[lobbyId] = {
        troops: [],
        towers: [
          { id: 1, x: 325, y: 100, hp: 500, team: "red" },
          { id: 2, x: 325, y: 700, hp: 500, team: "blue" },
        ],
        projectiles: [],
        playerCount: 0,
      }
    }

    const lobby = lobbies[lobbyId]
    const team = lobby.playerCount % 2 === 0 ? "blue" : "red";
    socket.team = team;
    lobby.playerCount++;

    io.emit("lobbyList", Object.keys(lobbies));

    socket.emit("init", { troops: lobby.troops, towers: lobby.towers, projectiles: lobby.projectiles, team });

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
      lobby.troops.push(troop);
      io.to(lobbyId).emit("update", lobby);

      io.to(lobbyId).emit("playSound", { bowlerSound });
    });

    socket.on("attack", ({ troopId, targetId }) => {
      const tower = lobby.towers.find((t) => t.id === targetId);
      if (!tower) return;

      tower.hp -= 20;
      if (tower.hp < 0){
        tower.hp = 0;

        resetGame(lobbyId);
      }

      io.to(lobbyId).emit("update", lobby);
    });

    socket.on("disconnect", () => {
      const lobbyId = socket.lobbyId;
      const lobby = lobbies[lobbyId];

      lobby.playerCount -= 1;

      if (lobby.playerCount <= 0) {
        delete lobbies[lobbyId];
      }

      io.emit("lobbyList", Object.keys(lobbies));
    })
  });
});

setInterval(() => {
  const TROOP_SPEED = 2;
  const ATTACK_RANGE = 120;
  const TROOP_DAMANGE = 10

  for (const lobbyId in lobbies) {
    const lobby = lobbies[lobbyId];
    const { troops, towers, projectiles} = lobby;

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

      if (troop.state === "moving") {
        if (nearbyEnemy && nearbyEnemy.dist <= ATTACK_RANGE) {
          troop.state = "attacking";
          troop.targetId = nearbyEnemy.enemy.id;
          troop.attackCooldown = 0;

          //projectiles.push({
            //id: Date.now() + Math.random(),
            //troopId: troop.id,
            //targetId: troop.targetId,
            //x: troop.x + TROOP_SIZE / 2,
            //y: troop.y + TROOP_SIZE / 2,
            //targetX: nearbyEnemy.enemy.x + TROOP_SIZE / 2,
            //targetY: nearbyEnemy.enemy.y + TROOP_SIZE / 2,
          //});
        }

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
        const targetTroop = troops.find(
          (t) => t.id === troop.targetId && t.team !== troop.team
        );
        const targetTower = towers.find(
          (t) => t.id === troop.targetId && t.team !== troop.team
        ); 

        if (troop.attackCooldown > 0) {
          troop.attackCooldown -= 1;
        }

        if (troop.attackCooldown <= 0) {
          if (targetTroop) {
            projectiles.push({
              id: Date.now() + Math.random(),
              troopId: troop.id,
              targetId: troop.targetId,
              x: troop.x + TROOP_SIZE / 2,
              y: troop.y + TROOP_SIZE / 2,
              targetX: nearbyEnemy.enemy.x + TROOP_SIZE / 2,
              targetY: nearbyEnemy.enemy.y + TROOP_SIZE / 2,
            });
          }

          if (targetTower) {
            projectiles.push({
              id: Date.now() + Math.random(),
              troopId: troop.id,
              targetId: troop.targetId,
              x: troop.x + TROOP_SIZE / 2,
              y: troop.y + TROOP_SIZE / 2,
              targetX: targetTowerObj.tower.x + TOWER_SIZE / 2,
              targetY: targetTowerObj.tower.y + TOWER_SIZE / 2,
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
        const tower = towers.find((t) => t.id === projectile.targetId);

        if (enemy) {
          enemy.hp -= 10;

          if (enemy.hp <= 0) {
            troops.splice(troops.indexOf(enemy), 1);
          }
        }

        if (tower) {
          tower.hp -= 10;

          if (tower.hp <= 0) {
            resetGame(lobbyId);
          }
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

    io.to(lobbyId).emit("update", lobby);
  }
}, 50);

function resetGame(lobbyId) {
  const lobby = lobbies[lobbyId];

  lobby.troops = [];

  lobby.towers = [
    { id: 1, x: 325, y: 100, hp: 500, team: "red" },
    { id: 2, x: 325, y: 700, hp: 500, team: "blue" },
  ];

  lobby.projectiles = [];

  io.to(lobbyId).emit("reset", lobby);
}

server.listen(process.env.PORT || 10000, () => console.log("Server running on 3000"));
