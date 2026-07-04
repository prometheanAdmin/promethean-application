import type { JiraColumnName, JiraTask } from '@/lib/jira';
import JiraTaskCard from './JiraTaskCard';
import { PlusIcon } from '@/components/dashboard/icons';
import styles from './JiraColumn.module.css';

const dotClass: Record<JiraColumnName, string> = {
  'To Do': styles.dotTodo,
  'In Progress': styles.dotProgress,
  Review: styles.dotReview,
  Done: styles.dotDone,
};

interface JiraColumnProps {
  name: JiraColumnName;
  tasks: JiraTask[];
  draggedTaskId: string | null;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, column: JiraColumnName) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, column: JiraColumnName) => void;
  onMoveTo: (taskId: string, column: JiraColumnName) => void;
  onAddTicket: (column: JiraColumnName) => void;
}

export default function JiraColumn({
  name,
  tasks,
  draggedTaskId,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onMoveTo,
  onAddTicket,
}: JiraColumnProps) {
  return (
    <div
      className={`${styles.column} ${isDragOver ? styles.columnDragOver : ''}`}
      onDragOver={(e) => onDragOver(e, name)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, name)}
    >
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={`${styles.dot} ${dotClass[name]}`} />
          <h3 className={styles.name}>{name}</h3>
        </div>
        <span className={styles.count}>{tasks.length}</span>
      </div>

      <div className={styles.list}>
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <JiraTaskCard
              key={task.id}
              task={task}
              isDragging={task.id === draggedTaskId}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onMoveTo={onMoveTo}
            />
          ))
        ) : (
          <p className={styles.empty}>Drop a ticket here.</p>
        )}
      </div>

      <button type="button" className={styles.addBtn} onClick={() => onAddTicket(name)}>
        <PlusIcon />
        Add ticket
      </button>
    </div>
  );
}
