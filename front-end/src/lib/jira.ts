export type JiraColumnName = 'To Do' | 'In Progress' | 'Review' | 'Done';

export interface JiraTask {
  id: string;
  key: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  assigneeName: string;
  assigneeInitials: string;
  dueDate: string;
  column: JiraColumnName;
}

export const jiraColumns: JiraColumnName[] = ['To Do', 'In Progress', 'Review', 'Done'];

// Sample data — swap for a real Jira/backend API later. Kept as a flat list
// (not pre-grouped by column) so a future drag-and-drop implementation can
// just update each task's `column` field.
export const jiraTasks: JiraTask[] = [
  {
    id: 't1',
    key: 'HB-133',
    title: 'Write unit tests for ledger service',
    description: 'Cover the double-entry accounting edge cases.',
    priority: 'Medium',
    assigneeName: 'Ananya Rao',
    assigneeInitials: 'AR',
    dueDate: 'Jul 5',
    column: 'To Do',
  },
  {
    id: 't2',
    key: 'HB-136',
    title: 'Add rate limiting to /charge endpoint',
    description: 'Prevent abuse on the payments charge route.',
    priority: 'Low',
    assigneeName: 'Ananya Rao',
    assigneeInitials: 'AR',
    dueDate: 'Jul 9',
    column: 'To Do',
  },
  {
    id: 't3',
    key: 'HB-128',
    title: 'Build payments API',
    description: 'Core Stripe integration for the ledger service.',
    priority: 'High',
    assigneeName: 'Ananya Rao',
    assigneeInitials: 'AR',
    dueDate: 'Jul 3',
    column: 'In Progress',
  },
  {
    id: 't4',
    key: 'HB-131',
    title: 'Add idempotency keys to /charge',
    description: 'Fix duplicate ledger entries under retry.',
    priority: 'Urgent',
    assigneeName: 'Ananya Rao',
    assigneeInitials: 'AR',
    dueDate: 'Jul 4',
    column: 'In Progress',
  },
  {
    id: 't5',
    key: 'HB-127',
    title: 'Auth middleware for internal ops dashboard',
    description: 'Restrict access to signed-in mentors only.',
    priority: 'Medium',
    assigneeName: 'Marcus Cole',
    assigneeInitials: 'MC',
    dueDate: 'Jul 3',
    column: 'Review',
  },
  {
    id: 't6',
    key: 'HB-124',
    title: 'Set up CI pipeline',
    description: 'Lint, test, and build checks on every PR.',
    priority: 'Medium',
    assigneeName: 'Ananya Rao',
    assigneeInitials: 'AR',
    dueDate: 'Jun 28',
    column: 'Done',
  },
  {
    id: 't7',
    key: 'HB-119',
    title: 'Repo scaffolding & environment setup',
    description: 'Initial project structure, env vars, and dev scripts.',
    priority: 'Low',
    assigneeName: 'Ananya Rao',
    assigneeInitials: 'AR',
    dueDate: 'Jun 22',
    column: 'Done',
  },
];
