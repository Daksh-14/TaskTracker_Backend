import pg from 'pg';
import 'dotenv/config';
import fs from 'fs';

export const db = new pg.Client({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: {
    ca: fs.readFileSync(process.env.CA_CERT).toString(),
    rejectUnauthorized: true
  }
});
