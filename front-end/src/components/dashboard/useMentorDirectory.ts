'use client';

import { useEffect, useState } from 'react';
import { fetchMentorDirectory } from '@/lib/mentorDirectory';
import { mentors as mentorFallbacks, type Mentor } from '@/lib/mentors';

interface UseMentorDirectoryResult {
  mentors: Mentor[];
  isLoading: boolean;
}

export function useMentorDirectory(): UseMentorDirectoryResult {
  const [mentors, setMentors] = useState<Mentor[]>(mentorFallbacks);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void fetchMentorDirectory()
      .then((directory) => {
        if (cancelled) return;
        setMentors(directory);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setMentors(mentorFallbacks);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { mentors, isLoading };
}
