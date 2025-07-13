import http from 'k6/http';
import { check, sleep } from 'k6';

// Minimal smoke test configuration
export const options = {
    vus: 1,        // 1 virtual user
    duration: '30s', // Run for 30 seconds
    thresholds: {
        http_req_duration: ['p(95)<2000'],
        http_req_failed: ['rate<0.1'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
    // Basic smoke tests to verify the app is working

    // 1. Health check
    const healthResponse = http.get(`${BASE_URL}/api/health`);
    check(healthResponse, {
        'smoke - health check works': (r) => r.status === 200,
    });

    // 2. API message
    const messageResponse = http.get(`${BASE_URL}/api/message`);
    check(messageResponse, {
        'smoke - API message works': (r) => r.status === 200,
    });

    // 3. Create a simple note
    const createPayload = JSON.stringify({
        content: 'Smoke test note',
        key: 'smoketestkey',
        user_id: 'k6_test_user'
    });

    const params = {
        headers: { 'Content-Type': 'application/json' },
    };

    const createResponse = http.post(`${BASE_URL}/api/notes`, createPayload, params);
    const createSuccess = check(createResponse, {
        'smoke - can create note': (r) => r.status === 200,
    });

    // 4. List notes
    const listResponse = http.get(`${BASE_URL}/api/notes`);
    check(listResponse, {
        'smoke - can list notes': (r) => r.status === 200,
    });

    // 5. Decrypt note if creation was successful
    if (createSuccess) {
        const noteId = createResponse.json('id');
        const decryptPayload = JSON.stringify({ key: 'smoketestkey' });

        const decryptResponse = http.post(
            `${BASE_URL}/api/notes/${noteId}/decrypt`,
            decryptPayload,
            params
        );

        check(decryptResponse, {
            'smoke - can decrypt note': (r) => r.status === 200,
        });
    }

    sleep(1);
}