'use client';

import { useStudentContext } from '@/components/dashboard/StudentContext';
import ProfileSummaryCard from '@/components/dashboard/ProfileSummaryCard';
import QuickAccessCard from '@/components/dashboard/QuickAccessCard';
import RightRail from '@/components/dashboard/RightRail';
import {
  ChatIcon,
  VideoIcon,
  TrendingIcon,
  BoardIcon,
  CheckSquareIcon,
  CalendarCheckIcon,
  ArrowRightIcon,
  ExternalLinkIcon,
} from '@/components/dashboard/icons';
import styles from './page.module.css';

export default function DashboardHomePage() {
  const { student } = useStudentContext();
  const firstName = student.name.split(' ')[0];

  return (
    <>
      <div className={styles.header}>
        <p className={styles.eyebrow}>Dashboard</p>
        <h1 className={styles.title}>Welcome back, {firstName}.</h1>
        <p className={styles.subtitle}>
          Here&apos;s your hub for everything in the {student.domain} batch — mentors, classes, and your work tracker.
        </p>
      </div>

      <div className={styles.summarySection}>
        <ProfileSummaryCard student={student} />
      </div>

      <div className={styles.layout}>
        <div>
          <h2 className={styles.sectionTitle}>Quick access</h2>
          <div className={styles.grid}>
            <QuickAccessCard
              title="Book a Mentor"
              description="Grab time with an industry mentor for code review, career advice, or getting unstuck."
              href="/dashboard/mentors"
              icon={CalendarCheckIcon}
              linkLabel="Book a session"
              linkIcon={ArrowRightIcon}
            />
            <QuickAccessCard
              title="Community Chats"
              description="Chat with your batch, mentors, and the wider Promethean community."
              href="/dashboard/community"
              icon={ChatIcon}
              linkLabel="Open chats"
              linkIcon={ArrowRightIcon}
            />
            <QuickAccessCard
              title="Zoom Classes"
              description="Join live sessions and catch up on recordings you missed."
              href="/dashboard/zoom"
              icon={VideoIcon}
              linkLabel="View classes"
              linkIcon={ArrowRightIcon}
            />
            <QuickAccessCard
              title="Weekly Updates"
              description="Your course roadmap, week by week, with tasks to complete."
              href="/dashboard/updates"
              icon={TrendingIcon}
              linkLabel="View roadmap"
              linkIcon={ArrowRightIcon}
            />
            <QuickAccessCard
              title="Jira Board"
              description="See your tickets — to do, in progress, and shipped."
              href="/dashboard/jira"
              icon={BoardIcon}
              linkLabel="Open board"
              linkIcon={ArrowRightIcon}
            />
            <QuickAccessCard
              title="What-To-Do Tracker"
              description="Your integrated productivity tracker for daily tasks and goals."
              href="/dashboard/todo"
              icon={CheckSquareIcon}
              linkLabel="Open What-To-Do Tracker"
              linkIcon={ExternalLinkIcon}
            />
          </div>
        </div>

        <RightRail />
      </div>
    </>
  );
}
