import { useState } from "react";
import NavIcon from "./NavIcon";
import { NAV_SECTIONS } from "../navigation";

export default function Sidebar({ activeTab, onTabChange }) {
  const [openSections, setOpenSections] = useState(() =>
    Object.fromEntries(NAV_SECTIONS.map((section) => [section.title, true]))
  );

  const toggleSection = (title) => {
    setOpenSections((current) => ({ ...current, [title]: !current[title] }));
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 2.8 20 6v5.6c0 4.8-3.2 8.2-8 9.6-4.8-1.4-8-4.8-8-9.6V6l8-3.2Z" />
            <path d="m8.2 12.2 2.4 2.4 5.3-5.5" />
          </svg>
        </div>
        <div>
          <div className="logo-title">Safe Surfer</div>
          <div className="logo-subtitle">Business intelligence</div>
        </div>
      </div>

      {NAV_SECTIONS.map((section, sectionIndex) => (
        <div className="sidebar-section" key={section.title}>
          {sectionIndex > 0 && <div className="sidebar-divider" />}
          <button
            type="button"
            className="sidebar-section-title"
            onClick={() => toggleSection(section.title)}
            aria-expanded={openSections[section.title]}
          >
            <span>{section.title}</span>
            <svg className={openSections[section.title] ? "is-open" : ""} viewBox="0 0 20 20" aria-hidden="true">
              <path d="m6 8 4 4 4-4" />
            </svg>
          </button>
          {openSections[section.title] && (
            <div className="sidebar-items">
              {section.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-item ${activeTab === item.id ? "active" : ""}`}
                  onClick={() => onTabChange(item.id)}
                  title={item.label}
                >
                  <span className="nav-icon">
                    <NavIcon name={item.icon} />
                  </span>
                  <span>{item.label}</span>
                  {activeTab === item.id && <span className="nav-active-dot" />}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="sidebar-bottom">
        <div className="connection-card">
          <div className="status-dot" />
          <div>
            <strong>Data connected</strong>
            <span>Excel source is online</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
