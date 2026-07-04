import { jiraColumns, type JiraColumnName, type JiraTask } from '@/lib/jira';
import styles from './JiraTaskCard.module.css';

const priorityClass: Record<JiraTask['priority'], string> = {
  Low: styles.priorityLow,
  Medium: styles.priorityMedium,
  High: styles.priorityHigh,
  Urgent: styles.priorityUrgent,
};

interface JiraTaskCardProps {
  task: JiraTask;
  isDragging?: boolean;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragEnd: () => void;
  onMoveTo: (taskId: string, column: JiraColumnName) => void;
}

export default function JiraTaskCard({ task, isDragging, onDragStart, onDragEnd, onMoveTo }: JiraTaskCardProps) {
  return (
    <div
      className={`${styles.card} ${isDragging ? styles.cardDragging : ''}`}
      title={`${task.key} · ${task.priority} priority`}
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragEnd={onDragEnd}
    >
      <div className={styles.top}>
        <span className={styles.key}>{task.key}</span>
        <span className={`${styles.priority} ${priorityClass[task.priority]}`}>{task.priority}</span>
      </div>
      <h4 className={styles.title}>{task.title}</h4>
      {task.description && <p className={styles.desc}>{task.description}</p>}
      <div className={styles.footer}>
        <span className={styles.assignee} title={task.assigneeName}>
          {task.assigneeInitials}
        </span>
        <span className={styles.due}>{task.dueDate === 'No due date' ? task.dueDate : `Due ${task.dueDate}`}</span>
      </div>
      <select
        className={styles.moveSelect}
        value={task.column}
        onChange={(e) => onMoveTo(task.id, e.target.value as JiraColumnName)}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Move ${task.key} to a different column`}
      >
        {jiraColumns.map((c) => (
          <option key={c} value={c}>
            Move to: {c}
          </option>
        ))}
      </select>
    </div>
  );
}
