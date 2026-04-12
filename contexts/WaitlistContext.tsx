import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import * as Notifications from 'expo-notifications';

interface WaitlistCtx {
  isOnWaitlist: (eventId: string) => boolean;
  addToWaitlist: (eventId: string, eventName: string) => Promise<void>;
  removeFromWaitlist: (eventId: string) => void;
}

const WaitlistContext = createContext<WaitlistCtx>({
  isOnWaitlist: () => false,
  addToWaitlist: async () => {},
  removeFromWaitlist: () => {},
});

export function WaitlistProvider({ children }: { children: ReactNode }) {
  const [waitlist, setWaitlist] = useState<Set<string>>(new Set());

  const isOnWaitlist = useCallback((eventId: string) => waitlist.has(eventId), [waitlist]);

  const addToWaitlist = useCallback(async (eventId: string, eventName: string) => {
    setWaitlist((prev) => {
      const next = new Set(prev);
      next.add(eventId);
      return next;
    });
    // Demo: notify after 20 seconds to simulate a spot opening up
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎉 Posto disponibile!',
        body: `Si è liberato un posto per ${eventName}. Acquista subito prima che finisca!`,
      },
      trigger: { seconds: 20 } as Parameters<typeof Notifications.scheduleNotificationAsync>[0]['trigger'],
    });
  }, []);

  const removeFromWaitlist = useCallback((eventId: string) => {
    setWaitlist((prev) => {
      const next = new Set(prev);
      next.delete(eventId);
      return next;
    });
  }, []);

  return (
    <WaitlistContext.Provider value={{ isOnWaitlist, addToWaitlist, removeFromWaitlist }}>
      {children}
    </WaitlistContext.Provider>
  );
}

export const useWaitlist = () => useContext(WaitlistContext);
