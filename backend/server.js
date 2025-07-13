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
    const client = await pool.connect();
    fastify.log.info('Database connection successful');

    await client.query(`
      CREATE TABLE IF NOT EXISTS secret_notes (
        id SERIAL PRIMARY KEY,
        encrypted_content TEXT NOT NULL,
        key_hash VARCHAR(64) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        user_id VARCHAR(64)
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
    await pool.query('SELECT 1');

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
    const { content, key, user_id } = request.body;

    if (!content || !key) {
      return reply.status(400).send({
        error: 'Content and key are required'
      });
    }

    const encryptedContent = encrypt(content, key);
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');

    const result = await pool.query(
      'INSERT INTO secret_notes (encrypted_content, key_hash, user_id) VALUES ($1, $2, $3) RETURNING id, created_at',
      [encryptedContent, keyHash, user_id || null]
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

    fastify.log.info(`Decrypt request - ID: ${id}, Key provided: ${!!key}`);

    if (!key) {
      return reply.status(400).send({
        error: 'Decryption key is required'
      });
    }

    // FIX: Select id as well
    const result = await pool.query(
      'SELECT id, encrypted_content, key_hash FROM secret_notes WHERE id = $1',
      [id]
    );

    fastify.log.info(`Database query result: ${result.rows.length} rows`);

    if (result.rows.length === 0 || result.rows[0].id.toString() !== id) {
      return reply.status(404).send({
        error: 'Note not found'
      });
    }

    const { encrypted_content, key_hash } = result.rows[0];
    const providedKeyHash = crypto.createHash('sha256').update(key).digest('hex');

    fastify.log.info(`Key hash match: ${providedKeyHash === key_hash}`);

    if (providedKeyHash !== key_hash) {
      return reply.status(401).send({
        error: 'Invalid decryption key'
      });
    }

    try {
      const decryptedContent = decrypt(encrypted_content, key);
      fastify.log.info('Decryption successful');

      return {
        content: decryptedContent,
        message: 'Note decrypted successfully'
      };
    } catch (decryptError) {
      fastify.log.error('Decryption error:', decryptError.message);
      return reply.status(501).send({
        error: 'Decryption failed: ' + decryptError.message
      });
    }

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
    const userId = request.query.user_id;
    let result;
    if (userId) {
      result = await pool.query(
        'SELECT id, created_at FROM secret_notes WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
    } else {
      result = await pool.query(
        'SELECT id, created_at FROM secret_notes ORDER BY created_at DESC'
      );
    }

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

fastify.delete('/api/test-data', async (request, reply) => {
  try {
    const result = await pool.query(
      `DELETE FROM secret_notes WHERE user_id = 'k6_test_user' OR user_id = 'e2e_test_user'`
    );
    fastify.log.info(`Cleaned up ${result.rowCount} test notes`);
    return { message: 'Test data cleaned up successfully', deletedCount: result.rowCount };
  } catch (err) {
    fastify.log.error('Error cleaning test data:', err.message);
    return reply.status(500).send({ error: 'Failed to clean test data: ' + err.message });
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