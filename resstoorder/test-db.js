import dotenv from 'dotenv';
import pg from 'pg';
const { Pool } = pg;

dotenv.config();

console.log("DATABASE_URL:", process.env.DATABASE_URL);

try {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  pool.connect()
    .then(client => {
      console.log("Connected successfully");
      client.release();
      pool.end();
    })
    .catch(err => {
      console.error("Connection error:", err);
      pool.end();
    });
} catch (err) {
  console.error("Pool creation error:", err);
}
