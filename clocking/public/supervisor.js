const supervisorMessage = document.querySelector('#supervisor-message');
const supervisorStatus = document.querySelector('#supervisor-status');
const supervisorNow = document.querySelector('#supervisor-now');
const supervisorDeviceLabel = document.querySelector('#supervisor-device-label');
const supervisorTerminalForm = document.querySelector('#supervisor-terminal-form');
const supervisorTerminalQr = document.querySelector('#supervisor-terminal-qr');
const supervisorExpiry = document.querySelector('#supervisor-expiry');
const supervisorLocationText = document.querySelector('#supervisor-location-text');
const supervisorMapLink = document.querySelector('#supervisor-map-link');
const supervisorManualForm = document.querySelector('#supervisor-manual-form');
const supervisorManualEmployee = document.querySelector('#supervisor-manual-employee');
const supervisorManualButton = document.querySelector('#supervisor-manual-button');
const supervisorFlagForm = document.querySelector('#supervisor-flag-form');
const supervisorFlagEmployee = document.querySelector('#supervisor-flag-employee');
const supervisorFlagButton = document.querySelector('#supervisor-flag-button');
const supervisorRecentList = document.querySelector('#supervisor-recent-list');
const supervisorTabButtons = document.querySelectorAll('[data-supervisor-tab]');
const supervisorTabPanels = document.querySelectorAll('[data-supervisor-tab-panel]');
const supervisorLoginPanel = document.querySelector('#supervisor-login-panel');
const supervisorWorkspace = document.querySelector('#supervisor-workspace');
const supervisorLoginForm = document.querySelector('#supervisor-login-form');
const supervisorLoginLink = document.querySelector('#supervisor-login-link');
const supervisorLoginButton = document.querySelector('#supervisor-login-button');
const supervisorLoginMessage = document.querySelector('#supervisor-login-message');
const supervisorTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Johannesburg';
const API_FETCH_TIMEOUT_MS = 15000;
const LEGACY_SERVER_URL_STORAGE = 'clocking.serverUrl';
const SUPERVISOR_SERVER_URL_STORAGE = 'clocking.supervisorServerUrl';
const SUPERVISOR_SESSION_STORAGE = 'clocking.supervisorSessionToken';
const SUPERVISOR_LABEL_STORAGE = 'clocking.supervisorDeviceLabel';

let currentLocation = null;
let currentQrExpiresAtMs = 0;
let serverUrl = readInitialSupervisorServerUrl();
let supervisorSessionToken = localStorage.getItem(SUPERVISOR_SESSION_STORAGE) || '';
let activeSupervisorTab = 'checkpoint';

const capacitorBridge = window.Capacitor;
const isNative = Boolean(capacitorBridge?.isNativePlatform?.() || capacitorBridge?.Plugins);

initialiseSupervisor();

async function initialiseSupervisor() {
  const launchSetup = setupFromUrl(new URL(window.location.href));
  clearLaunchParamsFromUrl();

  supervisorDeviceLabel.value = localStorage.getItem(SUPERVISOR_LABEL_STORAGE) || '';
  supervisorLoginForm.addEventListener('submit', handleSupervisorLogin);
  supervisorTerminalForm.addEventListener('submit', handleGenerateTerminalQr);
  supervisorManualForm.addEventListener('submit', handleManualClock);
  supervisorFlagForm.addEventListener('submit', handleFlagEmployee);
  supervisorDeviceLabel.addEventListener('change', saveSupervisorDeviceLabel);
  bindSupervisorTabs();

  updateSupervisorClock();
  updateQrCountdown();
  setInterval(updateSupervisorClock, 1000);
  setInterval(updateQrCountdown, 1000);

  if (launchSetup.token) {
    await activateSupervisorSetup(launchSetup);
    return;
  }

  if (hasSupervisorLogin()) {
    unlockSupervisorApp();
  } else {
    lockSupervisorApp();
  }
}

function bindSupervisorTabs() {
  supervisorTabButtons.forEach((button) => {
    button.addEventListener('click', () => switchSupervisorTab(button.dataset.supervisorTab || 'checkpoint'));
  });
}

async function handleSupervisorLogin(event) {
  event.preventDefault();
  const value = supervisorLoginLink.value.trim();
  if (!value) {
    setSupervisorLoginMessage('Enter the one-time supervisor link from the office.', true);
    return;
  }

  await activateSupervisorSetup(setupFromLink(value));
}

async function activateSupervisorSetup(setup) {
  setSupervisorLoginBusy(true);
  setSupervisorLoginMessage('');

  try {
    if (!setup.serverUrl || !setup.token) {
      throw new Error('Enter the one-time supervisor link from the office.');
    }

    saveServerUrl(setup.serverUrl);
    const response = await fetchWithTimeout(`${getBaseUrl()}/api/supervisor/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token: setup.token,
        deviceLabel: supervisorDeviceLabel.value.trim()
      })
    });
    const result = await parseJsonResponse(response);
    if (!response.ok) {
      throw new Error(result.error || 'Supervisor login failed.');
    }

    supervisorSessionToken = result.sessionToken;
    localStorage.setItem(SUPERVISOR_SESSION_STORAGE, supervisorSessionToken);
    unlockSupervisorApp();
    setSupervisorMessage('Supervisor link accepted. Check point is ready.', false);
  } catch (error) {
    clearSupervisorSession();
    lockSupervisorApp();
    setSupervisorLoginMessage(error.message, true);
  } finally {
    setSupervisorLoginBusy(false);
  }
}

async function switchSupervisorTab(tabName) {
  activeSupervisorTab = ['checkpoint', 'manual', 'flag', 'activity'].includes(tabName) ? tabName : 'checkpoint';

  supervisorTabButtons.forEach((button) => {
    const isActive = button.dataset.supervisorTab === activeSupervisorTab;
    button.classList.toggle('active', isActive);
    if (isActive) {
      button.setAttribute('aria-current', 'page');
    } else {
      button.removeAttribute('aria-current');
    }
  });

  supervisorTabPanels.forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.supervisorTabPanel === activeSupervisorTab);
  });

  if (activeSupervisorTab === 'activity') {
    await loadSupervisorActivity();
  }
}

async function handleGenerateTerminalQr(event) {
  event.preventDefault();
  setSupervisorBusy(true);
  setSupervisorStatus('LOCATING');
  setSupervisorMessage('');

  try {
    currentLocation = await captureLocation();
    renderLocation(currentLocation);
    saveSupervisorDeviceLabel();

    setSupervisorStatus('GENERATING');
    const { response, result } = await fetchOfficeJson('/api/supervisor/terminal', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        deviceLabel: supervisorDeviceLabel.value.trim(),
        location: currentLocation
      })
    });

    if (!response.ok) {
      throw new Error(result.error || 'Could not generate supervisor QR.');
    }

    supervisorTerminalQr.replaceChildren(svgFromString(result.qrSvg));
    currentQrExpiresAtMs = Date.parse(result.expiresAt);
    updateQrCountdown();
    setSupervisorStatus('LIVE');
    setSupervisorMessage(`${result.terminal.deviceLabel} QR is live. Employees can scan it now.`, false);
  } catch (error) {
    setSupervisorStatus('READY');
    setSupervisorMessage(error.message, true);
  } finally {
    setSupervisorBusy(false);
  }
}

async function handleManualClock(event) {
  event.preventDefault();
  const formData = new FormData(supervisorManualForm);
  const targetEmployeeId = formData.get('targetEmployeeId');
  const action = formData.get('action');

  if (!targetEmployeeId) {
    setSupervisorMessage('Choose an employee first.', true);
    return;
  }

  setSupervisorBusy(true);
  setSupervisorStatus('LOCATING');
  setSupervisorMessage('');

  try {
    currentLocation = await captureLocation();
    renderLocation(currentLocation);
    saveSupervisorDeviceLabel();

    setSupervisorStatus('SYNCING');
    const { response, result } = await fetchOfficeJson('/api/supervisor/clock', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        targetEmployeeId,
        action,
        reason: formData.get('reason'),
        date: localDateValue(new Date()),
        timeZone: supervisorTimeZone,
        deviceLabel: supervisorDeviceLabel.value.trim(),
        location: currentLocation
      })
    });

    if (!response.ok) {
      throw new Error(result.error || 'Manual clock failed.');
    }

    setSupervisorStatus('LIVE');
    setSupervisorMessage(`${clockMessage(result.entry)} via ${result.entry.deviceLabel || 'supervisor check point'}.`, false);
    renderSupervisorActivity(result.snapshot?.entries || [], result.snapshot?.flags || []);
  } catch (error) {
    setSupervisorStatus(currentQrExpiresAtMs > Date.now() ? 'LIVE' : 'READY');
    setSupervisorMessage(error.message, true);
  } finally {
    setSupervisorBusy(false);
  }
}

async function handleFlagEmployee(event) {
  event.preventDefault();
  const formData = new FormData(supervisorFlagForm);
  const targetEmployeeId = formData.get('targetEmployeeId');
  const reason = String(formData.get('reason') || '').trim();

  if (!targetEmployeeId || !reason) {
    setSupervisorMessage('Choose an employee and enter a flag note.', true);
    return;
  }

  setSupervisorBusy(true);
  setSupervisorStatus('LOCATING');
  setSupervisorMessage('');

  try {
    currentLocation = await captureLocation();
    renderLocation(currentLocation);
    saveSupervisorDeviceLabel();

    setSupervisorStatus('SYNCING');
    const { response, result } = await fetchOfficeJson('/api/supervisor/flag', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        targetEmployeeId,
        reason,
        date: localDateValue(new Date()),
        timeZone: supervisorTimeZone,
        deviceLabel: supervisorDeviceLabel.value.trim(),
        location: currentLocation
      })
    });

    if (!response.ok) {
      throw new Error(result.error || 'Could not flag employee.');
    }

    supervisorFlagForm.reset();
    renderEmployeeOptions(result.snapshot?.registeredEmployees || []);
    setSupervisorStatus(currentQrExpiresAtMs > Date.now() ? 'LIVE' : 'READY');
    setSupervisorMessage(`${result.flag.employeeName} flagged for office review.`, false);
    renderSupervisorActivity(result.snapshot?.entries || [], result.snapshot?.flags || []);
  } catch (error) {
    setSupervisorStatus(currentQrExpiresAtMs > Date.now() ? 'LIVE' : 'READY');
    setSupervisorMessage(error.message, true);
  } finally {
    setSupervisorBusy(false);
  }
}

function captureLocation() {
  if (!navigator.geolocation) {
    return Promise.reject(new Error('This phone cannot provide a GPS location.'));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
          capturedAt: new Date(position.timestamp).toISOString(),
          provider: 'browser-geolocation'
        });
      },
      (error) => {
        reject(new Error(geolocationErrorMessage(error)));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000
      }
    );
  });
}

function renderLocation(location) {
  const latitude = Number(location?.latitude);
  const longitude = Number(location?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    supervisorLocationText.textContent = 'Not captured';
    supervisorMapLink.classList.add('hidden');
    return;
  }

  const accuracy = Number(location.accuracyMeters);
  const accuracyText = Number.isFinite(accuracy) ? ` | accuracy ${Math.round(accuracy)}m` : '';
  supervisorLocationText.textContent = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}${accuracyText}`;
  supervisorMapLink.href = `https://www.google.com/maps?q=${latitude},${longitude}`;
  supervisorMapLink.classList.remove('hidden');
}

async function loadEmployees() {
  try {
    const { response, result } = await fetchOfficeJson('/api/employees');
    if (!response.ok) {
      throw new Error(result.error || 'Could not load employees.');
    }
    renderEmployeeOptions(result.employees || []);
  } catch (error) {
    renderEmptyEmployeeOptions(error.message);
  }
}

async function loadSupervisorActivity() {
  try {
    const params = new URLSearchParams({
      date: localDateValue(new Date()),
      timeZone: supervisorTimeZone
    });
    const { response, result } = await fetchOfficeJson(`/api/snapshot?${params.toString()}`);
    if (!response.ok) {
      throw new Error(result.error || 'Could not load supervisor activity.');
    }
    renderSupervisorActivity(result.entries || [], result.flags || []);
  } catch (error) {
    renderSupervisorMessage(error.message);
  }
}

function renderEmployeeOptions(employees) {
  const selectedManual = supervisorManualEmployee.value;
  const selectedFlag = supervisorFlagEmployee.value;
  supervisorManualEmployee.replaceChildren();
  supervisorFlagEmployee.replaceChildren();

  if (!employees.length) {
    renderEmptyEmployeeOptions('No employees registered.');
    return;
  }

  for (const employee of employees) {
    supervisorManualEmployee.append(employeeOption(employee));
    supervisorFlagEmployee.append(employeeOption(employee));
  }

  if (selectedManual && employees.some((employee) => employee.employeeId === selectedManual)) {
    supervisorManualEmployee.value = selectedManual;
  }
  if (selectedFlag && employees.some((employee) => employee.employeeId === selectedFlag)) {
    supervisorFlagEmployee.value = selectedFlag;
  }
}

function employeeOption(employee) {
  const option = document.createElement('option');
  option.value = employee.employeeId;
  option.textContent = `${employee.employeeName} (${employee.employeeId})`;
  return option;
}

function renderEmptyEmployeeOptions(text) {
  [supervisorManualEmployee, supervisorFlagEmployee].forEach((select) => {
    select.replaceChildren();
    const option = document.createElement('option');
    option.value = '';
    option.textContent = text;
    select.append(option);
  });
}

function renderSupervisorActivity(entries, flags = []) {
  supervisorRecentList.replaceChildren();
  const deviceLabel = supervisorDeviceLabel.value.trim();
  const supervisorEntries = entries
    .filter((entry) => entry.source === 'supervisor')
    .filter((entry) => !deviceLabel || entry.deviceLabel === deviceLabel)
    .map((entry) => ({ type: 'clock', timestamp: entry.timestamp, item: entry }));
  const supervisorFlags = flags
    .filter((flag) => flag.source === 'supervisor')
    .filter((flag) => !deviceLabel || flag.deviceLabel === deviceLabel)
    .map((flag) => ({ type: 'flag', timestamp: flag.timestamp, item: flag }));
  const activity = supervisorEntries.concat(supervisorFlags).sort((left, right) => {
    return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
  });

  if (!activity.length) {
    renderSupervisorMessage(deviceLabel ? `No activity for ${deviceLabel} today.` : 'No supervisor activity today.');
    return;
  }

  for (const event of activity.slice(0, 8)) {
    supervisorRecentList.append(event.type === 'flag' ? flagActivityItem(event.item) : clockActivityItem(event.item));
  }
}

function clockActivityItem(entry) {
  const item = document.createElement('article');
  item.className = 'supervisor-activity-item';

  const badge = document.createElement('strong');
  badge.className = `supervisor-activity-badge ${entry.action === 'out' ? 'is-out' : 'is-in'}`;
  badge.textContent = entry.action.toUpperCase();

  const detail = document.createElement('div');
  detail.className = 'supervisor-activity-detail';

  const name = document.createElement('div');
  name.className = 'supervisor-activity-name';
  name.textContent = entry.employeeName;

  const meta = document.createElement('div');
  meta.className = 'supervisor-activity-meta';
  meta.textContent = `${entry.deviceLabel || 'Supervisor check point'} | ${formatTime(entry.timestamp)}`;

  detail.append(name, meta);
  item.append(badge, detail);
  return item;
}

function flagActivityItem(flag) {
  const item = document.createElement('article');
  item.className = 'supervisor-activity-item';

  const badge = document.createElement('strong');
  badge.className = 'supervisor-activity-badge is-flag';
  badge.textContent = 'FLAG';

  const detail = document.createElement('div');
  detail.className = 'supervisor-activity-detail';

  const name = document.createElement('div');
  name.className = 'supervisor-activity-name';
  name.textContent = flag.employeeName;

  const meta = document.createElement('div');
  meta.className = 'supervisor-activity-meta';
  meta.textContent = `${flag.deviceLabel || 'Supervisor check point'} | ${formatTime(flag.timestamp)}`;

  const reason = document.createElement('div');
  reason.className = 'supervisor-activity-reason';
  reason.textContent = flag.reason;

  detail.append(name, meta, reason);
  item.append(badge, detail);
  return item;
}

function renderSupervisorMessage(text) {
  supervisorRecentList.replaceChildren();
  const message = document.createElement('p');
  message.className = 'supervisor-empty-message';
  message.textContent = text;
  supervisorRecentList.append(message);
}

async function fetchOfficeJson(url, options = {}) {
  const resolvedUrl = await resolveApiUrl(url);
  const response = await fetchWithTimeout(resolvedUrl, withSupervisorSession(options));
  const result = await parseJsonResponse(response);

  if (response.status === 403 && shouldRequireFreshSupervisorLink(result.error)) {
    clearSupervisorSession();
    lockSupervisorApp();
  }

  return { response, result };
}

async function resolveApiUrl(path) {
  await ensureSupervisorLogin();
  return `${getBaseUrl()}${path}`;
}

async function ensureSupervisorLogin() {
  if (hasSupervisorLogin()) {
    return;
  }

  lockSupervisorApp();
  throw new Error('Enter the one-time supervisor link from the office.');
}

function getBaseUrl() {
  if (isNative && serverUrl) {
    return serverUrl;
  }
  return '';
}

async function fetchWithTimeout(url, options = {}) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeout = controller ? window.setTimeout(() => controller.abort(), API_FETCH_TIMEOUT_MS) : 0;
  const fetchOptions = { ...options };

  if (controller && !fetchOptions.signal) {
    fetchOptions.signal = controller.signal;
  }

  try {
    return await fetch(url, fetchOptions);
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Office server did not respond. Check the office link or network.');
    }
    throw new Error('Office server is not reachable. Check the office link or network.');
  } finally {
    if (timeout) {
      window.clearTimeout(timeout);
    }
  }
}

function withSupervisorSession(options = {}) {
  const headers = new Headers(options.headers || {});
  if (supervisorSessionToken) {
    headers.set('x-supervisor-session-token', supervisorSessionToken);
  }

  return { ...options, headers };
}

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    if (/^\s*(<!doctype|<html)/i.test(text)) {
      return { error: 'Office server link is wrong. Enter the backend office link, not the app page.' };
    }
    return { error: text };
  }
}

function shouldRequireFreshSupervisorLink(message = '') {
  return /supervisor|check point|login link|setup link|office terminal|clocking terminal/i.test(message);
}

function saveSupervisorDeviceLabel() {
  const label = supervisorDeviceLabel.value.trim();
  if (label) {
    localStorage.setItem(SUPERVISOR_LABEL_STORAGE, label);
  } else {
    localStorage.removeItem(SUPERVISOR_LABEL_STORAGE);
  }
}

function saveServerUrl(value) {
  serverUrl = normaliseServerUrl(value);
  if (serverUrl) {
    localStorage.setItem(SUPERVISOR_SERVER_URL_STORAGE, serverUrl);
  }
}

function hasSupervisorLogin() {
  return Boolean(serverUrl && supervisorSessionToken);
}

function unlockSupervisorApp() {
  supervisorLoginPanel.classList.add('hidden');
  supervisorWorkspace.classList.remove('hidden');
  setSupervisorStatus(currentQrExpiresAtMs > Date.now() ? 'LIVE' : 'READY');
  loadEmployees();
  loadSupervisorActivity();
}

function lockSupervisorApp() {
  supervisorWorkspace.classList.add('hidden');
  supervisorLoginPanel.classList.remove('hidden');
  setSupervisorStatus('LOGIN');
}

function clearSupervisorSession() {
  supervisorSessionToken = '';
  localStorage.removeItem(SUPERVISOR_SESSION_STORAGE);
}

function setSupervisorLoginBusy(isBusy) {
  supervisorLoginButton.disabled = isBusy;
}

function setSupervisorLoginMessage(text, isError = false) {
  supervisorLoginMessage.textContent = text;
  supervisorLoginMessage.classList.toggle('text-rose', isError);
  supervisorLoginMessage.classList.toggle('text-primary', !isError);
}

function readInitialSupervisorServerUrl() {
  const supervisorUrl = normaliseServerUrl(localStorage.getItem(SUPERVISOR_SERVER_URL_STORAGE) || '');
  if (supervisorUrl) {
    return supervisorUrl;
  }

  const legacyUrl = normaliseServerUrl(localStorage.getItem(LEGACY_SERVER_URL_STORAGE) || '');
  if (legacyUrl) {
    localStorage.setItem(SUPERVISOR_SERVER_URL_STORAGE, legacyUrl);
  }

  return legacyUrl;
}

function setupFromUrl(url) {
  return {
    serverUrl: normaliseServerUrl(url.searchParams.get('server') || ''),
    token: String(url.searchParams.get('token') || '').trim()
  };
}

function setupFromLink(value) {
  const text = String(value || '').trim();
  try {
    const parsed = new URL(text);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      const setup = setupFromUrl(parsed);
      return {
        serverUrl: setup.serverUrl || normaliseServerUrl(parsed.origin),
        token: setup.token
      };
    }

    return setupFromUrl(parsed);
  } catch {
    return { serverUrl: '', token: '' };
  }
}

function clearLaunchParamsFromUrl() {
  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete('server');
  cleanUrl.searchParams.delete('token');
  const cleanPath = `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`;
  window.history.replaceState({}, document.title, cleanPath);
}

function setSupervisorBusy(isBusy) {
  supervisorTerminalForm.querySelector('button[type="submit"]').disabled = isBusy;
  supervisorManualButton.disabled = isBusy;
  supervisorFlagButton.disabled = isBusy;
}

function setSupervisorMessage(text, isError = false) {
  supervisorMessage.textContent = text;
  supervisorMessage.classList.toggle('text-rose', isError);
  supervisorMessage.classList.toggle('text-primary', !isError);
}

function setSupervisorStatus(text) {
  supervisorStatus.textContent = text;
}

function updateSupervisorClock() {
  supervisorNow.textContent = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function updateQrCountdown() {
  if (!currentQrExpiresAtMs) {
    supervisorExpiry.textContent = '--';
    return;
  }

  const seconds = Math.max(0, Math.floor((currentQrExpiresAtMs - Date.now()) / 1000));
  supervisorExpiry.textContent = `${seconds}s`;
  if (seconds === 0) {
    setSupervisorStatus('EXPIRED');
  }
}

function geolocationErrorMessage(error) {
  if (error.code === error.PERMISSION_DENIED) {
    return 'Location permission is required for supervisor check point QR codes.';
  }

  if (error.code === error.POSITION_UNAVAILABLE) {
    return 'This phone could not get a GPS fix.';
  }

  if (error.code === error.TIMEOUT) {
    return 'Location timed out. Try again with GPS enabled.';
  }

  return 'Location could not be captured.';
}

function normaliseServerUrl(value) {
  const trimmed = String(value || '').trim().replace(/\/+$/, '');
  if (!trimmed) {
    return '';
  }

  try {
    const candidate = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return '';
    }
    return `${url.protocol}//${url.host}`;
  } catch {
    return '';
  }
}

function svgFromString(svgText) {
  const template = document.createElement('template');
  template.innerHTML = svgText.trim();
  return template.content.firstElementChild;
}

function clockMessage(entry) {
  const verb = entry.action === 'in' ? 'clocked in' : 'clocked out';
  const suffix = entry.action === 'out' ? ` after ${formatMinutes(entry.shiftDurationMinutes)}` : '';
  return `${entry.employeeName} ${verb} at ${formatTime(entry.timestamp)}${suffix}`;
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatMinutes(minutes = 0) {
  const safeMinutes = Math.max(0, Number(minutes) || 0);
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;
  return `${hours}h ${String(remainder).padStart(2, '0')}m`;
}

function localDateValue(date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}
