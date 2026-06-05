import { useState, useEffect } from 'react';
import { Employee, AttendanceLog } from '../types';
import {
  Badge,
  ChevronRight,
  LogIn,
  LogOut,
  Smartphone,
  User,
  QrCode,
  History,
  BadgeAlert,
  HelpCircle,
  Clock,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ScannerViewProps {
  employees: Employee[];
  logs: AttendanceLog[];
  onScanEmployee: (employeeId: string) => void;
}

export default function ScannerView({
  employees,
  logs,
  onScanEmployee
}: ScannerViewProps) {
  // Select active scanning agent
  const [activeEmployeeId, setActiveEmployeeId] = useState('EMP-8842-X'); // Default to Marcus Thorne
  const [activeTab, setActiveTab] = useState<'scan' | 'history' | 'profile'>('scan');

  // Quick notifications internal to the scanner mockup
  const [notification, setNotification] = useState<string | null>(null);

  // Retrieve active employee details
  const activeEmployee = employees.find(e => e.id === activeEmployeeId) || employees[0];

  // Auto notification clear
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Handle Scan action in the mockup
  const handleStateExecute = () => {
    onScanEmployee(activeEmployee.id);
    const text = activeEmployee.status === 'ACTIVE' ? 'CLOCKED OUT' : 'CLOCKED IN';
    setNotification(`${activeEmployee.name} has successfully ${text}!`);
  };

  // Filter logs for the active employee
  const employeeLogs = logs.filter(log => log.employeeId === activeEmployee.id);

  return (
    <div className="flex flex-col items-center justify-center py-4">

      {/* Selector to change active employee in simulator */}
      <div className="mb-6 w-full max-w-sm bg-white p-4 rounded-xl custom-shadow border border-border-subtle text-center">
        <label className="block text-xs font-bold text-on-surface-variant mb-2">
          Simulator Tool: Act as Employee
        </label>
        <select
          value={activeEmployeeId}
          onChange={(e) => setActiveEmployeeId(e.target.value)}
          className="w-full bg-pistachio-light border border-outline-variant focus:border-primary text-xs rounded-xl px-3 py-1.5 font-semibold text-on-surface"
        >
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>
              {emp.name} ({emp.status === 'ACTIVE' ? 'Clocked In' : 'Clocked Out'})
            </option>
          ))}
        </select>
      </div>

      {/* Styled Smartphone Mockup Frame */}
      <div className="relative w-full max-w-[340px] h-[670px] bg-inverse-surface rounded-[40px] p-2.5 shadow-2xl border-4 border-outline/30 overflow-hidden flex flex-col justify-between">

        {/* Device Top Speaker Notch Detail */}
        <div className="absolute top-0 inset-x-0 flex justify-center z-50">
          <div className="w-32 h-5 bg-black rounded-b-2xl flex items-center justify-center">
            <div className="w-12 h-1 bg-zinc-800 rounded-full"></div>
          </div>
        </div>

        {/* Dynamic Display Canvas */}
        <div className="flex-1 bg-paper-warm rounded-[32px] overflow-hidden flex flex-col justify-between relative pt-8 pb-16">

          {/* Internal notification overlay */}
          <AnimatePresence>
            {notification && (
              <motion.div
                initial={{ opacity: 0, y: -40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -40 }}
                className="absolute inset-x-4 top-10 bg-primary-container text-on-primary-container text-xs font-bold p-3 rounded-xl shadow-lg z-50 text-center flex items-center justify-center gap-1.5"
              >
                <span className="inline-block w-2-h-2 rounded-full bg-green-300 animate-ping"></span>
                {notification}
              </motion.div>
            )}
          </AnimatePresence>

          {activeTab === 'scan' && (
            <div className="flex-1 flex flex-col items-center justify-between px-4 py-3">
              {/* Profile card details header */}
              <header className="w-full text-center space-y-1">
                <p className="font-sans text-[10px] font-extrabold text-primary tracking-widest uppercase">Current User</p>
                <h1 className="text-xl font-extrabold tracking-tight text-on-background">{activeEmployee ? activeEmployee.name : 'Unknown User'}</h1>

                <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-container rounded-lg border border-border-subtle shadow-sm">
                  <span className="material-symbols-outlined text-xs text-charcoal-muted">badge</span>
                  <span className="font-mono text-xs font-medium text-charcoal-muted uppercase">{activeEmployee ? activeEmployee.id : 'N/A'}</span>
                </div>
              </header>

              {/* High-Tech Viewfinder scan chamber */}
              <main className="relative w-52 h-52 flex flex-col items-center justify-center mt-2">
                {/* Viewfinder outer bracket overlays */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
                </div>

                {/* Cam image window container */}
                <div className="w-[90%] h-[90%] rounded-lg overflow-hidden relative shadow-lg bg-black flex items-center justify-center border border-border-subtle/50">
                  <img
                    alt="Simulated glass lens viewport"
                    className="absolute inset-0 w-full h-full object-cover opacity-60 grayscale scale-105"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCh8pjFJkfXzUqQfJXdDz4IR3s4e-wxgxsAnej7afIxtTIZz8HmUkdauDkRXgLVQsHgrVlyptwMkjpLEdlrs5y5D6jq-GaCv-2rPLyAK-TRxMc4BJyaGNM3RGsgL9KuYxEuKKLM7wJnzWp1CEybwlInVyAu3lxdO1FFl2OAl1nBiQLuuGar2TrqtZE9qa3TnQk1fOd64Og7VuWlYkdStF3BZKoWrtCjeXemE2rVU8WeWPqDOh5nJB1Q7pU1InsPZwA_T3lOLz0-t_A"
                  />

                  {/* Linear animated scan beam line */}
                  <div className="absolute inset-0 w-full scanner-line-animation opacity-25 pointer-events-none"></div>

                  {/* QR Core frame graphic overlay in center */}
                  <div className="z-10 w-32 h-32 border border-white/25 rounded-xl flex items-center justify-center bg-white/5 backdrop-blur-sm">
                    <span className="material-symbols-outlined text-white/55 text-3xl">qr_code_scanner</span>
                  </div>
                </div>
              </main>

              {/* State execution button trigger block */}
              <section className="w-full flex flex-col items-center gap-2 mt-2">
                <p className="text-[10px] font-bold text-on-surface-variant tracking-wider uppercase">Next Office Action</p>

                <button
                  onClick={handleStateExecute}
                  className="w-full p-4 rounded-2xl bg-white border border-border-subtle shadow-[0_4px_16px_rgba(23,33,28,0.05)] hover:shadow-md transition-all duration-300 active:scale-95 group overflow-hidden text-center cursor-pointer"
                >
                  {activeEmployee.status === 'ACTIVE' ? (
                    <div className="flex flex-col items-center justify-center gap-1">
                      <div className="w-12 h-12 bg-tertiary-container rounded-full flex items-center justify-center shadow-inner">
                        <LogOut className="w-5 h-5 text-on-tertiary-container" />
                      </div>
                      <span className="text-5xl font-extrabold text-tertiary tracking-tight mt-1">OUT</span>
                      <span className="text-[10px] text-on-surface-variant opacity-80 font-medium">Clocked in: {activeEmployee.checkInTime || '08:00 AM'}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1">
                      <div className="w-12 h-12 bg-primary-container rounded-full flex items-center justify-center shadow-inner">
                        <LogIn className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-5xl font-extrabold text-primary tracking-tight mt-1">IN</span>
                      <span className="text-[10px] text-on-surface-variant opacity-80 font-medium">Auto detect morning shift info</span>
                    </div>
                  )}
                </button>

                <p className="text-[10px] text-charcoal-muted leading-tight font-sans font-medium text-center px-2">
                  Scan the terminal QR to send the next office action instantly.
                </p>
              </section>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="flex-1 flex flex-col justify-start px-4 py-3 overflow-y-auto no-scrollbar">
              <header className="mb-4 text-center">
                <h2 className="text-sm font-extrabold text-on-background uppercase tracking-wider flex items-center justify-center gap-1">
                  <History className="w-4 h-4 text-primary" />
                  Your Scan History
                </h2>
                <p className="text-[10px] text-charcoal-muted">Past logged shifts for {activeEmployee.name}</p>
              </header>

              <div className="space-y-2 flex-grow overflow-y-auto max-h-[380px] no-scrollbar">
                {employeeLogs.length === 0 ? (
                  <div className="text-center py-10 bg-white/60 border border-dashed border-outline-variant/60 rounded-xl">
                    <p className="text-xs text-on-surface-variant">No logs associated to you yet.</p>
                  </div>
                ) : (
                  employeeLogs.map(log => (
                    <div key={log.id} className="p-3 bg-white rounded-xl border border-border-subtle flex items-center justify-between shadow-sm">
                      <div>
                        <span className="text-xs font-bold text-on-surface block">{log.action}</span>
                        <span className="text-[9px] font-medium text-charcoal-muted block">{log.station}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-xs font-bold text-on-surface block">{log.time}</span>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[8px] font-bold ${
                          log.status === 'COMPLETED' ? 'bg-secondary-fixed text-on-secondary-container' : 'bg-primary-fixed text-on-primary-fixed-variant'
                        }`}>{log.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="flex-1 flex flex-col justify-start px-4 py-3">
              <header className="mb-4 text-center">
                <h2 className="text-sm font-extrabold text-on-background uppercase tracking-wider">My Profile</h2>
                <p className="text-[10px] text-charcoal-muted">Employee Information Pass</p>
              </header>

              <div className="space-y-4 bg-white p-4 rounded-xl border border-border-subtle shadow-sm">
                <div className="flex items-center gap-3">
                  {activeEmployee.avatarUrl ? (
                    <img
                      alt={activeEmployee.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-primary"
                      src={activeEmployee.avatarUrl}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-secondary-fixed text-on-secondary-fixed rounded-full flex items-center justify-center font-bold font-sans">
                      {activeEmployee.name.split(' ').map(n=>n[0]).join('')}
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-on-surface leading-tight">{activeEmployee.name}</h3>
                    <p className="text-[10px] text-charcoal-muted font-mono">{activeEmployee.id}</p>
                  </div>
                </div>

                <div className="border-t border-border-subtle/60 pt-3 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-charcoal-muted font-medium flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-primary" />
                      Email:
                    </span>
                    <span className="font-semibold text-on-surface truncate max-w-[140px]" title={activeEmployee.email}>
                      {activeEmployee.email}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-charcoal-muted font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3 text-secondary" />
                      Hours Logged:
                    </span>
                    <span className="font-mono font-bold text-on-surface">{activeEmployee.hoursLogged}h</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-charcoal-muted font-medium flex items-center gap-1">
                      <User className="w-3 h-3 text-tertiary" />
                      Status:
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      activeEmployee.status === 'ACTIVE'
                        ? 'bg-primary-fixed text-on-primary-fixed-variant'
                        : 'bg-secondary-fixed text-on-secondary-container'
                    }`}>
                      {activeEmployee.status}
                    </span>
                  </div>
                </div>

                {/* Simulated QR Code Badge inside user profile */}
                <div className="flex flex-col items-center bg-pistachio-light p-3 rounded-xl border border-border-subtle/80 text-center">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Pass QR Code</p>
                  <div className="p-1 w-24 h-24 bg-white rounded border border-border-subtle flex items-center justify-center shadow-inner">
                    <span className="material-symbols-outlined text-[64px] text-on-surface/80">qr_code_2</span>
                  </div>
                  <span className="text-[8px] font-mono text-charcoal-muted mt-1 uppercase">Valid card for {activeEmployee.id}</span>
                </div>
              </div>
            </div>
          )}

          {/* Styled bottom navigation items inside mock viewport */}
          <nav className="absolute bottom-0 left-0 w-full flex justify-around items-center px-2 pb-5 pt-2 bg-white shadow-[0_-5px_15px_rgba(23,33,28,0.04)] rounded-t-2xl border-t border-border-subtle">
            <button
              onClick={() => setActiveTab('scan')}
              className={`flex flex-col items-center justify-center py-1 flex-1 relative ${
                activeTab === 'scan' ? 'text-primary' : 'text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: `'FILL' ${activeTab === 'scan' ? '1' : '0'}` }}>
                qr_code_2
              </span>
              <span className="font-bold text-[9px]">Scan</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex flex-col items-center justify-center py-1 flex-1 relative ${
                activeTab === 'history' ? 'text-primary' : 'text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: `'FILL' ${activeTab === 'history' ? '1' : '0'}` }}>
                history
              </span>
              <span className="font-bold text-[9px]">History</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center justify-center py-1 flex-1 ${
                activeTab === 'profile' ? 'text-primary' : 'text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: `'FILL' ${activeTab === 'profile' ? '1' : '0'}` }}>
                person
              </span>
              <span className="font-bold text-[9px]">Profile</span>
            </button>
          </nav>

        </div>

        {/* Smartphone Home Screen Bar detail */}
        <div className="absolute bottom-1 inset-x-0 flex justify-center pb-2 pointer-events-none z-50">
          <div className="w-24 h-1 bg-zinc-800 rounded-full"></div>
        </div>

      </div>
    </div>
  );
}
