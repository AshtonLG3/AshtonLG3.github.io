const mobileMessage = document.querySelector('#mobile-message');
const mobileNowElements = document.querySelectorAll('[data-mobile-now]');
const terminalStatusElements = document.querySelectorAll('[data-terminal-status]');
const scannerSetup = document.querySelector('#scanner-setup');
const scannerCard = document.querySelector('#scanner-card');
const scannerEmployeeName = document.querySelector('#scanner-employee-name');
const scannerEmployeeId = document.querySelector('#scanner-employee-id');
const scannerCredentialId = document.querySelector('#scanner-credential-id');
const scannerNextAction = document.querySelector('#scanner-next-action');
const scannerLiveStatus = document.querySelector('#scanner-live-status');
const mobileTabButtons = document.querySelectorAll('[data-tab]');
const mobileTabPanels = document.querySelectorAll('[data-tab-panel]');
const mobileHistoryList = document.querySelector('#mobile-history-list');
const profileEmployeeName = document.querySelector('#profile-employee-name');
const profileEmployeeId = document.querySelector('#profile-employee-id');
const profileServerUrl = document.querySelector('#profile-server-url');
const mobileTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Johannesburg';
const urlParams = new URLSearchParams(window.location.search);
const API_FETCH_TIMEOUT_MS = 15000;
const APP_URL_SCHEME = 'employmentclocking:';

let scannerStatus = { nextAction: 'in', isClockedIn: false };
let serverUrl = normaliseServerUrl(localStorage.getItem('clocking.serverUrl') || '');
let nativeScannerActive = false;
let nativeScanLoopActive = false;
let nativeScanInFlight = false;
let nativeScanTimer = 0;
let processingScan = false;
let lastScanContent = '';
let lastScanAt = 0;
let activeMobileTab = 'scan';

const capacitorBridge = window.Capacitor;
const isNative = Boolean(capacitorBridge?.isNativePlatform?.() || capacitorBridge?.Plugins);

initialiseMobile();

async function initialiseMobile() {
  if (isNative) {
    document.body.classList.add('native-app');
  }

  updateMobileClock();
  bindMobileTabs();
  renderScannerProfile();
  setInterval(updateMobileClock, 1000);
  setInterval(refreshScannerStatus, 30000);

  const setupProfile = readOfficeSetupFromUrl();
  const terminalToken = urlParams.get('token') || '';
  const launchServerUrl = serverUrlFromUrl(new URL(window.location.href));
  if (isNative && launchServerUrl) {
    saveServerUrl(launchServerUrl);
  }
  clearLaunchParamsFromUrl();

  if (setupProfile) {
    await activateIssuedScanner(setupProfile);
  } else {
    await refreshScannerStatus();
  }

  if (terminalToken) {
    await clockWithTerminalToken(terminalToken);
  }

  if (isNative) {
    startAutoScanner();
  } else {
    // Non-native fallback logic if any needed
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (isNative) stopAutoScanner();
    } else {
      if (isNative) startAutoScanner();
      refreshScannerStatus();
    }
  });
}

function bindMobileTabs() {
  mobileTabButtons.forEach((button) => {
    button.addEventListener('click', () => switchMobileTab(button.dataset.tab || 'scan'));
  });
}

async function switchMobileTab(tabName) {
  activeMobileTab = ['scan', 'history', 'profile'].includes(tabName) ? tabName : 'scan';

  mobileTabButtons.forEach((button) => {
    const isActive = button.dataset.tab === activeMobileTab;
    button.classList.toggle('active', isActive);
    if (isActive) {
      button.setAttribute('aria-current', 'page');
    } else {
      button.removeAttribute('aria-current');
    }
  });

  mobileTabPanels.forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.tabPanel === activeMobileTab);
  });

  if (activeMobileTab === 'scan') {
    setMobileMessage(getScannerProfile() ? `${getScannerProfile().employeeName} scanner ready.` : 'Office setup pending.', false);
    if (isNative) {
      startAutoScanner({ restart: true });
    }
    return;
  }

  if (isNative) {
    await stopAutoScanner();
  }

  if (activeMobileTab === 'history') {
    await loadMobileHistory();
    return;
  }

  if (activeMobileTab === 'profile') {
    renderProfile();
  }
}

function getBaseUrl() {
  if (isNative && serverUrl) {
    return serverUrl;
  }
  return '';
}

async function apiFetch(path, options = {}) {
  if (isNative && !serverUrl) {
    throw new Error('Office setup needed.');
  }

  let response;
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeout = controller ? window.setTimeout(() => controller.abort(), API_FETCH_TIMEOUT_MS) : 0;
  const fetchOptions = { ...options };

  if (controller && !fetchOptions.signal) {
    fetchOptions.signal = controller.signal;
  }

  try {
    response = await fetch(`${getBaseUrl()}${path}`, fetchOptions);
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Office server did not respond. Check the public office link or network, then scan again.');
    }
    throw new Error('Office server is not reachable. Scan a public office setup QR/link or connect this phone to the office network.');
  } finally {
    if (timeout) {
      window.clearTimeout(timeout);
    }
  }
  const text = await response.text();
  const result = text ? parseJsonResponse(text) : {};

  if (!response.ok) {
    throw new Error(result.error || `API error: ${response.status}`);
  }
  return result;
}

function parseJsonResponse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { error: text || 'The office server returned an unreadable response.' };
  }
}

async function startAutoScanner(options = {}) {
  if (options.restart && nativeScannerActive) {
    await stopAutoScanner();
  }

  if (!isNative || nativeScannerActive) {
    if (!isNative && !getScannerProfile()) {
      setMobileMessage('Office setup pending.', false);
    }
    return;
  }

  const barcodeScanner = getBarcodeScanner();
  if (!barcodeScanner) {
    setTerminalStatus('No camera');
    setMobileMessage('Native scanner is not available.', true);
    return;
  }

  try {
    const status = await barcodeScanner.checkPermission({ force: true });
    if (!status.granted) {
      setTerminalStatus('Camera');
      setMobileMessage('Camera permission is required.', true);
      return;
    }

    await showNativeCameraView(barcodeScanner);

    nativeScanLoopActive = true;
    nativeScannerActive = true;
    setTerminalStatus('Ready');
    if (!mobileMessage.textContent) {
      setMobileMessage(getScannerProfile() ? 'Camera ready. Aim at the terminal QR.' : 'Scan the office setup QR.', false);
    }
    scheduleScanLoop(100);
  } catch (error) {
    nativeScannerActive = false;
    await showNativeAppView(barcodeScanner);
    setTerminalStatus('Camera');
    setMobileMessage(`Scanner failed: ${error.message}`, true);
  }
}

async function stopAutoScanner() {
  const barcodeScanner = getBarcodeScanner();
  nativeScannerActive = false;
  nativeScanLoopActive = false;
  window.clearTimeout(nativeScanTimer);

  if (barcodeScanner) {
    await barcodeScanner.stopScan?.({ resolveScan: true }).catch(() => {});
    await showNativeAppView(barcodeScanner);
  } else {
    await showNativeAppView(null);
  }
}

function scheduleScanLoop(delay) {
  window.clearTimeout(nativeScanTimer);
  nativeScanTimer = window.setTimeout(runScanLoop, delay);
}

async function runScanLoop() {
  if (!nativeScanLoopActive || nativeScanInFlight) {
    return;
  }

  const barcodeScanner = getBarcodeScanner();
  if (!barcodeScanner) {
    return;
  }

  nativeScanInFlight = true;

  try {
    await showNativeCameraView(barcodeScanner);
    const result = await barcodeScanner.startScan({
      targetedFormats: ['QR_CODE'],
      cameraDirection: 'back'
    });

    await showNativeAppView(barcodeScanner);

    if (result?.hasContent) {
      if (shouldIgnoreDuplicateScan(result.content)) {
        setMobileMessage('QR already read. Aim at the next office code.', false);
      } else {
        setMobileMessage('QR read. Sending to office...', false);
        await processScannedContent(result.content);
      }
    }
  } catch (error) {
    setMobileMessage(`Scan failed: ${error.message}`, true);
  } finally {
    await showNativeAppView(barcodeScanner);
    nativeScanInFlight = false;
    if (nativeScanLoopActive) {
      scheduleScanLoop(800);
    }
  }
}

async function showNativeCameraView(barcodeScanner = getBarcodeScanner()) {
  document.body.classList.add('scanner-active');
  document.documentElement.classList.add('scanner-active');
  document.documentElement.style.backgroundColor = 'transparent';
  document.body.style.backgroundColor = 'transparent';
  await barcodeScanner?.hideBackground?.().catch(() => {});
}

async function showNativeAppView(barcodeScanner = getBarcodeScanner()) {
  document.body.classList.remove('scanner-active');
  document.documentElement.classList.remove('scanner-active');
  document.documentElement.style.backgroundColor = '';
  document.body.style.backgroundColor = '';
  await barcodeScanner?.showBackground?.().catch(() => {});
}

async function processScannedContent(scannedContent) {
  let url;

  try {
    url = new URL(scannedContent);
  } catch {
    setMobileMessage('Wrong QR code.', true);
    return;
  }

  const scannedServerUrl = serverUrlFromUrl(url) || normaliseServerUrl(`${url.protocol}//${url.host}`);
  if (isNative && scannedServerUrl) {
    saveServerUrl(scannedServerUrl);
  }

  if (isSetupUrl(url)) {
    await activateIssuedScanner(profileFromSetupUrl(url));
    return;
  }

  const terminalToken = url.searchParams.get('token');
  if (terminalToken) {
    await clockWithTerminalToken(terminalToken);
    return;
  }

  setMobileMessage('Wrong QR code.', true);
}

async function activateIssuedScanner(profile) {
  if (!profile?.employeeId || !profile?.employeeName || !profile?.credentialId) {
    setTerminalStatus('Setup');
    setMobileMessage('Office setup is incomplete.', true);
    return;
  }

  setTerminalStatus('Syncing');
  setMobileMessage('');

  try {
    const result = await apiFetch('/api/scanner/activate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(profile)
    });

    saveScannerProfile(result.employee);
    updateScannerState(result.status);
    renderScannerProfile();
    setTerminalStatus('Ready');
    setMobileMessage(`${result.employee.employeeName} scanner ready.`, false);
  } catch (error) {
    setTerminalStatus(getScannerProfile() ? 'Ready' : 'Setup');
    if (isCredentialRejected(error.message)) {
      clearScannerProfile();
      renderScannerProfile();
      setTerminalStatus('Setup');
      setMobileMessage('Office must issue this scanner first.', true);
      return;
    }
    setMobileMessage(error.message, true);
  }
}

async function clockWithTerminalToken(terminalToken) {
  const profile = getScannerProfile();
  if (!profile) {
    setMobileMessage('Office setup pending.', true);
    return;
  }

  const payload = {
    employeeId: profile.employeeId,
    employeeName: profile.employeeName,
    credentialId: profile.credentialId,
    date: localDateValue(new Date()),
    timeZone: mobileTimeZone,
    source: 'mobile',
    terminalToken
  };

  setTerminalStatus('Syncing');
  setMobileMessage('');

  try {
    const result = await apiFetch('/api/scan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });

    updateScannerState(result.status);
    saveScannerProfile(result.status);
    renderScannerProfile();
    await acknowledgeSuccess();
    setTerminalStatus('Ready');
    setMobileMessage(clockMessage(result.entry), false);
  } catch (error) {
    setTerminalStatus('Ready');
    const detail = isCredentialRejected(error.message)
      ? `${error.message} Phone has ${profile.employeeId} / ${profile.credentialId}. Reissue this scanner from the office register.`
      : error.message;
    setMobileMessage(detail, true);
  }
}

async function refreshScannerStatus() {
  const profile = getScannerProfile();
  if (!profile) {
    updateScannerState({ nextAction: 'in', isClockedIn: false });
    renderScannerProfile();
    return;
  }

  try {
    const params = new URLSearchParams({ credentialId: profile.credentialId });
    const result = await apiFetch(`/api/scanner/status?${params.toString()}`);

    updateScannerState(result.status);
    saveScannerProfile(result.status);
    renderScannerProfile();
  } catch (error) {
    if (isCredentialRejected(error.message)) {
      clearScannerProfile();
      renderScannerProfile();
      setMobileMessage('Office must issue this scanner first.', true);
      return;
    }

    if (isNative && !serverUrl) {
      setMobileMessage('Office setup pending.', false);
      return;
    }

    setMobileMessage(error.message, true);
  }
}

function readOfficeSetupFromUrl() {
  if (!isSetupUrl(new URL(window.location.href))) {
    return null;
  }
  return profileFromSetupUrl(new URL(window.location.href));
}

function isSetupUrl(url) {
  return url.searchParams.get('setup') === '1' || (url.protocol === APP_URL_SCHEME && url.hostname === 'setup');
}

function serverUrlFromUrl(url) {
  return normaliseServerUrl(url.searchParams.get('server') || '');
}

function profileFromSetupUrl(url) {
  const employeeId = url.searchParams.get('employeeId') || '';
  const employeeName = url.searchParams.get('employeeName') || '';
  const credentialId = url.searchParams.get('credentialId') || '';

  return {
    employeeId: employeeId.trim().toUpperCase(),
    employeeName: employeeName.replace(/\s+/g, ' ').trim(),
    credentialId: credentialId.trim().toUpperCase()
  };
}

function clearLaunchParamsFromUrl() {
  const cleanUrl = new URL(window.location.href);
  ['server', 'setup', 'employeeId', 'employeeName', 'credentialId', 'token', 'terminal'].forEach((key) => {
    cleanUrl.searchParams.delete(key);
  });
  const cleanPath = `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`;
  window.history.replaceState({}, document.title, cleanPath);
}

function getScannerProfile() {
  const employeeId = localStorage.getItem('clocking.employeeId') || '';
  const employeeName = localStorage.getItem('clocking.employeeName') || '';
  const credentialId = localStorage.getItem('clocking.credentialId') || '';

  if (!employeeId || !employeeName || !credentialId) {
    return null;
  }

  return { employeeId, employeeName, credentialId };
}

function saveScannerProfile(profile) {
  localStorage.setItem('clocking.employeeId', profile.employeeId.trim().toUpperCase());
  localStorage.setItem('clocking.employeeName', profile.employeeName.replace(/\s+/g, ' ').trim());
  localStorage.setItem('clocking.credentialId', profile.credentialId.trim().toUpperCase());
}

function saveServerUrl(value) {
  serverUrl = normaliseServerUrl(value);
  if (serverUrl) {
    localStorage.setItem('clocking.serverUrl', serverUrl);
  }
}

function clearScannerProfile() {
  localStorage.removeItem('clocking.employeeId');
  localStorage.removeItem('clocking.employeeName');
  localStorage.removeItem('clocking.credentialId');
}

function renderScannerProfile() {
  const profile = getScannerProfile();

  if (!profile) {
    scannerSetup.classList.remove('hidden');
    scannerCard.classList.add('hidden');
    return;
  }

  scannerSetup.classList.add('hidden');
  scannerCard.classList.remove('hidden');
  scannerEmployeeName.textContent = profile.employeeName;
  scannerEmployeeId.textContent = profile.employeeId;
  scannerCredentialId.textContent = profile.credentialId;
  renderProfile();

  if (!mobileMessage.textContent) {
    setMobileMessage(`${profile.employeeName} scanner ready.`, false);
  }
}

async function loadMobileHistory() {
  const profile = getScannerProfile();
  if (!profile) {
    renderHistoryMessage('Office must issue this scanner first.');
    return;
  }

  renderHistoryMessage('Loading history...');

  try {
    const params = new URLSearchParams({
      employeeId: profile.employeeId,
      date: localDateValue(new Date()),
      timeZone: mobileTimeZone
    });
    const snapshot = await apiFetch(`/api/snapshot?${params.toString()}`);
    renderHistoryEntries(snapshot.entries || []);
    setMobileMessage(`${profile.employeeName} scanner ready.`, false);
  } catch (error) {
    renderHistoryMessage(error.message);
    setMobileMessage(error.message, true);
  }
}

function renderHistoryEntries(entries) {
  mobileHistoryList.replaceChildren();

  if (!entries.length) {
    renderHistoryMessage('No clocking records today.');
    return;
  }

  entries.slice(0, 8).forEach((entry) => {
    const item = document.createElement('article');
    item.className = `history-item ${entry.action === 'out' ? 'history-out' : 'history-in'}`;

    const action = document.createElement('strong');
    action.textContent = entry.action.toUpperCase();

    const time = document.createElement('span');
    time.textContent = formatTime(entry.timestamp);

    const detail = document.createElement('small');
    detail.textContent = entry.action === 'out'
      ? `Total ${formatMinutes(entry.shiftDurationMinutes)}`
      : 'Shift started';

    item.append(action, time, detail);
    mobileHistoryList.append(item);
  });
}

function renderHistoryMessage(text) {
  mobileHistoryList.replaceChildren();
  const message = document.createElement('p');
  message.textContent = text;
  mobileHistoryList.append(message);
}

function renderProfile() {
  const profile = getScannerProfile();
  if (!profile) {
    return;
  }

  profileEmployeeName.textContent = profile.employeeName;
  profileEmployeeId.textContent = profile.employeeId;
  scannerCredentialId.textContent = profile.credentialId;
  profileServerUrl.textContent = serverUrl || `${location.protocol}//${location.host}`;
}

function updateScannerState(status) {
  scannerStatus = {
    nextAction: status?.nextAction === 'out' ? 'out' : 'in',
    isClockedIn: Boolean(status?.isClockedIn)
  };
  const label = scannerStatus.nextAction.toUpperCase();
  scannerNextAction.textContent = label;
  scannerCard.dataset.nextAction = scannerStatus.nextAction;

  if (scannerStatus.nextAction === 'out') {
    scannerNextAction.classList.remove('text-primary');
    scannerNextAction.classList.add('text-tertiary');
  } else {
    scannerNextAction.classList.remove('text-tertiary');
    scannerNextAction.classList.add('text-primary');
  }
}

function shouldIgnoreDuplicateScan(content) {
  const now = Date.now();
  if (content === lastScanContent && now - lastScanAt < 4500) {
    return true;
  }

  lastScanContent = content;
  lastScanAt = now;
  return false;
}

function updateMobileClock() {
  const time = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
  mobileNowElements.forEach((element) => {
    element.textContent = time;
  });
}

async function acknowledgeSuccess() {
  if (isNative) {
    const haptics = capacitorBridge?.Plugins?.Haptics;
    if (haptics) {
      await haptics.impact({ style: 'HEAVY' }).catch(() => haptics.vibrate?.({ duration: 220 }).catch(() => {}));
    }
  } else if (navigator.vibrate) {
    navigator.vibrate([90, 40, 90]);
  }
  playSuccessChime();
}

async function playSuccessChime() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    return;
  }

  try {
    const context = new AudioContext();
    if (context.state === 'suspended') {
      await context.resume();
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.exponentialRampToValueAtTime(1174, now + 0.16);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.24);
    oscillator.addEventListener('ended', () => context.close(), { once: true });
  } catch {
    // Web Audio can be blocked until the installed app has a user gesture.
  }
}

function clockMessage(entry) {
  const verb = entry.action === 'in' ? 'clocked in' : 'clocked out';
  const suffix = entry.action === 'out' ? ` after ${formatMinutes(entry.shiftDurationMinutes)}` : '';
  return `${entry.employeeName} ${verb} at ${formatTime(entry.timestamp)}${suffix}.`;
}

function setMobileMessage(text, isError = false) {
  mobileMessage.textContent = text;
  mobileMessage.classList.toggle('text-rose', isError);
  mobileMessage.classList.toggle('text-primary', !isError);
  setScannerLiveStatus(text, isError);
}

function setScannerLiveStatus(text = '', isError = false) {
  if (!scannerLiveStatus) {
    return;
  }

  let statusText = 'System active - Ready to scan';
  if (isError) {
    statusText = 'Scan failed';
  } else if (/clocked in|clocked out/i.test(text || '')) {
    statusText = 'Scan successful';
  } else if (/QR read|sending/i.test(text || '')) {
    statusText = 'Scan received';
  }

  scannerLiveStatus.textContent = statusText;
  scannerLiveStatus.classList.toggle('text-rose', isError);
  scannerLiveStatus.classList.toggle('text-primary', !isError);
}

function setTerminalStatus(text) {
  terminalStatusElements.forEach((element) => {
    element.textContent = text;
  });
}

function getBarcodeScanner() {
  return capacitorBridge?.Plugins?.BarcodeScanner || null;
}

function isCredentialRejected(message) {
  return /unknown credential|office must issue|not linked|not active/i.test(message || '');
}

function normaliseServerUrl(value) {
  const trimmed = String(value || '').trim().replace(/\/+$/, '');
  if (!trimmed) {
    return '';
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return '';
    }
    return `${url.protocol}//${url.host}`;
  } catch {
    return '';
  }
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
