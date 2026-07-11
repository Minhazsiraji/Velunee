import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createClient,
  processLock,
  type SupabaseClient,
} from '@supabase/supabase-js';
import {
  AppState,
  Platform,
  type AppStateStatus,
  type NativeEventSubscription,
} from 'react-native';
import 'react-native-url-polyfill/auto';

import { environment } from './environment';
import { secureAuthStorage } from './secure-auth-storage';

let client: SupabaseClient | null = null;
let authLifecycleSubscription: NativeEventSubscription | null = null;

function registerAuthLifecycle(
  supabaseClient: SupabaseClient,
): void {
  if (
    Platform.OS === 'web' ||
    authLifecycleSubscription
  ) {
    return;
  }

  const handleAppStateChange = (
    state: AppStateStatus,
  ): void => {
    if (state === 'active') {
      supabaseClient.auth.startAutoRefresh();
    } else {
      supabaseClient.auth.stopAutoRefresh();
    }
  };

  handleAppStateChange(AppState.currentState);

  authLifecycleSubscription = AppState.addEventListener(
    'change',
    handleAppStateChange,
  );
}

export function getSupabaseClient(): SupabaseClient | null {
  if (
    !environment.supabaseUrl ||
    !environment.supabaseAnonKey
  ) {
    return null;
  }

  if (client) {
    return client;
  }

  client = createClient(
    environment.supabaseUrl,
    environment.supabaseAnonKey,
    {
      auth: {
        storage:
          Platform.OS === 'web'
            ? AsyncStorage
            : secureAuthStorage,
        storageKey: 'velunee.auth.session.v1',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
        lock: processLock,
      },
    },
  );

  registerAuthLifecycle(client);

  return client;
}
