const http = require('node:http');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const attendancePath = '/attendease-api';
const enhanceMiddleware = config.server.enhanceMiddleware;

config.server.enhanceMiddleware = (middleware, server) => {
  const next = enhanceMiddleware ? enhanceMiddleware(middleware, server) : middleware;
  return (request, response, nextHandler) => {
    if (!request.url?.startsWith(`${attendancePath}/`)) {
      return next(request, response, nextHandler);
    }

    const upstream = http.request({
      hostname: '127.0.0.1',
      port: Number(process.env.ATTENDANCE_PORT || 3001),
      path: request.url.slice(attendancePath.length),
      method: request.method,
      headers: request.headers,
    }, (reply) => {
      response.writeHead(reply.statusCode, reply.headers);
      reply.pipe(response);
    });
    upstream.on('error', () => {
      if (response.headersSent) return response.destroy();
      response.writeHead(503, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: 'Start the attendance server on the computer running Expo, then retry.' }));
    });
    request.on('aborted', () => upstream.destroy());
    request.pipe(upstream);
  };
};

module.exports = config;
