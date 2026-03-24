import express from "express";
import { createServer as createViteServer } from "vite";
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from "dotenv";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key_for_learning";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  let connectionString = process.env.DATABASE_URL;
  if (connectionString && connectionString.startsWith('postgresql://')) {
    const parts = connectionString.split('@');
    if (parts.length >= 2) {
      const hostPart = parts.pop();
      const userPassPart = parts.join('@');
      const userPassParts = userPassPart.split(':');
      if (userPassParts.length >= 3) {
        const pass = userPassParts.slice(2).join(':');
        let decodedPass = pass;
        try { decodedPass = decodeURIComponent(pass); } catch (e) {}
        const encodedPass = encodeURIComponent(decodedPass);
        connectionString = userPassParts.slice(0, 2).join(':') + ':' + encodedPass + '@' + hostPart;
      }
    }
  }

  // Configuration de la base de données PostgreSQL
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  // Middleware pour vérifier le token JWT
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // API Route: Test de la connexion à la base de données
  app.get("/api/db-test", async (req, res) => {
    try {
      if (!process.env.DATABASE_URL) {
        return res.status(500).json({ error: "DATABASE_URL n'est pas défini dans les variables d'environnement." });
      }
      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as time');
      client.release();
      res.json({ status: "ok", time: result.rows[0].time, message: "Connexion à PostgreSQL réussie !" });
    } catch (err: any) {
      console.error("Erreur de connexion DB:", err);
      res.status(500).json({ 
        error: "Erreur de connexion à la base de données", 
        details: err.message
      });
    }
  });

  // API Route: Login
  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    try {
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
      client.release();

      if (result.rows.length === 0) {
        return res.status(401).json({ error: "Email ou mot de passe incorrect" });
      }

      const user = result.rows[0];
      
      // Pour l'apprentissage, on compare directement si le mot de passe n'est pas haché
      // Dans une vraie app, on utiliserait toujours bcrypt.compare(password, user.password_hash)
      let isMatch = false;
      if (user.password_hash === password) {
        isMatch = true;
      } else {
        isMatch = await bcrypt.compare(password, user.password_hash);
      }

      if (!isMatch) {
        return res.status(401).json({ error: "Email ou mot de passe incorrect" });
      }

      // Générer le token JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (err: any) {
      console.error("Erreur login:", err);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // API Route: Obtenir l'utilisateur actuel
  app.get("/api/me", authenticateToken, (req: any, res: any) => {
    res.json({ user: req.user });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
