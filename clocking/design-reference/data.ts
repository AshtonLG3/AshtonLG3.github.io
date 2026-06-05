import { Employee, AttendanceLog } from './types';

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'EMP-2941-S',
    name: 'Sarah Miller',
    email: 'sarah.miller@company.com',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAbJIjIRwFiJgUoitmbXYxYhP9ppKF5SsC4fieBgcoQsR9K0EmHCj1ZP9PVCK8s3EtzADZx8C5Q1TsjJqp_UIW3aDNjxTAHGz6YZhHttXdVf4t0YzYG7XXatIVnA4bIWUQJa1iTWIqz3w8OMSZg07-xQ7BlbifPaV70DMjr-wSHkvKdI9GKwsOmJOccSNJPGU4yiSt4ROcZGBZGJdCasgWmKIOmlkOGtEC3SIdxS4N0iqQGFd1Nw24NzXP5__IzOOLMlrCLCORhGWU',
    status: 'COMPLETED',
    lastActionTime: '17:04:12',
    station: 'Terminal 01',
    shiftsCompleted: 42,
    hoursLogged: 336.0,
  },
  {
    id: 'EMP-3048-W',
    name: 'James Wilson',
    email: 'james.wilson@company.com',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC5F0IwgkzJJRaOtcBGhCVnh7y3uAm4BavPjQWVW_sGXVLmv6FwjjBQU2WIVLsXk_i5LZgdyUDyH6UPKzDdOvh1a-sdIaACyc1i-bZHq9A8CM3iEKuaIlLtAuE1Ai6S1K_RtTM19_2cMpMfhrfrxNj_h60plLRDjxYz_8kaW14ueBFz9e330W5V9jgm7e7SVDQcr268mk5NidMlrGjg4InAu9xptYrc--VNDuvp3SZlWBSQk2oLKra8gHRozzXNfOsBa-TtW137_W0',
    status: 'ACTIVE',
    lastActionTime: '08:15:44',
    station: 'Mobile App',
    shiftsCompleted: 38,
    hoursLogged: 298.5,
    checkInTime: '08:15 AM'
  },
  {
    id: 'EMP-4105-R',
    name: 'Elena Rodriguez',
    email: 'elena.rodriguez@company.com',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA3JLJ5St7aHll7jH7B8sJlq57bD1izIXHurygcGwNJbQutAmZq4nF81o6-GU6zMSFVbB0tmt9SdDieuGix_e4HvEPjaInBRn3GZ9irmKhheGcagedPPU15qcGo1n9OvXWZkXsnlC5Sjqy3kmLmEctqvi_ZE4u4fzqvI-Hl8dYbyIrTyfafvFdJpro_mkTm8t_gJVmlpk5WjQISoXHqc8F4nD0Ns9mbhUurb7ZVbWDpMn0pMFRk6WaTXz21oQhptYHejD-aKmsBKbg',
    status: 'ACTIVE',
    lastActionTime: '08:30:00',
    station: 'Mobile App',
    shiftsCompleted: 31,
    hoursLogged: 242.0,
    checkInTime: '08:30 AM'
  },
  {
    id: 'EMP-8842-X',
    name: 'Marcus Thorne',
    email: 'marcus.thorne@company.com',
    status: 'ACTIVE',
    lastActionTime: '09:00:00',
    station: 'Mobile App',
    shiftsCompleted: 21,
    hoursLogged: 168.0,
    checkInTime: '09:00 AM'
  },
  {
    id: 'EMP-1102-R',
    name: 'Tom Reed',
    email: 'tom.reed@company.com',
    status: 'ACTIVE',
    lastActionTime: '08:12:01',
    station: 'Terminal 01',
    shiftsCompleted: 10,
    hoursLogged: 40.0,
    checkInTime: '08:12 AM'
  },
  {
    id: 'EMP-4021-L',
    name: 'Alice Low',
    email: 'alice.low@company.com',
    status: 'FLAGGED',
    lastActionTime: '09:10:00',
    station: 'Override',
    shiftsCompleted: 14,
    hoursLogged: 98.0,
    checkInTime: '09:10 AM'
  }
];

export const INITIAL_LOGS: AttendanceLog[] = [
  {
    id: 'LOG-101',
    employeeId: 'EMP-2941-S',
    employeeName: 'Sarah Miller',
    action: 'Clocked Out',
    time: '17:04:12',
    station: 'Terminal 01',
    status: 'COMPLETED'
  },
  {
    id: 'LOG-102',
    employeeId: 'EMP-3048-W',
    employeeName: 'James Wilson',
    action: 'Clocked In',
    time: '08:15:44',
    station: 'Mobile App',
    status: 'ACTIVE'
  },
  {
    id: 'LOG-103',
    employeeId: 'EMP-1102-R',
    employeeName: 'Tom Reed',
    action: 'Clocked In',
    time: '08:12:01',
    station: 'Terminal 01',
    status: 'ACTIVE'
  },
  {
    id: 'LOG-104',
    employeeId: 'EMP-4021-L',
    employeeName: 'Alice Low',
    action: 'Late Entry',
    time: '09:10:00',
    station: 'Override',
    status: 'FLAGGED'
  }
];

export function getStoredData() {
  const employees = localStorage.getItem('clocking_employees_db');
  const logs = localStorage.getItem('clocking_logs_db');
  const totals = localStorage.getItem('clocking_totals_db');

  return {
    employees: employees ? JSON.parse(employees) : INITIAL_EMPLOYEES,
    logs: logs ? JSON.parse(logs) : INITIAL_LOGS,
    totals: totals ? JSON.parse(totals) : { shifts: 142, hours: 1084.5 }
  };
}

export function saveStoredData(employees: Employee[], logs: AttendanceLog[], totals: { shifts: number; hours: number }) {
  localStorage.setItem('clocking_employees_db', JSON.stringify(employees));
  localStorage.setItem('clocking_logs_db', JSON.stringify(logs));
  localStorage.setItem('clocking_totals_db', JSON.stringify(totals));
}
