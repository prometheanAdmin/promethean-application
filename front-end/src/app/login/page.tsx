import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Login — Promethean',
};

export default function LoginPage() {
  permanentRedirect('/sign-in');
}
