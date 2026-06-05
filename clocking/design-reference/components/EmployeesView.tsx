import { useState } from 'react';
import { Employee } from '../types';
import { Mail, ShieldCheck, Ticket, RefreshCw, Layers, Award, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EmployeesViewProps {
  employees: Employee[];
  onScanEmployee: (employeeId: string) => void;
  onRemoveEmployee?: (employeeId: string) => void;
}

export default function EmployeesView({
  employees,
  onScanEmployee,
  onRemoveEmployee
}: EmployeesViewProps) {
  const [activeCardPassEmployeeId, setActiveCardPassEmployeeId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-secondary tracking-wider uppercase font-bold">Rosters & Passes</p>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight font-sans">Staff Directory</h1>
        </div>
        <p className="text-xs text-charcoal-muted leading-tight md:text-right">
          Total Registered: <span className="font-bold text-primary font-mono">{employees.length} employees</span>
        </p>
      </header>

      {/* Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.map((emp) => {
          const initials = emp.name.split(' ').map(n=>n[0]).join('');

          return (
            <motion.div
              layout
              key={emp.id}
              className="bg-white rounded-2xl border border-border-subtle custom-shadow p-5 flex flex-col justify-between hover:shadow-lg transition-all duration-300 relative overflow-hidden group"
            >
              {/* Decorative side color strip based on current active status */}
              <div className={`absolute top-0 inset-x-0 h-1 ${
                emp.status === 'ACTIVE'
                  ? 'bg-primary'
                  : emp.status === 'FLAGGED'
                    ? 'bg-error'
                    : 'bg-outline/40'
              }`}></div>

              <div>

                {/* Upper line: image, meta name, badge ID */}
                <div className="flex items-start gap-4 mb-4">

                  {emp.avatarUrl ? (
                    <img
                      alt={emp.name}
                      src={emp.avatarUrl}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-full object-cover border-2 border-primary/20 shadow-sm"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-secondary-fixed text-on-secondary-fixed text-lg font-bold flex items-center justify-center border-2 border-primary/20 shadow-sm">
                      {initials}
                    </div>
                  )}

                  <div className="space-y-0.5 flex-1 min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-primary font-mono block">
                      {emp.id}
                    </span>
                    <h3 className="text-base font-extrabold text-on-surface leading-snug tracking-tight truncate block" title={emp.name}>
                      {emp.name}
                    </h3>
                    <p className="text-xs text-charcoal-muted truncate block leading-normal">
                      {emp.email}
                    </p>
                  </div>
                </div>

                {/* Staff metrics row */}
                <div className="grid grid-cols-2 gap-2 bg-pistachio-light/40 rounded-xl p-3 border border-border-subtle/50 mb-4">
                  <div className="text-center">
                    <span className="text-[10px] text-charcoal-muted block font-semibold">Shifts Logged</span>
                    <span className="text-sm font-extrabold text-on-surface font-mono inline-flex items-center gap-1 mt-0.5">
                      <Layers className="w-3.5 h-3.5 text-secondary inline" />
                      {emp.shiftsCompleted}
                    </span>
                  </div>
                  <div className="text-center border-l border-border-subtle/60">
                    <span className="text-[10px] text-charcoal-muted block font-semibold">Hours Logged</span>
                    <span className="text-sm font-extrabold text-on-surface font-mono inline-flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-tertiary inline" />
                      {emp.hoursLogged.toFixed(1)}h
                    </span>
                  </div>
                </div>

              </div>

              {/* Functional tap triggers */}
              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={() => onScanEmployee(emp.id)}
                  className={`flex-1 font-bold py-2 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 active:scale-[0.97] cursor-pointer ${
                    emp.status === 'ACTIVE'
                      ? 'bg-tertiary-container text-on-tertiary-container hover:opacity-95'
                      : 'bg-primary-container text-on-primary-container hover:bg-primary hover:text-white'
                  }`}
                >
                  <Ticket className="w-3.5 h-3.5" />
                  {emp.status === 'ACTIVE' ? 'Clock Out QR Pass' : 'Clock In QR Pass'}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCardPassEmployeeId(activeCardPassEmployeeId === emp.id ? null : emp.id)}
                  className="px-3 py-2 bg-pistachio-light hover:bg-surface-container border border-border-subtle hover:border-primary/20 text-primary font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                  title="Show Physical Pass Card"
                >
                  Pass
                </button>
              </div>

              {/* Dynamic printable ID Badge Drawer Overlay */}
              <AnimatePresence>
                {activeCardPassEmployeeId === emp.id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    className="absolute inset-0 bg-white z-30 p-5 flex flex-col justify-between border-t border-primary/20"
                  >
                    <div className="text-center space-y-2">
                      <p className="text-[9px] text-[#005f43] tracking-widest uppercase font-extrabold font-mono">Company ID Access Pass</p>

                      {/* Sub card visualization matching template layout */}
                      <div className="mx-auto w-16 h-16 rounded-full overflow-hidden border-2 border-primary/20 shadow-sm">
                        {emp.avatarUrl ? (
                          <img
                            alt={emp.name}
                            src={emp.avatarUrl}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-secondary-fixed text-on-secondary-fixed text-lg font-bold flex items-center justify-center">
                            {initials}
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="text-sm font-extrabold text-on-surface tracking-tight">{emp.name}</h4>
                        <span className="font-mono text-[10px] text-charcoal-muted uppercase">{emp.id}</span>
                      </div>
                    </div>

                    {/* QR block code matching image visualizer exactly */}
                    <div className="flex flex-col items-center justify-center my-1 bg-surface-container-low p-2 rounded-xl border border-border-subtle/40">
                      <div className="p-1 bg-white border border-border-subtle shadow-inner w-24 h-24 flex items-center justify-center">
                        <span className="material-symbols-outlined text-6xl text-on-surface/80">qr_code_2</span>
                      </div>
                      <span className="text-[8px] font-mono font-medium text-charcoal-muted mt-1 uppercase">Scan at terminal node</span>
                    </div>

                    {/* Button trigger list actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          onScanEmployee(emp.id);
                          setActiveCardPassEmployeeId(null);
                        }}
                        className="flex-1 py-1.5 bg-primary hover:bg-primary-container text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Trigger Scan
                      </button>
                      <button
                        onClick={() => setActiveCardPassEmployeeId(null)}
                        className="py-1.5 px-4 border border-outline/30 hover:bg-pistachio-light font-bold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        Close
                      </button>
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
