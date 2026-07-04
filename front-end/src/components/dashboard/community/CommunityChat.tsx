'use client';

import { useState } from 'react';
import type { ChatRoom } from '@/lib/community';
import { useCurrentStudent } from '@/components/dashboard/useCurrentStudent';
import { ArrowLeftIcon, ChatIcon, SendIcon } from '@/components/dashboard/icons';
import styles from './CommunityChat.module.css';

let localMessageId = 0;
const nextId = () => `local-${Date.now()}-${localMessageId++}`;

export default function CommunityChat({ rooms }: { rooms: ChatRoom[] }) {
  const { student } = useCurrentStudent();
  const [roomsState, setRoomsState] = useState(rooms);
  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.id ?? '');
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [draft, setDraft] = useState('');

  const selectedRoom = roomsState.find((r) => r.id === selectedRoomId);

  const selectRoom = (id: string) => {
    setSelectedRoomId(id);
    setMobileShowChat(true);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !selectedRoom) return;

    setRoomsState((prev) =>
      prev.map((room) =>
        room.id === selectedRoom.id
          ? {
              ...room,
              messages: [
                ...room.messages,
                {
                  id: nextId(),
                  sender: 'You',
                  initials: student.initials,
                  text,
                  timestamp: 'Just now',
                  isSelf: true,
                },
              ],
            }
          : room
      )
    );
    setDraft('');
  };

  return (
    <div className={styles.wrap}>
      <div className={`${styles.roomList} ${mobileShowChat ? styles.roomListHidden : ''}`}>
        <p className={styles.roomListHeader}>Chat rooms</p>
        {roomsState.map((room) => (
          <button
            key={room.id}
            type="button"
            className={`${styles.roomBtn} ${room.id === selectedRoomId ? styles.roomBtnActive : ''}`}
            onClick={() => selectRoom(room.id)}
          >
            <span className={styles.roomAvatar}>{room.name.slice(0, 2).toUpperCase()}</span>
            <span className={styles.roomInfo}>
              <p className={styles.roomName}>{room.name}</p>
              <p className={styles.roomMeta}>
                {room.description} &middot; {room.memberCount}
              </p>
            </span>
          </button>
        ))}
      </div>

      <div className={`${styles.chatWindow} ${mobileShowChat ? '' : styles.chatWindowHidden}`}>
        {selectedRoom ? (
          <>
            <div className={styles.chatHeader}>
              <button type="button" className={styles.backBtn} onClick={() => setMobileShowChat(false)} aria-label="Back to rooms">
                <ArrowLeftIcon />
              </button>
              <div>
                <h2 className={styles.chatHeaderTitle}>{selectedRoom.name}</h2>
                <p className={styles.chatHeaderMeta}>{selectedRoom.memberCount} members</p>
              </div>
            </div>

            {selectedRoom.messages.length > 0 ? (
              <div className={styles.messages}>
                {selectedRoom.messages.map((m) => (
                  <div key={m.id} className={`${styles.messageRow} ${m.isSelf ? styles.messageRowSelf : ''}`}>
                    <span className={styles.messageAvatar}>{m.initials}</span>
                    <div className={styles.messageBody}>
                      <div className={styles.messageMeta}>
                        <span className={styles.messageSender}>{m.sender}</span>
                        <span className={styles.messageTime}>{m.timestamp}</span>
                      </div>
                      <div className={styles.messageBubble}>{m.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <ChatIcon />
                <p>No messages yet — be the first to say something.</p>
              </div>
            )}

            <form className={styles.inputRow} onSubmit={handleSend}>
              <input
                type="text"
                className={styles.input}
                placeholder={`Message ${selectedRoom.name}…`}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-label="Message"
              />
              <button type="submit" className={styles.sendBtn} disabled={!draft.trim()} aria-label="Send message">
                <SendIcon />
              </button>
            </form>
          </>
        ) : (
          <div className={styles.emptyState}>
            <ChatIcon />
            <p>No chat rooms available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
