const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const { Pool } = require('pg');
const crypto = require('crypto');

// Register CORS
fastify.register(cors);

// Set up PostgreSQL connection pool 
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false,
  } : false, // No SSL for local development
});

// Fixed encryption functions
function encrypt(text, key) {
  const algorithm = 'aes-256-cbc';
  const keyBuffer = crypto.createHash('sha256').update(key).digest();
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText, key) {
  const algorithm = 'aes-256-cbc';
  const keyBuffer = crypto.createHash('sha256').update(key).digest();

  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];

  const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// Initialize database with better error handling
async function initDatabase() {
  try {
    // Test connection
    const client = await pool.connect();
    fastify.log.info('Database connection successful');

    await client.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        encrypted_content TEXT NOT NULL,
        key_hash VARCHAR(64) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    client.release();
    fastify.log.info('Database tables initialized');
  } catch (err) {
    fastify.log.error('Database initialization failed:', err.message);
  }
}

// Routes
fastify.get('/api/message', async () => {
  return { message: 'Secret Notes API - Ready for encryption!' };
});

fastify.get('/api/health', async () => {
  try {
    const response = await pool.query('SELECT 1');

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    };
  } catch (err) {
    return {
      status: 'degraded',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: err.message
    };
  }
});

// Create encrypted note
fastify.post('/api/notes', async (request, reply) => {
  try {
    const { content, key } = request.body;

    if (!content || !key) {
      return reply.status(400).send({
        error: 'Content and key are required'
      });
    }

    const encryptedContent = encrypt(content, key);
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');

    const result = await pool.query(
      'INSERT INTO notes (encrypted_content, key_hash) VALUES ($1, $2) RETURNING id, created_at',
      [encryptedContent, keyHash]
    );

    return {
      id: result.rows[0].id,
      created_at: result.rows[0].created_at,
      message: 'Note encrypted and stored successfully'
    };

  } catch (err) {
    fastify.log.error('Error creating note:', err.message);
    return reply.status(500).send({
      error: 'Failed to create note: ' + err.message
    });
  }
});

// Retrieve and decrypt note
fastify.post('/api/notes/:id/decrypt', async (request, reply) => {
  try {
    const { id } = request.params;
    const { key } = request.body;

    if (!key) {
      return reply.status(400).send({
        error: 'Decryption key is required'
      });
    }

    const result = await pool.query(
      'SELECT encrypted_content, key_hash FROM notes WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        error: 'Note not found'
      });
    }

    const { encrypted_content, key_hash } = result.rows[0];
    const providedKeyHash = crypto.createHash('sha256').update(key).digest('hex');

    if (providedKeyHash !== key_hash) {
      return reply.status(401).send({
        error: 'Invalid decryption key'
      });
    }

    const decryptedContent = decrypt(encrypted_content, key);

    return {
      content: decryptedContent,
      message: 'Note decrypted successfully'
    };

  } catch (err) {
    fastify.log.error('Error decrypting note:', err.message);
    return reply.status(500).send({
      error: 'Failed to decrypt note: ' + err.message
    });
  }
});

// List all notes
fastify.get('/api/notes', async (request, reply) => {
  try {
    const result = await pool.query(
      'SELECT id, created_at FROM notes ORDER BY created_at DESC'
    );

    return {
      notes: result.rows
    };

  } catch (err) {
    fastify.log.error('Error fetching notes:', err.message);
    return reply.status(500).send({
      error: 'Failed to fetch notes: ' + err.message
    });
  }
});

const start = async () => {
  try {
    await initDatabase();
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    fastify.log.info(`Secret Notes Backend running on http://0.0.0.0:3000`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

module.exports = fastify; // export for testing