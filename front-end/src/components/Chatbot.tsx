'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  BotIcon,
  ChatIcon,
  CloseIcon,
  MinusIcon,
  SendIcon,
  ArrowRightIcon,
} from '@/components/dashboard/icons';
import { chatbotSuggestedQuestions, getChatbotResponse, type ChatbotLink } from '@/lib/chatbotKnowledge';
import styles from './Chatbot.module.css';

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  link?: ChatbotLink;
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  sender: 'bot',
  text: "Hi, I'm the Promethean assistant. Ask me anything about the platform, your dashboard, or your tasks — or tap a question below.",
};

let messageId = 0;
const nextId = () => `msg-${Date.now()}-${messageId++}`;

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isMinimized]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMessage: Message = { id: nextId(), sender: 'user', text: trimmed };
    const { response, link } = getChatbotResponse(trimmed);
    const botMessage: Message = { id: nextId(), sender: 'bot', text: response, link };

    setMessages((prev) => [...prev, userMessage, botMessage]);
    setDraft('');
    setIsMinimized(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(draft);
  };

  const openPanel = () => {
    setMessages((prev) => (prev.length === 0 ? [WELCOME_MESSAGE] : prev));
    setIsOpen(true);
    setIsMinimized(false);
  };

  if (!isOpen) {
    return (
      <button type="button" className={styles.launcher} onClick={openPanel} aria-label="Open Promethean assistant">
        <ChatIcon />
      </button>
    );
  }

  return (
    <div className={styles.panel} role="dialog" aria-label="Promethean assistant chat">
      <div className={styles.header} onClick={() => setIsMinimized((v) => !v)}>
        <span className={styles.headerIcon}>
          <BotIcon />
        </span>
        <div className={styles.headerText}>
          <p className={styles.headerTitle}>Promethean Assistant</p>
          <div className={styles.headerStatus}>
            <span />
            Online
          </div>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label={isMinimized ? 'Expand chat' : 'Minimize chat'}
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized((v) => !v);
            }}
          >
            <MinusIcon />
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Close chat"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className={styles.body}>
          <div className={styles.messages}>
            {messages.map((m) => (
              <div key={m.id} className={`${styles.row} ${m.sender === 'user' ? styles.rowUser : styles.rowBot}`}>
                <div className={`${styles.bubble} ${m.sender === 'user' ? styles.bubbleUser : styles.bubbleBot}`}>
                  {m.text}
                  {m.link && (
                    <Link href={m.link.href} className={styles.bubbleLink} onClick={() => setIsOpen(false)}>
                      {m.link.label}
                      <ArrowRightIcon />
                    </Link>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className={styles.suggestions}>
            {chatbotSuggestedQuestions.map((q) => (
              <button key={q} type="button" className={styles.chip} onClick={() => send(q)}>
                {q}
              </button>
            ))}
          </div>

          <form className={styles.inputRow} onSubmit={handleSubmit}>
            <input
              type="text"
              className={styles.input}
              placeholder="Ask a question…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="Message"
            />
            <button type="submit" className={styles.sendBtn} disabled={!draft.trim()} aria-label="Send message">
              <SendIcon />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
