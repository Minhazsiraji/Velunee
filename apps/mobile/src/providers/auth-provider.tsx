import type { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import { getSupabaseClient } from '@/lib/supabase';
import { useChatStore } from '@/stores/chat-store';

type AuthStatus =
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'
  | 'unconfigured';

type VeluneeUser = User & {
  is_anonymous?: boolean;
};

interface AuthContextValue {
  session: Session | null;
  user: VeluneeUser | null;
  status: AuthStatus;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  isConfigured: boolean;
  signInAsGuest: (captchaToken?: string) => Promise<void>;
  signOutCurrentDevice: () => Promise<void>;
  signOutEverywhere: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: PropsWithChildren): React.JSX.Element {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const queryClient = useQueryClient();

  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const currentUserIdRef = useRef<string | null>(null);

  const applySession = useCallback(
    (nextSession: Session | null): void => {
      const nextUserId = nextSession?.user.id ?? null;

      if (currentUserIdRef.current !== nextUserId) {
        queryClient.clear();
        useChatStore.getState().clearConversation();
      }

      currentUserIdRef.current = nextUserId;
      setSession(nextSession);

      setStatus(
        nextSession ? 'authenticated' : 'unauthenticated',
      );
    },
    [queryClient],
  );

  useEffect(() => {
    if (!supabase) {
      setStatus('unconfigured');
      return;
    }

    let isMounted = true;
    let authEventReceived = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;

      authEventReceived = true;
      applySession(nextSession);
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted || authEventReceived) return;

      if (error) {
        console.warn(
          'Unable to restore Supabase session:',
          error.message,
        );

        applySession(null);
        return;
      }

      applySession(data.session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [applySession, supabase]);

  const value = useMemo<AuthContextValue>(() => {
    const user =
      (session?.user as VeluneeUser | undefined) ?? null;

    return {
      session,
      user,
      status,
      isLoading: status === 'loading',
      isAuthenticated: status === 'authenticated',
      isAnonymous: Boolean(user?.is_anonymous),
      isConfigured: status !== 'unconfigured',

      signInAsGuest: async (captchaToken?: string) => {
        if (!supabase) {
          throw new Error(
            'Supabase authentication is not configured.',
          );
        }

        const { error } =
          await supabase.auth.signInAnonymously(
            captchaToken
              ? {
                  options: {
                    captchaToken,
                  },
                }
              : {},
          );

        if (error) throw error;
      },

      signOutCurrentDevice: async () => {
        if (!supabase) return;

        const { error } = await supabase.auth.signOut({
          scope: 'local',
        });

        if (error) throw error;
      },

      signOutEverywhere: async () => {
        if (!supabase) return;

        const { error } = await supabase.auth.signOut({
          scope: 'global',
        });

        if (error) throw error;
      },
    };
  }, [session, status, supabase]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error(
      'useAuth must be used inside AuthProvider.',
    );
  }

  return value;
}
