/**
 * Prometheus Metrics Middleware
 */

const client = require('prom-client');

// Create a Registry to register the metrics
const register = new client.Registry();

// Add default metrics (memory, CPU, event loop, etc.)
if (process.env.NODE_ENV !== 'test') {
    client.collectDefaultMetrics({ register });
}

// HTTP Request metrics
const httpRequestsTotal = new client.Counter({
    name: 'screensprout_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
});

const httpRequestDuration = new client.Histogram({
    name: 'screensprout_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route'],
    buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.5, 1, 2, 5],
    registers: [register]
});

/**
 * Middleware to track HTTP metrics
 */
const metricsMiddleware = (req, res, next) => {
    const start = Date.now();
    const route = req.route ? req.route.path : req.path;

    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const method = req.method;
        const statusCode = res.statusCode.toString();

        httpRequestsTotal.inc({ method, route, status_code: statusCode });
        httpRequestDuration.observe({ method, route }, duration);
    });

    next();
};

module.exports = {
    register,
    metricsMiddleware,
    httpRequestsTotal,
    httpRequestDuration
};
