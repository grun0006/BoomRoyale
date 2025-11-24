<script>
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import io from "socket.io-client";

    let socket;
    let lobbies = [];

    let username = "";

    let uiOpacity = 1;
    let uiSpinningWheelOpacity = 0;
    let cardOpacity = 0;
    let winCardOpacity = 0;
    let openingChest = false;
    let chestOpend = false;

    const troopCards = [{name: "Bowler"}, {name: "Knight"}, {name: "Archers"}, {name: "Golem"}]
    const chestCards = troopCards;

    let randomCard = chestCards[0];
    let winCard = chestCards[0];

    let playerData;
    let usernamePromptOpacity = 1;

    let chests = [];
    let deck = [];
    let ownedCards = [];

    onMount(() => {
        socket = io("http://localhost:3000");

        socket.on("playerData", (player) => {
            playerData = player;

            chests = playerData.chests;
            deck = playerData.deck;
            ownedCards = playerData.ownedCards;

            console.log(playerData);
        });

        socket.on("lobbyList", (list) => {
            lobbies = list;

            console.log(lobbies);
        });
    });

    function startGame() {
        if (username != "") {
            goto(`lobby/${username}`);
        }
    }

    function joinGame(lobbyId) {
        goto(`lobby/${lobbyId}`);
    }

    function openChest() {
        if (chests.length > 0) {
            uiOpacity = 0.5;
            uiSpinningWheelOpacity = 0.7;
            cardOpacity = 1;
            openingChest = true;

            let cardCount = 0;

            const spinCards = setInterval(() => {
            randomCard = chestCards[Math.floor(Math.random() * chestCards.length)];

            cardCount++;

            if (cardCount >= 20) {
                clearInterval(spinCards);

                winCard = chestCards[Math.floor(Math.random() * chestCards.length)];
                cardOpacity = 0;
                winCardOpacity = 1;
                chestOpend = true;

                socket.emit("openChest", [playerData, winCard]);

                setTimeout(() => {
                uiOpacity = 1;
                uiSpinningWheelOpacity = 0;
                winCardOpacity = 0;
                openingChest = false;
                }, 5000);
            }
            }, 500);
        }
    }

    function buyChest() {
        socket.emit("buyChest", playerData);

        window.open("https://betaalverzoek.rabobank.nl/betaalverzoek/?id=RhJlJvlaRjKjAQttJtbv7g", "_blank");
    }

    function sendUsername() {
        if (username != "") {
            usernamePromptOpacity = 0;

            socket.emit("login", username);
        }
    }
</script>

<div style="width: 100%; height: 80px; background-color: darkgrey; position: absolute; top: 0px; left: 0px;">
    <h1 style="position: absolute; color: white; left: 1500px;">173624 Gold</h1>
    <h1 style="position: absolute; color: white; left: 50px;">{username}</h1>
</div>

<ul style="position: absolute; top: 400px; left: 100px;">
    {#each lobbies as lobby}
        <li>
            Lobby {lobby}
            <button on:click={() => joinGame(lobby)}>Join game</button>
        </li>
    {/each}
</ul>

<div style="position: absolute; width: 700px; height: 800px; left: 1000px; top: 90px;">
  <img src="/Royal_Wild_Chest.webp" style="position: absolute; width: 200px; left: 250px; top: 200px; opacity: {uiOpacity};">
  <button style="position: absolute; width: 250px; height: 100px; font-size: 40px; left: 225px; top: 450px; z-index: 10" on:click={openChest} disabled={openingChest}>Open Chest</button>
  <button style="position: absolute; width: 250px; height: 100px; font-size: 40px; left: 225px; top: 600px; z-index: 10" on:click={buyChest} disabled={openingChest}>Buy Chest</button>

  <img src={"/" + randomCard.name + ".webp"} style="opacity: {cardOpacity}; position: absolute; left: 225px; top: 50px; width: 250px; height: 350px; object-fit: contain;">
  <img src={"/" + winCard.name + ".webp"} style="opacity: {winCardOpacity}; position: absolute; left: 225px; top: 50px; width: 250px; height: 350px; object-fit: contain;">

  <h1 style="position: absolute; left: 300px; opacity: {winCardOpacity}">{winCard.name}</h1>
  <h1 style="position: absolute; left: 210px; top: 100px; opacity: {uiOpacity}">Chests Remaining: {chests.length}</h1>
</div>

<div style="position: absolute; left: 750px; top: 780px;">
    <button style="width: 200px; height: 100px; font-size: 50px;" on:click={startGame}>Battle</button>
</div>

<div style="position: absolute; background-color:darkgrey; height: 250px; width: 400px; top: 300px; left: 640px; opacity: {usernamePromptOpacity}">
    <h1 style="color: white; position: absolute; left: 100px; font-size: 40px">Username: </h1>
    <input type="Text" bind:value={username} placeholder="Voer een Username in" style="position: absolute; left: 110px; top: 90px">
    <button on:click={sendUsername} style="position: absolute; width: 150px; height: 50px; font-size: 28px; left: 118px; top: 170px">Send</button>
</div>

<div style="position: absolute; top: 100px; display: flex;">
    <h1>Your Deck:</h1>
    {#each deck as card}
        {#if (card != "")}
            <div style="background-color: darkgrey; margin: 20px;">
                <img src="/{card}.webp" style="width: 150px; height: 150px; object-fit: contain;">
                <h1 style="position: absolute; top: 150px;">{card}</h1>
            </div>
        {/if}
        {#if (card == "")}
            <div style="background-color: darkgrey; margin: 20px;">
                <img src="" style="width: 150px; height: 150px; object-fit: contain;">
                <h1 style="position: absolute; top: 150px;">{card}</h1>
            </div>
        {/if}
    {/each}
</div>

<div style="position: absolute; top: 400px; display: flex;">
    <h1>Owned cards:</h1>
    {#each ownedCards as card}
        {#if (card != "")}
            <div style="background-color: darkgrey; margin: 20px;">
                <img src="/{card}.webp" style="width: 150px; height: 150px; object-fit: contain;">
                <h1 style="position: absolute; top: 150px;">{card}</h1>
            </div>
        {/if}
        {#if (card == "")}
            <div style="background-color: darkgrey; margin: 20px;">
                <img src="" style="width: 150px; height: 150px; object-fit: contain;">
                <h1 style="position: absolute; top: 150px;">Locked</h1>
            </div>
        {/if}
    {/each}
</div>