<script>
  import { onMount } from "svelte";
  import io from "socket.io-client";
  import { page } from "$app/stores";

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
  let lobbyId;
  let username;
  let selectedTroop = "Bowler";

  const CARD_STATS = {
    Bowler: {
      hp: 100,
      damage: 10,
      range: 100,
      speed: 2,
      image: "/Bowler.webp"
    },
    Archers: {
      hp: 50,
      damage: 20,
      range: 200,
      speed: 3,
      image: "/Archers.webp"
    }
  }

  let deck = [];

  let elxir = 100;

  onMount(() => {
    lobbyId = $page.params.id;
    username = $page.url.searchParams.get("username")

    socket = io("http://localhost:3000");
    socket.emit("joinLobby", {lobbyId, username});

    const context = new AudioContext();
    let buffer;

    fetch("/BowlingSound.mp3")
      .then(res => res.arrayBuffer())
      .then(arrayBuffer => context.decodeAudioData(arrayBuffer))
      .then(decoded => buffer = decoded);

    socket.on("init", (data) => {
      troops = data.troops;
      towers = data.towers;
      projectiles = data.projectiles;
      myTeam = data.team;
      deck = data.deck;
    });

    socket.on("update", (data) => {
      troops = data.troops;
      towers = data.towers;
      projectiles = data.projectiles;
    });

    socket.on("playSound", (data) => {
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.start(0);
    });

    socket.on("reset", (data) => {
      troops = data.troops;
      towers = data.towers;
      projectiles = data.projectiles;
    });
  });

  function spawnTroop(event) {
    if (!myTeam) return;

    if (elxir < 50) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    let x = event.clientX - rect.left - TROOP_SIZE / 2;
    let y = event.clientY - rect.top - TROOP_SIZE / 2;

    if (myTeam === "red") {
      x = ARENA_WIDTH - x - TROOP_SIZE;
      y = ARENA_HEIGHT - y - TROOP_SIZE;
    }

    if ( myTeam === "blue" && y < rect.height / 2) {
      return;
    }

    if ( myTeam === "red" && y > rect.height / 2) {
      return;
    }

    elxir -= 50;

    socket.emit("spawn", { x, y, team: myTeam, selectedTroop: selectedTroop });
  }

  setInterval(() => {
    if (elxir >= 100) {
      return
    }

    elxir += 10;
  }, 1000);
</script>

<h1 class="text-center text-3xl mb-4">Boom Royale ⚔️ (Team {myTeam})</h1>

<div style="position: absolute; width: 400px; height: 70px; background-color: black; z-index: 10; left: 150px; top: 845px;">
  <div style="position: absolute; width: {elxir}%; height: 100%; background-color: cyan; z-index: 10;"></div>
</div>

<div style="position: absolute; left: 870px; top: 700px; width: 700px; height: 150px; background-color: grey; display: flex;">
  {#each deck as card}
    <div>
      <img src={CARD_STATS[card].image} style="width: 120px; height: 120px; object-fit: contain; background-color: darkgrey;" on:click={() => selectedTroop = card}>
      <h1 style="position: absolute; top: 90px; color: white;">{card}</h1>
    </div>
  {/each}
</div>

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
      src={troop.image}
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

  {#each projectiles as p (p.id)}
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
