const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const { Client } = require('pg');

fastify.register(cors);

const db = new Client({
  connectionString: process.env.DATABASE_URL, // or your connection string here
});

db.connect();

fastify.get('/api/message', async () => {
  return { message: 'Hello from Node.js Fastify backend!' };
});

fastify.get('/api/dbtest', async (request, reply) => {
  try {
    const result = await db.query('SELECT NOW()');
    return { status: 'DB connected', time: result.rows[0].now };
  } catch (error) {
    reply.status(500).send({ status: 'DB error', error: error.message });
  }
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    fastify.log.info(`Server running on http://0.0.0.0:3000`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
