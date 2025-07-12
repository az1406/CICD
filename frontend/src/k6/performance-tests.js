import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// SHORTENED Test configuration for CI/CD
export const options = {
    stages: [
        { duration: '10s', target: 3 },   // Ramp up to 3 users
        { duration: '15s', target: 5 },   // Stay at 5 users  
        { duration: '5s', target: 0 },    // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<1000'], // More lenient for CI
        http_req_failed: ['rate<0.1'],
        errors: ['rate<0.1'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
    // Test 1: Health check
    testHealthCheck();

    // Test 2: API message endpoint  
    testApiMessage();

    // Test 3: Create and decrypt note (combined)
    testCreateAndDecryptNote();

    // Test 4: List notes
    testListNotes();

    sleep(0.5); // Shorter sleep
}

function testHealthCheck() {
    const response = http.get(`${BASE_URL}/api/health`);

    const success = check(response, {
        'health check status is 200': (r) => r.status === 200,
        'health check response time < 500ms': (r) => r.timings.duration < 500, // More lenient
    });

    errorRate.add(!success);
}

function testApiMessage() {
    const response = http.get(`${BASE_URL}/api/message`);

    const success = check(response, {
        'message endpoint status is 200': (r) => r.status === 200,
        'message endpoint response time < 500ms': (r) => r.timings.duration < 500,
    });

    errorRate.add(!success);
}

function testCreateAndDecryptNote() {
    // Create note
    const createPayload = JSON.stringify({
        content: `CI test note ${__VU}-${__ITER}`,
        key: `testkey${__VU}${__ITER}`,
    });

    const params = {
        headers: { 'Content-Type': 'application/json' },
    };

    const createResponse = http.post(`${BASE_URL}/api/notes`, createPayload, params);

    const createSuccess = check(createResponse, {
        'create note status is 200': (r) => r.status === 200,
        'create note response time < 1000ms': (r) => r.timings.duration < 1000, // More lenient
    });

    errorRate.add(!createSuccess);

    // If create succeeded, test decrypt
    if (createSuccess) {
        const noteId = createResponse.json('id');

        const decryptPayload = JSON.stringify({
            key: `testkey${__VU}${__ITER}`,
        });

        const decryptResponse = http.post(
            `${BASE_URL}/api/notes/${noteId}/decrypt`,
            decryptPayload,
            params
        );

        const decryptSuccess = check(decryptResponse, {
            'decrypt note status is 200': (r) => r.status === 200,
            'decrypt note response time < 1000ms': (r) => r.timings.duration < 1000,
        });

        errorRate.add(!decryptSuccess);
    }
}

function testListNotes() {
    const response = http.get(`${BASE_URL}/api/notes`);

    const success = check(response, {
        'list notes status is 200': (r) => r.status === 200,
        'list notes response time < 1000ms': (r) => r.timings.duration < 1000,
    });

    errorRate.add(!success);
}