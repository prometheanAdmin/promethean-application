import type { Metadata } from 'next';
import PageHeader from '@/components/dashboard/PageHeader';
import MentorBooking from '@/components/dashboard/mentors/MentorBooking';

export const metadata: Metadata = {
  title: 'Book a Mentor - Promethean',
};

export default function MentorsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Mentorship"
        title="Book a mentor."
        subtitle="Grab time with an industry mentor for code review, career advice, or getting unstuck."
      />
      <MentorBooking />
    </>
  );
}
