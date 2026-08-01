import React from 'react';
import { useVisibleInWindow } from '../hooks/useVisibleInWindow';
import { Clock, Filter, AlertTriangle, Info, ShieldAlert } from 'lucide-react';

export function ChartSection({
  id,
  title,
  description,
  filters = [],
  windows = [],
  overrideTime = null,
  dataCount = 0,
  caveatMessage = '',
  accentClass = 'card-accent-blue',
  children
}) {
  const isVisible = useVisibleInWindow(windows, overrideTime);

  // Formatted windows for display
  const formatWindows = () => {
    if (!windows || windows.length === 0) return 'Always Visible';
    return windows.map(w => {
      const [sh, sm] = w.start.split(':');
      const [eh, em] = w.end.split(':');
      const formatTime = (h, m) => {
        const hr = parseInt(h, 10);
        const ampm = hr >= 12 ? 'PM' : 'AM';
        const displayHr = hr % 12 === 0 ? 12 : hr % 12;
        return `${displayHr}:${m} ${ampm}`;
      };
      return `${formatTime(sh, sm)} – ${formatTime(eh, em)}`;
    }).join(' and ');
  };

  return (
    <section id={id} className="scroll-mt-24">
      <div className={`dashboard-card ${accentClass}`}>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              {title}
              {windows.length > 0 && (
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                  isVisible ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  <Clock className="w-3 h-3" />
                  {isVisible ? 'Active' : 'Locked'}
                </span>
              )}
            </h2>
            <p className="text-sm text-slate-400 mt-1">{description}</p>
          </div>
          
          <div className="flex flex-col items-start md:items-end gap-1.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Filters</span>
            <div className="flex flex-wrap gap-1 md:justify-end">
              {filters.map((f, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                  <Filter className="w-2.5 h-2.5" />
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Visibility Checker */}
        {!isVisible ? (
          <div className="visibility-placeholder">
            <div className="visibility-icon-container">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-amber-400 mb-1">Visualizations Locked</h3>
            <p className="text-sm text-slate-300 max-w-lg mb-4">
              To adhere to scheduling requirements, this chart is only visible during the following IST window:
            </p>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded px-3 py-1 text-xs font-bold text-amber-300 inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatWindows()} IST
            </div>
            <p className="text-xs text-slate-500 mt-4 max-w-sm">
              Use the <strong>Testing Mode</strong> controls in the header to change the simulated IST clock and inspect this chart.
            </p>
          </div>
        ) : (
          <div className="mt-4 min-h-[350px]">
            {/* Filter Warning/Caveat Alert if Data is Zero/Low */}
            {dataCount === 0 ? (
              <div className="dashboard-alert">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-rose-300">No Data Points Matching Filters</h4>
                  <p className="mt-0.5 text-xs text-rose-200/90 leading-relaxed">
                    {caveatMessage || "The row-level filters specified for this task did not match any tweets in the dataset."}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Low data count caveat */}
                {dataCount < 10 && caveatMessage && (
                  <div className="dashboard-info-alert mb-4">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-blue-200 leading-relaxed">
                        <strong>Notice:</strong> {caveatMessage} ({dataCount} matching rows).
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Actual Chart Rendered here */}
                <div className="w-100 h-[350px] relative">
                  {children}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default ChartSection;
