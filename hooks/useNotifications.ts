import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Mostra l'alert anche con app in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// IDs deterministici per poter cancellare i reminder in seguito
function notifIds(eventId: string) {
  return {
    confirmed:  `confirmed-${eventId}`,
    dayBefore:  `reminder-24h-${eventId}`,
    sameDay:    `reminder-sameday-${eventId}`,
    oneHour:    `reminder-1h-${eventId}`,
  };
}

function secondsUntil(target: Date): number {
  return Math.floor((target.getTime() - Date.now()) / 1000);
}

// ─── Setup permessi + canale Android ─────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('mynox-default', {
      name: 'MyNox',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: '#a855f7',
      sound: 'default',
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ─── Biglietto confermato (immediata) ────────────────────────────────────────

export async function notifyTicketConfirmed(
  eventId: string,
  eventName: string,
  clubName: string,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: notifIds(eventId).confirmed,
    content: {
      title: 'Biglietto confermato!',
      body: `${eventName} @ ${clubName} — il tuo QR è pronto. Mostralo alla sicurezza.`,
      data: { route: '/(tabs)/tickets' },
      sound: 'default',
    },
    trigger: null, // immediata
  });
}

// ─── Tre reminder scalati prima dell'evento ───────────────────────────────────

export async function scheduleEventReminders(
  eventId: string,
  eventName: string,
  clubName: string,
  eventDate: string,   // 'YYYY-MM-DD'
  startTime: string,   // 'HH:MM'
): Promise<void> {
  const ids = notifIds(eventId);
  const [hh, mm] = startTime.split(':').map(Number);

  // Ora esatta dell'inizio evento
  const eventStart = new Date(eventDate + 'T12:00:00');
  eventStart.setHours(hh, mm, 0, 0);

  // ① Giorno prima alle 12:00 — "Domani si balla!"
  const dayBefore = new Date(eventDate + 'T12:00:00');
  dayBefore.setDate(dayBefore.getDate() - 1);
  dayBefore.setHours(12, 0, 0, 0);
  const secsDayBefore = secondsUntil(dayBefore);
  if (secsDayBefore > 0) {
    await Notifications.scheduleNotificationAsync({
      identifier: ids.dayBefore,
      content: {
        title: 'Domani si balla!',
        body: `${eventName} @ ${clubName} è domani sera. Hai tutto pronto?`,
        data: { route: '/(tabs)/tickets' },
        sound: 'default',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secsDayBefore },
    });
  }

  // ② Giorno stesso alle 18:00 — "Stasera si balla!"
  const sameDay = new Date(eventDate + 'T18:00:00');
  sameDay.setHours(18, 0, 0, 0);
  const secsSameDay = secondsUntil(sameDay);
  if (secsSameDay > 0) {
    await Notifications.scheduleNotificationAsync({
      identifier: ids.sameDay,
      content: {
        title: 'Stasera si balla!',
        body: `${eventName} inizia alle ${startTime}. Tieni il QR a portata di mano!`,
        data: { route: '/(tabs)/tickets' },
        sound: 'default',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secsSameDay },
    });
  }

  // ③ Un'ora prima — "Tra 1 ora!"
  const oneHourBefore = new Date(eventStart.getTime() - 60 * 60 * 1000);
  const secsOneHour = secondsUntil(oneHourBefore);
  if (secsOneHour > 0) {
    await Notifications.scheduleNotificationAsync({
      identifier: ids.oneHour,
      content: {
        title: `Tra 1 ora: ${eventName}`,
        body: `Sei pronto? Mostra il QR alla sicurezza di ${clubName}.`,
        data: { route: '/(tabs)/tickets' },
        sound: 'default',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secsOneHour },
    });
  }
}

// ─── Cancella tutti i reminder di un evento (es. rimborso) ───────────────────

export async function cancelEventNotifications(eventId: string): Promise<void> {
  await Promise.all(
    Object.values(notifIds(eventId)).map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => {})
    )
  );
}

// ─── Reminder evento salvato nei preferiti ───────────────────────────────────

function favoriteNotifIds(eventId: string) {
  return {
    dayBefore: `fav-reminder-24h-${eventId}`,
    sameDay:   `fav-reminder-sameday-${eventId}`,
  };
}

export async function scheduleFavoriteReminder(
  eventId: string,
  eventName: string,
  clubName: string,
  eventDate: string,
  startTime: string,
  hasTicket: boolean,
): Promise<void> {
  const ids = favoriteNotifIds(eventId);

  // Giorno prima alle 18:00
  const dayBefore = new Date(eventDate + 'T12:00:00');
  dayBefore.setDate(dayBefore.getDate() - 1);
  dayBefore.setHours(18, 0, 0, 0);
  const secsDayBefore = secondsUntil(dayBefore);
  if (secsDayBefore > 0) {
    await Notifications.scheduleNotificationAsync({
      identifier: ids.dayBefore,
      content: hasTicket ? {
        title: 'Domani si balla!',
        body: `Sei pronto per ${eventName} @ ${clubName}? Il QR è nella sezione Biglietti.`,
        data: { route: '/(tabs)/tickets' },
        sound: 'default',
      } : {
        title: 'Posti limitati!',
        body: `${eventName} è domani sera — acquista ora prima che si esauriscano.`,
        data: { eventId },
        sound: 'default',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secsDayBefore },
    });
  }

  // Giorno stesso alle 12:00
  const sameDay = new Date(eventDate + 'T12:00:00');
  sameDay.setHours(12, 0, 0, 0);
  const secsSameDay = secondsUntil(sameDay);
  if (secsSameDay > 0) {
    await Notifications.scheduleNotificationAsync({
      identifier: ids.sameDay,
      content: hasTicket ? {
        title: `Stasera: ${eventName}`,
        body: `Inizia alle ${startTime} @ ${clubName}. Tieni il QR a portata di mano!`,
        data: { route: '/(tabs)/tickets' },
        sound: 'default',
      } : {
        title: 'Ultima chance!',
        body: `${eventName} è stasera — non perdere i posti rimasti. Compra ora!`,
        data: { eventId },
        sound: 'default',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secsSameDay },
    });
  }
}

export async function cancelFavoriteReminder(eventId: string): Promise<void> {
  await Promise.all(
    Object.values(favoriteNotifIds(eventId)).map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => {})
    )
  );
}

// ─── Vecchia firma — compatibilità con codice esistente ──────────────────────

export async function scheduleEventReminder(
  eventName: string,
  eventDate: string,
): Promise<void> {
  const target = new Date(eventDate + 'T18:00:00');
  const secs = secondsUntil(target);
  if (secs <= 0) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Stasera si balla!',
      body: `${eventName} ti aspetta stasera. Mostra il QR all'ingresso.`,
      sound: 'default',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secs },
  });
}
