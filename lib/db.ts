import * as SQLite from 'expo-sqlite';
export const db = SQLite.openDatabaseSync('sicilia.db');

export async function initDb() {
    await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS meta(
        key TEXT PRIMARY KEY,
        value TEXT
        );
        CREATE TABLE IF NOT EXISTS cards(
        id INTEGER PRIMARY KEY,
        word TEXT NOT NULL,
        meaning_ja TEXT NOT NULL,
        is_premium INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS progress(
        card_id INTEGER PRIMARY KEY,            -- cards.id と型を合わせる
        learned INTEGER DEFAULT 0,              -- 0/1
        correct INTEGER DEFAULT 0,
        wrong INTEGER DEFAULT 0,
        reps INTEGER DEFAULT 0,
        interval_days INTEGER DEFAULT 0,
        ease REAL DEFAULT 2.5,
        due_at INTEGER                          -- epoch ms
        );
    `);

    // 初期データ投入（初回だけ）
    const seeded = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM meta WHERE key=?',
        ['seeded_v1']
    );

    if (!seeded) {
        try {
        const seed: Array<any> = require('../assets/data/seed100.json');

        await db.execAsync('BEGIN');
        for (const row of seed) {
            await db.runAsync(
            'INSERT INTO cards(id, word, meaning_ja, is_premium) VALUES(?, ?, ?, ?)',
            [row.id, row.word, row.meaning_ja, row.is_premium ? 1 : 0]
            );
        }
        await db.runAsync(
            'INSERT INTO meta(key, value) VALUES(?, ?)',
            ['seeded_v1', '1']
        );
        await db.execAsync('COMMIT');
        } catch (e) {
        await db.execAsync('ROLLBACK');
        console.log('Seeding failed:', e);
        }
    }
}
