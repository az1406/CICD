const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');

fastify.register(cors);

fastify.get('/api/message', async () => {
  return { message: 'Hello from Node.js Fastify backend!' };

});
// Example in Node.js
app.get('/api/dbtest', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ status: 'DB connected', time: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ status: 'DB error', error: error.message });
  }
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
