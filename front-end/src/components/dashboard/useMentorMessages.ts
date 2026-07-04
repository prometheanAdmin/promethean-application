'use client';

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import {
  getMessagesForMentor,
  sendStudentMessage,
  sendMentorReply,
  generateAutoReply,
  MESSAGES_EVENT,
} from '@/lib/mentorMessages';

function subscribe(callback: () => void) {
  window.addEventListener(MESSAGES_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(MESSAGES_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export function useMentorMessages(mentorId: string, mentorFirstName: string) {
  const messages = useSyncExternalStore(
    subscribe,
    () => getMessagesForMentor(mentorId),
    () => []
  );
  const replyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (replyTimeout.current) clearTimeout(replyTimeout.current);
    };
  }, []);

  const send = useCallback(
    (text: string) => {
      sendStudentMessage(mentorId, text);
      replyTimeout.current = setTimeout(() => {
        sendMentorReply(mentorId, generateAutoReply(mentorFirstName, text));
      }, 1100);
    },
    [mentorId, mentorFirstName]
  );

  return { messages, send };
}
