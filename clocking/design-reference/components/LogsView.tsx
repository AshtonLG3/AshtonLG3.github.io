import { useState } from 'react';
import { Employee, AttendanceLog } from '../types';
import { Search, FileSpreadsheet, PlayCircle, SlidersHorizontal, Trash2 } from 'lucide-react';

interface LogsViewProps {
  logs: AttendanceLog[];
  employees: Employee[];
  onClearLogs: () => void;
}

export default function LogsView({ logs, employees, onClearLogs }: LogsViewProps) {
  const [search, setSearch] = useState('');
  const [stationFilter, setStationFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');

  // Filter logs
  const filtered = logs.filter(log => {
    const matchesSearch = log.employeeName.toLowerCase().includes(search.toLowerCase()) ||
                          log.employeeId.toLowerCase().includes(search.toLowerCase());
    const matchesStation = stationFilter === 'ALL' || log.station === stationFilter;
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;

    return matchesSearch && matchesStation && matchesAction;
  });

  // Extract unique stations & actions
  const uniqueStations = Array.from(new Set(logs.map(l => l.station)));
  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));

  // Mock downloading logs as CSV
  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + ["LOG_ID,EMPLOYEE_ID,EMPLOYEE_NAME,ACTION,TIME,STATION,STATUS"]
        .concat(filtered.map(l => `"${l.id}","${l.employeeId}","${l.employeeName}","${l.action}","${l.time}","${l.station}","${l.status}"`))
        .join("\n");
    const blobEncoded = encodeURI(csvContent);
    const link = document.createElement("a");
    link.href = blobEncoded;
    link.download = `attendance_log_report_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-secondary tracking-wider uppercase font-bold">Audit Trails</p>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Central Attendance Logs</h1>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-primary hover:bg-primary-container text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm active:scale-95 duration-200 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Log Report
          </button>
          <button
            onClick={onClearLogs}
            className="px-4 py-2 border border-error text-error hover:bg-error-container/20 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm active:scale-95 duration-200 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Reset Log Database
          </button>
        </div>
      </header>

      {/* Filter and control panel */}
      <section className="bg-white p-5 rounded-2xl border border-border-subtle custom-shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Search phrase text field */}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Search Staff or ID</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-charcoal-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="E.g. James Wilson..."
                className="w-full bg-pistachio-light border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-xl pl-8 pr-3 py-1.5 text-xs text-on-surface"
              />
            </div>
          </div>

          {/* Action trigger selection */}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Filter by Action</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full bg-pistachio-light border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-xl px-3 py-1.5 text-xs text-on-surface font-semibold"
            >
              <option value="ALL">All Actions</option>
              {uniqueActions.map(act => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
          </div>

          {/* Station selector */}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Filter by Station</label>
            <select
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value)}
              className="w-full bg-pistachio-light border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-xl px-3 py-1.5 text-xs text-on-surface font-semibold"
            >
              <option value="ALL">All Stations</option>
              {uniqueStations.map(station => (
                <option key={station} value={station}>{station}</option>
              ))}
            </select>
          </div>

        </div>
      </section>

      {/* Logs Table Render panel */}
      <section className="bg-white rounded-2xl custom-shadow overflow-hidden border border-border-subtle/50">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-[#f2f7f4] border-b border-border-subtle">
              <tr>
                <th className="px-6 py-4 text-[11px] font-extrabold text-on-surface-variant tracking-wider uppercase">Log ID</th>
                <th className="px-6 py-4 text-[11px] font-extrabold text-on-surface-variant tracking-wider uppercase">Staff Member</th>
                <th className="px-6 py-4 text-[11px] font-extrabold text-on-surface-variant tracking-wider uppercase">Action Type</th>
                <th className="px-6 py-4 text-[11px] font-extrabold text-on-surface-variant tracking-wider uppercase">Station Method</th>
                <th className="px-6 py-4 text-[11px] font-extrabold text-on-surface-variant tracking-wider uppercase">Time Checked</th>
                <th className="px-6 py-4 text-[11px] font-extrabold text-on-surface-variant tracking-wider uppercase">Shift Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs text-charcoal-muted">
                    No matching attendance entries available.
                  </td>
                </tr>
              ) : (
                filtered.map(log => {
                  const emp = employees.find(e => e.id === log.employeeId);
                  return (
                    <tr key={log.id} className="hover:bg-pistachio-light/20 transition-colors duration-150">
                      <td className="px-6 py-4 text-xs font-mono font-bold text-primary">
                        {log.id}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {emp?.avatarUrl ? (
                            <img
                              alt={log.employeeName}
                              className="w-8 h-8 rounded-full object-cover border border-border-subtle/60"
                              src={emp.avatarUrl}
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold text-xs flex items-center justify-center">
                              {log.employeeName.split(' ').map(n=>n[0]).join('')}
                            </div>
                          )}
                          <div>
                            <span className="text-xs font-bold text-on-surface block leading-tight">{log.employeeName}</span>
                            <span className="text-[10px] text-charcoal-muted font-mono leading-none">{log.employeeId}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-on-surface">
                        {log.action}
                      </td>
                      <td className="px-6 py-4 text-xs text-charcoal-muted font-medium">
                        {log.station}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-on-surface font-bold">
                        {log.time}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider ${
                          log.status === 'COMPLETED'
                            ? 'bg-secondary-fixed text-on-secondary-container'
                            : log.status === 'ACTIVE'
                              ? 'bg-primary-fixed text-on-primary-fixed-variant'
                              : 'bg-error-container text-on-error-container'
                        }`}>
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
      </section>
    </div>
  );
}
