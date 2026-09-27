export type IconName =
  | "grid"
  | "gem"
  | "layers"
  | "component"
  | "lock"
  | "search"
  | "plus"
  | "minus"
  | "bell"
  | "building"
  | "chevron"
  | "menu"
  | "close"
  | "arrow"
  | "check"
  | "warning"
  | "error"
  | "info"
  | "calendar"
  | "upload"
  | "filter"
  | "columns"
  | "sort"
  | "more"
  | "eye"
  | "mail"
  | "key"
  | "user"
  | "users"
  | "target"
  | "phone"
  | "edit"
  | "shield"
  | "logout"
  | "help"
  | "settings"
  | "wallet"
  | "send"
  | "droplet"
  | "factory";

const paths: Record<IconName, React.ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
  /* Soap bar — the Maharaja Soap product mark. */
  gem: <><rect x="2.5" y="6" width="19" height="12" rx="4"/><path d="M6.5 10.5c1.8-1.2 3.6-1.2 5.4 0s3.6 1.2 5.4 0"/><path d="M6.5 14c1.8-1.2 3.6-1.2 5.4 0s3.6 1.2 5.4 0"/></>,
  layers: <><path d="m12 2 9 5-9 5-9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/></>,
  component: <><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><path d="M17 14v6m-3-3h6"/></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  minus: <path d="M5 12h14"/>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  building: <><path d="M4 21V5l8-3 8 3v16M8 9h1m6 0h1M8 13h1m6 0h1M8 17h1m6 0h1"/></>,
  chevron: <path d="m8 10 4 4 4-4"/>,
  menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  arrow: <path d="m9 18 6-6-6-6"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  warning: <><path d="M12 3 2 21h20Z"/><path d="M12 9v5m0 3h.01"/></>,
  error: <><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
  upload: <><path d="M12 16V4m-4 4 4-4 4 4"/><path d="M4 15v5h16v-5"/></>,
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8Z"/>,
  columns: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/></>,
  sort: <path d="m8 9 4-4 4 4M8 15l4 4 4-4"/>,
  more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
  key: <><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9m-4 4 3 3"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  users: <><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M15.8 13.7a6.5 6.5 0 0 1 5.7 6.3"/></>,
  target: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2"/></>,
  phone: <path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>,
  edit: <><path d="m17 3 4 4L8 20l-5 1 1-5Z"/><path d="m14 6 4 4"/></>,
  shield: <><path d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5Z"/><path d="m9 12 2 2 4-4"/></>,
  logout: <><path d="M10 4H5v16h5M14 8l4 4-4 4m4-4H9"/></>,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.7 2.7 0 1 1 4.3 2.2c-1.1.8-1.8 1.2-1.8 2.8m0 3h.01"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  wallet: <><path d="M19 7V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5"/><path d="M16.5 13.5h.01"/></>,
  droplet: <><path d="M12 3s6 6.4 6 10.2A6 6 0 0 1 6 13.2C6 9.4 12 3 12 3Z"/><path d="M9.5 14.2a2.6 2.6 0 0 0 2.5 2.4"/></>,
  factory: <><path d="M3 21V10l6 4V10l6 4V7l6 4v10Z"/><path d="M7 21v-3m5 3v-3m5 3v-3"/></>,
  send: <><path d="m21 3-9.5 9.5"/><path d="M21 3 14 21l-2.5-8.5L3 10Z"/></>,
};

export default function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
