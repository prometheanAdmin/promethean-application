export interface ChatMessage {
  id: string;
  sender: string;
  initials: string;
  text: string;
  timestamp: string;
  isSelf?: boolean;
}

export interface ChatRoom {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  messages: ChatMessage[];
}

// Sample data — swap for a real-time chat backend (websockets/API) later.
// The `ChatRoom` / `ChatMessage` shapes are kept deliberately flat so a
// future fetch layer can drop straight in.
export const chatRooms: ChatRoom[] = [
  {
    id: 'general',
    name: 'General',
    description: 'All of Promethean',
    memberCount: 482,
    messages: [
      { id: 'g1', sender: 'Diego Santos', initials: 'DS', text: 'Anyone else\'s standup running long today?', timestamp: '9:02 AM' },
      { id: 'g2', sender: 'Lena Hoffmann', initials: 'LH', text: 'Ha, always. Worth it though.', timestamp: '9:04 AM' },
      { id: 'g3', sender: 'You', initials: 'AR', text: 'Just wrapped mine — ledger service demo went well!', timestamp: '9:10 AM', isSelf: true },
    ],
  },
  {
    id: 'fintech-12',
    name: 'Fintech · Batch 12',
    description: 'Your batch',
    memberCount: 24,
    messages: [
      { id: 'f1', sender: 'Aisha Verma', initials: 'AV', text: 'Great job on the PR review today, team.', timestamp: 'Yesterday' },
      { id: 'f2', sender: 'Marcus Cole', initials: 'MC', text: 'Pushed the idempotency key fix, ready for another look.', timestamp: 'Yesterday' },
      { id: 'f3', sender: 'You', initials: 'AR', text: 'On it — will review after lunch.', timestamp: 'Yesterday', isSelf: true },
      { id: 'f4', sender: 'Aisha Verma', initials: 'AV', text: 'Also — sprint demo is Friday 4pm, don\'t forget to prep your slide.', timestamp: '8:41 AM' },
    ],
  },
  {
    id: 'mentors',
    name: 'Mentors',
    description: 'Ask a mentor',
    memberCount: 12,
    messages: [
      { id: 'm1', sender: 'Aisha Verma', initials: 'AV', text: 'Office hours moved to 3pm today, same link.', timestamp: '11:20 AM' },
    ],
  },
  {
    id: 'announcements',
    name: 'Announcements',
    description: 'Read-only',
    memberCount: 482,
    messages: [
      { id: 'a1', sender: 'Promethean Team', initials: 'HB', text: 'New domain launching next month: Cybersecurity. Stay tuned!', timestamp: 'Mon' },
    ],
  },
];
