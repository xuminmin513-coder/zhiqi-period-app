const paths = {
  home: <><path d="M3 10.8 12 3l9 7.8"/><path d="M5.5 9.5V21h13V9.5M9 21v-7h6v7"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></>,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21c.7-4.5 3.4-7 8-7s7.3 2.5 8 7"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
  shield: <><path d="M12 3 4 6v5c0 5 3.2 8.3 8 10 4.8-1.7 8-5 8-10V6l-8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
  chevron: <path d="m9 5 7 7-7 7"/>,
  left: <path d="m15 5-7 7 7 7"/>,
  right: <path d="m9 5 7 7-7 7"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  heart: <path d="M20.8 5.8a5.4 5.4 0 0 0-7.6 0L12 7l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 22l8.8-8.6a5.4 5.4 0 0 0 0-7.6Z"/>,
  drop: <><path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z"/><path d="M9 16c.5 1.5 1.5 2 3 2"/></>,
  download: <path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>,
  upload: <path d="M12 16V4m-5 5 5-5 5 5M4 17v4h16v-4"/>,
  trash: <path d="M4 7h16M9 3h6l1 4H8l1-4ZM6 7l1 14h10l1-14M10 11v6M14 11v6"/>,
  phone: <><rect x="5" y="2" width="14" height="20" rx="3"/><path d="M10 18h4"/></>,
  file: <path d="M6 2h8l4 4v16H6zM14 2v5h5M9 13h6M9 17h6"/>,
  alert: <><path d="M12 3 2 21h20L12 3Z"/><path d="M12 9v5M12 18h.01"/></>
};

export default function Icon({ name, size = 20 }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name] || paths.info}
    </svg>
  );
}
