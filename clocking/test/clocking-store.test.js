const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { ClockingStore, getDateInZone } = require('../lib/clockingStore');

async function createStore() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'clocking-store-'));
  let id = 0;
  const store = new ClockingStore(path.join(dir, 'clock-log.json'), {
    now: () => new Date('2026-05-24T06:00:00.000Z'),
    idFactory: () => `entry-${++id}`
  });
  return { dir, store };
}

async function registerThandi(store, credentialId = 'card:001') {
  return store.registerEmployee({
    credentialId,
    employeeId: 'emp-001',
    employeeName: 'Thandi Nkosi',
    timestamp: '2026-05-24T05:50:00.000Z'
  });
}

async function registerAdmin(store, role = 'admin', credentialId = 'admin:001') {
  return store.registerEmployee({
    credentialId,
    employeeId: `${role}-001`,
    employeeName: role === 'super' ? 'Super Admin' : 'Admin User',
    role,
    timestamp: '2026-05-24T05:45:00.000Z'
  });
}

test('office registration creates an approved employee credential', async () => {
  const { store } = await createStore();

  const employee = await registerThandi(store);
  const employees = await store.getEmployees();

  assert.equal(employee.employeeId, 'EMP-001');
  assert.equal(employee.credentialId, 'CARD:001');
  assert.equal(employee.status, 'active');
  assert.equal(employees.length, 1);
});

test('clock-in is rejected when the employee has not been registered by the office', async () => {
  const { store } = await createStore();

  await assert.rejects(
    () =>
      store.clock({
        employeeId: 'emp-001',
        employeeName: 'Thandi Nkosi',
        action: 'in',
        timestamp: '2026-05-24T06:00:00.000Z'
      }),
    { statusCode: 403 }
  );
});

test('clock-in creates an active employee and central log entry', async () => {
  const { store } = await createStore();
  await registerThandi(store);

  const entry = await store.clock({
    employeeId: 'emp-001',
    employeeName: 'Thandi Nkosi',
    action: 'in',
    timestamp: '2026-05-24T06:00:00.000Z'
  });
  const snapshot = await store.getSnapshot({ date: '2026-05-24', timeZone: 'Africa/Johannesburg' });

  assert.equal(entry.id, 'entry-1');
  assert.equal(entry.employeeId, 'EMP-001');
  assert.equal(snapshot.activeEmployees.length, 1);
  assert.equal(snapshot.entries.length, 1);
  assert.equal(snapshot.registeredEmployees.length, 1);
  assert.equal(snapshot.totals.onDuty, 1);
});

test('duplicate clock-in is rejected while a shift is active', async () => {
  const { store } = await createStore();
  await registerThandi(store);

  await store.clock({
    employeeId: 'emp-001',
    employeeName: 'Thandi Nkosi',
    action: 'in',
    timestamp: '2026-05-24T06:00:00.000Z'
  });

  await assert.rejects(
    () =>
      store.clock({
        employeeId: 'EMP-001',
        employeeName: 'Thandi Nkosi',
        action: 'in',
        timestamp: '2026-05-24T06:15:00.000Z'
      }),
    { statusCode: 409 }
  );
});

test('clock-out closes the active shift and records duration', async () => {
  const { store } = await createStore();
  await registerThandi(store);

  await store.clock({
    employeeId: 'emp-001',
    employeeName: 'Thandi Nkosi',
    action: 'in',
    timestamp: '2026-05-24T06:00:00.000Z'
  });
  const out = await store.clock({
    employeeId: 'EMP-001',
    employeeName: 'Thandi Nkosi',
    action: 'out',
    timestamp: '2026-05-24T14:30:00.000Z'
  });
  const snapshot = await store.getSnapshot({ date: '2026-05-24', timeZone: 'Africa/Johannesburg' });

  assert.equal(out.pairedEntryId, 'entry-1');
  assert.equal(out.shiftDurationMinutes, 510);
  assert.equal(snapshot.activeEmployees.length, 0);
  assert.equal(snapshot.totals.completedShifts, 1);
  assert.equal(snapshot.totals.minutesWorked, 510);
});

test('clock-out without an active shift is rejected', async () => {
  const { store } = await createStore();
  await registerThandi(store);

  await assert.rejects(
    () =>
      store.clock({
        employeeId: 'emp-001',
        employeeName: 'Thandi Nkosi',
        action: 'out',
        timestamp: '2026-05-24T14:30:00.000Z'
      }),
    { statusCode: 409 }
  );
});

test('unknown credential scan is rejected until the office registers it', async () => {
  const { store } = await createStore();

  await assert.rejects(
    () =>
      store.clock({
        credentialId: 'card:001',
        employeeId: 'emp-001',
        employeeName: 'Thandi Nkosi',
        action: 'in',
        timestamp: '2026-05-24T06:00:00.000Z'
      }),
    { statusCode: 403 }
  );
});

test('office-approved credential can clock without re-entering employee details', async () => {
  const { store } = await createStore();
  await registerThandi(store);

  await store.clock({
    credentialId: 'card:001',
    employeeId: 'emp-001',
    employeeName: 'Thandi Nkosi',
    action: 'in',
    timestamp: '2026-05-24T06:00:00.000Z'
  });
  const out = await store.clock({
    credentialId: 'CARD:001',
    action: 'out',
    timestamp: '2026-05-24T14:00:00.000Z'
  });

  assert.equal(out.employeeId, 'EMP-001');
  assert.equal(out.employeeName, 'Thandi Nkosi');
  assert.equal(out.shiftDurationMinutes, 480);
});

test('scanner scan automatically chooses the next central-ledger action', async () => {
  const { store } = await createStore();
  await registerThandi(store);

  const firstScan = await store.clockNext({
    credentialId: 'card:001',
    timestamp: '2026-05-24T06:00:00.000Z'
  });
  const firstStatus = await store.getCredentialStatus('CARD:001');
  const secondScan = await store.clockNext({
    credentialId: 'CARD:001',
    timestamp: '2026-05-24T14:00:00.000Z'
  });
  const secondStatus = await store.getCredentialStatus('card:001');

  assert.equal(firstScan.action, 'in');
  assert.equal(firstStatus.nextAction, 'out');
  assert.equal(firstStatus.isClockedIn, true);
  assert.equal(secondScan.action, 'out');
  assert.equal(secondScan.shiftDurationMinutes, 480);
  assert.equal(secondStatus.nextAction, 'in');
  assert.equal(secondStatus.isClockedIn, false);
});

test('supervisor terminal scan records source and GPS location', async () => {
  const { store } = await createStore();
  await registerThandi(store);

  const entry = await store.clockNext({
    credentialId: 'card:001',
    source: 'supervisor',
    deviceLabel: 'Gate supervisor phone',
    timestamp: '2026-05-24T06:00:00.000Z',
    location: {
      latitude: -26.2041028,
      longitude: 28.0473051,
      accuracyMeters: 11.2,
      capturedAt: '2026-05-24T05:59:40.000Z'
    }
  });

  assert.equal(entry.source, 'supervisor');
  assert.equal(entry.deviceLabel, 'Gate supervisor phone');
  assert.deepEqual(entry.location, {
    latitude: -26.204103,
    longitude: 28.047305,
    capturedAt: '2026-05-24T05:59:40.000Z',
    accuracyMeters: 11
  });
});

test('supervisor terminal scan is rejected without fresh GPS location', async () => {
  const { store } = await createStore();
  await registerThandi(store);

  await assert.rejects(
    () =>
      store.clockNext({
        credentialId: 'card:001',
        source: 'supervisor',
        timestamp: '2026-05-24T06:00:00.000Z'
      }),
    /GPS location/
  );

  await assert.rejects(
    () =>
      store.clockNext({
        credentialId: 'card:001',
        source: 'supervisor',
        timestamp: '2026-05-24T06:00:00.000Z',
        location: {
          latitude: -26.2041028,
          longitude: 28.0473051,
          capturedAt: '2026-05-24T05:00:00.000Z'
        }
      }),
    /stale/
  );
});

test('supervisor app can flag an employee with GPS location', async () => {
  const { store } = await createStore();
  await registerThandi(store);

  const flag = await store.flagEmployee({
    targetEmployeeId: 'emp-001',
    reason: 'Needs office review',
    deviceLabel: 'Gate phone',
    timestamp: '2026-05-24T06:00:00.000Z',
    location: {
      latitude: -26.2041028,
      longitude: 28.0473051,
      accuracyMeters: 8,
      capturedAt: '2026-05-24T05:59:45.000Z'
    }
  });
  const snapshot = await store.getSnapshot({ date: '2026-05-24', timeZone: 'Africa/Johannesburg' });

  assert.equal(flag.employeeId, 'EMP-001');
  assert.equal(flag.source, 'supervisor');
  assert.equal(flag.reason, 'Needs office review');
  assert.equal(flag.deviceLabel, 'Gate phone');
  assert.equal(snapshot.flags.length, 1);
  assert.equal(snapshot.flags[0].id, flag.id);
});

test('supervisor setup link activates one session and cannot be reused', async () => {
  const { store } = await createStore();

  const setup = await store.createSupervisorSetupToken({ deviceLabel: 'Gate phone' });
  const session = await store.activateSupervisorSetupToken(setup.token, { deviceLabel: 'Gate phone' });

  assert.ok(setup.token);
  assert.ok(session.sessionToken);
  assert.equal(await store.isSupervisorSessionActive(session.sessionToken), true);
  assert.equal(await store.isSupervisorSessionActive('not-a-session'), false);

  await assert.rejects(
    () => store.activateSupervisorSetupToken(setup.token, { deviceLabel: 'Gate phone' }),
    { statusCode: 403 }
  );
});

test('admin credential can automatically clock another regular employee in and out', async () => {
  const { store } = await createStore();
  await registerThandi(store);
  await registerAdmin(store);

  const first = await store.adminClockNext({
    adminCredentialId: 'admin:001',
    targetEmployeeId: 'emp-001',
    timestamp: '2026-05-24T06:00:00.000Z',
    reason: 'Gate support'
  });
  const second = await store.adminClockNext({
    adminCredentialId: 'admin:001',
    targetEmployeeId: 'emp-001',
    timestamp: '2026-05-24T14:00:00.000Z'
  });

  assert.equal(first.action, 'in');
  assert.equal(first.source, 'admin');
  assert.equal(first.actor.employeeId, 'ADMIN-001');
  assert.equal(first.reason, 'Gate support');
  assert.equal(second.action, 'out');
  assert.equal(second.shiftDurationMinutes, 480);
});

test('admin credential cannot clock an admin target, but super credential can force clock them out', async () => {
  const { store } = await createStore();
  await registerAdmin(store, 'admin', 'admin:001');
  await registerAdmin(store, 'super', 'super:001');

  await store.clockNext({
    credentialId: 'admin:001',
    timestamp: '2026-05-24T06:00:00.000Z'
  });

  await assert.rejects(
    () =>
      store.adminClockNext({
        adminCredentialId: 'admin:001',
        targetEmployeeId: 'admin-001',
        timestamp: '2026-05-24T06:10:00.000Z'
      }),
    /Super power/
  );

  const forced = await store.superForceClockOut({
    superCredentialId: 'super:001',
    targetEmployeeId: 'admin-001',
    timestamp: '2026-05-24T06:15:00.000Z'
  });

  assert.equal(forced.action, 'out');
  assert.equal(forced.source, 'super-admin');
  assert.equal(forced.emergency, true);
  assert.equal(forced.actor.employeeId, 'SUPER-001');
});

test('issued scanner activation can correct the employee name once synced with office', async () => {
  const { store } = await createStore();
  await registerThandi(store);

  const employee = await store.activateScanner({
    employeeId: 'emp-001',
    employeeName: 'Thandi N.',
    credentialId: 'card:001',
    timestamp: '2026-05-24T05:55:00.000Z'
  });
  const status = await store.getCredentialStatus('CARD:001');

  assert.equal(employee.employeeName, 'Thandi N.');
  assert.equal(status.employeeName, 'Thandi N.');
  assert.equal(status.nextAction, 'in');
});

test('date filtering uses the requested time zone', () => {
  assert.equal(getDateInZone('2026-05-23T22:30:00.000Z', 'Africa/Johannesburg'), '2026-05-24');
});
