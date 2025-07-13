import posthog from 'posthog-js';

posthog.init('phc_wsrRNhY3KOOuCYdQPw4vDS7gdHMMoQUAxBWnbiKW67O', {
    api_host: 'https://us.i.posthog.com',
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
    disable_session_recording: false,
    debug: true,
});

export default posthog;