import { useState, useEffect, FormEvent } from 'react';
import { Employee, AttendanceLog } from '../types';
import {
  CheckCircle,
  Clock,
  QrCode,
  Search,
  SlidersHorizontal,
  Download,
  UserPlus,
  CornerDownRight,
  ArrowRightLeft,
  UserCheck,
  Zap,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardViewProps {
  employees: Employee[];
  logs: AttendanceLog[];
  totals: { shifts: number; hours: number };
  onAddEmployee: (name: string, email: string) => void;
  onExecuteOverride: (employeeId: string, action: 'In' | 'Out', explicitName?: string) => void;
  onScanEmployee: (employeeId: string) => void;
}

export default function DashboardView({
  employees,
  logs,
  totals,
  onAddEmployee,
  onExecuteOverride,
  onScanEmployee
}: DashboardViewProps) {
  // Manual override states
  const [overrideId, setOverrideId] = useState('');
  const [overrideAction, setOverrideAction] = useState<'In' | 'Out'>('In');
  const [overrideName, setOverrideName] = useState('');

  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');

  // Filter & search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'FLAGGED'>('ALL');
  const [visibleLogsCount, setVisibleLogsCount] = useState(5);

  // Scan simulation states
  const [selectedScanEmployeeId, setSelectedScanEmployeeId] = useState('');
  const [scanSuccessMessage, setScanSuccessMessage] = useState<string | null>(null);
  const [showQrOptions, setShowQrOptions] = useState(false);

  // Form errors / success indications
  const [overrideStatus, setOverrideStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [registerStatus, setRegisterStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Live timer for terminal node
  const [timeStr, setTimeStr] = useState('09:42:15');
  const [dateStr, setDateStr] = useState('Monday, Oct 23, 2023');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour12: false }));
      setDateStr(now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync manual name search if employee is found by ID
  useEffect(() => {
    if (overrideId.trim()) {
      const found = employees.find(
        e => e.id.toLowerCase().includes(overrideId.toLowerCase()) ||
             e.id.replace('EMP-', '').includes(overrideId)
      );
      if (found) {
        setOverrideName(found.name);
      }
    } else {
      setOverrideName('');
    }
  }, [overrideId, employees]);

  // Handle Manual Override
  const handleOverrideSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!overrideId.trim()) {
      setOverrideStatus({ type: 'error', message: 'Employee ID is required.' });
      return;
    }

    const employee = employees.find(
      e => e.id.toLowerCase() === overrideId.toLowerCase() ||
           e.id === `EMP-${overrideId}` ||
           e.name.toLowerCase().includes(overrideId.toLowerCase())
    );

    const checkId = employee ? employee.id : `EMP-${Math.floor(1000 + Math.random() * 9000)}-O`;
    const finalName = employee ? employee.name : (overrideName.trim() || 'Temporary Staff');

    onExecuteOverride(checkId, overrideAction, finalName);

    setOverrideStatus({
      type: 'success',
      message: `Successfully executed manual ${overrideAction === 'In' ? 'CLOCK IN' : 'CLOCK OUT'} for ${finalName}!`
    });
    setOverrideId('');
    setOverrideName('');

    setTimeout(() => setOverrideStatus(null), 4000);
  };

  // Handle Add Employee
  const handleAddSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) {
      setRegisterStatus({ type: 'error', message: 'Both fields are required.' });
      return;
    }
    onAddEmployee(regName, regEmail);
    setRegisterStatus({ type: 'success', message: `${regName} has been registered successfully!` });
    setRegName('');
    setRegEmail('');

    setTimeout(() => setRegisterStatus(null), 4000);
  };

  // Handle simulating a physical QR card scan
  const handleSimulatedScan = () => {
    if (!selectedScanEmployeeId) return;
    const emp = employees.find(e => e.id === selectedScanEmployeeId);
    if (!emp) return;

    onScanEmployee(emp.id);
    const nextStateStr = emp.status === 'ACTIVE' ? 'CLOCKED OUT' : 'CLOCKED IN';
    setScanSuccessMessage(`${emp.name} scanned QR successfully! Action: ${nextStateStr}`);

    setTimeout(() => {
      setScanSuccessMessage(null);
    }, 3500);
  };

  // On duty counts
  const activeEmployees = employees.filter(e => e.status === 'ACTIVE');
  const onDutyCount = activeEmployees.length;

  // Filter logs based on search query / status selection
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.station.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.action.toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && log.status === statusFilter;
  });

  // Mock CSV download file
  const triggerCsvDownload = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + ["STAFF MEMBER ID,STAFF NAME,ACTION,TIME,STATION,STATUS"]
        .concat(logs.map(l => `"${l.employeeId}","${l.employeeName}","${l.action}","${l.time}","${l.station}","${l.status}"`))
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Totals */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-secondary tracking-wider uppercase font-bold">Terminal Node 01 | Active Base</p>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Daily Overview</h1>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
          {/* Completed Shifts widget */}
          <div className="bg-surface-container-low p-4 rounded-xl custom-shadow flex items-center gap-3 border border-border-subtle/50">
            <span className="p-2.5 rounded-full bg-primary-fixed text-primary flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </span>
            <div>
              <p className="text-xs font-bold text-on-surface-variant font-sans tracking-tight">SFT Completed</p>
              <p className="text-xl font-extrabold text-on-surface leading-tight">{totals.shifts} shifts</p>
            </div>
          </div>

          {/* Hours Logged Widget */}
          <div className="bg-surface-container-low p-4 rounded-xl custom-shadow flex items-center gap-3 border border-border-subtle/50">
            <span className="p-2.5 rounded-full bg-tertiary-fixed text-tertiary flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </span>
            <div>
              <p className="text-xs font-bold text-on-surface-variant font-sans tracking-tight">Hours Logged</p>
              <p className="text-xl font-extrabold text-on-surface leading-tight">{totals.hours.toFixed(1)}h</p>
            </div>
          </div>
        </div>
      </header>

      {/* Grid Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Terminal Scanner & Custom Forms */}
        <div className="lg:col-span-5 space-y-6">

          {/* Check Point QR Emulator */}
          <section className="bg-white p-6 rounded-2xl custom-shadow border-t-4 border-primary relative overflow-hidden transition-all duration-300 hover:shadow-xl">
            {/* Ambient Background decoration */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>

            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-extrabold text-on-surface tracking-tight">Check Point QR Terminal</h2>
                <p className="text-xs text-on-surface-variant">Instant scan to clock user in or out</p>
              </div>
              <span className="bg-primary text-on-primary font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse"></span>
                Live Terminal
              </span>
            </div>

            {/* Simulated Live scanning window */}
            <div className="flex flex-col items-center py-6 bg-pistachio-light rounded-xl border border-border-subtle relative overflow-hidden">
              <div
                className="absolute inset-0 opacity-[0.06] pointer-events-none"
                style={{
                  backgroundImage: "radial-gradient(#005f43 1px, transparent 1px)",
                  backgroundSize: "16px 16px"
                }}
              ></div>

              {/* Viewfinder frame */}
              <div className="scanner-viewfinder w-56 h-56 flex items-center justify-center bg-white rounded-xl shadow-inner z-10 p-4 relative">
                <span className="absolute inset-0 pointer-events-none rounded-xl"></span>
                <div className="p-4 bg-white/40 leading-none h-full w-full flex items-center justify-center">
                  <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: [0.95, 1, 0.95] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                    className="relative"
                  >
                    {/* Visual QR code container */}
                    <img
                      alt="Terminal simulation code"
                      className="w-36 h-36 opacity-85 object-contain"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCn29LxUND948ZesWtEyr6xD3j2EWQKcysP_KZuDPmZBYHGC8r4ztLSxpzoPoAUHdhkrBJwJCaAJlt5MBVaurhzVpsQp893JP6h5KYVLdFUdLY_8HE4Gd1Z5M1CZW5k9-ciwS70Ud5Wiz6OdJshYpY5vQ05GYbU_PTwy7C3H-jBAjv4VysUvhQpsmGKEIXkMew2wXRa29_Rdt3QHrMXEHIotdDbacvkVbCa4KRtiR3risfcm6rhEZgfkc_woFtdV75smwfZJiEmoHw"
                    />

                    {/* High-tech scanner laser horizontal line overlay indicator */}
                    <div className="absolute top-0 inset-x-0 h-0.5 bg-primary/70 shadow-[0_0_10px_#005f43] scanner-line-animation"></div>
                  </motion.div>
                </div>
              </div>

              {/* Timestamp Indicator */}
              <div className="mt-4 text-center z-10">
                <p className="text-4xl font-extrabold tracking-tight text-primary font-mono leading-none" id="live-clock">
                  {timeStr}
                </p>
                <p className="text-xs font-bold text-on-surface-variant font-sans mt-1">
                  {dateStr}
                </p>
              </div>
            </div>

            {/* Interactive Quick Scan Card Connector (SIMULATE CARD SCAN!) */}
            <div className="mt-4 pt-4 border-t border-border-subtle/70">
              <button
                onClick={() => setShowQrOptions(!showQrOptions)}
                className="w-full py-2 px-3 border border-dashed border-primary/40 rounded-xl bg-surface-container-low text-primary text-xs font-bold hover:bg-surface-container transition-all flex items-center justify-center gap-2"
              >
                <QrCode className="w-4 h-4" />
                {showQrOptions ? 'Collapse QR Scanner Simulator' : 'Simulate Physical QR Pass Tap'}
              </button>

              <AnimatePresence>
                {showQrOptions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mt-3"
                  >
                    <div className="p-3 bg-surface rounded-xl border border-border-subtle space-y-3">
                      <p className="text-[11px] text-on-surface-variant font-medium leading-normal">
                        Select a staff member below to simulate placing their physical ID card in front of the scanner.
                      </p>

                      <div className="flex gap-2">
                        <select
                          value={selectedScanEmployeeId}
                          onChange={(e) => setSelectedScanEmployeeId(e.target.value)}
                          className="flex-1 rounded-xl border border-outline-variant bg-white px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="">-- Choose Employee to Scan --</option>
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} ({emp.status === 'ACTIVE' ? 'Active Shift' : 'Off Clock'})
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={handleSimulatedScan}
                          disabled={!selectedScanEmployeeId}
                          className="px-4 py-1.5 bg-primary hover:bg-primary-container text-white rounded-xl text-xs font-bold disabled:opacity-40 flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Scan Pass
                        </button>
                      </div>

                      {scanSuccessMessage && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-2 bg-primary-container text-on-primary-container rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1.5"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          {scanSuccessMessage}
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* Office Manual Override Form */}
          <section className="bg-white p-6 rounded-2xl custom-shadow relative">
            <h3 className="text-xs font-extrabold text-on-surface-variant uppercase tracking-wider mb-3 flex items-center gap-1">
              <span className="w-1 h-3.5 bg-status-rose rounded-full inline-block"></span>
              Manual Override Input
            </h3>

            <form onSubmit={handleOverrideSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Employee ID / Search</label>
                  <input
                    type="text"
                    value={overrideId}
                    onChange={(e) => setOverrideId(e.target.value)}
                    placeholder="E.g. 4021"
                    className="w-full bg-pistachio-light border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-xl px-3 py-2 text-xs font-medium text-on-surface"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Force Action</label>
                  <select
                    value={overrideAction}
                    onChange={(e) => setOverrideAction(e.target.value as 'In' | 'Out')}
                    className="w-full bg-pistachio-light border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-xl px-3 py-2 text-xs font-medium text-on-surface"
                  >
                    <option value="In">Clock In</option>
                    <option value="Out">Clock Out</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Staff Name Reference</label>
                <input
                  type="text"
                  value={overrideName}
                  onChange={(e) => setOverrideName(e.target.value)}
                  placeholder="Auto-resolves on valid ID, or type manually..."
                  className="w-full bg-pistachio-light border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-xl px-3 py-2 text-xs font-medium text-on-surface"
                />
              </div>

              {overrideStatus && (
                <div className={`p-2 rounded-lg text-xs leading-snug font-medium text-center ${
                  overrideStatus.type === 'success' ? 'bg-primary-container text-on-primary-container' : 'bg-error-container text-on-error-container'
                }`}>
                  {overrideStatus.message}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-inverse-surface text-on-primary font-bold py-2.5 rounded-xl hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm text-xs"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Execute Manual Override
              </button>
            </form>
          </section>

          {/* Register Employee Form */}
          <section className="bg-surface-container p-6 rounded-2xl border border-border-subtle relative">
            <div className="flex items-center gap-2 mb-3 text-primary">
              <UserPlus className="w-5 h-5" />
              <h3 className="text-sm font-extrabold tracking-tight">Register New Employee Card</h3>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Full Name (e.g. Alice Low)"
                className="w-full bg-white border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-xl px-3 py-2 text-xs font-medium text-on-surface"
              />
              <div className="flex gap-2">
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="Work Email (e.g. alice@company.com)"
                  className="w-full bg-white border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-xl px-3 py-2 text-xs font-medium text-on-surface"
                />
                <button
                  type="submit"
                  className="bg-primary-container hover:bg-primary text-on-primary-container hover:text-white px-5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  Create
                </button>
              </div>

              {registerStatus && (
                <div className={`p-2 rounded-lg text-xs font-semibold text-center ${
                  registerStatus.type === 'success' ? 'bg-primary-container text-on-primary-container' : 'bg-error-container text-on-error-container'
                }`}>
                  {registerStatus.message}
                </div>
              )}
            </form>
          </section>

        </div>

        {/* Right Column: Active rosters, Filterable and searchable Attendance table logs */}
        <div className="lg:col-span-7 space-y-6">

          {/* On Duty Horizontal List */}
          <section className="bg-white p-6 rounded-2xl custom-shadow overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-extrabold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
                On Duty Now ({onDutyCount})
              </h3>
              <p className="text-[11px] text-charcoal-muted">Active Shifts</p>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
              {activeEmployees.length === 0 ? (
                <div className="w-full py-8 text-center bg-pistachio-light rounded-xl border border-dashed border-outline-variant/60 flex flex-col items-center justify-center">
                  <p className="text-xs text-on-surface-variant/80 font-medium">No employees are currently on duty.</p>
                  <p className="text-[10px] text-charcoal-muted mt-0.5">Use the scanner simulator or override to start a shift.</p>
                </div>
              ) : (
                activeEmployees.map(emp => (
                  <motion.div
                    layoutId={`onduty-${emp.id}`}
                    key={emp.id}
                    className="flex-shrink-0 w-36 p-3 bg-pistachio-light rounded-xl border border-primary/20 text-center transition-all duration-200 hover:border-primary/50 hover:shadow-sm"
                  >
                    {emp.avatarUrl ? (
                      <img
                        alt={emp.name}
                        className="w-12 h-12 rounded-full mx-auto mb-2 object-cover border-2 border-primary shadow-sm"
                        src={emp.avatarUrl}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full mx-auto mb-2 bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm border-2 border-primary shadow-sm">
                        {emp.name.split(' ').map(n=>n[0]).join('')}
                      </div>
                    )}
                    <p className="text-xs font-bold text-on-surface truncate pr-1" title={emp.name}>{emp.name}</p>
                    <p className="font-mono text-[10px] text-primary font-bold mt-1 inline-flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-primary/10">
                      In: {emp.checkInTime || '09:00 AM'}
                    </p>
                  </motion.div>
                ))
              )}
            </div>
          </section>

          {/* Central Attendance Log Table container */}
          <section className="bg-white rounded-2xl custom-shadow overflow-hidden border border-border-subtle/50">

            {/* Table Header Controls */}
            <div className="px-6 py-4 flex flex-col md:flex-row gap-3 md:items-center justify-between border-b border-border-subtle bg-white">
              <div>
                <h3 className="text-base font-extrabold text-on-surface tracking-tight">Central Attendance Log</h3>
                <p className="text-xs text-on-surface-variant/80">Real-time terminal node check-ins</p>
              </div>

              {/* Action Buttons: download mock exports */}
              <div className="flex items-center gap-2">
                <button
                  onClick={triggerCsvDownload}
                  title="Export to CSV"
                  className="p-1.5 bg-pistachio-light hover:bg-surface-container text-primary rounded-lg border border-border-subtle transition-colors flex items-center justify-center"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter controls sub-bar */}
            <div className="px-6 py-3 bg-pistachio-light/40 border-b border-border-subtle/60 flex flex-wrap gap-2 items-center justify-between">

              {/* Search Log Input field */}
              <div className="relative w-full max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-charcoal-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search logs..."
                  className="w-full bg-white border border-outline-variant/60 focus:ring-1 focus:ring-primary focus:border-primary rounded-xl pl-8 pr-3 py-1.5 text-xs text-on-surface"
                />
              </div>

              {/* Status chips layout selection */}
              <div className="flex items-center gap-1 scroll-x pt-1 md:pt-0">
                {(['ALL', 'ACTIVE', 'COMPLETED', 'FLAGGED'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${
                      statusFilter === f
                        ? 'bg-primary text-on-primary'
                        : 'bg-white text-on-surface-variant border border-outline-variant/40 hover:bg-pistachio-light'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Responsive Table UI */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-pistachio-light border-b border-border-subtle">
                  <tr>
                    <th className="px-6 py-3 text-[11px] font-extrabold text-on-surface-variant tracking-wider uppercase font-sans">Staff Member</th>
                    <th className="px-6 py-3 text-[11px] font-extrabold text-on-surface-variant tracking-wider uppercase font-sans">Action</th>
                    <th className="px-6 py-3 text-[11px] font-extrabold text-on-surface-variant tracking-wider uppercase font-sans">Time</th>
                    <th className="px-6 py-3 text-[11px] font-extrabold text-on-surface-variant tracking-wider uppercase font-sans">Station</th>
                    <th className="px-6 py-3 text-[11px] font-extrabold text-on-surface-variant tracking-wider uppercase font-sans">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/60">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-xs text-charcoal-muted">
                        No attendance logs found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.slice(0, visibleLogsCount).map((log) => {
                      const empDetails = employees.find(e => e.id === log.employeeId);
                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-pistachio-light/30 transition-colors"
                        >
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              {empDetails && empDetails.avatarUrl ? (
                                <img
                                  alt={log.employeeName}
                                  className="w-7 h-7 rounded-full object-cover border border-border-subtle/50"
                                  src={empDetails.avatarUrl}
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold text-[10px] flex items-center justify-center border border-border-subtle/50">
                                  {log.employeeName.split(' ').map(n=>n[0]).join('')}
                                </div>
                              )}
                              <div>
                                <span className="text-xs font-bold text-on-surface tracking-tight block">
                                  {log.employeeName}
                                </span>
                                <span className="text-[9px] font-mono text-charcoal-muted tracking-tight block -mt-0.5">
                                  {log.employeeId}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-on-surface">
                            {log.action}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-on-surface">
                            {log.time}
                          </td>
                          <td className="px-6 py-4 text-xs text-charcoal-muted font-medium">
                            {log.station}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider ${
                                log.status === 'COMPLETED'
                                  ? 'bg-secondary-fixed text-on-secondary-container'
                                  : log.status === 'ACTIVE'
                                    ? 'bg-primary-fixed text-on-primary-fixed-variant'
                                    : 'bg-error-container text-on-error-container'
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Load More Trigger button */}
            {filteredLogs.length > visibleLogsCount && (
              <div className="px-6 py-3.5 bg-pistachio-light/20 border-t border-border-subtle/50 text-center">
                <button
                  onClick={() => setVisibleLogsCount(prev => prev + 5)}
                  className="text-xs font-extrabold text-primary hover:text-primary-container transition-colors inline-flex items-center gap-1 hover:underline cursor-pointer"
                >
                  Load More Records
                </button>
              </div>
            )}
          </section>

        </div>

      </div>
    </div>
  );
}
