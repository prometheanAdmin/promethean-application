'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Mentor } from '@/lib/mentors';
import { getMentorAvailability } from '@/lib/mentors';
import { isSlotBooked, type Booking } from '@/lib/bookings';
import { CloseIcon, CalendarCheckIcon, CheckCircleIcon } from '@/components/dashboard/icons';
import styles from './BookingModal.module.css';

interface BookingModalProps {
  mentor: Mentor;
  existingBookings: Booking[];
  onClose: () => void;
  onBooked: (booking: Booking) => void;
}

export default function BookingModal({ mentor, existingBookings, onClose, onBooked }: BookingModalProps) {
  const availability = useMemo(() => getMentorAvailability(mentor), [mentor]);
  const [selectedDateISO, setSelectedDateISO] = useState(availability[0]?.dateISO ?? '');
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  const selectedDay = availability.find((d) => d.dateISO === selectedDateISO) ?? availability[0];

  const selectDate = (dateISO: string) => {
    setSelectedDateISO(dateISO);
    setSelectedTime(null);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleConfirm = () => {
    if (!selectedDay || !selectedTime) return;

    const booking: Booking = {
      id: `bk-${Date.now()}`,
      mentorId: mentor.id,
      mentorName: mentor.name,
      mentorInitials: mentor.initials,
      domain: mentor.domain,
      dateISO: selectedDay.dateISO,
      dateLabel: `${selectedDay.weekday}, ${selectedDay.monthLabel} ${selectedDay.dayNumber}`,
      time: selectedTime,
      durationMinutes: mentor.slotMinutes,
      topic: topic.trim() || 'General mentorship session',
      createdAt: new Date().toISOString(),
    };

    onBooked(booking);
    setConfirmedBooking(booking);
  };

  if (confirmedBooking) {
    return (
      <div className={styles.backdrop} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Booking confirmed">
          <div className={styles.success}>
            <span className={styles.successIcon}>
              <CheckCircleIcon />
            </span>
            <h2 className={styles.successTitle}>Session booked!</h2>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--muted)' }}>
              You&apos;re all set with {mentor.name.split(' ')[0]}.
            </p>

            <div className={styles.successCard}>
              <div className={styles.successRow}>
                <span>Mentor</span>
                <span>{mentor.name}</span>
              </div>
              <div className={styles.successRow}>
                <span>Date</span>
                <span>{confirmedBooking.dateLabel}</span>
              </div>
              <div className={styles.successRow}>
                <span>Time</span>
                <span>{confirmedBooking.time} &middot; {confirmedBooking.durationMinutes} min</span>
              </div>
              <div className={styles.successRow}>
                <span>Topic</span>
                <span>{confirmedBooking.topic}</span>
              </div>
            </div>

            <button type="button" className={styles.doneBtn} onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Book a session with ${mentor.name}`}>
        <div className={styles.header}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mentor.imageSrc} alt={mentor.name} className={styles.avatar} />
          <div className={styles.headerText}>
            <h2 className={styles.title}>Book {mentor.name}</h2>
            <p className={styles.subtitle}>{mentor.role} &middot; {mentor.slotMinutes} min session</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <p className={styles.sectionLabel}>Select a date</p>
        <div className={styles.dayRow}>
          {availability.map((day) => (
            <button
              key={day.dateISO}
              type="button"
              className={`${styles.dayBtn} ${day.dateISO === selectedDateISO ? styles.dayBtnActive : ''}`}
              onClick={() => selectDate(day.dateISO)}
            >
              <span className={styles.dayWeekday}>{day.weekday}</span>
              <span className={styles.dayNumber}>{day.dayNumber}</span>
              <span className={styles.dayMonth}>{day.monthLabel}</span>
              {day.isToday && <span className={styles.todayDot} />}
            </button>
          ))}
        </div>

        <p className={styles.sectionLabel}>Select a time</p>
        <div className={styles.slotGrid}>
          {selectedDay && selectedDay.slots.length > 0 ? (
            selectedDay.slots.map((time) => {
              const taken = isSlotBooked(existingBookings, mentor.id, selectedDay.dateISO, time);
              return (
                <button
                  key={time}
                  type="button"
                  className={`${styles.slotBtn} ${time === selectedTime ? styles.slotBtnActive : ''}`}
                  disabled={taken}
                  onClick={() => setSelectedTime(time)}
                >
                  {time}
                </button>
              );
            })
          ) : (
            <p className={styles.emptySlots}>No availability this day — try another date.</p>
          )}
        </div>

        <div className={styles.field}>
          <p className={styles.sectionLabel}>What do you want to discuss? (optional)</p>
          <textarea
            className={styles.textarea}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Review my payments API design before I ship it"
          />
        </div>

        {selectedDay && selectedTime && (
          <div className={styles.summary}>
            <CalendarCheckIcon />
            {selectedDay.weekday}, {selectedDay.monthLabel} {selectedDay.dayNumber} at {selectedTime}
          </div>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={styles.confirmBtn} disabled={!selectedTime} onClick={handleConfirm}>
            Confirm booking
          </button>
        </div>
      </div>
    </div>
  );
}
