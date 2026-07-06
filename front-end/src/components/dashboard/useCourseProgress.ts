'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { getCourseWeeks, loadCompletedTasks, toggleTaskCompletion, getCurrentWeekNumber, getWeekStatus, COURSE_PROGRESS_EVENT } from '@/lib/courseProgress';
import { useStudentContext } from './StudentContext';

const EMPTY_COMPLETED: Record<number, string[]> = {};

function subscribe(callback: () => void) {
  window.addEventListener(COURSE_PROGRESS_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(COURSE_PROGRESS_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export function useCourseProgress() {
  const { student } = useStudentContext();
  const weeks = useMemo(() => getCourseWeeks(student.domain, student.mentorName), [student.domain, student.mentorName]);

  const completed = useSyncExternalStore(
    subscribe,
    () => loadCompletedTasks(student.id, weeks),
    () => EMPTY_COMPLETED
  );

  const currentWeek = getCurrentWeekNumber(weeks, completed);

  const toggleTask = useCallback(
    (week: number, taskId: string) => toggleTaskCompletion(student.id, weeks, week, taskId),
    [student.id, weeks]
  );

  const statusForWeek = useCallback((week: number) => getWeekStatus(week, currentWeek), [currentWeek]);

  return { weeks, completed, currentWeek, totalWeeks: student.totalWeeks, toggleTask, statusForWeek };
}
