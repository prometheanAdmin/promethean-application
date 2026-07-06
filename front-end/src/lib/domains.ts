import { api } from './api';

export interface DomainRead {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
}

export async function fetchDomains(): Promise<DomainRead[]> {
  return api.get<DomainRead[]>('/api/v1/domains');
}
