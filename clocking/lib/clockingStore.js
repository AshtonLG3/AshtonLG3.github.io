const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const VALID_ACTIONS = new Set(['in', 'out']);
const DEFAULT_TIME_ZONE = 'Africa/Johannesburg';
const VALID_SOURCES = new Set(['terminal', 'mobile', 'supervisor', 'admin', 'super-admin']);
const VALID_ROLES = new Set(['employee', 'admin', 'super']);
const MAX_SUPERVISOR_LOCATION_AGE_MS = 10 * 60 * 1000;
const SUPERVISOR_SETUP_TOKEN_TTL_MS = 20 * 60 * 1000;
const SUPERVISOR_SESSION_TTL_MS = 180 * 24 * 60 * 60 * 1000;

class ClockingError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'ClockingError';
    this.statusCode = statusCode;
  }
}

class ClockingStore {
  constructor(filePath, options = {}) {
    this.filePath = filePath;
    this.now = options.now || (() => new Date());
    this.idFactory = options.idFactory || (() => crypto.randomUUID());
  }

  async clock(payload) {
    const action = normaliseAction(payload.action);
    const timestamp = payload.timestamp || this.now().toISOString();
    const data = await this.#readData();
    const credentialId = normaliseCredentialId(payload.credentialId);
    const employee = resolveEmployee(data, payload, credentialId, timestamp);
    const metadata = normaliseClockMetadata(payload, timestamp);

    const entry = this.#appendClockEntry(data, employee, credentialId, action, timestamp, metadata);
    await this.#writeData(data);
    return entry;
  }

  async clockNext(payload) {
    const timestamp = payload.timestamp || this.now().toISOString();
    const data = await this.#readData();
    const credentialId = normaliseCredentialId(payload.credentialId);

    if (!credentialId) {
      throw new ClockingError('Scanner credential is required.');
    }

    const employee = resolveEmployee(data, payload, credentialId, timestamp);
    const metadata = normaliseClockMetadata(payload, timestamp);
    const activeEntry = findActiveEntry(data.entries, employee.employeeId);
    const action = activeEntry ? 'out' : 'in';
    const entry = this.#appendClockEntry(data, employee, credentialId, action, timestamp, metadata);
    await this.#writeData(data);
    return entry;
  }

  async registerEmployee(payload) {
    const timestamp = payload.timestamp || this.now().toISOString();
    const data = await this.#readData();
    const employee = normaliseEmployee(payload);
    const credentialId = normaliseCredentialId(payload.credentialId);
    const role = normaliseEmployeeRole(payload.role);

    if (!credentialId) {
      throw new ClockingError('Employee credential is required.');
    }

    const existingCredential = data.credentials[credentialId];
    if (existingCredential && existingCredential.employeeId !== employee.employeeId) {
      throw new ClockingError('That credential is already assigned to another employee.', 409);
    }

    const existingEmployee = data.employees[employee.employeeId];
    if (existingEmployee?.credentialId && existingEmployee.credentialId !== credentialId) {
      delete data.credentials[existingEmployee.credentialId];
    }

    const status = normaliseEmployeeStatus(payload.status);
    const employeeRecord = {
      employeeId: employee.employeeId,
      employeeName: employee.employeeName,
      credentialId,
      status,
      role,
      createdAt: existingEmployee?.createdAt || timestamp,
      updatedAt: timestamp
    };

    data.employees[employee.employeeId] = employeeRecord;
    data.credentials[credentialId] = {
      credentialId,
      employeeId: employee.employeeId,
      employeeName: employee.employeeName,
      role,
      active: status === 'active',
      createdAt: existingCredential?.createdAt || timestamp,
      updatedAt: timestamp,
      lastUsedAt: existingCredential?.lastUsedAt || null
    };

    await this.#writeData(data);
    return employeeRecord;
  }

  async adminClockNext(payload) {
    const timestamp = payload.timestamp || this.now().toISOString();
    const data = await this.#readData();
    const authority = resolveAuthorityCredential(data, payload.adminCredentialId);
    const target = resolveEmployeeById(data, payload.targetEmployeeId, { allowInactive: false });

    assertAdminCanActOnTarget(authority, target);

    const source = authority.role === 'super' ? 'super-admin' : 'admin';
    const metadata = {
      ...normaliseClockMetadata({ ...payload, source }, timestamp),
      actor: actorMetadata(authority),
      reason: normaliseMetadataText(payload.reason, 120)
    };
    const activeEntry = findActiveEntry(data.entries, target.employeeId);
    const action = activeEntry ? 'out' : 'in';
    const entry = this.#appendClockEntry(data, target, target.credentialId, action, timestamp, metadata);
    await this.#writeData(data);
    return entry;
  }

  async superForceClockOut(payload) {
    const timestamp = payload.timestamp || this.now().toISOString();
    const data = await this.#readData();
    const authority = resolveAuthorityCredential(data, payload.superCredentialId || payload.adminCredentialId);
    if (authority.role !== 'super') {
      throw new ClockingError('Super power credential is required for emergency clock-out.', 403);
    }

    const target = resolveEmployeeById(data, payload.targetEmployeeId, { allowInactive: true });
    const metadata = {
      ...normaliseClockMetadata({ ...payload, source: 'super-admin' }, timestamp),
      actor: actorMetadata(authority),
      emergency: true,
      reason: normaliseMetadataText(payload.reason || 'Emergency super-admin clock-out', 120)
    };
    const entry = this.#appendClockEntry(data, target, target.credentialId, 'out', timestamp, metadata);
    await this.#writeData(data);
    return entry;
  }

  async flagEmployee(payload) {
    const timestamp = payload.timestamp || this.now().toISOString();
    const data = await this.#readData();
    const employee = resolveFlagTarget(data, payload, timestamp);
    const metadata = normaliseClockMetadata({ ...payload, source: 'supervisor' }, timestamp);
    const flag = {
      id: this.idFactory(),
      employeeId: employee.employeeId,
      employeeName: employee.employeeName,
      credentialId: employee.credentialId,
      reason: normaliseMetadataText(payload.reason || 'Supervisor flag', 160),
      status: 'open',
      source: 'supervisor',
      timestamp
    };

    if (metadata.location) {
      flag.location = metadata.location;
    }

    if (metadata.deviceLabel) {
      flag.deviceLabel = metadata.deviceLabel;
    }

    data.flags.push(flag);
    await this.#writeData(data);
    return flag;
  }

  async createSupervisorSetupToken(payload = {}) {
    const timestamp = this.now().toISOString();
    const data = await this.#readData();
    pruneSupervisorAccess(data, timestamp);

    const token = randomToken();
    const expiresAt = new Date(Date.parse(timestamp) + SUPERVISOR_SETUP_TOKEN_TTL_MS).toISOString();
    data.supervisorSetupTokens[token] = {
      token,
      createdAt: timestamp,
      expiresAt,
      consumedAt: null,
      deviceLabel: normaliseMetadataText(payload.deviceLabel || 'Supervisor check point', 80)
    };

    await this.#writeData(data);
    return data.supervisorSetupTokens[token];
  }

  async activateSupervisorSetupToken(tokenValue, payload = {}) {
    const token = normaliseAccessToken(tokenValue);
    const timestamp = this.now().toISOString();
    const data = await this.#readData();
    pruneSupervisorAccess(data, timestamp);

    const setup = data.supervisorSetupTokens[token];
    if (!setup) {
      throw new ClockingError('Supervisor setup link is invalid or expired.', 403);
    }

    if (setup.consumedAt) {
      throw new ClockingError('Supervisor setup link has already been used.', 403);
    }

    if (Date.parse(setup.expiresAt) <= Date.parse(timestamp)) {
      delete data.supervisorSetupTokens[token];
      await this.#writeData(data);
      throw new ClockingError('Supervisor setup link has expired. Generate a new one from the office dashboard.', 403);
    }

    const sessionToken = randomToken();
    const expiresAt = new Date(Date.parse(timestamp) + SUPERVISOR_SESSION_TTL_MS).toISOString();
    setup.consumedAt = timestamp;
    setup.consumedBy = normaliseMetadataText(payload.deviceLabel || setup.deviceLabel || 'Supervisor check point', 80);
    data.supervisorSessions[sessionToken] = {
      token: sessionToken,
      createdAt: timestamp,
      expiresAt,
      deviceLabel: setup.consumedBy
    };

    await this.#writeData(data);
    return {
      sessionToken,
      expiresAt,
      deviceLabel: setup.consumedBy
    };
  }

  async isSupervisorSessionActive(tokenValue) {
    const token = normaliseAccessToken(tokenValue);
    if (!token) {
      return false;
    }

    const timestamp = this.now().toISOString();
    const data = await this.#readData();
    pruneSupervisorAccess(data, timestamp);
    const session = data.supervisorSessions[token];
    if (!session || Date.parse(session.expiresAt) <= Date.parse(timestamp)) {
      return false;
    }

    return true;
  }

  async activateScanner(payload) {
    const timestamp = payload.timestamp || this.now().toISOString();
    const data = await this.#readData();
    const employeeId = normaliseEmployeeId(payload.employeeId);
    const credentialId = normaliseCredentialId(payload.credentialId);
    const employeeName = String(payload.employeeName || '').replace(/\s+/g, ' ').trim();

    if (!credentialId) {
      throw new ClockingError('Scanner credential is required.');
    }

    if (!employeeName) {
      throw new ClockingError('Employee name is required.');
    }

    if (employeeName.length > 80) {
      throw new ClockingError('Employee name must be 80 characters or fewer.');
    }

    const credential = data.credentials[credentialId];
    if (!credential || credential.employeeId !== employeeId) {
      throw new ClockingError('Office must issue this scanner before it can be used.', 403);
    }

    const employee = data.employees[employeeId];
    if (!employee) {
      throw new ClockingError('Scanner is not linked to an office employee.', 403);
    }

    if (employee.status !== 'active' || !credential.active) {
      throw new ClockingError('This scanner is not active for clocking.', 403);
    }

    employee.employeeName = employeeName;
    employee.updatedAt = timestamp;
    employee.scannerActivatedAt = employee.scannerActivatedAt || timestamp;
    credential.employeeName = employeeName;
    credential.updatedAt = timestamp;
    credential.scannerActivatedAt = credential.scannerActivatedAt || timestamp;

    await this.#writeData(data);
    return employee;
  }

  async getEmployees() {
    const data = await this.#readData();
    return Object.values(data.employees).sort(sortByEmployeeName);
  }

  async getCredentialStatus(credentialId) {
    const data = await this.#readData();
    const credential = resolveCredential(data, normaliseCredentialId(credentialId));
    const employee = data.employees[credential.employeeId];

    if (!employee) {
      throw new ClockingError('Credential is not linked to a registered employee.', 403);
    }

    if (employee.status !== 'active') {
      throw new ClockingError(`${employee.employeeName} is not active for clocking.`, 403);
    }

    const activeEntry = findActiveEntry(data.entries, employee.employeeId);
    return {
      employeeId: employee.employeeId,
      employeeName: employee.employeeName,
      credentialId: credential.credentialId,
      isClockedIn: Boolean(activeEntry),
      nextAction: activeEntry ? 'out' : 'in'
    };
  }

  async getSnapshot(filters = {}) {
    const data = await this.#readData();
    const timeZone = filters.timeZone || DEFAULT_TIME_ZONE;
    const entries = filterEntries(data.entries, filters, timeZone);
    const activeEntries = getActiveEntries(data.entries);
    const completedToday = entries.filter((entry) => entry.action === 'out');
    const totalMinutes = completedToday.reduce((sum, entry) => {
      return sum + (Number(entry.shiftDurationMinutes) || 0);
    }, 0);

    return {
      entries: entries.slice().sort(sortNewestFirst),
      flags: filterEntries(data.flags, filters, timeZone).slice().sort(sortNewestFirst),
      activeEmployees: activeEntries.sort(sortByEmployeeName),
      registeredEmployees: Object.values(data.employees).sort(sortByEmployeeName),
      totals: {
        onDuty: activeEntries.length,
        completedShifts: completedToday.length,
        minutesWorked: totalMinutes
      }
    };
  }

  async #readData() {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.entries)) {
        throw new ClockingError('Clocking data is damaged: entries must be a list.', 500);
      }
      return normaliseDataShape(parsed);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return emptyClockingData();
      }
      if (error instanceof SyntaxError) {
        throw new ClockingError('Clocking data is damaged: invalid JSON.', 500);
      }
      throw error;
    }
  }

  async #writeData(data) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.${process.pid}.tmp`;
    await fs.writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    await fs.rename(tempPath, this.filePath);
  }

  #appendClockEntry(data, employee, credentialId, action, timestamp, metadata = {}) {
    const activeEntry = findActiveEntry(data.entries, employee.employeeId);

    if (action === 'in' && activeEntry) {
      throw new ClockingError(`${employee.employeeName} is already clocked in.`, 409);
    }

    if (action === 'out' && !activeEntry) {
      throw new ClockingError(`${employee.employeeName} is not currently clocked in.`, 409);
    }

    const entry = {
      id: this.idFactory(),
      employeeId: employee.employeeId,
      employeeName: employee.employeeName,
      action,
      timestamp
    };

    if (credentialId) {
      entry.credentialId = credentialId;
    }

    if (metadata.source) {
      entry.source = metadata.source;
    }

    if (metadata.location) {
      entry.location = metadata.location;
    }

    if (metadata.deviceLabel) {
      entry.deviceLabel = metadata.deviceLabel;
    }

    if (metadata.actor) {
      entry.actor = metadata.actor;
    }

    if (metadata.reason) {
      entry.reason = metadata.reason;
    }

    if (metadata.emergency) {
      entry.emergency = true;
    }

    if (action === 'out') {
      entry.pairedEntryId = activeEntry.id;
      entry.shiftDurationMinutes = minutesBetween(activeEntry.timestamp, timestamp);
    }

    data.entries.push(entry);
    return entry;
  }
}

function emptyClockingData() {
  return {
    version: 7,
    entries: [],
    flags: [],
    employees: {},
    credentials: {},
    supervisorSetupTokens: {},
    supervisorSessions: {}
  };
}

function normaliseDataShape(data) {
  const employees = data.employees && typeof data.employees === 'object' ? data.employees : {};
  normaliseEmployeeRoles(employees);
  const credentials = migrateCredentials(data.credentials, employees);

  return {
    version: Math.max(Number(data.version) || 1, 7),
    entries: data.entries,
    flags: Array.isArray(data.flags) ? data.flags : [],
    employees,
    credentials,
    supervisorSetupTokens: data.supervisorSetupTokens && typeof data.supervisorSetupTokens === 'object'
      ? data.supervisorSetupTokens
      : {},
    supervisorSessions: data.supervisorSessions && typeof data.supervisorSessions === 'object'
      ? data.supervisorSessions
      : {}
  };
}

function pruneSupervisorAccess(data, timestamp) {
  const nowMs = Date.parse(timestamp);
  for (const [token, setup] of Object.entries(data.supervisorSetupTokens || {})) {
    const expiresAtMs = Date.parse(setup.expiresAt || '');
    const consumedAtMs = Date.parse(setup.consumedAt || '');
    if (Number.isNaN(expiresAtMs) || expiresAtMs <= nowMs || (!Number.isNaN(consumedAtMs) && consumedAtMs + SUPERVISOR_SETUP_TOKEN_TTL_MS <= nowMs)) {
      delete data.supervisorSetupTokens[token];
    }
  }

  for (const [token, session] of Object.entries(data.supervisorSessions || {})) {
    const expiresAtMs = Date.parse(session.expiresAt || '');
    if (Number.isNaN(expiresAtMs) || expiresAtMs <= nowMs) {
      delete data.supervisorSessions[token];
    }
  }
}

function normaliseEmployeeRoles(employees) {
  for (const employee of Object.values(employees)) {
    employee.role = normaliseEmployeeRole(employee.role);
  }
}

function migrateCredentials(rawCredentials, employees) {
  if (!rawCredentials || typeof rawCredentials !== 'object') {
    return {};
  }

  const credentials = {};
  for (const [rawCredentialId, rawCredential] of Object.entries(rawCredentials)) {
    const credentialId = normaliseCredentialId(rawCredentialId);
    if (!credentialId) {
      continue;
    }

    const employeeId = typeof rawCredential === 'string' ? rawCredential : rawCredential?.employeeId;
    const employeeName = typeof rawCredential === 'object' ? rawCredential.employeeName : '';
    if (!employeeId) {
      continue;
    }

    const employee = {
      employeeId: String(employeeId).trim().toUpperCase(),
      employeeName: String(employeeName || employees[String(employeeId).trim().toUpperCase()]?.employeeName || 'Registered employee')
        .replace(/\s+/g, ' ')
        .trim(),
      credentialId,
      status: rawCredential.active === false ? 'inactive' : 'active',
      role: normaliseEmployeeRole(rawCredential.role || employees[String(employeeId).trim().toUpperCase()]?.role),
      createdAt: rawCredential.createdAt || null,
      updatedAt: rawCredential.updatedAt || null
    };

    employees[employee.employeeId] = employees[employee.employeeId] || employee;
    employees[employee.employeeId].role = normaliseEmployeeRole(employees[employee.employeeId].role || employee.role);
    credentials[credentialId] = {
      credentialId,
      employeeId: employee.employeeId,
      employeeName: employee.employeeName,
      role: normaliseEmployeeRole(rawCredential.role || employees[employee.employeeId].role),
      active: employee.status === 'active',
      createdAt: rawCredential.createdAt || null,
      updatedAt: rawCredential.updatedAt || null,
      lastUsedAt: rawCredential.lastUsedAt || null
    };
  }

  return credentials;
}

function normaliseAction(action) {
  const value = String(action || '').trim().toLowerCase();
  if (!VALID_ACTIONS.has(value)) {
    throw new ClockingError('Choose whether the employee is coming in or going off duty.');
  }
  return value;
}

function normaliseEmployee(payload) {
  const employeeId = normaliseEmployeeId(payload.employeeId);
  const employeeName = String(payload.employeeName || '').replace(/\s+/g, ' ').trim();

  if (!employeeName) {
    throw new ClockingError('Employee name is required.');
  }

  if (employeeName.length > 80) {
    throw new ClockingError('Employee name must be 80 characters or fewer.');
  }

  return { employeeId, employeeName };
}

function normaliseEmployeeId(employeeId) {
  const value = String(employeeId || '').trim().toUpperCase();

  if (!value) {
    throw new ClockingError('Employee number is required.');
  }

  if (!/^[A-Z0-9._-]{2,24}$/.test(value)) {
    throw new ClockingError('Employee number must be 2-24 letters, numbers, dots, dashes, or underscores.');
  }

  return value;
}

function normaliseEmployeeStatus(status) {
  const value = String(status || 'active').trim().toLowerCase();
  if (value !== 'active' && value !== 'inactive') {
    throw new ClockingError('Employee status must be active or inactive.');
  }
  return value;
}

function normaliseEmployeeRole(role) {
  const value = String(role || 'employee').trim().toLowerCase();
  if (!VALID_ROLES.has(value)) {
    throw new ClockingError('Employee role must be employee, admin, or super.');
  }
  return value;
}

function normaliseCredentialId(credentialId) {
  const value = String(credentialId || '').trim().toUpperCase();
  if (!value) {
    return '';
  }

  if (!/^[A-Z0-9._:-]{2,64}$/.test(value)) {
    throw new ClockingError('Card or NFC ID must be 2-64 letters, numbers, dots, dashes, underscores, or colons.');
  }

  return value;
}

function normaliseClockMetadata(payload, timestamp) {
  const source = normaliseClockSource(payload.source);
  const location = normaliseClockLocation(payload.location);
  const deviceLabel = normaliseMetadataText(payload.deviceLabel, 80);

  if (source === 'supervisor' && !location) {
    throw new ClockingError('Supervisor terminal must capture its GPS location before clocking.');
  }

  if (source === 'supervisor') {
    assertFreshSupervisorLocation(location, timestamp);
  }

  const metadata = {};
  if (source) {
    metadata.source = source;
  }
  if (location) {
    metadata.location = location;
  }
  if (deviceLabel) {
    metadata.deviceLabel = deviceLabel;
  }
  return metadata;
}

function normaliseClockSource(source) {
  const value = String(source || '').trim().toLowerCase();
  if (!value) {
    return '';
  }

  if (!VALID_SOURCES.has(value)) {
    throw new ClockingError('Clocking source must be terminal, mobile, or supervisor.');
  }

  return value;
}

function normaliseClockLocation(location) {
  if (location === undefined || location === null || location === '') {
    return null;
  }

  if (typeof location !== 'object') {
    throw new ClockingError('Supervisor location must be a GPS reading.');
  }

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new ClockingError('Supervisor location must include a valid latitude.');
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new ClockingError('Supervisor location must include a valid longitude.');
  }

  const capturedAtValue = String(location.capturedAt || location.timestamp || '').trim();
  const capturedAtMs = Date.parse(capturedAtValue);
  if (!capturedAtValue || Number.isNaN(capturedAtMs)) {
    throw new ClockingError('Supervisor location must include when it was captured.');
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

function assertFreshSupervisorLocation(location, timestamp) {
  const eventMs = Date.parse(timestamp);
  const capturedMs = Date.parse(location.capturedAt);

  if (Number.isNaN(eventMs) || Number.isNaN(capturedMs)) {
    throw new ClockingError('Supervisor location timestamp is invalid.');
  }

  if (Math.abs(eventMs - capturedMs) > MAX_SUPERVISOR_LOCATION_AGE_MS) {
    throw new ClockingError('Supervisor location is stale. Refresh location and clock again.');
  }
}

function normaliseMetadataText(value, maxLength) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) {
    return '';
  }

  if (text.length > maxLength) {
    throw new ClockingError(`Clocking metadata must be ${maxLength} characters or fewer.`);
  }

  return text;
}

function randomToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function normaliseAccessToken(value) {
  return String(value || '').trim();
}

function roundCoordinate(value) {
  return Number(value.toFixed(6));
}

function resolveAuthorityCredential(data, credentialId) {
  const credential = resolveCredential(data, normaliseCredentialId(credentialId));
  const employee = data.employees[credential.employeeId];

  if (!employee) {
    throw new ClockingError('Power credential is not linked to a registered employee.', 403);
  }

  if (employee.status !== 'active') {
    throw new ClockingError(`${employee.employeeName} is not active for admin actions.`, 403);
  }

  const role = normaliseEmployeeRole(employee.role || credential.role);
  if (role !== 'admin' && role !== 'super') {
    throw new ClockingError('Admin or super power credential is required.', 403);
  }

  return {
    employeeId: employee.employeeId,
    employeeName: employee.employeeName,
    credentialId: credential.credentialId,
    role
  };
}

function resolveEmployeeById(data, employeeId, options = {}) {
  const targetEmployeeId = normaliseEmployeeId(employeeId);
  const employee = data.employees[targetEmployeeId];
  if (!employee) {
    throw new ClockingError('Target employee must be registered first.', 403);
  }

  if (!options.allowInactive && employee.status !== 'active') {
    throw new ClockingError(`${employee.employeeName} is not active for clocking.`, 403);
  }

  return employee;
}

function resolveFlagTarget(data, payload, timestamp) {
  if (payload.targetEmployeeId || payload.employeeId) {
    return resolveEmployeeById(data, payload.targetEmployeeId || payload.employeeId, { allowInactive: true });
  }

  const credentialId = normaliseCredentialId(payload.credentialId);
  if (credentialId) {
    return resolveEmployee(data, payload, credentialId, timestamp);
  }

  throw new ClockingError('Choose an employee to flag.');
}

function assertAdminCanActOnTarget(authority, target) {
  const targetRole = normaliseEmployeeRole(target.role);
  if ((targetRole === 'admin' || targetRole === 'super') && authority.role !== 'super') {
    throw new ClockingError('Super power credential is required to clock an admin.', 403);
  }
}

function actorMetadata(authority) {
  return {
    employeeId: authority.employeeId,
    employeeName: authority.employeeName,
    credentialId: authority.credentialId,
    role: authority.role
  };
}

function resolveEmployee(data, payload, credentialId, timestamp) {
  if (!credentialId) {
    const employeeId = normaliseEmployeeId(payload.employeeId);
    const employee = data.employees[employeeId];
    if (!employee) {
      throw new ClockingError('Employee must be registered in the office before clocking.', 403);
    }
    if (employee.status !== 'active') {
      throw new ClockingError(`${employee.employeeName} is not active for clocking.`, 403);
    }
    return employee;
  }

  const credential = resolveCredential(data, credentialId);

  const employee = data.employees[credential.employeeId];
  if (!employee) {
    throw new ClockingError('Credential is not linked to a registered employee.', 403);
  }

  if (employee.status !== 'active') {
    throw new ClockingError(`${employee.employeeName} is not active for clocking.`, 403);
  }

  credential.lastUsedAt = timestamp;
  return employee;
}

function resolveCredential(data, credentialId) {
  if (!credentialId) {
    throw new ClockingError('Scanner credential is required.');
  }

  const credential = data.credentials[credentialId];
  if (!credential) {
    throw new ClockingError('Unknown credential. Register it in the office first.', 403);
  }

  if (!credential.active) {
    throw new ClockingError('That credential is not active for clocking.', 403);
  }

  return credential;
}

function findActiveEntry(entries, employeeId) {
  const latest = entries
    .filter((entry) => entry.employeeId === employeeId)
    .sort(sortNewestFirst)[0];

  return latest?.action === 'in' ? latest : null;
}

function getActiveEntries(entries) {
  const byEmployee = new Map();
  for (const entry of entries.slice().sort(sortNewestFirst)) {
    if (!byEmployee.has(entry.employeeId)) {
      byEmployee.set(entry.employeeId, entry);
    }
  }

  return Array.from(byEmployee.values())
    .filter((entry) => entry.action === 'in')
    .map((entry) => ({
      employeeId: entry.employeeId,
      employeeName: entry.employeeName,
      clockedInAt: entry.timestamp,
      activeEntryId: entry.id
    }));
}

function filterEntries(entries, filters, timeZone) {
  return entries.filter((entry) => {
    if (filters.employeeId && entry.employeeId !== String(filters.employeeId).trim().toUpperCase()) {
      return false;
    }

    if (filters.date && getDateInZone(entry.timestamp, timeZone) !== filters.date) {
      return false;
    }

    return true;
  });
}

function getDateInZone(timestamp, timeZone) {
  const date = new Date(timestamp);
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(date).reduce((map, part) => {
    map[part.type] = part.value;
    return map;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function minutesBetween(startTimestamp, endTimestamp) {
  const start = new Date(startTimestamp).getTime();
  const end = new Date(endTimestamp).getTime();
  return Math.max(0, Math.round((end - start) / 60000));
}

function sortNewestFirst(left, right) {
  return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
}

function sortByEmployeeName(left, right) {
  return left.employeeName.localeCompare(right.employeeName);
}

module.exports = {
  ClockingError,
  ClockingStore,
  DEFAULT_TIME_ZONE,
  getDateInZone
};
