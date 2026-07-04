export interface ChatbotLink {
  label: string;
  href: string;
}

export interface ChatbotEntry {
  keywords: string[];
  response: string;
  link?: ChatbotLink;
}

// Simple rule-based knowledge base: first entry whose keyword appears in the
// user's message (case-insensitive substring match) wins. Swap this for a
// real AI/API-backed chatbot later without touching the calling component.
export const chatbotKnowledge: ChatbotEntry[] = [
  {
    keywords: ['hi', 'hello', 'hey', 'yo'],
    response: "Hey! I'm the Promethean assistant. Ask me about the dashboard, your tasks, classes, or updates.",
  },
  {
    keywords: ['what is this platform', 'what is promethean', 'about promethean', 'what does promethean'],
    response:
      'Promethean is a live job simulation — you work with an industry mentor inside a real domain (fintech, healthcare, logistics, and more), shipping real code instead of taking a course.',
    link: { label: 'Explore batches', href: '/#batches' },
  },
  {
    keywords: ['task', 'to-do', 'to do', 'todo', 'plan my day', 'productivity'],
    response: 'Daily tasks live in the built-in What-To-Do tracker, right inside your dashboard.',
    link: { label: 'Open What-To-Do Tracker', href: '/dashboard/todo' },
  },
  {
    keywords: ['class', 'zoom', 'session', 'live session'],
    response: 'Live sessions and recordings are under Zoom Classes in your dashboard.',
    link: { label: 'View Zoom Classes', href: '/dashboard/zoom' },
  },
  {
    keywords: ['update', 'progress', 'weekly'],
    response: 'Weekly Updates shows your sprint progress and mentor feedback as a slider — a new card every week.',
    link: { label: 'View Weekly Updates', href: '/dashboard/updates' },
  },
  {
    keywords: ['profile', 'account', 'my details', 'my info'],
    response: 'Your name, email, program, and mentor all live on the My Profile page.',
    link: { label: 'View My Profile', href: '/dashboard/profile' },
  },
  {
    keywords: ['jira', 'ticket', 'board', 'kanban'],
    response: 'Track tickets across To Do, In Progress, Review, and Done on your custom Jira Board.',
    link: { label: 'Open Jira Board', href: '/dashboard/jira' },
  },
  {
    keywords: ['reminder', 'deadline', 'standup'],
    response: 'Reminders keeps you on top of standups, deadlines, and reviews so nothing slips.',
    link: { label: 'View Reminders', href: '/dashboard/reminders' },
  },
  {
    keywords: ['community', 'chat', 'message', 'batchmates'],
    response: 'Community Chats connects you with your batch and mentors in one place.',
    link: { label: 'Open Community Chats', href: '/dashboard/community' },
  },
  {
    keywords: ['mentor'],
    response: 'Every batch is run by a working industry engineer as your mentor.',
    link: { label: 'Meet the mentors', href: '/#mentors' },
  },
  {
    keywords: ['dashboard'],
    response:
      'Your dashboard is the hub for everything: profile, community chats, Zoom classes, weekly updates, reminders, the Jira board, and your task tracker.',
    link: { label: 'Go to Dashboard', href: '/dashboard' },
  },
  {
    keywords: ['sign up', 'signup', 'join', 'enroll', 'register'],
    response: 'You can reserve a seat in an upcoming batch right from the homepage.',
    link: { label: 'Join a batch', href: '/signup' },
  },
];

export const chatbotFallback =
  "I'm not totally sure about that one yet — try asking about the dashboard, your tasks, classes, or weekly updates.";

export const chatbotSuggestedQuestions: string[] = [
  'What is this platform?',
  'How do I track my tasks?',
  'Where can I find my classes?',
  'How do I view project updates?',
];

export function getChatbotResponse(message: string): ChatbotEntry {
  const normalized = message.toLowerCase();
  const match = chatbotKnowledge.find((entry) =>
    entry.keywords.some((keyword) => normalized.includes(keyword))
  );
  return match ?? { keywords: [], response: chatbotFallback };
}
