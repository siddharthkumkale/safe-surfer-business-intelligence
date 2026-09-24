export default function AppHeader({ refreshing, onRefresh, activeTab, onTabChange }) {
  return (
    <header className="header">
      <div className="brand">
        <div>
          <p>Safe Surfer / Financial reporting</p>
          <h1>Performance dashboard</h1>
        </div>
      </div>

      <div className="header-actions">
        <label className="quick-view">
          <span>Quick view</span>
          <select value={activeTab} onChange={(event) => onTabChange(event.target.value)}>
            <option value="overview">Subscription overview</option>
            <option value="active-subs">Active subscriptions</option>
            <option value="trialists">Trialist conversion</option>
            <option value="analysis">Customer analysis</option>
            <option value="revenue">Revenue</option>
            <option value="mrr">Monthly recurring revenue</option>
            <option value="international">International</option>
          </select>
        </label>

        <details className="action-menu">
          <summary aria-label="Open report menu">
            <span>Report</span>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4" /></svg>
          </summary>
          <div className="action-menu-popover">
            <button type="button" onClick={() => window.print()}>Print or save as PDF</button>
            <button type="button" onClick={onRefresh}>Refresh source data</button>
          </div>
        </details>

        <button
          type="button"
          className={`refresh-btn ${refreshing ? "is-loading" : ""}`}
          onClick={onRefresh}
          disabled={refreshing}
        >
          <span className="refresh-btn-icon" aria-hidden="true">↻</span>
          <span className="refresh-btn-label">{refreshing ? "Refreshing…" : "Refresh"}</span>
        </button>

        <details className="profile-menu">
          <summary aria-label="Open profile menu">
            <span className="profile-avatar">SS</span>
            <span className="profile-copy"><strong>Safe Surfer</strong><small>Finance team</small></span>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4" /></svg>
          </summary>
          <div className="profile-menu-popover">
            <div><strong>Safe Surfer</strong><span>Financial workspace</span></div>
            <button type="button" onClick={() => onTabChange("details")}>View detailed data</button>
          </div>
        </details>
      </div>
    </header>
  );
}
