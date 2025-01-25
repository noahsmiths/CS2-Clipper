import postgres from "postgres";

if (process.env.POSTGRES_URL === undefined) {
    throw new Error("POSTGRES_URL env variable not set!");
}

const sql = postgres(process.env.POSTGRES_URL);

export default sql;