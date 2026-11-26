import { Redirect } from 'expo-router';

import { useApp } from '@/lib/store';

/** Entry point: signed-in users land on sessions, everyone else on sign-up. */
export default function Index() {
  const { profile } = useApp();
  return <Redirect href={profile ? '/sessions' : '/welcome'} />;
}
