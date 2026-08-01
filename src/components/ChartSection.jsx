import React, { useMemo, useState } from 'react';
import { useVisibleInWindow } from '../hooks/useVisibleInWindow';
import { Lock, ChevronDown, ChevronUp } from 'lucide-react';

export function ChartSection({
  id,
  title,
  description,
  filters = [],
  windows = [],
  overrideTime = null,
  dataCount = 0,
  caveatMessage = '',
  children
}) {
  const isVisible = useVisibleInWindow(windows, overrideTime);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const windowsLabel = useMemo(() => {
    if (!windows || windows.length === 0) return 'Always visible';
    return windows.map(w => `${w.start}–${w.end}`).join(' and ');
  }, [windows]);

  return (
    <section id={id} className="report-section">
      <div className="card">
        <div className="card-header">
          <div className="card-header-main">
            <div className="card-title-row">
              <h2 className="card-title">{title}</h2>
              {windows.length > 0 && (
                <span className={`status-pill ${isVisible ? 'status-pill--active' : 'status-pill--locked'}`}>
                  {isVisible ? 'Active' : 'Locked'}
                </span>
              )}
            </div>
            {description ? <p className="card-description">{description}</p> : null}
            <div className="card-subrow">
              <button
                type="button"
                className="filters-toggle"
                aria-expanded={filtersOpen}
                onClick={() => setFiltersOpen(v => !v)}
              >
                <span>Filters applied</span>
                {filtersOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {(dataCount === 0 || dataCount < 10) ? (
                <span className="limited-data">Limited data: {dataCount.toLocaleString()} rows</span>
              ) : null}
            </div>
            {filtersOpen ? (
              <div className="filters-panel">
                {filters.length > 0 ? (
                  <ul className="filters-list">
                    {filters.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="filters-empty">No filters</div>
                )}
                {caveatMessage ? <div className="filters-note">{caveatMessage}</div> : null}
              </div>
            ) : null}
          </div>
        </div>

        {!isVisible ? (
          <div className="locked-placeholder">
            <Lock size={20} />
            <div className="locked-text">Visible {windowsLabel} IST</div>
          </div>
        ) : (
          <div className="chart-area">{children}</div>
        )}
      </div>
    </section>
  );
}

export default ChartSection;
