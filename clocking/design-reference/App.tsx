import { useState, useEffect } from 'react';
import { getStoredData, saveStoredData, INITIAL_EMPLOYEES, INITIAL_LOGS } from './data';
import { Employee, AttendanceLog } from './types';
import DashboardView from './components/DashboardView';
import ScannerView from './components/ScannerView';
import LogsView from './components/LogsView';
import EmployeesView from './components/EmployeesView';
import {
  Bell,
  Settings,
  Sparkles,
  Smartphone,
  LayoutDashboard,
  History,
  Users,
  LogOut,
  Info,
  BadgeCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [totals, setTotals] = useState({ shifts: 142, hours: 1084.5 });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'logs' | 'employees' | 'scanner'>('dashboard');
  const [toast, setToast] = useState<string | null>(null);

  // Load initial local persistence states
  useEffect(() => {
    const data = getStoredData();
    setEmployees(data.employees);
    setLogs(data.logs);
    setTotals(data.totals);
  }, []);

  // Simple clean toast mechanism
  const triggerToast = (message: string) => {
    setToast(message);
    const id = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(id);
  };

  // Central employee scan state synchronizer
  const handleScanEmployee = (employeeId: string) => {
    const employeeIndex = employees.findIndex(e => e.id === employeeId);
    if (employeeIndex === -1) return;

    const employee = employees[employeeIndex];
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
    const timeLabelStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    let updatedEmployees = [...employees];
    let updatedLogs = [...logs];
    let updatedTotals = { ...totals };

    if (employee.status === 'ACTIVE') {
      // Clocking Out!
      updatedEmployees[employeeIndex] = {
        ...employee,
        status: 'COMPLETED',
        lastActionTime: timeStr,
        station: employee.station || 'Terminal 01',
        shiftsCompleted: employee.shiftsCompleted + 1,
        hoursLogged: employee.hoursLogged + 8.5
      };

      const newLog: AttendanceLog = {
        id: `LOG-${Date.now()}`,
        employeeId: employee.id,
        employeeName: employee.name,
        action: 'Clocked Out',
        time: timeStr,
        station: employee.station || 'Terminal 01',
        status: 'COMPLETED'
      };

      updatedLogs = [newLog, ...logs];
      updatedTotals.shifts += 1;
      updatedTotals.hours += 8.5;

      triggerToast(`Successful Out Check for ${employee.name}`);
    } else {
      // Clocking In!
      const isLate = now.getHours() >= 9 && now.getMinutes() > 0;
      const action = isLate ? 'Late Entry' : 'Clocked In';
      const status = isLate ? 'FLAGGED' : 'ACTIVE';

      updatedEmployees[employeeIndex] = {
        ...employee,
        status,
        lastActionTime: timeStr,
        station: 'Terminal 01',
        checkInTime: timeLabelStr
      };

      const newLog: AttendanceLog = {
        id: `LOG-${Date.now()}`,
        employeeId: employee.id,
        employeeName: employee.name,
        action,
        time: timeStr,
        station: 'Terminal 01',
        status
      };

      updatedLogs = [newLog, ...logs];
      triggerToast(`${employee.name} logged ${isLate ? 'LATE ENTRY' : 'IN'} at ${timeLabelStr}`);
    }

    setEmployees(updatedEmployees);
    setLogs(updatedLogs);
    setTotals(updatedTotals);
    saveStoredData(updatedEmployees, updatedLogs, updatedTotals);
  };

  // Add Registered Card Employee
  const handleAddEmployee = (name: string, email: string) => {
    const isDuplicate = employees.some(e => e.email.toLowerCase() === email.toLowerCase());
    if (isDuplicate) {
      triggerToast(`Error: ${email} is already registered.`);
      return;
    }

    const newEmp: Employee = {
      id: `EMP-${Math.floor(1000 + Math.random() * 9000)}-${name.substring(0, 2).toUpperCase()}`,
      name,
      email,
      status: 'INACTIVE',
      shiftsCompleted: 0,
      hoursLogged: 0.0,
    };

    const updated = [...employees, newEmp];
    setEmployees(updated);
    saveStoredData(updated, logs, totals);
    triggerToast(`Passed card registration key for ${name}`);
  };

  // Execute manual desk overrides
  const handleExecuteOverride = (employeeId: string, action: 'In' | 'Out', explicitName?: string) => {
    let employeeIndex = employees.findIndex(e => e.id === employeeId);
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
    const timeLabelStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    let updatedEmployees = [...employees];
    let updatedLogs = [...logs];
    let updatedTotals = { ...totals };

    if (employeeIndex !== -1) {
      const employee = employees[employeeIndex];
      if (action === 'Out') {
        updatedEmployees[employeeIndex] = {
          ...employee,
          status: 'COMPLETED',
          lastActionTime: timeStr,
          station: 'Override',
          shiftsCompleted: employee.shiftsCompleted + 1,
          hoursLogged: employee.hoursLogged + 8.0,
        };

        const newLog: AttendanceLog = {
          id: `LOG-${Date.now()}`,
          employeeId: employee.id,
          employeeName: employee.name,
          action: 'Manual Override (Out)',
          time: timeStr,
          station: 'Override',
          status: 'COMPLETED'
        };
        updatedLogs = [newLog, ...logs];
        updatedTotals.shifts += 1;
        updatedTotals.hours += 8.0;
      } else {
        updatedEmployees[employeeIndex] = {
          ...employee,
          status: 'ACTIVE',
          lastActionTime: timeStr,
          station: 'Override',
          checkInTime: timeLabelStr,
        };

        const newLog: AttendanceLog = {
          id: `LOG-${Date.now()}`,
          employeeId: employee.id,
          employeeName: employee.name,
          action: 'Manual Override (In)',
          time: timeStr,
          station: 'Override',
          status: 'ACTIVE'
        };
        updatedLogs = [newLog, ...logs];
      }
    } else {
      // Temp override reference
      const finalName = explicitName || 'Override Temp Reference';
      const newLog: AttendanceLog = {
        id: `LOG-${Date.now()}`,
        employeeId,
        employeeName: finalName,
        action: `Manual Override (${action})`,
        time: timeStr,
        station: 'Override',
        status: action === 'In' ? 'ACTIVE' : 'COMPLETED'
      };
      updatedLogs = [newLog, ...logs];
      if (action === 'Out') {
        updatedTotals.shifts += 1;
        updatedTotals.hours += 8.0;
      }
    }

    setEmployees(updatedEmployees);
    setLogs(updatedLogs);
    setTotals(updatedTotals);
    saveStoredData(updatedEmployees, updatedLogs, updatedTotals);
    triggerToast(`Executed override check for ${employeeId}`);
  };

  // Reset/Clear Log Database helper
  const handleClearLogs = () => {
    if (window.confirm("Are you sure you want to reset the logs back to standard template data?")) {
      setLogs(INITIAL_LOGS);
      setEmployees(INITIAL_EMPLOYEES);
      const standardTotals = { shifts: 142, hours: 1084.5 };
      setTotals(standardTotals);
      saveStoredData(INITIAL_EMPLOYEES, INITIAL_LOGS, standardTotals);
      triggerToast("Attendance system database cleared successfully!");
    }
  };

  return (
    <div className="min-h-screen bg-paper-warm text-on-surface select-none pb-12 flex flex-col justify-between">

      {/* Dynamic Slide Toast overlay alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            className="fixed bottom-6 right-6 bg-inverse-surface border border-outline/20 text-inverse-on-surface px-5 py-4 rounded-xl shadow-2xl z-[9999] flex items-center gap-3"
          >
            <div className="p-1 rounded-full bg-primary text-white">
              <BadgeCheck className="w-5 h-5" />
            </div>
            <div className="pr-2">
              <p className="text-xs font-extrabold tracking-tight uppercase leading-none text-ring">Notification</p>
              <p className="text-sm font-semibold mt-1 leading-normal">{toast}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Framework body */}
      <div>

        {/* Top Sticky Navigation bar */}
        <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-border-subtle">
          <div className="flex justify-between items-center w-full px-6 py-4 max-w-[1200px] mx-auto">

            {/* Title & responsive navigation elements */}
            <div className="flex items-center gap-6">
              <span className="text-2xl font-extrabold tracking-tight text-primary font-sans">
                Clocking
              </span>

              <div className="hidden lg:flex gap-6 ml-6 items-center">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`text-sm font-bold pb-1 transition-all flex items-center gap-1.5 cursor-pointer border-b-2 ${
                    activeTab === 'dashboard'
                      ? 'text-primary border-primary'
                      : 'text-on-surface-variant hover:text-primary border-transparent'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`text-sm font-bold pb-1 transition-all flex items-center gap-1.5 cursor-pointer border-b-2 ${
                    activeTab === 'logs'
                      ? 'text-primary border-primary'
                      : 'text-on-surface-variant hover:text-primary border-transparent'
                  }`}
                >
                  <History className="w-4 h-4" />
                  Logs
                </button>
                <button
                  onClick={() => setActiveTab('employees')}
                  className={`text-sm font-bold pb-1 transition-all flex items-center gap-1.5 cursor-pointer border-b-2 ${
                    activeTab === 'employees'
                      ? 'text-primary border-primary'
                      : 'text-on-surface-variant hover:text-primary border-transparent'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Employees
                </button>
                <button
                  onClick={() => setActiveTab('scanner')}
                  className={`text-sm font-bold pb-1 transition-all flex items-center gap-1.5 cursor-pointer border-b-2 ${
                    activeTab === 'scanner'
                      ? 'text-primary  border-primary'
                      : 'text-on-surface-variant hover:text-primary border-transparent text-charcoal-muted'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  Scanner Simulator
                </button>
              </div>
            </div>

            {/* Right meta controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => triggerToast(`Terminal node online with ${employees.length} keys`)}
                title="Status alert"
                className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-pistachio-light rounded-lg transition-all flex items-center justify-center cursor-pointer"
              >
                <Bell className="w-5 h-5" />
              </button>
              <button
                onClick={() => triggerToast("Terminal Node 01 configurations fully loaded")}
                title="System configurations"
                className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-pistachio-light rounded-lg transition-all flex items-center justify-center cursor-pointer"
              >
                <Settings className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 border-l border-border-subtle/70 pl-3">
                <img
                  alt="Administrator profile reference"
                  className="w-8 h-8 rounded-full border border-border-subtle object-cover shadow-sm"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDt7VK3sw2lVyYr4hFgioZf4PjHOqrTeCmfzWuGzUdErG9FGvUoHAGTZG0TO5mWd0UBMtOLIHQL0fDsk0uEDr27s_ckAQNPRBQ3eRmiVbDFwHlhh5woLDttZOs6axT5tgcNBKj4AQ6MmJGNCByqX2Y5x4Jp5SHAp8LUy0J6-VGKDlsy57ZsabN_6Q3swvWtZol79nxaVvKEoDaZmOYkB8lmxLT8thn_2NEJWk4RUuKevv2U_dDL3zYbU5fmSCUl8Ayn2y8HqG4E3d4"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

          </div>
        </nav>

        {/* Unified Application Container contents */}
        <main className="max-w-[1200px] mx-auto px-4 md:px-6 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              {activeTab === 'dashboard' && (
                <DashboardView
                  employees={employees}
                  logs={logs}
                  totals={totals}
                  onAddEmployee={handleAddEmployee}
                  onExecuteOverride={handleExecuteOverride}
                  onScanEmployee={handleScanEmployee}
                />
              )}

              {activeTab === 'logs' && (
                <LogsView
                  logs={logs}
                  employees={employees}
                  onClearLogs={handleClearLogs}
                />
              )}

              {activeTab === 'employees' && (
                <EmployeesView
                  employees={employees}
                  onScanEmployee={handleScanEmployee}
                />
              )}

              {activeTab === 'scanner' && (
                <div className="space-y-4">
                  <div className="max-w-2xl mx-auto text-center py-2">
                    <h2 className="text-xl font-extrabold text-on-surface">Employee Personal Pass Scanner Simulator</h2>
                    <p className="text-xs text-charcoal-muted mt-1 leading-relaxed">
                      This represents the active screen shown on staff smartphones. Pick any user below and trigger IN/OUT actions to test state sync with the master admin terminal logs.
                    </p>
                  </div>
                  <ScannerView
                    employees={employees}
                    logs={logs}
                    onScanEmployee={handleScanEmployee}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

      </div>

      {/* Persistent responsive footer shell */}
      <footer className="text-center py-6 text-[11px] text-charcoal-muted max-w-sm mx-auto border-t border-border-subtle/40 mt-12 bg-transparent space-y-1">
        <p className="font-semibold text-primary/80 uppercase tracking-widest leading-none font-mono">Terminal Node 01 Access Desk</p>
        <p className="font-medium">Company High-Trust Clocking &middot; Dynamic QR Portal</p>
      </footer>

      {/* Bottom Nav bar Mobile-oriented view */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-2 bg-white shadow-[0_-10px_20px_rgba(23,33,28,0.06)] z-50 rounded-t-2xl border-t border-border-subtle">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center p-2 flex-1 relative ${
            activeTab === 'dashboard' ? 'text-primary' : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined">dashboard</span>
          <span className="font-bold text-[10px]">Portal</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex flex-col items-center justify-center p-2 flex-1 relative ${
            activeTab === 'logs' ? 'text-primary' : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined">history</span>
          <span className="font-bold text-[10px]">Audit</span>
        </button>

        <button
          onClick={() => setActiveTab('employees')}
          className={`flex flex-col items-center justify-center p-2 flex-1 relative ${
            activeTab === 'employees' ? 'text-primary' : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined">person</span>
          <span className="font-bold text-[10px]">Staff</span>
        </button>

        <button
          onClick={() => setActiveTab('scanner')}
          className={`flex flex-col items-center justify-center p-2 flex-1 relative ${
            activeTab === 'scanner' ? 'text-primary' : 'text-on-surface-variant text-charcoal-muted'
          }`}
        >
          <span className="material-symbols-outlined">qr_code_2</span>
          <span className="font-bold text-[10px]">Mobile Scan</span>
        </button>
      </nav>

    </div>
  );
}
