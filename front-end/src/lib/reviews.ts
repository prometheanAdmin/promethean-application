export interface Review {
  id: string;
  mentorId: string;
  studentName: string;
  studentInitials: string;
  rating: number;
  comment: string;
  date: string;
}

// Sample data — swap for a real reviews API once sessions are tracked
// end-to-end (booked -> completed -> reviewed).
export const reviews: Review[] = [
  { id: 'rv1', mentorId: 'aisha-verma', studentName: 'Priya Nair', studentInitials: 'PN', rating: 5, comment: 'Aisha walked me through idempotency keys line by line. Completely changed how I think about payment APIs.', date: '2 weeks ago' },
  { id: 'rv2', mentorId: 'aisha-verma', studentName: 'Jordan Lee', studentInitials: 'JL', rating: 5, comment: 'Best code review I’ve had. Direct, specific, and she explained the "why" every time.', date: '3 weeks ago' },
  { id: 'rv3', mentorId: 'aisha-verma', studentName: 'Sam Okafor', studentInitials: 'SO', rating: 4, comment: 'Great session on ledger design. Would’ve liked a bit more time on the risk-scoring part.', date: '1 month ago' },
  { id: 'rv4', mentorId: 'marcus-cole', studentName: 'Wei Zhang', studentInitials: 'WZ', rating: 5, comment: 'Marcus is excellent at explaining FHIR without making it feel like a spec dump. Super patient.', date: '1 week ago' },
  { id: 'rv5', mentorId: 'marcus-cole', studentName: 'Fatima Al-Sayed', studentInitials: 'FA', rating: 5, comment: 'Helped me debug a pipeline issue that had blocked me for two days in 20 minutes.', date: '3 weeks ago' },
  { id: 'rv6', mentorId: 'diego-santos', studentName: 'Lucas Meyer', studentInitials: 'LM', rating: 4, comment: 'Sharp on Go performance. Session ran a little over but worth it.', date: '2 weeks ago' },
  { id: 'rv7', mentorId: 'diego-santos', studentName: 'Ravi Shah', studentInitials: 'RS', rating: 5, comment: 'Diego’s routing engine walkthrough was the clearest explanation of graph algorithms I’ve had.', date: '1 month ago' },
  { id: 'rv8', mentorId: 'lena-hoffmann', studentName: 'Chloe Martin', studentInitials: 'CM', rating: 5, comment: 'Lena reviewed my checkout flow and caught three accessibility issues I completely missed.', date: '4 days ago' },
  { id: 'rv9', mentorId: 'lena-hoffmann', studentName: 'Ben Turner', studentInitials: 'BT', rating: 5, comment: 'Genuinely one of the best React mentors I’ve worked with. Explains trade-offs, not just answers.', date: '2 weeks ago' },
];

export function getReviewsForMentor(mentorId: string): Review[] {
  return reviews.filter((r) => r.mentorId === mentorId);
}

export interface RatingBreakdown {
  average: number;
  total: number;
  counts: Record<1 | 2 | 3 | 4 | 5, number>;
}

export function getRatingBreakdown(mentorId: string): RatingBreakdown {
  const mentorReviews = getReviewsForMentor(mentorId);
  const counts: RatingBreakdown['counts'] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;

  for (const r of mentorReviews) {
    const bucket = Math.max(1, Math.min(5, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    counts[bucket] += 1;
    sum += r.rating;
  }

  return {
    average: mentorReviews.length > 0 ? sum / mentorReviews.length : 0,
    total: mentorReviews.length,
    counts,
  };
}
