import {
  HomeIcon,
  ChatIcon,
  VideoIcon,
  TrendingIcon,
  BoardIcon,
  CheckSquareIcon,
  CalendarCheckIcon,
} from './icons';

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: () => React.ReactElement;
}

export const dashboardNavItems: DashboardNavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { href: '/dashboard/mentors', label: 'Book a Mentor', icon: CalendarCheckIcon },
  { href: '/dashboard/community', label: 'Community Chats', icon: ChatIcon },
  { href: '/dashboard/zoom', label: 'Zoom Classes', icon: VideoIcon },
  { href: '/dashboard/updates', label: 'Weekly Updates', icon: TrendingIcon },
  { href: '/dashboard/jira', label: 'Jira Board', icon: BoardIcon },
  { href: '/dashboard/todo', label: 'What-To-Do Tracker', icon: CheckSquareIcon },
];
