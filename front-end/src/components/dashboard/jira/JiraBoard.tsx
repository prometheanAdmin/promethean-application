'use client';

import { useMemo, useState } from 'react';
import { jiraColumns, type JiraColumnName, type JiraTask } from '@/lib/jira';
import JiraColumn from './JiraColumn';
import NewTicketModal from './NewTicketModal';
import { PlusIcon } from '@/components/dashboard/icons';
import styles from './JiraBoard.module.css';

const TASK_DRAG_TYPE = 'application/x-promethean-task-id';

export default function JiraBoard({ tasks }: { tasks: JiraTask[] }) {
  const [taskList, setTaskList] = useState(tasks);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<JiraColumnName | null>(null);
  const [modalColumn, setModalColumn] = useState<JiraColumnName | null>(null);

  const nextTicketNumber = useMemo(() => {
    const numbers = taskList
      .map((t) => Number(t.key.replace(/^HB-/, '')))
      .filter((n) => !Number.isNaN(n));
    return (numbers.length ? Math.max(...numbers) : 100) + 1;
  }, [taskList]);

  const moveTask = (taskId: string, column: JiraColumnName) => {
    setTaskList((prev) => prev.map((t) => (t.id === taskId ? { ...t, column } : t)));
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData(TASK_DRAG_TYPE, taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, column: JiraColumnName) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(column);
  };

  const handleDrop = (e: React.DragEvent, column: JiraColumnName) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData(TASK_DRAG_TYPE) || draggedTaskId;
    if (taskId) moveTask(taskId, column);
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const handleCreate = (task: JiraTask) => {
    setTaskList((prev) => [...prev, task]);
    setModalColumn(null);
  };

  return (
    <div>
      <div className={styles.toolbar}>
        <p className={styles.hint}>Drag a ticket to move it, or use its &ldquo;Move to&rdquo; menu.</p>
        <button type="button" className={styles.newTicketBtn} onClick={() => setModalColumn('To Do')}>
          <PlusIcon />
          New ticket
        </button>
      </div>

      <div className={styles.board}>
        {jiraColumns.map((column) => (
          <JiraColumn
            key={column}
            name={column}
            tasks={taskList.filter((t) => t.column === column)}
            draggedTaskId={draggedTaskId}
            isDragOver={dragOverColumn === column}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={() => setDragOverColumn(null)}
            onDrop={handleDrop}
            onMoveTo={moveTask}
            onAddTicket={setModalColumn}
          />
        ))}
      </div>

      {modalColumn && (
        <NewTicketModal
          defaultColumn={modalColumn}
          nextTicketNumber={nextTicketNumber}
          onClose={() => setModalColumn(null)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
