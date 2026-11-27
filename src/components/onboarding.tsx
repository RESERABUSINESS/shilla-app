import { createContext, useContext, useState, type ReactNode } from 'react';

import type { Gender, HobbyLevels } from '@/lib/types';

type Draft = { firstName: string; gender: Gender | null; hobbies: HobbyLevels; email: string; password: string; cityId: string | null };

const Ctx = createContext<{ draft: Draft; update: (d: Partial<Draft>) => void } | null>(null);

/** Holds sign-up answers across the onboarding screens until the profile is saved. */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>({ firstName: '', gender: null, hobbies: {}, email: '', password: '', cityId: null });
  return <Ctx.Provider value={{ draft, update: (d) => setDraft((p) => ({ ...p, ...d })) }}>{children}</Ctx.Provider>;
}

export function useOnboarding() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useOnboarding must be used inside <OnboardingProvider>');
  return v;
}
