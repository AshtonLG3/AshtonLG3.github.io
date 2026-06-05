export interface Employee {
  id: string; // e.g., "EMP-8842-X"
  name: string;
  email: string;
  avatarUrl?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'FLAGGED' | 'INACTIVE';
  lastActionTime?: string;
  station?: string;
  shiftsCompleted: number;
  hoursLogged: number;
  checkInTime?: string; // timestamp or duration
}

export interface AttendanceLog {
  id: string;
  employeeId: string;
  employeeName: string;
  action: 'Clocked In' | 'Clocked Out' | 'Late Entry' | 'Manual Override' | 'Flagged' | string;
  time: string;
  station: string;
  status: 'ACTIVE' | 'COMPLETED' | 'FLAGGED';
}
