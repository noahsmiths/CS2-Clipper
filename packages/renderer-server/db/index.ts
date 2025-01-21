import pg from "pg";
import sql from "sql-template-strings";

const pool = new pg.Pool({
    connectionString: process.env.POSTGRES_URL
});

export async function getUsersAndMatchCodes() {
    const { rows }: { rows: User[] } = await pool.query(sql`SELECT steam_id as "steamId", cs_auth_code as "authCode", match_code as "matchCode" FROM users;`);
    return rows;
}