<script>
  import { onMount } from "svelte";
  import io from "socket.io-client";

  const ARENA_WIDTH = 700;
  const ARENA_HEIGHT = 800;
  const TROOP_SIZE = 100;
  const TOWER_SIZE = 50;
  const PROJECTILE_SPEED = 8;

  let troops = [];
  let towers = [];
  let projectiles = [];
  let socket;
  let myTeam = null;

  onMount(() => {
    socket = io("https://boomroyale-backend.onrender.com/");

    socket.on("init", (data) => {
      troops = data.troops;
      towers = data.towers;
      myTeam = data.team;
    });

    socket.on("update", (data) => {
      troops = data.troops;
      towers = data.towers;
    });

    socket.on("reset", (data) => {
      troops = data.troops;
      towers = data.towers;
      projectiles = [];
    });

    setInterval(updateProjectiles, 50);
  });

  function spawnTroop(event) {
    if (!myTeam) return;

    const rect = event.currentTarget.getBoundingClientRect();
    let x = event.clientX - rect.left - TROOP_SIZE / 2;
    let y = event.clientY - rect.top - TROOP_SIZE / 2;

    if (myTeam === "red") {
      x = ARENA_WIDTH - x - TROOP_SIZE;
      y = ARENA_HEIGHT - y - TROOP_SIZE;
    }

    socket.emit("spawn", { x, y, team: myTeam });
  }

  function updateProjectiles() {
    const remove = [];
    projectiles.forEach((p, i) => {
      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const dist = Math.hypot(dx, dy);

      if (dist < PROJECTILE_SPEED) {
        remove.push(i);
        socket.emit("attack", { troopId: p.troopId, targetId: p.targetId });
      } else {
        p.x += (dx / dist) * PROJECTILE_SPEED;
        p.y += (dy / dist) * PROJECTILE_SPEED;
      }
    });
    projectiles = projectiles.filter((_, i) => !remove.includes(i));
  }

  $: troops.forEach((t) => {
    if (
      t.state === "attacking" &&
      t.targetId &&
      !projectiles.find((p) => p.troopId === t.id)
    ) {
      const tower = towers.find((to) => to.id === t.targetId);
      if (!tower) return;

      projectiles.push({
        troopId: t.id,
        targetId: t.targetId,
        x: t.x + TROOP_SIZE / 2,
        y: t.y + TROOP_SIZE / 2,
        targetX: tower.x + TOWER_SIZE / 2,
        targetY: tower.y + TOWER_SIZE / 2,
      });
    }
  });
</script>

<h1 class="text-center text-3xl mb-4">Boom Royale ⚔️ (Team {myTeam})</h1>

<div
  class="arena"
  on:click={spawnTroop}
  style="
    position: relative; 
    width: {ARENA_WIDTH}px; 
    height: {ARENA_HEIGHT}px;
    transform: {myTeam === 'red' ? 'rotate(180deg)' : 'none'};
  "
>
  <img src="/Arena.jpg" style="width: 100%; height: 100%;" />

  {#each towers as tower (tower.id)}
    <div
      style="
        position: absolute;
        left: {tower.x}px;
        top: {tower.y}px;
        width: {TOWER_SIZE}px;
        height: {TOWER_SIZE}px;
        background: {tower.team === myTeam ? 'blue' : 'red'};
        border-radius: 10px;
        border: 2px solid white;
        text-align: center;
        color: white;
        font-size: 12px;
        font-weight: bold;
        line-height: {TOWER_SIZE}px;
        transform: {myTeam === 'red' ? 'rotate(180deg)' : 'none'};
      "
    >
      {tower.hp}
    </div>
  {/each}

  {#each troops as troop (troop.id)}
    <img
      src="/Bowler.webp"
      style="
        position: absolute;
        left: {troop.x}px;
        top: {troop.y + Math.sin(Date.now() / 200) * 2}px;
        width: {TROOP_SIZE}px;
        height: {TROOP_SIZE}px;
        pointer-events: none;
        filter: drop-shadow(0 0 6px {troop.team === myTeam ? 'blue' : 'red'});
        transform: {myTeam === 'red' ? 'rotate(180deg)' : 'none'};
      "
    />
  {/each}

  {#each projectiles as p (p.troopId)}
    <div
      style="
        position: absolute;
        left: {p.x}px;
        top: {p.y}px;
        width: 20px;
        height: 20px;
        background: grey;
      "
    >
    </div>
  {/each}
</div>
