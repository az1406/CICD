// Mock the database pool
jest.mock('pg', () => {
  const mClient = {
    connect: jest.fn(),
    query: jest.fn().mockResolvedValue({ 
      rows: [
        { id: 1, encrypted_content: '177d66f5c72de640afb844c172228ecb:a897f78810a6bca20990863f9aa34ac95f7d7077672f55b610add17eb35b2fd8', key_hash: '0a2f59d5afb5d5aa0d6d20fefd3372c29e830681d9605b1f3d3c41abdeebd71c', created_at: '2024-01-01T12:00:00Z' }, // Test note content, correctKey123
        { id: 2, encrypted_content: 'encrypted_content', key_hash:'key_hash2', created_at: '2024-01-01T14:00:00Z' }
      ] 
    }),
    end: jest.fn(),
  };
  return { Pool: jest.fn(() => mClient) };
});

const app = require('../server.js');

beforeAll(async () => {
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