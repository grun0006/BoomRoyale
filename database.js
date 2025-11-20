import sqlite3 from "sqlite3";
import { open } from "sqlite";

export const db = await open({
    filename: "./database.db",
    driver: sqlite3.Database
});

await db.exec(`CREATE TABLE IF NOT EXISTS players (username TEXT PRIMARY KEY, ownedCards TEXT, deck TEXT, chests TEXT);`);