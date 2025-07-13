export const config = {
    environments: {
        local: 'http://localhost:8080',
        staging: 'http://18.204.164.224:8080',
        production: 'https://your-production-url.com'
    },

    thresholds: {
        performance: {
            http_req_duration: ['p(95)<500'],
            http_req_failed: ['rate<0.1'],
        },
        load: {
            http_req_duration: ['p(95)<1000'],
            http_req_failed: ['rate<0.05'],
        },
        smoke: {
            http_req_duration: ['p(95)<2000'],
            http_req_failed: ['rate<0.1'],
        }
    }
};