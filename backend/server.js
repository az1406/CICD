const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');

fastify.register(cors);

fastify.get('/api/message', async () => {
  return { message: 'Hello from Node.js Fastify backend!' };

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
