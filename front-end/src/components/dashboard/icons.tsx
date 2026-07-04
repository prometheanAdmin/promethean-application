const base = {
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function HomeIcon() {
  return (
    <svg {...base}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H10v-5.5h4V20h3.5a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

export function UserIcon() {
  return (
    <svg {...base}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
    </svg>
  );
}

export function ChatIcon() {
  return (
    <svg {...base}>
      <path d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8c-1.1 0-2.15-.2-3.1-.6L4 20l1.3-4.4C4.5 14.4 4 13.25 4 12Z" />
    </svg>
  );
}

export function VideoIcon() {
  return (
    <svg {...base}>
      <rect x="2.5" y="6" width="13" height="12" rx="2" />
      <path d="M15.5 10.2 21 7v10l-5.5-3.2Z" />
    </svg>
  );
}

export function TrendingIcon() {
  return (
    <svg {...base}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </svg>
  );
}

export function BellIcon() {
  return (
    <svg {...base}>
      <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9Z" />
      <path d="M9.5 17.5a2.5 2.5 0 0 0 5 0" />
    </svg>
  );
}

export function BoardIcon() {
  return (
    <svg {...base}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M8 8v9M13 8v5M18 8v11" />
    </svg>
  );
}

export function CheckSquareIcon() {
  return (
    <svg {...base}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M8 12.2l2.5 2.5L16.5 9" />
    </svg>
  );
}

export function MenuIcon() {
  return (
    <svg {...base}>
      <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg {...base}>
      <path d="M5 5l14 14M19 5 5 19" />
    </svg>
  );
}

export function ArrowLeftIcon() {
  return (
    <svg {...base}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

export function ExternalLinkIcon() {
  return (
    <svg {...base}>
      <path d="M9 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
      <path d="M14 4h6v6M20 4 11 13" />
    </svg>
  );
}

export function MailIcon() {
  return (
    <svg {...base}>
      <rect x="3" y="5" width="18" height="14" rx="2.4" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}

export function ArrowRightIcon() {
  return (
    <svg {...base}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function BookIcon() {
  return (
    <svg {...base}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" />
      <path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20" />
    </svg>
  );
}

export function CalendarIcon() {
  return (
    <svg {...base}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.4" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </svg>
  );
}

export function MinusIcon() {
  return (
    <svg {...base}>
      <path d="M5 12h14" />
    </svg>
  );
}

export function SendIcon() {
  return (
    <svg {...base}>
      <path d="M4.5 12 20 4.5l-4 15.5-4.5-6-7-2Z" />
    </svg>
  );
}

export function BotIcon() {
  return (
    <svg {...base}>
      <rect x="4" y="8" width="16" height="12" rx="3" />
      <path d="M12 8V4M9 2h6" />
      <circle cx="9" cy="14" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="14" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ClockIcon() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg {...base}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg {...base}>
      <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m3 0-.8 12.1a2 2 0 0 1-2 1.9H7.8a2 2 0 0 1-2-1.9L5 7" />
    </svg>
  );
}

export function CalendarCheckIcon() {
  return (
    <svg {...base}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.4" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
      <path d="M9 14.5l1.8 1.8L15 12.5" />
    </svg>
  );
}

export function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M12 2.5l2.9 6.3 6.8.7-5.1 4.6 1.5 6.7L12 17.4l-6.1 3.4 1.5-6.7L2.3 9.5l6.8-.7L12 2.5z" />
    </svg>
  );
}

export function CheckCircleIcon() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.3l2.4 2.4L15.8 9" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg {...base}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4.3-4.3" />
    </svg>
  );
}

export function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20.5s-7.5-4.6-9.8-9.1C.6 8 1.9 4.7 5 3.7c2-.6 4 .1 5.3 1.9l1.7 2.3 1.7-2.3c1.3-1.8 3.3-2.5 5.3-1.9 3.1 1 4.4 4.3 2.8 7.7-2.3 4.5-9.8 9.1-9.8 9.1Z" />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg {...base}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.2" />
      <path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5" />
    </svg>
  );
}

export function LogOutIcon() {
  return (
    <svg {...base}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function MapPinIcon() {
  return (
    <svg {...base}>
      <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.4" />
    </svg>
  );
}
