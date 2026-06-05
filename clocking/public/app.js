const form = document.querySelector('#clock-form');
const message = document.querySelector('#message');
const submitLabel = document.querySelector('#submit-label');
const currentTime = document.querySelector('#current-time');
const currentDate = document.querySelector('#current-date');
const terminalDisplayTime = document.querySelector('#terminal-display-time');
const terminalDisplayDate = document.querySelector('#terminal-display-date');
const logDate = document.querySelector('#log-date');
const refreshButton = document.querySelector('#refresh-button');
const activeList = document.querySelector('#active-list');
const onDutyCount = document.querySelector('#on-duty-count');
const completedShifts = document.querySelector('#completed-shifts');
const hoursLogged = document.querySelector('#hours-logged');
const logBody = document.querySelector('#log-body');
const supervisorDeviceActivity = document.querySelector('#supervisor-device-activity');
const supervisorActivityCount = document.querySelector('#supervisor-activity-count');
const terminalQr = document.querySelector('#terminal-qr');
const mobileLink = document.querySelector('#mobile-link');
const terminalExpiry = document.querySelector('#terminal-expiry');
const employeeForm = document.querySelector('#employee-form');
const employeeMessage = document.querySelector('#employee-message');
const employeeList = document.querySelector('#employee-list');
const registeredCount = document.querySelector('#registered-count');
const scannerSetupPanel = document.querySelector('#scanner-setup-panel');
const scannerSetupQr = document.querySelector('#scanner-setup-qr');
const scannerSetupLink = document.querySelector('#scanner-setup-link');
const supervisorSetupLinkInput = document.querySelector('#supervisor-setup-link-input');
const supervisorGenerateLinkButton = document.querySelector('#supervisor-generate-link-button');
const supervisorCopyLinkButton = document.querySelector('#supervisor-copy-link-button');
const supervisorOpenLink = document.querySelector('#supervisor-open-link');
const supervisorSetupExpires = document.querySelector('#supervisor-setup-expires');
const supervisorSetupMessage = document.querySelector('#supervisor-setup-message');
const credentialForm = document.querySelector('#credential-form');
const credentialMessage = document.querySelector('#credential-message');
const officeNavLinks = document.querySelectorAll('[data-office-nav]');
const officeNavStatus = document.querySelector('#office-nav-status');
const officeSettingsButton = document.querySelector('#office-settings-button');
const officeProfileButton = document.querySelector('#office-profile-button');
const adminActionForm = document.querySelector('#admin-action-form');
const adminPowerCredential = document.querySelector('#admin-power-credential');
const adminTargetEmployee = document.querySelector('#admin-target-employee');
const adminForceOutButton = document.querySelector('#admin-force-out-button');
const adminMessage = document.querySelector('#admin-message');
const settingsOfficeKey = document.querySelector('#settings-office-key');
const settingsSaveKeyButton = document.querySelector('#settings-save-key-button');
const settingsClearKeyButton = document.querySelector('#settings-clear-key-button');
const settingsVersion = document.querySelector('#settings-version');
const themeInputs = document.querySelectorAll('input[name="officeTheme"]');
const powerCredentialForm = document.querySelector('#power-credential-form');
const powerCredentialMessage = document.querySelector('#power-credential-message');
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Johannesburg';
const APP_VERSION = '0.7.28';
const OFFICE_KEY_STORAGE = 'clocking.officeTerminalKey';
const OFFICE_THEME_STORAGE = 'clocking.officeTheme';
const NAV_OFFSET_PX = 96;

let latestSnapshot = {
  activeEmployees: [],
  entries: [],
  flags: [],
  registeredEmployees: [],
  totals: { onDuty: 0, completedShifts: 0, minutesWorked: 0 }
};

initialise();

function initialise() {
  logDate.value = localDateValue(new Date());
  form.addEventListener('submit', handleClockSubmit);
  form.addEventListener('change', updateActionLabel);
  employeeForm.addEventListener('submit', handleEmployeeRegister);
  credentialForm.addEventListener('submit', handleCredentialSubmit);
  adminActionForm.addEventListener('submit', handleAdminClockSubmit);
  adminForceOutButton.addEventListener('click', handleAdminForceOut);
  powerCredentialForm.addEventListener('submit', handlePowerCredentialSubmit);
  settingsSaveKeyButton.addEventListener('click', saveOfficeKeyFromSettings);
  settingsClearKeyButton.addEventListener('click', clearOfficeKeyFromSettings);
  supervisorGenerateLinkButton?.addEventListener('click', handleGenerateSupervisorSetup);
  supervisorCopyLinkButton?.addEventListener('click', copySupervisorSetupLink);
  themeInputs.forEach((input) => {
    input.addEventListener('change', () => applyOfficeTheme(input.value, { persist: true }));
  });
  refreshButton.addEventListener('click', refreshSnapshot);
  logDate.addEventListener('change', refreshSnapshot);
  bindOfficeNavigation();
  initialiseSettings();
  updateActionLabel();
  updateClock();
  loadTerminalQr();
  refreshSnapshot();
  setInterval(updateClock, 1000);
  setInterval(loadTerminalQr, 30000);
  setInterval(renderActiveList, 30000);
}

function bindOfficeNavigation() {
  officeNavLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const targetId = link.dataset.officeNav;
      if (!targetId) {
        return;
      }

      event.preventDefault();
      navigateOfficeSection(targetId);
    });
  });

  officeSettingsButton?.addEventListener('click', handleOfficeSettingsClick);
  officeProfileButton?.addEventListener('click', () => navigateOfficeSection('admin-portal'));
  window.addEventListener('hashchange', setActiveNavFromHash);
  window.addEventListener('scroll', updateActiveNavFromScroll, { passive: true });
  setActiveNavFromHash();
}

function navigateOfficeSection(targetId) {
  const target = document.getElementById(targetId);
  if (!target) {
    return;
  }

  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.history.replaceState({}, document.title, `#${targetId}`);
  setActiveOfficeNav(targetId);
}

function handleOfficeSettingsClick() {
  navigateOfficeSection('settings-panel');
  setOfficeNavStatus('Settings opened.');
}

function setActiveNavFromHash() {
  const hashTarget = window.location.hash.replace('#', '');
  if (hashTarget && document.getElementById(hashTarget)) {
    setActiveOfficeNav(hashTarget);
    return;
  }

  updateActiveNavFromScroll();
}

function updateActiveNavFromScroll() {
  const sections = Array.from(officeNavLinks)
    .map((link) => document.getElementById(link.dataset.officeNav))
    .filter(Boolean)
    .sort((left, right) => left.offsetTop - right.offsetTop);

  let activeId = sections[0]?.id || 'dashboard-top';
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= NAV_OFFSET_PX) {
      activeId = section.id;
    }
  }

  setActiveOfficeNav(activeId);
}

function setActiveOfficeNav(targetId) {
  officeNavLinks.forEach((link) => {
    const isActive = link.dataset.officeNav === targetId;
    link.dataset.active = String(isActive);
    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

function setOfficeNavStatus(text) {
  if (officeNavStatus) {
    officeNavStatus.textContent = text;
  }
}

function initialiseSettings() {
  settingsVersion.textContent = `v${APP_VERSION}`;
  settingsOfficeKey.value = localStorage.getItem(OFFICE_KEY_STORAGE) || '';
  const savedTheme = localStorage.getItem(OFFICE_THEME_STORAGE) || 'classic';
  applyOfficeTheme(savedTheme, { persist: false });
}

function saveOfficeKeyFromSettings() {
  const key = settingsOfficeKey.value.trim();
  if (key) {
    localStorage.setItem(OFFICE_KEY_STORAGE, key);
    setOfficeNavStatus('Office key saved.');
    loadTerminalQr();
    return;
  }

  clearOfficeKeyFromSettings();
}

function clearOfficeKeyFromSettings() {
  settingsOfficeKey.value = '';
  localStorage.removeItem(OFFICE_KEY_STORAGE);
  setOfficeNavStatus('Office key cleared.');
  loadTerminalQr();
}

function applyOfficeTheme(theme, options = {}) {
  const safeTheme = ['classic', 'sky', 'graphite'].includes(theme) ? theme : 'classic';
  document.body.dataset.officeTheme = safeTheme;
  themeInputs.forEach((input) => {
    input.checked = input.value === safeTheme;
  });

  if (options.persist) {
    localStorage.setItem(OFFICE_THEME_STORAGE, safeTheme);
    setOfficeNavStatus(`Theme set to ${safeTheme}.`);
  }
}

async function handleEmployeeRegister(event) {
  event.preventDefault();
  const formData = new FormData(employeeForm);
  const payload = {
    employeeId: formData.get('employeeId'),
    employeeName: formData.get('employeeName'),
    credentialId: formData.get('credentialId'),
    status: 'active'
  };

  setEmployeeBusy(true);
  setEmployeeMessage('');

  try {
    const { response, result } = await fetchOfficeJson('/api/employees', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(result.error || 'Registration failed.');
    }

    latestSnapshot.registeredEmployees = result.employees;
    renderEmployeeList();
    renderScannerSetup(result);
    employeeForm.reset();
    setEmployeeMessage(`${result.employee.employeeName} is registered for clocking.`, false);
  } catch (error) {
    setEmployeeMessage(error.message, true);
  } finally {
    setEmployeeBusy(false);
  }
}

async function handlePowerCredentialSubmit(event) {
  event.preventDefault();
  const formData = new FormData(powerCredentialForm);
  const role = formData.get('role');
  const payload = {
    employeeId: formData.get('employeeId'),
    employeeName: formData.get('employeeName'),
    credentialId: formData.get('credentialId'),
    role,
    status: 'active'
  };

  setPowerCredentialBusy(true);
  setPowerCredentialMessage('');

  try {
    const { response, result } = await fetchOfficeJson('/api/employees', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(result.error || 'Power credential registration failed.');
    }

    latestSnapshot.registeredEmployees = result.employees;
    renderEmployeeList();
    renderAdminTargetOptions();
    powerCredentialForm.reset();
    setPowerCredentialMessage(`${result.employee.employeeName} saved as ${formatRole(result.employee.role)}.`, false);
  } catch (error) {
    setPowerCredentialMessage(error.message, true);
  } finally {
    setPowerCredentialBusy(false);
  }
}

function renderScannerSetup(result) {
  scannerSetupPanel.classList.remove('hidden');
  scannerSetupLink.href = result.scannerSetupAppUrl || result.scannerSetupUrl;
  scannerSetupLink.textContent = `Open ${result.employee.employeeName}'s scanner app`;
  scannerSetupLink.title = result.isPublicScannerSetup
    ? 'Opens the installed scanner app; the HTTPS fallback link works in a browser.'
    : 'Local setup only. Set PUBLIC_BASE_URL for setup links that work on mobile data.';
  scannerSetupQr.replaceChildren(svgFromString(result.scannerSetupQrSvg));
}

async function handleGenerateSupervisorSetup() {
  setSupervisorSetupBusy(true);
  setSupervisorSetupMessage('');

  try {
    const { response, result } = await fetchOfficeJson('/api/supervisor/setup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({})
    });
    if (!response.ok) {
      throw new Error(result.error || 'Could not generate supervisor link.');
    }

    renderSupervisorSetupLink(result);
    setSupervisorSetupMessage('One-time supervisor link is ready.', false);
  } catch (error) {
    setSupervisorSetupMessage(error.message, true);
  } finally {
    setSupervisorSetupBusy(false);
  }
}

function renderSupervisorSetupLink(result) {
  const link = result.supervisorAppUrl || result.supervisorUrl || '';
  supervisorSetupLinkInput.value = link;
  supervisorCopyLinkButton.disabled = !link;
  supervisorOpenLink.href = link || '/supervisor';
  supervisorOpenLink.setAttribute('aria-disabled', link ? 'false' : 'true');
  supervisorSetupExpires.textContent = result.expiresAt
    ? `Expires ${formatTime(result.expiresAt)}`
    : 'No active link';
}

async function copySupervisorSetupLink() {
  const link = supervisorSetupLinkInput.value.trim();
  if (!link) {
    setSupervisorSetupMessage('Generate a supervisor link first.', true);
    return;
  }

  try {
    await navigator.clipboard.writeText(link);
    setSupervisorSetupMessage('Supervisor link copied.', false);
  } catch {
    supervisorSetupLinkInput.focus();
    supervisorSetupLinkInput.select();
    setSupervisorSetupMessage('Copy the selected supervisor link.', false);
  }
}

async function handleClockSubmit(event) {
  event.preventDefault();
  const formData = new FormData(form);
  const payload = {
    employeeId: formData.get('employeeId'),
    employeeName: formData.get('employeeName'),
    action: formData.get('action'),
    date: logDate.value,
    timeZone,
    source: 'terminal'
  };

  setBusy(true);
  setMessage('');

  try {
    const { response, result } = await fetchOfficeJson('/api/clock', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(result.error || 'Clocking failed.');
    }

    latestSnapshot = result.snapshot;
    renderSnapshot();
    setMessage(clockMessage(result.entry), false);
  } catch (error) {
    setMessage(error.message, true);
  } finally {
    setBusy(false);
  }
}

async function handleCredentialSubmit(event) {
  event.preventDefault();
  const formData = new FormData(credentialForm);
  const payload = {
    credentialId: formData.get('credentialId'),
    date: logDate.value,
    timeZone,
    source: 'terminal'
  };

  setCredentialBusy(true);
  setCredentialMessage('');

  try {
    const { response, result } = await fetchOfficeJson('/api/scan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(result.error || 'Credential clocking failed.');
    }

    latestSnapshot = result.snapshot;
    renderSnapshot();
    credentialForm.reset();
    setCredentialMessage(clockMessage(result.entry), false);
  } catch (error) {
    setCredentialMessage(error.message, true);
  } finally {
    setCredentialBusy(false);
  }
}

async function handleAdminClockSubmit(event) {
  event.preventDefault();
  const payload = adminActionPayload();

  setAdminBusy(true);
  setAdminMessage('');

  try {
    const { response, result } = await fetchOfficeJson('/api/admin/clock-next', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(result.error || 'Admin clocking failed.');
    }

    latestSnapshot = result.snapshot;
    renderSnapshot();
    setAdminMessage(clockMessage(result.entry), false);
  } catch (error) {
    setAdminMessage(error.message, true);
  } finally {
    setAdminBusy(false);
  }
}

async function handleAdminForceOut() {
  const payload = {
    ...adminActionPayload(),
    superCredentialId: adminPowerCredential.value.trim()
  };

  setAdminBusy(true);
  setAdminMessage('');

  try {
    const { response, result } = await fetchOfficeJson('/api/admin/force-clock-out', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(result.error || 'Emergency clock-out failed.');
    }

    latestSnapshot = result.snapshot;
    renderSnapshot();
    setAdminMessage(`Emergency clock-out recorded. ${clockMessage(result.entry)}`, false);
  } catch (error) {
    setAdminMessage(error.message, true);
  } finally {
    setAdminBusy(false);
  }
}

function adminActionPayload() {
  return {
    adminCredentialId: adminPowerCredential.value.trim(),
    targetEmployeeId: adminTargetEmployee.value,
    reason: document.querySelector('#admin-reason').value.trim(),
    date: logDate.value,
    timeZone
  };
}

async function refreshSnapshot() {
  setMessage('');
  try {
    const params = new URLSearchParams({ date: logDate.value, timeZone });
    const response = await fetch(`/api/snapshot?${params.toString()}`);
    const snapshot = await response.json();

    if (!response.ok) {
      throw new Error(snapshot.error || 'Could not load the central log.');
    }

    latestSnapshot = snapshot;
    renderSnapshot();
  } catch (error) {
    setMessage(error.message, true);
  }
}

async function loadTerminalQr() {
  try {
    const { response, result: terminal } = await fetchOfficeJson('/api/terminal');

    if (!response.ok) {
      throw new Error(terminal.error || 'Could not load phone scan code.');
    }

    mobileLink.href = terminal.mobileUrl;
    mobileLink.textContent = 'Employee scanner';
    terminalExpiry.textContent = `${terminal.ttlSeconds}s`;
    terminalQr.replaceChildren(svgFromString(terminal.qrSvg));
  } catch (error) {
    terminalQr.textContent = 'QR unavailable';
    mobileLink.href = '/mobile';
    mobileLink.textContent = 'Employee scanner';
    terminalExpiry.textContent = '--';
  }
}

async function fetchOfficeJson(url, options = {}) {
  let response = await fetch(url, withOfficeKey(options));
  let result = await parseJsonResponse(response);

  if (response.status === 403 && shouldAskForOfficeKey(result.error)) {
    const key = window.prompt('Enter the office terminal key for this hosted clocking system.');
    if (key?.trim()) {
      localStorage.setItem(OFFICE_KEY_STORAGE, key.trim());
      response = await fetch(url, withOfficeKey(options));
      result = await parseJsonResponse(response);
    }
  }

  return { response, result };
}

function withOfficeKey(options = {}) {
  const headers = new Headers(options.headers || {});
  const key = localStorage.getItem(OFFICE_KEY_STORAGE);
  if (key) {
    headers.set('x-office-terminal-key', key);
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
    return { error: text };
  }
}

function shouldAskForOfficeKey(message = '') {
  return /office terminal|clocking terminal|terminal clocking|supervisor|check point/i.test(message);
}

function renderSnapshot() {
  onDutyCount.textContent = latestSnapshot.totals.onDuty;
  registeredCount.textContent = `${latestSnapshot.registeredEmployees?.length || 0} TOTAL`;
  completedShifts.textContent = latestSnapshot.totals.completedShifts;
  hoursLogged.textContent = formatMinutes(latestSnapshot.totals.minutesWorked);
  renderActiveList();
  renderEmployeeList();
  renderAdminTargetOptions();
  renderLogTable();
  renderSupervisorDeviceActivity();
}

function svgFromString(svgText) {
  const template = document.createElement('template');
  template.innerHTML = svgText.trim();
  return template.content.firstElementChild;
}

function renderActiveList() {
  activeList.replaceChildren();

  if (!latestSnapshot.activeEmployees.length) {
    const empty = document.createElement('div');
    empty.className = 'w-full rounded-lg border border-dashed border-border-subtle bg-pistachio-light px-lg py-xl text-center text-body-md text-on-surface-variant';
    empty.textContent = 'No staff currently clocked in';
    activeList.append(empty);
    return;
  }

  for (const person of latestSnapshot.activeEmployees) {
    const item = document.createElement('div');
    item.className = 'flex-shrink-0 w-40 rounded-lg border border-primary/20 bg-pistachio-light p-md text-center';

    const avatar = document.createElement('div');
    avatar.className = 'mx-auto mb-sm grid h-12 w-12 place-items-center rounded-full border-2 border-primary bg-primary-fixed text-xs font-extrabold text-on-primary-fixed';
    avatar.textContent = initialsFor(person.employeeName);

    const name = document.createElement('div');
    name.className = 'truncate text-label-bold font-bold text-on-surface';
    name.textContent = person.employeeName;

    const time = document.createElement('div');
    time.className = 'mt-1 font-mono text-xs text-primary';
    time.textContent = `In: ${formatTime(person.clockedInAt)}`;

    item.append(avatar, name, time);
    activeList.append(item);
  }
}

function renderEmployeeList() {
  employeeList.replaceChildren();

  const employees = latestSnapshot.registeredEmployees || [];

  if (!employees.length) {
    const empty = document.createElement('div');
    empty.className = 'px-lg py-xl text-center text-body-md text-on-surface-variant';
    empty.textContent = 'No employees registered yet';
    employeeList.append(empty);
    return;
  }

  for (const employee of employees) {
    const item = document.createElement('div');
    item.className = 'grid grid-cols-[auto_1fr_auto] items-center gap-sm border-b border-border-subtle bg-white px-md py-sm transition-colors last:border-b-0 hover:bg-pistachio-light/50';

    const avatar = document.createElement('div');
    avatar.className = 'grid h-9 w-9 place-items-center rounded-full bg-secondary-fixed text-xs font-extrabold text-on-secondary-fixed';
    avatar.textContent = initialsFor(employee.employeeName);

    const detail = document.createElement('div');
    detail.className = 'min-w-0';

    const name = document.createElement('div');
    name.className = 'truncate text-body-md font-semibold text-on-surface';
    name.textContent = employee.employeeName;

    const id = document.createElement('div');
    id.className = 'mt-0.5 font-mono text-xs text-charcoal-muted';
    id.textContent = `${employee.employeeId} · ${employee.credentialId || 'No credential'}`;

    const statusBadge = document.createElement('div');
    const isClockedIn = latestSnapshot.activeEmployees.some(e => e.employeeId === employee.employeeId);
    statusBadge.className = `rounded-full px-sm py-xs text-[10px] font-extrabold uppercase ${isClockedIn ? 'bg-primary-fixed text-on-primary-fixed-variant' : 'bg-secondary-fixed text-on-secondary-container'}`;
    statusBadge.textContent = `${isClockedIn ? 'On Duty' : 'Off Duty'} · ${formatRole(employee.role)}`;

    detail.append(name, id, statusBadge);
    item.append(avatar, detail);
    employeeList.append(item);
  }
}

function renderAdminTargetOptions() {
  const selected = adminTargetEmployee.value;
  adminTargetEmployee.replaceChildren();

  const employees = latestSnapshot.registeredEmployees || [];
  if (!employees.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Register employees first';
    adminTargetEmployee.append(option);
    return;
  }

  for (const employee of employees) {
    const option = document.createElement('option');
    option.value = employee.employeeId;
    const isClockedIn = latestSnapshot.activeEmployees.some(e => e.employeeId === employee.employeeId);
    option.textContent = `${employee.employeeName} (${employee.employeeId}) - ${formatRole(employee.role)} - ${isClockedIn ? 'On duty' : 'Off duty'}`;
    adminTargetEmployee.append(option);
  }

  if (selected && employees.some((employee) => employee.employeeId === selected)) {
    adminTargetEmployee.value = selected;
  }
}

function renderLogTable() {
  logBody.replaceChildren();

  const shifts = buildShiftRows(latestSnapshot.entries || []);

  if (!shifts.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 8;
    cell.className = 'px-lg py-xl text-center text-body-md text-charcoal-muted';
    cell.textContent = 'No shifts for this date';
    row.append(cell);
    logBody.append(row);
    return;
  }

  for (const shift of shifts) {
    const row = document.createElement('tr');
    row.className = 'hover:bg-pistachio-light/50 transition-colors';

    row.append(
      tableCell(formatShortDate(shift.displayTimestamp), 'px-lg py-md font-mono text-body-md'),
      tableCell(shift.employeeName, 'px-lg py-md text-body-md font-semibold'),
      tableCell(shift.employeeId, 'px-lg py-md font-mono text-body-md text-charcoal-muted'),
      tableCell(shift.startedAt ? formatTime(shift.startedAt) : 'Earlier', 'px-lg py-md text-body-md'),
      shift.endedAt ? tableCell(formatTime(shift.endedAt), 'px-lg py-md text-body-md') : statusCell('ON DUTY', 'in'),
      tableCell(shift.endedAt ? formatMinutes(shift.totalMinutes) : formatElapsed(shift.startedAt), 'px-lg py-md text-body-md font-bold text-primary'),
      sourceCell(shift.source, shift.actor, shift.emergency),
      locationCell(shift.location)
    );
    logBody.append(row);
  }
}

function buildShiftRows(entries) {
  const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
  const pairedInIds = new Set();
  const rows = [];

  for (const entry of entries) {
    if (entry.action !== 'out') {
      continue;
    }

    const inEntry = entriesById.get(entry.pairedEntryId);
    if (entry.pairedEntryId) {
      pairedInIds.add(entry.pairedEntryId);
    }

    rows.push({
      displayTimestamp: inEntry?.timestamp || entry.timestamp,
      startedAt: inEntry?.timestamp || '',
      endedAt: entry.timestamp,
      employeeName: entry.employeeName,
      employeeId: entry.employeeId,
      totalMinutes: entry.shiftDurationMinutes,
      source: entry.source || inEntry?.source || 'terminal',
      location: entry.location || inEntry?.location || null,
      actor: entry.actor || inEntry?.actor || null,
      emergency: Boolean(entry.emergency || inEntry?.emergency)
    });
  }

  for (const entry of entries) {
    if (entry.action !== 'in' || pairedInIds.has(entry.id)) {
      continue;
    }

    rows.push({
      displayTimestamp: entry.timestamp,
      startedAt: entry.timestamp,
      endedAt: '',
      employeeName: entry.employeeName,
      employeeId: entry.employeeId,
      totalMinutes: 0,
      source: entry.source || 'terminal',
      location: entry.location || null,
      actor: entry.actor || null,
      emergency: Boolean(entry.emergency)
    });
  }

  return rows.sort((left, right) => {
    return new Date(right.displayTimestamp).getTime() - new Date(left.displayTimestamp).getTime();
  });
}

function renderSupervisorDeviceActivity() {
  supervisorDeviceActivity.replaceChildren();
  const entries = (latestSnapshot.entries || [])
    .filter((entry) => entry.source === 'supervisor')
    .map((entry) => ({ type: 'scan', timestamp: entry.timestamp, item: entry }));
  const flags = (latestSnapshot.flags || [])
    .filter((flag) => flag.source === 'supervisor')
    .map((flag) => ({ type: 'flag', timestamp: flag.timestamp, item: flag }));
  const activity = entries.concat(flags).sort((left, right) => {
    return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
  });

  supervisorActivityCount.textContent = `${activity.length} TODAY`;

  if (!activity.length) {
    const empty = document.createElement('div');
    empty.className = 'rounded-lg border border-dashed border-border-subtle bg-pistachio-light px-lg py-xl text-center text-body-md text-on-surface-variant';
    empty.textContent = 'No supervisor check point activity today';
    supervisorDeviceActivity.append(empty);
    return;
  }

  for (const event of activity.slice(0, 10)) {
    supervisorDeviceActivity.append(event.type === 'flag'
      ? supervisorFlagActivityItem(event.item)
      : supervisorScanActivityItem(event.item));
  }
}

function supervisorScanActivityItem(entry) {
  const item = document.createElement('article');
  item.className = 'grid grid-cols-[auto_1fr_auto] items-center gap-sm rounded-lg border border-border-subtle bg-pistachio-light p-sm';

  const badge = document.createElement('strong');
  badge.className = `grid h-10 w-10 place-items-center rounded-full text-xs font-extrabold ${entry.action === 'out' ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-primary-fixed text-on-primary-fixed-variant'}`;
  badge.textContent = entry.action.toUpperCase();

  const detail = document.createElement('div');
  detail.className = 'min-w-0';

  const title = document.createElement('div');
  title.className = 'truncate text-body-md font-extrabold text-on-surface';
  title.textContent = entry.employeeName;

  const meta = document.createElement('div');
  meta.className = 'mt-1 font-mono text-xs text-charcoal-muted';
  meta.textContent = `${entry.deviceLabel || 'Supervisor check point'} · ${formatTime(entry.timestamp)}`;

  detail.append(title, meta);
  item.append(badge, detail, activityLocationLink(entry.location));
  return item;
}

function supervisorFlagActivityItem(flag) {
  const item = document.createElement('article');
  item.className = 'grid grid-cols-[auto_1fr_auto] items-center gap-sm rounded-lg border border-border-subtle bg-white p-sm';

  const badge = document.createElement('strong');
  badge.className = 'grid h-10 w-10 place-items-center rounded-full bg-tertiary-fixed text-[10px] font-extrabold text-on-tertiary-fixed';
  badge.textContent = 'FLAG';

  const detail = document.createElement('div');
  detail.className = 'min-w-0';

  const title = document.createElement('div');
  title.className = 'truncate text-body-md font-extrabold text-on-surface';
  title.textContent = flag.employeeName;

  const meta = document.createElement('div');
  meta.className = 'mt-1 font-mono text-xs text-charcoal-muted';
  meta.textContent = `${flag.deviceLabel || 'Supervisor check point'} · ${formatTime(flag.timestamp)}`;

  const reason = document.createElement('div');
  reason.className = 'mt-1 truncate text-xs font-bold text-on-surface-variant';
  reason.textContent = flag.reason;

  detail.append(title, meta, reason);
  item.append(badge, detail, activityLocationLink(flag.location));
  return item;
}

function statusCell(label, action) {
  const cell = document.createElement('td');
  cell.className = 'px-lg py-md';
  const chip = document.createElement('span');
  chip.className = `inline-block rounded-full px-sm py-xs text-[10px] font-extrabold uppercase ${action === 'in' ? 'bg-primary-fixed text-on-primary-fixed-variant' : 'bg-tertiary-fixed text-on-tertiary-fixed'}`;
  chip.textContent = label;
  cell.append(chip);
  return cell;
}

function sourceCell(source, actor, emergency = false) {
  const cell = document.createElement('td');
  cell.className = 'px-lg py-md';
  const chip = document.createElement('span');
  chip.className = `inline-block rounded-full px-sm py-xs text-[10px] font-extrabold uppercase ${source === 'supervisor' || source === 'admin' || source === 'super-admin' ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-primary-fixed text-on-primary-fixed-variant'}`;
  chip.textContent = formatSource(source);
  if (actor?.employeeName) {
    chip.title = `${emergency ? 'Emergency by' : 'Action by'} ${actor.employeeName}`;
  }
  cell.append(chip);
  return cell;
}

function locationCell(location) {
  const cell = document.createElement('td');
  cell.className = 'px-lg py-md font-mono text-xs text-charcoal-muted';

  if (!location) {
    cell.textContent = '--';
    return cell;
  }

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    cell.textContent = '--';
    return cell;
  }

  const link = document.createElement('a');
  link.href = `https://www.google.com/maps?q=${latitude},${longitude}`;
  link.target = '_blank';
  link.rel = 'noopener';
  link.className = 'font-bold text-primary hover:underline';
  link.textContent = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  if (Number.isFinite(Number(location.accuracyMeters))) {
    link.title = `Accuracy ${Math.round(Number(location.accuracyMeters))}m`;
  }
  cell.append(link);
  return cell;
}

function activityLocationLink(location) {
  const container = document.createElement('div');
  container.className = 'min-w-[74px] text-right';

  const latitude = Number(location?.latitude);
  const longitude = Number(location?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    const empty = document.createElement('span');
    empty.className = 'font-mono text-xs text-charcoal-muted';
    empty.textContent = '--';
    container.append(empty);
    return container;
  }

  const link = document.createElement('a');
  link.href = `https://www.google.com/maps?q=${latitude},${longitude}`;
  link.target = '_blank';
  link.rel = 'noopener';
  link.className = 'inline-flex min-h-9 items-center rounded-lg border border-primary bg-white px-sm text-xs font-extrabold text-primary hover:bg-primary-fixed';
  link.textContent = 'Map';
  if (Number.isFinite(Number(location.accuracyMeters))) {
    link.title = `Accuracy ${Math.round(Number(location.accuracyMeters))}m`;
  }
  container.append(link);
  return container;
}

function tableCell(value, className) {
  const cell = document.createElement('td');
  cell.className = className;
  cell.textContent = value;
  return cell;
}

function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString([], {
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  });
  if(currentTime) currentTime.textContent = time;
  if(currentDate) currentDate.textContent = date;
  if(terminalDisplayTime) terminalDisplayTime.textContent = time;
  if(terminalDisplayDate) terminalDisplayDate.textContent = date;
}

function updateActionLabel() {
  const action = new FormData(form).get('action');
  submitLabel.textContent = action === 'out' ? 'Clock out' : 'Clock in';
}

function clockMessage(entry) {
  const verb = entry.action === 'in' ? 'clocked in' : 'clocked out';
  const suffix = entry.action === 'out' ? ` after ${formatMinutes(entry.shiftDurationMinutes)}` : '';
  return `${entry.employeeName} ${verb} at ${formatTime(entry.timestamp)}${suffix}.`;
}

function formatSource(source) {
  if (source === 'super-admin') {
    return 'Super';
  }
  if (source === 'admin') {
    return 'Admin';
  }
  if (source === 'supervisor') {
    return 'Supervisor';
  }
  if (source === 'mobile') {
    return 'Employee';
  }
  return 'Office';
}

function formatRole(role) {
  if (role === 'super') {
    return 'Super';
  }
  if (role === 'admin') {
    return 'Admin';
  }
  return 'Employee';
}

function setBusy(isBusy) {
  form.querySelector('button[type="submit"]').disabled = isBusy;
}

function setEmployeeBusy(isBusy) {
  employeeForm.querySelector('button[type="submit"]').disabled = isBusy;
}

function setCredentialBusy(isBusy) {
  credentialForm.querySelector('button[type="submit"]').disabled = isBusy;
}

function setSupervisorSetupBusy(isBusy) {
  supervisorGenerateLinkButton.disabled = isBusy;
}

function setAdminBusy(isBusy) {
  adminActionForm.querySelector('button[type="submit"]').disabled = isBusy;
  adminForceOutButton.disabled = isBusy;
}

function setPowerCredentialBusy(isBusy) {
  powerCredentialForm.querySelector('button[type="submit"]').disabled = isBusy;
}

function setMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle('text-rose', isError);
  message.classList.toggle('text-primary', !isError);
}

function setEmployeeMessage(text, isError = false) {
  employeeMessage.textContent = text;
  employeeMessage.classList.toggle('text-rose', isError);
  employeeMessage.classList.toggle('text-primary', !isError);
}

function setCredentialMessage(text, isError = false) {
  credentialMessage.textContent = text;
  credentialMessage.classList.toggle('text-rose', isError);
  credentialMessage.classList.toggle('text-primary', !isError);
}

function setSupervisorSetupMessage(text, isError = false) {
  supervisorSetupMessage.textContent = text;
  supervisorSetupMessage.classList.toggle('text-rose', isError);
  supervisorSetupMessage.classList.toggle('text-primary', !isError);
}

function setAdminMessage(text, isError = false) {
  adminMessage.textContent = text;
  adminMessage.classList.toggle('text-rose', isError);
  adminMessage.classList.toggle('text-primary', !isError);
}

function setPowerCredentialMessage(text, isError = false) {
  powerCredentialMessage.textContent = text;
  powerCredentialMessage.classList.toggle('text-rose', isError);
  powerCredentialMessage.classList.toggle('text-primary', !isError);
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatShortDate(timestamp) {
  return new Date(timestamp).toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  });
}

function formatMinutes(minutes = 0) {
  const safeMinutes = Math.max(0, Number(minutes) || 0);
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;
  return `${hours}h ${String(remainder).padStart(2, '0')}m`;
}

function formatElapsed(timestamp) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000));
  return formatMinutes(minutes);
}

function initialsFor(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return '--';
  }

  return parts.map((part) => part[0]).join('').toUpperCase();
}

function localDateValue(date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}
