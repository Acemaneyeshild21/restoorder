import pg from 'pg';
const { Pool } = pg;

const connectionString = process.argv[2];

if (!connectionString) {
  console.error("Please provide the connection string as an argument.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function initDb() {
  const client = await pool.connect();
  try {
    console.log("Connected to database. Creating tables...");
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'client',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Table 'users' created or already exists.");

    // Check if admin exists
    const adminCheck = await client.query("SELECT * FROM users WHERE email = 'admin@resto.com'");
    if (adminCheck.rows.length === 0) {
      // In a real app, we would hash the password with bcrypt. 
      // For this learning step, we'll store it plain or use a simple mock hash, 
      // but let's use a placeholder for now and we'll add bcrypt later.
      await client.query(`
        INSERT INTO users (name, email, password_hash, role) 
        VALUES ('Administrateur', 'admin@resto.com', 'admin123', 'manager')
      `);
      console.log("Default admin user created.");
    }

    // Check if cuisine exists
    const cuisineCheck = await client.query("SELECT * FROM users WHERE email = 'cuisine@resto.com'");
    if (cuisineCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO users (name, email, password_hash, role) 
        VALUES ('Chef Cuisine', 'cuisine@resto.com', 'cuisine123', 'cuisine')
      `);
      console.log("Default cuisine user created.");
    }

    // Check if livreur exists
    const livreurCheck = await client.query("SELECT * FROM users WHERE email = 'livreur@resto.com'");
    if (livreurCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO users (name, email, password_hash, role) 
        VALUES ('Livreur Rapide', 'livreur@resto.com', 'livreur123', 'livreur')
      `);
      console.log("Default livreur user created.");
    }

    console.log("Database initialization complete.");
  } catch (err) {
    console.error("Error initializing database:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

initDb();
