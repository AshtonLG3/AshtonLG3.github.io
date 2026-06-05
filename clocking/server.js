const crypto = require('node:crypto');
const http = require('node:http');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const QRCode = require('qrcode');
const { ClockingError, ClockingStore, DEFAULT_TIME_ZONE } = require('./lib/clockingStore');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_FILE = process.env.CLOCKING_DATA_FILE || path.join(ROOT, 'data', 'clock-log.json');
const PUBLIC_BASE_URL = normalisePublicBaseUrl(process.env.PUBLIC_BASE_URL || '');
const OFFICE_TERMINAL_KEY = String(process.env.OFFICE_TERMINAL_KEY || '').trim();
const TERMINAL_TOKEN_TTL_MS = 180000;
const MAX_TERMINAL_LOCATION_AGE_MS = 10 * 60 * 1000;
const APP_URL_SCHEME = 'employmentclocking';
const SUPERVISOR_APP_URL_SCHEME = 'employmentclockingsupervisor';
const terminalTokens = new Map();
const store = new ClockingStore(DATA_FILE);

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    // Handle CORS for Native Apps
    const origin = request.headers.origin;
    if (origin && (origin === 'capacitor://localhost' || origin === 'http://localhost')) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Office-Terminal-Key');
      response.setHeader('Access-Control-Allow-Private-Network', 'true');
      response.setHeader('Vary', 'Origin');
    }

    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }

    if (url.pathname === '/api/clock' && request.method === 'POST') {
      await handleClock(request, response);
      return;
    }

    if (url.pathname === '/api/scan' && request.method === 'POST') {
      await handleScan(request, response);
      return;
    }

    if (url.pathname === '/api/scanner/activate' && request.method === 'POST') {
      await handleScannerActivate(request, response);
      return;
    }

    if (url.pathname === '/api/scanner/status' && request.method === 'GET') {
      await handleScannerStatus(url, response);
      return;
    }

    if (url.pathname === '/api/admin/clock-next' && request.method === 'POST') {
      await handleAdminClockNext(request, response);
      return;
    }

    if (url.pathname === '/api/admin/force-clock-out' && request.method === 'POST') {
      await handleAdminForceClockOut(request, response);
      return;
    }

    if (url.pathname === '/api/snapshot' && request.method === 'GET') {
      await handleSnapshot(url, response);
      return;
    }

    if (url.pathname === '/api/employees' && request.method === 'GET') {
      await handleEmployees(response);
      return;
    }

    if (url.pathname === '/api/employees' && request.method === 'POST') {
      await handleRegisterEmployee(request, response);
      return;
    }

    if (url.pathname === '/api/terminal' && request.method === 'GET') {
      await handleTerminal(request, response);
      return;
    }

    if (url.pathname === '/api/supervisor/setup' && request.method === 'POST') {
      await handleSupervisorSetup(request, response);
      return;
    }

    if (url.pathname === '/api/supervisor/session' && request.method === 'POST') {
      await handleSupervisorSession(request, response);
      return;
    }

    if (url.pathname === '/api/supervisor/terminal' && request.method === 'POST') {
      await handleSupervisorTerminal(request, response);
      return;
    }

    if (url.pathname === '/api/supervisor/clock' && request.method === 'POST') {
      await handleSupervisorClock(request, response);
      return;
    }

    if (url.pathname === '/api/supervisor/flag' && request.method === 'POST') {
      await handleSupervisorFlag(request, response);
      return;
    }

    if (url.pathname.startsWith('/api/')) {
      sendJson(response, 404, { error: 'Not found' });
      return;
    }

    await serveStatic(url.pathname, response);
  } catch (error) {
    handleError(error, response);
  }
});

async function handleClock(request, response) {
  const payload = await readJsonBody(request);
  validateClockSource(payload, request);

  if (payload.source === 'mobile') {
    throw new ClockingError('Employee scanners must use the office-controlled scan path.', 403);
  }

  if (payload.source === 'supervisor') {
    throw new ClockingError('Supervisor actions must use the supervisor endpoint.', 403);
  }

  const entry = await store.clock(payload);
  const snapshot = await store.getSnapshot({
    date: payload.date,
    timeZone: payload.timeZone || DEFAULT_TIME_ZONE
  });
  sendJson(response, 201, { entry, snapshot });
}

async function handleScan(request, response) {
  const payload = await readJsonBody(request);
  validateClockSource(payload, request);
  const entry = await store.clockNext(payload);
  if (payload.terminalToken) {
    consumeTerminalToken(payload.terminalToken);
  }
  const snapshot = await store.getSnapshot({
    date: payload.date,
    timeZone: payload.timeZone || DEFAULT_TIME_ZONE
  });
  const status = await store.getCredentialStatus(entry.credentialId);
  sendJson(response, 201, { entry, snapshot, status });
}

async function handleScannerActivate(request, response) {
  const payload = await readJsonBody(request);
  const employee = await store.activateScanner(payload);
  const status = await store.getCredentialStatus(employee.credentialId);
  sendJson(response, 200, { employee, status });
}

async function handleScannerStatus(url, response) {
  const status = await store.getCredentialStatus(url.searchParams.get('credentialId'));
  sendJson(response, 200, { status });
}

async function handleAdminClockNext(request, response) {
  const payload = await readJsonBody(request);
  delete payload.timestamp;
  const entry = await store.adminClockNext(payload);
  const snapshot = await store.getSnapshot({
    date: payload.date,
    timeZone: payload.timeZone || DEFAULT_TIME_ZONE
  });
  sendJson(response, 201, { entry, snapshot });
}

async function handleAdminForceClockOut(request, response) {
  const payload = await readJsonBody(request);
  delete payload.timestamp;
  const entry = await store.superForceClockOut(payload);
  const snapshot = await store.getSnapshot({
    date: payload.date,
    timeZone: payload.timeZone || DEFAULT_TIME_ZONE
  });
  sendJson(response, 201, { entry, snapshot });
}

async function handleSnapshot(url, response) {
  const snapshot = await store.getSnapshot({
    date: url.searchParams.get('date'),
    employeeId: url.searchParams.get('employeeId'),
    timeZone: url.searchParams.get('timeZone') || DEFAULT_TIME_ZONE
  });
  sendJson(response, 200, snapshot);
}

async function handleEmployees(response) {
  const employees = await store.getEmployees();
  sendJson(response, 200, { employees });
}

async function handleRegisterEmployee(request, response) {
  if (!isOfficeRequest(request)) {
    throw new ClockingError('Employee registration must happen at the office terminal.', 403);
  }

  const payload = await readJsonBody(request);
  const employee = await store.registerEmployee(payload);
  const employees = await store.getEmployees();
  const scannerSetupUrl = buildScannerSetupUrl(request, employee);
  const scannerSetupAppUrl = buildScannerSetupAppUrl(request, employee);
  const scannerSetupQrSvg = await QRCode.toString(scannerSetupAppUrl, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 300,
    color: {
      dark: '#17211c',
      light: '#ffffff'
    }
  });
  sendJson(response, 201, {
    employee,
    employees,
    scannerSetupUrl,
    scannerSetupAppUrl,
    scannerSetupQrSvg,
    isPublicScannerSetup: Boolean(PUBLIC_BASE_URL)
  });
}

async function handleTerminal(request, response) {
  if (!isOfficeRequest(request)) {
    throw new ClockingError('Terminal QR codes can only be generated at the clocking terminal.', 403);
  }

  const terminalToken = createTerminalToken({
    source: 'mobile',
    deviceLabel: 'Terminal Node 01'
  });
  const mobileUrl = buildMobileUrl(request, terminalToken.token, terminalToken);
  const qrSvg = await QRCode.toString(mobileUrl, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 360,
    color: {
      dark: '#17211c',
      light: '#ffffff'
    }
  });
  sendJson(response, 200, {
    mobileUrl,
    qrSvg,
    expiresAt: terminalToken.expiresAt,
    ttlSeconds: Math.floor(TERMINAL_TOKEN_TTL_MS / 1000),
    terminal: terminalSummary(terminalToken)
  });
}

async function handleSupervisorSetup(request, response) {
  if (!isOfficeRequest(request)) {
    throw new ClockingError('Supervisor assignment requires the office terminal key.', 403);
  }

  const payload = await readJsonBody(request);
  const setup = await store.createSupervisorSetupToken(payload);
  const supervisorUrl = buildSupervisorSetupUrl(request, setup.token);
  const supervisorAppUrl = buildSupervisorSetupAppUrl(request, setup.token);

  sendJson(response, 200, {
    supervisorUrl,
    supervisorAppUrl,
    serverUrl: publicBaseUrl(request),
    expiresAt: setup.expiresAt
  });
}

async function handleSupervisorSession(request, response) {
  const payload = await readJsonBody(request);
  const session = await store.activateSupervisorSetupToken(payload.token, {
    deviceLabel: payload.deviceLabel
  });
  sendJson(response, 200, session);
}

async function handleSupervisorTerminal(request, response) {
  if (!(await isSupervisorRequest(request))) {
    throw new ClockingError('Supervisor check point requires a fresh supervisor login link.', 403);
  }

  const payload = await readJsonBody(request);
  const terminalToken = createTerminalToken({
    source: 'supervisor',
    deviceLabel: payload.deviceLabel,
    location: payload.location
  });
  const mobileUrl = buildMobileUrl(request, terminalToken.token, terminalToken);
  const qrSvg = await QRCode.toString(mobileUrl, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 360,
    color: {
      dark: '#17211c',
      light: '#ffffff'
    }
  });
  sendJson(response, 200, {
    mobileUrl,
    qrSvg,
    expiresAt: terminalToken.expiresAt,
    ttlSeconds: Math.floor(TERMINAL_TOKEN_TTL_MS / 1000),
    terminal: terminalSummary(terminalToken)
  });
}

async function handleSupervisorClock(request, response) {
  if (!(await isSupervisorRequest(request))) {
    throw new ClockingError('Supervisor clocking requires a fresh supervisor login link.', 403);
  }

  const payload = await readJsonBody(request);
  payload.source = 'supervisor';
  payload.employeeId = payload.targetEmployeeId || payload.employeeId;
  delete payload.timestamp;
  validateClockSource(payload, request);
  const entry = await store.clock(payload);
  const snapshot = await store.getSnapshot({
    date: payload.date,
    timeZone: payload.timeZone || DEFAULT_TIME_ZONE
  });
  sendJson(response, 201, { entry, snapshot });
}

async function handleSupervisorFlag(request, response) {
  if (!(await isSupervisorRequest(request))) {
    throw new ClockingError('Supervisor flags require a fresh supervisor login link.', 403);
  }

  const payload = await readJsonBody(request);
  delete payload.timestamp;
  const flag = await store.flagEmployee(payload);
  const snapshot = await store.getSnapshot({
    date: payload.date,
    timeZone: payload.timeZone || DEFAULT_TIME_ZONE
  });
  sendJson(response, 201, { flag, snapshot });
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
    if (Buffer.concat(chunks).length > 100000) {
      throw new ClockingError('Request body is too large.', 413);
    }
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw new ClockingError('Request body must be valid JSON.');
  }
}

async function serveStatic(pathname, response) {
  const requestedPath = routeToStaticFile(pathname);
  const safePath = path.normalize(decodeURIComponent(requestedPath)).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);
  const relative = path.relative(PUBLIC_DIR, filePath);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    sendJson(response, 403, { error: 'Forbidden' });
    return;
  }

  try {
    const body = await fs.readFile(filePath);
    response.writeHead(200, {
      'content-type': MIME_TYPES[path.extname(filePath)] || 'application/octet-stream'
    });
    response.end(body);
  } catch (error) {
    if (error.code === 'ENOENT') {
      if (path.extname(filePath)) {
        sendJson(response, 404, { error: 'Not found' });
        return;
      }

      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      const body = await fs.readFile(indexPath);
      response.writeHead(200, { 'content-type': MIME_TYPES['.html'] });
      response.end(body);
      return;
    }
    throw error;
  }
}

function routeToStaticFile(pathname) {
  if (pathname === '/') {
    return '/index.html';
  }

  if (pathname === '/mobile') {
    return '/mobile.html';
  }

  if (pathname === '/supervisor') {
    return '/supervisor.html';
  }

  return pathname;
}

function validateClockSource(payload, request) {
  const source = String(payload.source || 'terminal').trim().toLowerCase();
  if (source !== 'terminal' && source !== 'mobile' && source !== 'supervisor') {
    throw new ClockingError('Clocking source must be terminal, mobile, or supervisor.');
  }

  if (source === 'terminal' && !isOfficeRequest(request)) {
    throw new ClockingError('Terminal clocking must happen at the clocking terminal.', 403);
  }

  if (source === 'supervisor') {
    delete payload.timestamp;
  }

  if (source === 'mobile') {
    applyTerminalTokenMetadata(payload, validateTerminalToken(payload.terminalToken));
    return;
  }

  payload.source = source;
}

function createTerminalToken(metadata = {}) {
  cleanupTerminalTokens();
  const token = crypto.randomBytes(18).toString('base64url');
  const expiresAtMs = Date.now() + TERMINAL_TOKEN_TTL_MS;
  const terminal = normaliseTerminalMetadata(metadata);
  terminalTokens.set(token, { ...terminal, expiresAtMs });
  return {
    token,
    expiresAt: new Date(expiresAtMs).toISOString(),
    ...terminal
  };
}

function validateTerminalToken(token) {
  cleanupTerminalTokens();
  const value = String(token || '').trim();
  const terminal = terminalTokens.get(value);

  if (!terminal || terminal.expiresAtMs <= Date.now()) {
    throw new ClockingError('Scan the terminal QR again.', 403);
  }

  return terminal;
}

function consumeTerminalToken(token) {
  terminalTokens.delete(String(token || '').trim());
}

function cleanupTerminalTokens() {
  const now = Date.now();
  for (const [token, terminal] of terminalTokens) {
    if (terminal.expiresAtMs <= now) {
      terminalTokens.delete(token);
    }
  }
}

function applyTerminalTokenMetadata(payload, terminal) {
  payload.source = terminal.source;
  payload.deviceLabel = terminal.deviceLabel;
  if (terminal.location) {
    payload.location = terminal.location;
  }
}

function normaliseTerminalMetadata(metadata = {}) {
  const source = String(metadata.source || 'mobile').trim().toLowerCase();
  if (source !== 'mobile' && source !== 'supervisor') {
    throw new ClockingError('Terminal QR source must be mobile or supervisor.');
  }

  const terminal = {
    source,
    deviceLabel: normaliseMetadataText(metadata.deviceLabel, 80) || (source === 'supervisor' ? 'Supervisor check point' : 'Terminal Node 01')
  };

  if (source === 'supervisor') {
    terminal.location = normaliseTerminalLocation(metadata.location);
  }

  return terminal;
}

function normaliseTerminalLocation(location) {
  if (!location || typeof location !== 'object') {
    throw new ClockingError('Supervisor check point must capture its GPS location before generating a QR code.');
  }

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new ClockingError('Supervisor check point location must include a valid latitude.');
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new ClockingError('Supervisor check point location must include a valid longitude.');
  }

  const capturedAtValue = String(location.capturedAt || location.timestamp || '').trim();
  const capturedAtMs = Date.parse(capturedAtValue);
  if (!capturedAtValue || Number.isNaN(capturedAtMs)) {
    throw new ClockingError('Supervisor check point location must include when it was captured.');
  }

  if (Math.abs(Date.now() - capturedAtMs) > MAX_TERMINAL_LOCATION_AGE_MS) {
    throw new ClockingError('Supervisor check point location is stale. Refresh location and generate a new QR code.');
  }

  const accuracy = Number(location.accuracyMeters ?? location.accuracy);
  const normalised = {
    latitude: roundCoordinate(latitude),
    longitude: roundCoordinate(longitude),
    capturedAt: new Date(capturedAtMs).toISOString()
  };

  if (Number.isFinite(accuracy) && accuracy >= 0) {
    normalised.accuracyMeters = Math.round(accuracy);
  }

  return normalised;
}

function normaliseMetadataText(value, maxLength) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) {
    return '';
  }

  if (text.length > maxLength) {
    throw new ClockingError(`Terminal metadata must be ${maxLength} characters or fewer.`);
  }

  return text;
}

function roundCoordinate(value) {
  return Number(value.toFixed(6));
}

function terminalSummary(terminal) {
  return {
    source: terminal.source,
    deviceLabel: terminal.deviceLabel,
    location: terminal.location || null
  };
}

function isLoopbackRequest(request) {
  return isLoopbackAddress(request.socket.remoteAddress || '');
}

function isOfficeRequest(request) {
  return isLoopbackRequest(request) || hasValidOfficeKey(request) || isUnkeyedPrivateLanRequest(request);
}

async function isSupervisorRequest(request) {
  if (isLoopbackRequest(request) || hasValidOfficeKey(request)) {
    return true;
  }

  return store.isSupervisorSessionActive(getSupervisorSessionToken(request));
}

function hasValidOfficeKey(request) {
  if (!OFFICE_TERMINAL_KEY) {
    return false;
  }

  const provided = String(request.headers['x-office-terminal-key'] || '').trim();
  if (!provided || provided.length !== OFFICE_TERMINAL_KEY.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(OFFICE_TERMINAL_KEY));
}

function getSupervisorSessionToken(request) {
  return String(request.headers['x-supervisor-session-token'] || '').trim();
}

function isLoopbackAddress(address) {
  return address === '::1' || address === '127.0.0.1' || address.startsWith('::ffff:127.');
}

function isUnkeyedPrivateLanRequest(request) {
  if (OFFICE_TERMINAL_KEY) {
    return false;
  }

  return isPrivateLanAddress(normaliseRemoteAddress(request.socket.remoteAddress || ''));
}

function normaliseRemoteAddress(address) {
  return String(address || '').replace(/^::ffff:/, '');
}

function buildMobileUrl(request, token, terminal = {}) {
  const url = new URL('/mobile', publicBaseUrl(request));
  url.searchParams.set('token', token);
  return url.toString();
}

function buildScannerSetupUrl(request, employee) {
  const url = new URL('/mobile', publicBaseUrl(request));
  url.searchParams.set('setup', '1');
  url.searchParams.set('employeeId', employee.employeeId);
  url.searchParams.set('employeeName', employee.employeeName);
  url.searchParams.set('credentialId', employee.credentialId);
  return url.toString();
}

function buildScannerSetupAppUrl(request, employee) {
  const url = new URL(`${APP_URL_SCHEME}://setup`);
  url.searchParams.set('server', publicBaseUrl(request));
  url.searchParams.set('setup', '1');
  url.searchParams.set('employeeId', employee.employeeId);
  url.searchParams.set('employeeName', employee.employeeName);
  url.searchParams.set('credentialId', employee.credentialId);
  return url.toString();
}

function buildSupervisorSetupUrl(request, token) {
  const url = new URL('/supervisor', publicBaseUrl(request));
  url.searchParams.set('server', publicBaseUrl(request));
  url.searchParams.set('token', token);
  return url.toString();
}

function buildSupervisorSetupAppUrl(request, token) {
  const url = new URL(`${SUPERVISOR_APP_URL_SCHEME}://setup`);
  url.searchParams.set('server', publicBaseUrl(request));
  url.searchParams.set('token', token);
  return url.toString();
}

function publicBaseUrl(request) {
  if (PUBLIC_BASE_URL) {
    return PUBLIC_BASE_URL;
  }

  const hostHeader = request.headers.host || `localhost:${PORT}`;
  const { hostname, port } = splitHostHeader(hostHeader);
  const phoneHost = isLoopbackHost(hostname) ? getLanAddress() || hostname : hostname;
  const protocol = request.headers['x-forwarded-proto'] || 'http';
  return `${protocol}://${formatHost(phoneHost, port)}`;
}

function normalisePublicBaseUrl(value) {
  const trimmed = String(value || '').trim().replace(/\/+$/, '');
  if (!trimmed) {
    return '';
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return '';
    }
    return url.toString().replace(/\/+$/, '');
  } catch {
    return '';
  }
}

function splitHostHeader(hostHeader) {
  if (hostHeader.startsWith('[')) {
    const end = hostHeader.indexOf(']');
    const hostname = hostHeader.slice(1, end);
    const port = hostHeader[end + 1] === ':' ? hostHeader.slice(end + 2) : '';
    return { hostname, port };
  }

  const lastColon = hostHeader.lastIndexOf(':');
  if (lastColon === -1) {
    return { hostname: hostHeader, port: '' };
  }

  return {
    hostname: hostHeader.slice(0, lastColon),
    port: hostHeader.slice(lastColon + 1)
  };
}

function isLoopbackHost(hostname) {
  const host = hostname.toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

function getLanAddress() {
  const networks = os.networkInterfaces();
  const addresses = [];

  for (const interfaces of Object.values(networks)) {
    for (const network of interfaces || []) {
      if (network.family === 'IPv4' && !network.internal) {
        addresses.push(network.address);
      }
    }
  }

  return addresses.find(isPrivateLanAddress) || addresses[0] || '';
}

function isPrivateLanAddress(address) {
  const parts = address.split('.').map(Number);
  return (
    parts[0] === 10 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  );
}

function formatHost(hostname, port) {
  const host = hostname.includes(':') ? `[${hostname}]` : hostname;
  return port ? `${host}:${port}` : host;
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'content-type': MIME_TYPES['.json'] });
  response.end(`${JSON.stringify(payload)}\n`);
}

function handleError(error, response) {
  const statusCode = error.statusCode || 500;
  const message = statusCode >= 500 ? 'The clocking system could not complete that request.' : error.message;
  if (statusCode >= 500) {
    console.error(error);
  }
  sendJson(response, statusCode, { error: message });
}

server.listen(PORT, () => {
  console.log(`Employment Clocking System listening on http://localhost:${PORT}`);
});
