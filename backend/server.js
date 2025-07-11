const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const { Client } = require('pg');

fastify.register(cors);

const db = new Client({
  connectionString: 'postgres://postgres:postgres@secret-notes-db.ci4bvrmai3fb.us-east-1.rds.amazonaws.com:5432/secret_notes'
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
