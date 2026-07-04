'use client';

import { useEffect, useRef, useState } from 'react';
import type { Mentor } from '@/lib/mentors';
import { useMentorMessages } from '@/components/dashboard/useMentorMessages';
import { CloseIcon, SendIcon } from '@/components/dashboard/icons';
import styles from './MessageMentorModal.module.css';

export default function MessageMentorModal({ mentor, onClose }: { mentor: Mentor; onClose: () => void }) {
  const firstName = mentor.name.split(' ')[0];
  const { messages, send } = useMentorMessages(mentor.id, firstName);
  const [draft, setDraft] = useState('');
  const [pendingSince, setPendingSince] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Derived, not stored state: "waiting" is true from the moment we send
  // until a mentor message newer than that moment shows up. Once `messages`
  // updates (via useSyncExternalStore) this recomputes on its own — no
  // effect needed to clear it.
  const awaitingReply =
    pendingSince !== null &&
    !messages.some((m) => m.sender === 'mentor' && new Date(m.timestamp).getTime() > pendingSince);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, awaitingReply]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    send(text);
    setDraft('');
    setPendingSince(Date.now());
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Message ${mentor.name}`}>
        <div className={styles.header}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mentor.imageSrc} alt={mentor.name} className={styles.avatar} />
          <div className={styles.headerText}>
            <p className={styles.name}>{mentor.name}</p>
            <p className={styles.subtitle}>{mentor.domain} mentor</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <div className={styles.messages} ref={listRef}>
          {messages.length === 0 && (
            <p className={styles.emptyState}>
              Say hi to {firstName} — questions about your batch, a ticket you&apos;re stuck on, or anything else.
            </p>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`${styles.bubbleRow} ${m.sender === 'student' ? styles.bubbleRowStudent : ''}`}>
              <div className={`${styles.bubble} ${m.sender === 'student' ? styles.bubbleStudent : ''}`}>
                {m.text}
              </div>
            </div>
          ))}
          {awaitingReply && (
            <div className={styles.bubbleRow}>
              <div className={styles.typingRow}>
                <span className={styles.typingDot} />
                <span className={styles.typingDot} />
                <span className={styles.typingDot} />
              </div>
            </div>
          )}
        </div>

        <div className={styles.composer}>
          <textarea
            className={styles.input}
            placeholder={`Message ${firstName}…`}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button type="button" className={styles.sendBtn} onClick={handleSend} disabled={!draft.trim()} aria-label="Send message">
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
