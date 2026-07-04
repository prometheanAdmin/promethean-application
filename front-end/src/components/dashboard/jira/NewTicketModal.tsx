'use client';

import { useEffect, useState } from 'react';
import { jiraColumns, type JiraColumnName, type JiraTask } from '@/lib/jira';
import { CloseIcon } from '@/components/dashboard/icons';
import styles from './NewTicketModal.module.css';

const priorities: JiraTask['priority'][] = ['Low', 'Medium', 'High', 'Urgent'];

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

function formatDueDate(value: string) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface NewTicketModalProps {
  defaultColumn: JiraColumnName;
  nextTicketNumber: number;
  onClose: () => void;
  onCreate: (task: JiraTask) => void;
}

export default function NewTicketModal({ defaultColumn, nextTicketNumber, onClose, onCreate }: NewTicketModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<JiraTask['priority']>('Medium');
  const [assigneeName, setAssigneeName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [column, setColumn] = useState<JiraColumnName>(defaultColumn);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Give the ticket a title.');
      return;
    }

    const trimmedAssignee = assigneeName.trim() || 'Unassigned';

    onCreate({
      id: `t-${Date.now()}`,
      key: `HB-${nextTicketNumber}`,
      title: trimmedTitle,
      description: description.trim(),
      priority,
      assigneeName: trimmedAssignee,
      assigneeInitials: trimmedAssignee === 'Unassigned' ? '—' : initialsFromName(trimmedAssignee),
      dueDate: formatDueDate(dueDate) || 'No due date',
      column,
    });
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="New ticket">
        <div className={styles.header}>
          <h2 className={styles.title}>New ticket</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="ticket-title">Title</label>
            <input
              id="ticket-title"
              type="text"
              className={styles.input}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. Fix pagination bug on batches page"
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="ticket-desc">Description</label>
            <textarea
              id="ticket-desc"
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details…"
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="ticket-priority">Priority</label>
              <select
                id="ticket-priority"
                className={styles.select}
                value={priority}
                onChange={(e) => setPriority(e.target.value as JiraTask['priority'])}
              >
                {priorities.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="ticket-column">Column</label>
              <select
                id="ticket-column"
                className={styles.select}
                value={column}
                onChange={(e) => setColumn(e.target.value as JiraColumnName)}
              >
                {jiraColumns.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="ticket-assignee">Assignee</label>
              <input
                id="ticket-assignee"
                type="text"
                className={styles.input}
                value={assigneeName}
                onChange={(e) => setAssigneeName(e.target.value)}
                placeholder="e.g. Ananya Rao"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="ticket-due">Due date</label>
              <input
                id="ticket-due"
                type="date"
                className={styles.input}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn}>
              Create ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
