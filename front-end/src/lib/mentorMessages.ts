export interface MentorMessage {
  id: string;
  mentorId: string;
  sender: 'student' | 'mentor';
  text: string;
  timestamp: string;
}

const STORAGE_KEY = 'pm:mentor-messages';
export const MESSAGES_EVENT = 'pm:mentor-messages-event';

function isBrowser() {
  return typeof window !== 'undefined';
}

let cachedRaw: string | null = null;
let cachedMessages: MentorMessage[] = [];

export function loadAllMessages(): MentorMessage[] {
  if (!isBrowser()) return cachedMessages;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedMessages;

  cachedRaw = raw;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    cachedMessages = Array.isArray(parsed) ? parsed : [];
  } catch {
    cachedMessages = [];
  }
  return cachedMessages;
}

// Cache the per-mentor filtered slice keyed on the identity of the source
// array so it's only recomputed when the underlying data actually changes —
// same reasoning as the raw-string cache above, needed for
// `useSyncExternalStore` (see useMentorMessages.ts) to get a stable
// reference when nothing changed.
const perMentorCache = new Map<string, { source: MentorMessage[]; data: MentorMessage[] }>();

export function getMessagesForMentor(mentorId: string): MentorMessage[] {
  const all = loadAllMessages();
  const cached = perMentorCache.get(mentorId);
  if (cached && cached.source === all) return cached.data;

  const filtered = all.filter((m) => m.mentorId === mentorId);
  perMentorCache.set(mentorId, { source: all, data: filtered });
  return filtered;
}

function persist(messages: MentorMessage[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  window.dispatchEvent(new CustomEvent(MESSAGES_EVENT));
}

function appendMessage(message: MentorMessage) {
  persist([...loadAllMessages(), message]);
}

export function sendStudentMessage(mentorId: string, text: string) {
  appendMessage({
    id: `msg-${Date.now()}`,
    mentorId,
    sender: 'student',
    text,
    timestamp: new Date().toISOString(),
  });
}

export function sendMentorReply(mentorId: string, text: string) {
  appendMessage({
    id: `msg-${Date.now()}-r`,
    mentorId,
    sender: 'mentor',
    text,
    timestamp: new Date().toISOString(),
  });
}

// Simple rule-based auto-reply so the DM thread feels alive without a real
// backend — same approach as the landing-page chatbot. Swap for a real
// messaging backend later.
const replyRules: { keywords: string[]; reply: string }[] = [
  { keywords: ['stuck', 'help', 'error', 'bug', 'broken'], reply: "Send me the file or the error and I'll take a look before our next session." },
  { keywords: ['review', 'pr', 'pull request', 'feedback'], reply: "Drop the PR link here — I'll leave comments today." },
  { keywords: ['thank', 'thanks'], reply: "Anytime — that's what I'm here for." },
  { keywords: ['session', 'book', 'time', 'schedule', 'reschedule'], reply: 'Grab a slot on my calendar and I\'ll see you there — ping me if none of the times work.' },
  { keywords: ['deadline', 'due', 'ship'], reply: "You've got this. Let's break it into smaller pieces if it's feeling tight." },
];

export function generateAutoReply(mentorFirstName: string, studentText: string): string {
  const normalized = studentText.toLowerCase();
  const match = replyRules.find((rule) => rule.keywords.some((k) => normalized.includes(k)));
  if (match) return match.reply;
  return `Got it — thanks for the update. I'll follow up in our next session. — ${mentorFirstName}`;
}
