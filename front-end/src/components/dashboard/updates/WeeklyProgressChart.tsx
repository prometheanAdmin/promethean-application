'use client';

import { useMemo, useRef, useState } from 'react';
import { useCourseProgress } from '@/components/dashboard/useCourseProgress';
import { CheckCircleIcon, LockIcon, CloseIcon } from '@/components/dashboard/icons';
import styles from './WeeklyProgressChart.module.css';

interface Point {
  week: number;
  x: number;
  y: number;
}

function buildPoints(count: number): Point[] {
  const startX = 7;
  const endX = 93;
  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    const x = count === 1 ? (startX + endX) / 2 : startX + (i / (count - 1)) * (endX - startX);
    const y = 50 + 26 * Math.sin(i * 0.85);
    points.push({ week: i + 1, x, y });
  }
  return points;
}

function pointsToPath(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function alignForIndex(index: number, total: number): { left: string; transform: string } {
  if (index <= 1) return { left: '0%', transform: 'translate(0, 0)' };
  if (index >= total - 2) return { left: '100%', transform: 'translate(-100%, 0)' };
  return { left: '50%', transform: 'translate(-50%, 0)' };
}

export default function WeeklyProgressChart() {
  const { weeks, completed, currentWeek, totalWeeks, toggleTask, statusForWeek } = useCourseProgress();
  const [openWeek, setOpenWeek] = useState<number | null>(null);
  const [pinned, setPinned] = useState(false);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const points = useMemo(() => buildPoints(weeks.length), [weeks.length]);
  const fullPath = useMemo(() => pointsToPath(points), [points]);
  const doneUpToIndex = Math.max(0, Math.min(points.length - 1, currentWeek - 1));
  const donePath = useMemo(() => pointsToPath(points.slice(0, doneUpToIndex + 1)), [points, doneUpToIndex]);

  const weeksDoneCount = Math.min(currentWeek - 1, weeks.length);
  const progressPct = weeks.length > 0 ? (weeksDoneCount / weeks.length) * 100 : 0;
  const courseFinished = currentWeek > weeks.length;

  const cancelClose = () => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimeout.current = setTimeout(() => {
      setOpenWeek(null);
      setPinned(false);
    }, 200);
  };

  const openPopover = (week: number) => {
    cancelClose();
    setOpenWeek(week);
  };

  const closePopover = () => {
    cancelClose();
    setOpenWeek(null);
    setPinned(false);
  };

  return (
    <>
      <div className={styles.summaryRow}>
        <span className={styles.summaryPill}>
          {courseFinished ? 'Course complete' : `Week ${currentWeek} of ${totalWeeks}`}
        </span>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
        </div>
        <span className={styles.progressLabel}>{weeksDoneCount} of {weeks.length} weeks done</span>
      </div>

      <div className={styles.scrollArea}>
        <div className={styles.chart}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <path d={fullPath} className={styles.wavePath} />
            {donePath && <path d={donePath} className={`${styles.wavePath} ${styles.wavePathDone}`} />}
          </svg>

          {points.map((p, i) => {
            const status = statusForWeek(p.week);
            const isOpen = openWeek === p.week;
            const align = alignForIndex(i, points.length);

            return (
              <div
                key={p.week}
                className={styles.marker}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                onMouseEnter={() => openPopover(p.week)}
                onMouseLeave={() => { if (!pinned || openWeek !== p.week) scheduleClose(); }}
              >
                {status === 'current' && <span className={styles.currentTag}>Current</span>}
                <button
                  type="button"
                  className={`${styles.dot} ${status === 'done' ? styles.dotDone : ''} ${status === 'current' ? styles.dotCurrent : ''}`}
                  style={{ position: 'relative' }}
                  onClick={() => { openPopover(p.week); setPinned(true); }}
                  aria-label={`Week ${p.week}${status === 'current' ? ' — current week' : ''}`}
                >
                  {status === 'current' && <span className={styles.currentRing} aria-hidden />}
                  {status === 'done' ? <CheckCircleIcon /> : p.week}
                </button>
                <span className={`${styles.weekLabel} ${status === 'current' ? styles.weekLabelCurrent : ''}`}>
                  Wk {p.week}
                </span>

                {isOpen && (
                  <div
                    className={styles.popover}
                    style={{ top: '46px', left: align.left, transform: align.transform }}
                    onMouseEnter={cancelClose}
                    onMouseLeave={() => { if (!pinned) scheduleClose(); }}
                  >
                    <div className={styles.popoverHeader}>
                      <p className={styles.popoverWeek}>Week {p.week}</p>
                      <button type="button" className={styles.popoverClose} onClick={closePopover} aria-label="Close">
                        <CloseIcon />
                      </button>
                    </div>
                    <h4 className={styles.popoverTitle}>{weeks[i].title}</h4>
                    <span className={`${styles.popoverStatus} ${status === 'done' ? styles.statusDone : status === 'current' ? styles.statusCurrent : styles.statusUpcoming}`}>
                      {status === 'done' ? 'Completed' : status === 'current' ? 'In progress' : 'Upcoming'}
                    </span>

                    <div className={styles.taskList}>
                      {weeks[i].tasks.map((task) => {
                        const isDone = (completed[p.week] ?? []).includes(task.id);
                        const isLocked = status === 'upcoming';
                        const interactive = status === 'current';
                        return (
                          <button
                            key={task.id}
                            type="button"
                            className={styles.taskRow}
                            disabled={!interactive}
                            onClick={() => interactive && toggleTask(p.week, task.id)}
                          >
                            <span className={`${styles.checkbox} ${isDone ? styles.checkboxChecked : ''} ${isLocked ? styles.checkboxLocked : ''}`}>
                              {isDone && <CheckCircleIcon />}
                              {isLocked && <LockIcon />}
                            </span>
                            <span className={isDone ? styles.taskDone : isLocked ? styles.taskLocked : ''}>
                              {task.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {status === 'upcoming' && (
                      <p className={styles.lockedNote}>Unlocks once you finish Week {currentWeek}.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
