const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const { Pool } = require('pg');

// Register CORS
fastify.register(cors);

// Set up PostgreSQL connection pool using DATABASE_URL from environment
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});


// Simple API route
fastify.get('/api/message', async () => {
  return { message: 'Hello from Node.js Fastify backend!' };
});

// Test DB connection route
fastify.get('/api/db-test', async () => {
  const result = await pool.query('SELECT NOW()');
  return { time: result.rows[0].now };
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    fastify.log.info(`Server running on http://localhost:3000`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();