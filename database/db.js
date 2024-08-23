import pg from 'pg';
import 'dotenv/config'
export const db = new pg.Client({
    connectionString: process.env.connectionString
});
