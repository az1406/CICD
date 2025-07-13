import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// LIGHTWEIGHT Load test for CI/CD
export const options = {
    stages: [
        { duration: '10s', target: 10 },  // Ramp up to 10 users
        { duration: '10s', target: 15 },  // Stay at 15 users
        { duration: '10s', target: 0 },   // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<2000'],
        http_req_failed: ['rate<0.1'],
        errors: ['rate<0.1'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
    const userScenario = Math.random();

    if (userScenario < 0.5) {
        // 50% - Quick create and decrypt
        quickCreateAndDecrypt();
    } else {
        // 50% - List and health checks
        quickHealthAndList();
    }

    sleep(Math.random() * 1 + 0.5); // Sleep 0.5-1.5 seconds
}

function quickCreateAndDecrypt() {
    const uniqueId = `${__VU}-${__ITER}`;
    const payload = JSON.stringify({
        content: `Load test ${uniqueId}`,
        key: `key${uniqueId}`,
        user_id: 'k6_test_user'
    });

    const params = {
        headers: { 'Content-Type': 'application/json' },
    };

    const createResponse = http.post(`${BASE_URL}/api/notes`, payload, params);

    const createSuccess = check(createResponse, {
        'load - create note success': (r) => r.status === 200,
    });

    errorRate.add(!createSuccess);
}

function quickHealthAndList() {
    // Health check
    const healthResponse = http.get(`${BASE_URL}/api/health`);
    check(healthResponse, {
        'load - health check success': (r) => r.status === 200,
    });

    // List notes
    const listResponse = http.get(`${BASE_URL}/api/notes`);
    const listSuccess = check(listResponse, {
        'load - list notes success': (r) => r.status === 200,
    });

    errorRate.add(!listSuccess);
}