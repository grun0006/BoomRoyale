import { json } from "@sveltejs/kit";
import { db } from "./database.js";

export async function getPlayer(username) {
    const row = await db.get("SELECT * FROM players WHERE username = ?", username);

    if (!row) {
        return;
    }

    return {
        username: row.username,
        ownedCards: JSON.parse(row.ownedCards),
        deck: JSON.parse(row.deck),
        chests: JSON.parse(row.chests)
    };
}

export async function createPlayer(username) {
    const ownedCards = ["Bowler", "", "", ""];
    const deck = ["Bowler", "", "", "", ""];
    const chests = [];

    await db.run("INSERT INTO players (username, ownedCards, deck, chests) VALUES (?, ?, ?, ?)", username, JSON.stringify(ownedCards), JSON.stringify(deck), JSON.stringify(chests));

    return { username, ownedCards, deck, chests };
}

export async function updatePlayer(player) {
    await db.run("UPDATE players SET ownedCards=?, deck=?, chests=? WHERE username=?", JSON.stringify(player.ownedCards), JSON.stringify(player.deck), JSON.stringify(player.chests), player.username);
}