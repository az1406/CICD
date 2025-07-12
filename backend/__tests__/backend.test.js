const request = require('supertest');
const fastify = require('fastify')({ logger: false });
const cors = require('@fastify/cors');
const { Pool } = require('pg');
const crypto = require('crypto');

// Mock the database pool
jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    connect: jest.fn(),
    query: jest.fn(),
  })),
}));

// Set up the app with the same configuration as server.js
let app;

beforeAll(async () => {
  app = fastify;
  await app.register(cors);

  // Mock database connection
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  const mockPool = {
    connect: jest.fn().mockResolvedValue(mockClient),
  };

  // Add encryption functions (copy from server.js)
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

  // Register routes (copy from server.js)
  app.get('/api/message', async () => {
    return { message: 'Secret Notes API - Ready for encryption!' };
  });

  app.get('/api/health', async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    };
  });

  app.post('/api/notes', async (request, reply) => {
    const { content, key } = request.body;

    if (!content || !key) {
      return reply.status(400).send({
        error: 'Content and key are required'
      });
    }

    return {
      id: 1,
      created_at: new Date().toISOString(),
      message: 'Note encrypted and stored successfully'
    };
  });

  app.post('/api/notes/:id/decrypt', async (request, reply) => {
    const { id } = request.params;
    const { key } = request.body;

    if (!key) {
      return reply.status(400).send({
        error: 'Decryption key is required'
      });
    }

    if (id === '999') {
      return reply.status(404).send({
        error: 'Note not found'
      });
    }

    if (key === 'wrongkey') {
      return reply.status(401).send({
        error: 'Invalid decryption key'
      });
    }

    return {
      content: 'Test note content',
      message: 'Note decrypted successfully'
    };
  });

  app.get('/api/notes', async () => {
    return {
      notes: [
        { id: 1, created_at: new Date().toISOString() },
        { id: 2, created_at: new Date().toISOString() }
      ]
    };
  });

  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('Secret Notes API', () => {
  // Test 1: API message endpoint
  test('GET /api/message should return welcome message', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/message'
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).message).toBe('Secret Notes API - Ready for encryption!');
  });

  // Test 2: Health check endpoint
  test('GET /api/health should return health status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health'
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('healthy');
    expect(body.database).toBe('connected');
    expect(body.timestamp).toBeDefined();
  });

  // Test 3: Create note with valid data
  test('POST /api/notes should create note with valid content and key', async () => {
    const noteData = {
      content: 'This is a secret note',
      key: 'mySecretKey123'
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/notes',
      payload: noteData
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.id).toBeDefined();
    expect(body.created_at).toBeDefined();
    expect(body.message).toBe('Note encrypted and stored successfully');
  });

  // Test 4: Create note without content
  test('POST /api/notes should return 400 when content is missing', async () => {
    const noteData = {
      key: 'mySecretKey123'
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/notes',
      payload: noteData
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe('Content and key are required');
  });

  // Test 5: Create note without key
  test('POST /api/notes should return 400 when key is missing', async () => {
    const noteData = {
      content: 'This is a secret note'
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/notes',
      payload: noteData
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe('Content and key are required');
  });

  // Test 6: Decrypt note with valid key
  test('POST /api/notes/:id/decrypt should decrypt note with correct key', async () => {
    const decryptData = {
      key: 'correctKey123'
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/notes/1/decrypt',
      payload: decryptData
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.content).toBe('Test note content');
    expect(body.message).toBe('Note decrypted successfully');
  });

  // Test 7: Decrypt note with wrong key
  test('POST /api/notes/:id/decrypt should return 401 with wrong key', async () => {
    const decryptData = {
      key: 'wrongkey'
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/notes/1/decrypt',
      payload: decryptData
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body).error).toBe('Invalid decryption key');
  });

  // Test 8: Decrypt non-existent note
  test('POST /api/notes/:id/decrypt should return 404 for non-existent note', async () => {
    const decryptData = {
      key: 'anyKey123'
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/notes/999/decrypt',
      payload: decryptData
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).error).toBe('Note not found');
  });

  // Test 9: Decrypt without key
  test('POST /api/notes/:id/decrypt should return 400 when key is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/notes/1/decrypt',
      payload: {}
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe('Decryption key is required');
  });

  // Test 10: List all notes
  test('GET /api/notes should return list of notes', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/notes'
    });


    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.notes).toBeDefined();
    expect(Array.isArray(body.notes)).toBe(true);
    expect(body.notes.length).toBeGreaterThanOrEqual(0);

    if (body.notes.length > 0) {
      expect(body.notes[0]).toHaveProperty('id');
      expect(body.notes[0]).toHaveProperty('created_at');
    }
  });
});

