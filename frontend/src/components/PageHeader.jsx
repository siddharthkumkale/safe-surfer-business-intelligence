import { PAGE_META } from "../navigation";

export default function PageHeader({ activeTab }) {
  const meta = PAGE_META[activeTab] ?? {
    title: "Dashboard",
    subtitle: "Business performance overview",
  };

  return (
    <div className="page-title">
      <div>
        <div className="breadcrumb"><span>Dashboard</span><b>/</b>{meta.title}</div>
        <h2>{meta.title}</h2>
        <p>{meta.subtitle}</p>
      </div>
      <div className="data-status">
        <span />
        Source data loaded
      </div>
    </div>
  );
}
