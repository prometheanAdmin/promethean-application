import { api } from './api';
import { mentors as mentorPresets, type Mentor } from './mentors';

interface BackendDomainRead {
  id: string;
  name: string;
}

interface BackendMentorProfileRead {
  id: string;
  user_id: string;
  bio: string | null;
  company: string | null;
  experience_yrs: number | null;
  github_username: string | null;
  domains: string[];
  is_verified: boolean;
  rating_avg: string | null;
  rev_share_pct: string;
  created_at: string;
  updated_at: string;
}

interface BackendMentorListResponse {
  items: BackendMentorProfileRead[];
  total: number;
  page: number;
  per_page: number;
}

interface BackendMentorDetailRead extends BackendMentorProfileRead {
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

const presetByName = new Map(mentorPresets.map((mentor) => [mentor.name, mentor]));
const mentorUserIdByViewId = new Map<string, string>();

let cachedMentorDirectory: Mentor[] | null = null;
let inflightMentorDirectory: Promise<Mentor[]> | null = null;

function deriveInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((part) => (part[0] ?? '').toUpperCase())
    .join('');
}

function mapMentorDetailToViewModel(
  detail: BackendMentorDetailRead,
  domainById: Map<string, string>
): Mentor {
  const displayName =
    [detail.first_name, detail.last_name].filter(Boolean).join(' ').trim() ||
    'Promethean Mentor';
  const preset = presetByName.get(displayName);
  const domainName = domainById.get(detail.domains[0] ?? '') ?? preset?.domain ?? 'General';
  const rating =
    detail.rating_avg !== null && !Number.isNaN(Number(detail.rating_avg))
      ? Number(detail.rating_avg)
      : preset?.rating ?? 4.8;
  const viewId = preset?.id ?? detail.id;

  mentorUserIdByViewId.set(viewId, detail.user_id);

  return {
    id: viewId,
    name: displayName,
    initials: preset?.initials ?? deriveInitials(displayName),
    imageSrc: preset?.imageSrc ?? '/mentor_aisha.png',
    role: preset?.role ?? 'Industry Mentor',
    company: detail.company ?? preset?.company ?? 'Promethean',
    domain: domainName,
    expertise: preset?.expertise ?? [domainName],
    bio: detail.bio ?? preset?.bio ?? 'Industry mentor supporting Promethean students.',
    rating,
    sessionsCompleted: preset?.sessionsCompleted ?? Math.max(24, (detail.experience_yrs ?? 3) * 14),
    slotMinutes: preset?.slotMinutes ?? 30,
    hours: preset?.hours ?? [10, 14, 17],
  };
}

export async function fetchMentorDirectory(forceRefresh = false): Promise<Mentor[]> {
  if (!forceRefresh && cachedMentorDirectory) {
    return cachedMentorDirectory;
  }

  if (!forceRefresh && inflightMentorDirectory) {
    return inflightMentorDirectory;
  }

  inflightMentorDirectory = (async () => {
    const [domains, mentorList] = await Promise.all([
      api.get<BackendDomainRead[]>('/api/v1/domains'),
      api.get<BackendMentorListResponse>('/api/v1/mentors'),
    ]);

    mentorUserIdByViewId.clear();
    const domainById = new Map(domains.map((domain) => [domain.id, domain.name]));
    const mentorDetails = await Promise.all(
      mentorList.items.map((mentor) =>
        api.get<BackendMentorDetailRead>(`/api/v1/mentors/${mentor.id}`)
      )
    );

    cachedMentorDirectory = mentorDetails.map((detail) =>
      mapMentorDetailToViewModel(detail, domainById)
    );
    inflightMentorDirectory = null;
    return cachedMentorDirectory;
  })().catch((error) => {
    inflightMentorDirectory = null;
    throw error;
  });

  return inflightMentorDirectory;
}

export function findMentorByUserId(mentors: Mentor[], userId: string): Mentor | undefined {
  return mentors.find((mentor) => mentorUserIdByViewId.get(mentor.id) === userId);
}
