const icons = {
  grid: (
    <path
      d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"
      fill="currentColor"
    />
  ),
  activity: (
    <path
      d="M4 16l4-8 4 5 4-9 4 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="17" cy="9" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M14.5 19c.3-2.2 1.8-4 4.5-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </>
  ),
  chart: (
    <>
      <path d="M4 19V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 19v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M22 19V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  table: (
    <>
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M3 10h18M9 10v9" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  dollar: (
    <path
      d="M12 3v18M9.5 7.5c0-1.5 1.2-2.5 2.5-2.5 1.8 0 3 1 3 2.5 0 2-2.5 2-4.5 3.5S8 14.5 8 16.5 9.2 19 11.5 19c1.6 0 2.8-.7 3.5-1.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  ),
  trend: (
    <path
      d="M4 16l5-5 4 4 7-9"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M3 12h18M12 3c2.5 2.8 4 5.8 4 9s-1.5 6.2-4 9M12 3c-2.5 2.8-4 5.8-4 9s1.5 6.2 4 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </>
  ),
};

export default function NavIcon({ name }) {
  return (
    <svg
      className="nav-icon-svg"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
    >
      {icons[name] ?? icons.grid}
    </svg>
  );
}
