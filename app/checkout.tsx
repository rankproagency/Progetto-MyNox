import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState, useRef, useEffect } from 'react';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';
import { useStripe } from '@stripe/stripe-react-native';
import { useEvents } from '../contexts/EventsContext';
import { useAuth } from '../contexts/AuthContext';
import { notifyTicketConfirmed, scheduleEventReminders } from '../hooks/useNotifications';
import { useTickets, MockTicket } from '../contexts/TicketsContext';

const PROXY_URL = 'https://mynox-stripe-proxy.onrender.com';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

function dbRowToMockTicket(row: any): MockTicket {
  const ev = row.events as any;
  const tt = row.ticket_types as any;
  const isTable = !tt;
  return {
    id: row.id,
    type: isTable ? 'table' : 'ticket',
    eventId: ev?.id ?? '',
    eventName: ev?.name ?? '',
    clubName: ev?.clubs?.name ?? '',
    rawDate: ev?.date ?? '',
    date: formatDate(ev?.date ?? ''),
    startTime: ev?.start_time ?? '',
    ticketLabel: isTable ? (row.table_name ?? 'Tavolo') : (tt?.label ?? ''),
    tableName: row.table_name ?? undefined,
    pricePaid: row.price_paid ?? 0,
    qrCode: row.qr_code,
    drinkQrCode: row.drink_qr_code ?? undefined,
    drinkUsed: row.drink_used ?? false,
    status: row.status,
    imageUrl: ev?.clubs?.image_url ?? undefined,
    eventImageUrl: ev?.image_url ?? undefined,
  };
}

const PROMO_CODES: Record<string, { type: 'percent' | 'flat'; value: number; label: string }> = {
  LAUNCH10: { type: 'percent', value: 10, label: '10% di sconto' },
  VIP20:    { type: 'percent', value: 20, label: '20% di sconto' },
  PADOVA:   { type: 'flat',    value: 5,  label: '€5 di sconto' },
  FRIENDS:  { type: 'percent', value: 15, label: '15% di sconto' },
};

export default function CheckoutScreen() {
  const { eventId, ticketId, tableId, tableName, qty } = useLocalSearchParams<{
    eventId: string;
    ticketId: string;
    tableId: string;
    tableName: string;
    qty: string;
  }>();
  const router = useRouter();
  const { addTickets } = useTickets();

  const { user } = useAuth();
  const { events } = useEvents();
  const event = events.find((e) => e.id === eventId);
  const ticket = ticketId ? event?.ticketTypes.find((t) => t.id === ticketId) : null;
  const table = tableId ? event?.tables.find((t) => t.id === tableId) : null;
  const quantity = Math.max(1, parseInt(qty ?? '1', 10));
  const isTableOnly = !ticket && !!table;

  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<(typeof PROMO_CODES)[string] | null>(null);
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'apple' | 'card' | 'google'>('apple');
  const [showSuccess, setShowSuccess] = useState(false);
  const [paying, setPaying] = useState(false);

  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showSuccess) {
      Animated.parallel([
        Animated.spring(successScale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 12,
          stiffness: 180,
        }),
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      successScale.setValue(0);
      successOpacity.setValue(0);
    }
  }, [showSuccess]);

  if (!event || (!ticket && !table)) return null;

  const ticketSubtotal = ticket ? ticket.price * quantity : 0;
  const discount = appliedPromo && !isTableOnly
    ? appliedPromo.type === 'percent'
      ? parseFloat(((ticketSubtotal * appliedPromo.value) / 100).toFixed(2))
      : Math.min(appliedPromo.value, ticketSubtotal)
    : 0;
  const discountedSubtotal = ticketSubtotal - discount;
  const tableDeposit = table?.deposit ?? 0;
  const base = isTableOnly ? tableDeposit : discountedSubtotal + tableDeposit;
  const commission = parseFloat((base * 0.08).toFixed(2));
  const total = parseFloat((base + commission).toFixed(2));

  async function handleApplyPromo() {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    setPromoLoading(false);
    const found = PROMO_CODES[code];
    if (found) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAppliedPromo(found);
      setPromoError('');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPromoError('Codice non valido o scaduto.');
      setAppliedPromo(null);
    }
  }

  async function handlePay() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPaying(true);

    try {
      const userId = user?.id ?? '';
      if (!userId) {
        Alert.alert('Errore', 'Devi essere autenticato per acquistare.');
        return;
      }

      // 1. Crea PaymentIntent tramite Edge Function
      const metadata: Record<string, string> = {
        event_id: event!.id,
        user_id: userId,
        quantity: String(quantity),
        includes_drink: String(ticket?.includesDrink ?? false),
      };
      if (ticket) metadata.ticket_type_id = ticket.id;
      if (tableId) {
        metadata.table_id = tableId;
        metadata.table_name = tableName?.trim() ?? '';
      }

      let createdTickets: any[];

      if (total === 0) {
        // Biglietto gratuito — bypass Stripe
        const freeRes = await fetch(`${PROXY_URL}/create-free-ticket`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metadata }),
        });
        const freeJson = await freeRes.json() as { tickets?: any[]; error?: string };
        if (!freeJson.tickets || freeJson.tickets.length === 0) {
          Alert.alert('Errore', freeJson.error ?? 'Impossibile creare i biglietti.');
          return;
        }
        createdTickets = freeJson.tickets;
      } else {
        // Flusso Stripe normale
        const fnRes = await fetch(`${PROXY_URL}/create-payment-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: Math.round(total * 100), metadata }),
        });

        const fnJson = await fnRes.json() as { clientSecret?: string; paymentIntentId?: string; error?: string };

        if (!fnJson.clientSecret || !fnJson.paymentIntentId) {
          Alert.alert('Errore pagamento', fnJson.error ?? 'Nessun client secret');
          return;
        }

        const { error: initError } = await initPaymentSheet({
          paymentIntentClientSecret: fnJson.clientSecret,
          merchantDisplayName: 'MyNox',
          style: 'alwaysDark',
          appearance: {
            colors: { primary: '#a855f7', background: '#07080f', componentBackground: '#12151f' },
          },
        });

        if (initError) {
          Alert.alert('Errore', initError.message);
          return;
        }

        const { error: payError } = await presentPaymentSheet();

        if (payError) {
          if (payError.code !== 'Canceled') {
            Alert.alert('Pagamento fallito', payError.message);
          }
          return;
        }

        const confirmRes = await fetch(`${PROXY_URL}/confirm-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_intent_id: fnJson.paymentIntentId }),
        });

        const confirmJson = await confirmRes.json() as { tickets?: any[]; error?: string };

        if (!confirmJson.tickets || confirmJson.tickets.length === 0) {
          Alert.alert('Errore', confirmJson.error ?? 'Impossibile creare i biglietti.');
          return;
        }
        createdTickets = confirmJson.tickets;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      try {
        await notifyTicketConfirmed(event!.id, event!.name, event!.club?.name ?? '');
        await scheduleEventReminders(event!.id, event!.name, event!.club?.name ?? '', event!.date, event!.startTime);
      } catch (_) {
        // notifiche non bloccanti
      }

      addTickets(createdTickets.map(dbRowToMockTicket));
      setShowSuccess(true);

    } catch (err) {
      Alert.alert('Errore imprevisto', String(err));
    } finally {
      setPaying(false);
    }
  }

  const isTable = isTableOnly;
  const successLabel = isTable
    ? table!.label
    : `${quantity}× ${ticket!.label}`;

  return (
    <>
      <Modal visible={showSuccess} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.successOverlay}>
          <Animated.View style={[styles.successCard, { opacity: successOpacity, transform: [{ scale: successScale }] }]}>
            <LinearGradient
              colors={['rgba(168,85,247,0.18)', 'transparent']}
              style={styles.successGradient}
              pointerEvents="none"
            />
            <View style={styles.successIconRing}>
              <Ionicons name="checkmark" size={38} color={Colors.white} />
            </View>
            <Text style={styles.successTitle}>Acquisto completato!</Text>
            <Text style={styles.successEventName}>{event!.name}</Text>
            <Text style={styles.successMeta}>{event!.club?.name} · {formatDate(event!.date)}</Text>
            <View style={styles.successDivider} />
            <View style={styles.successDetail}>
              <Ionicons name="ticket-outline" size={14} color={Colors.accent} />
              <Text style={styles.successDetailText}>{successLabel}</Text>
            </View>
            <View style={styles.successDetail}>
              <Ionicons name="card-outline" size={14} color={Colors.accent} />
              <Text style={styles.successDetailText}>€{total} pagati</Text>
            </View>
            <TouchableOpacity
              style={styles.successBtn}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.replace('/(tabs)/tickets');
              }}
            >
              <Text style={styles.successBtnText}>Vedi il mio biglietto</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.white} />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

    <View style={styles.outerContainer}>
      <LinearGradient
        colors={['rgba(168,85,247,0.20)', 'transparent']}
        style={styles.bgGradient}
        pointerEvents="none"
      />
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isTableOnly ? 'Prenota tavolo' : 'Checkout'}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Riepilogo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Riepilogo ordine</Text>
          <View style={styles.card}>
            <Text style={styles.eventName}>{event.name}</Text>
            <Text style={styles.clubName}>{event.club?.name} · {formatDate(event.date)}</Text>
            <View style={styles.divider} />

            {ticket && (
              <>
                {quantity > 1 ? (
                  <Row label={`Biglietto ${ticket.label} × ${quantity}`} value={`€${ticketSubtotal}`} />
                ) : (
                  <Row label={`Biglietto ${ticket.label}`} value={`€${ticket.price}`} />
                )}
                {ticket.includesDrink && (
                  <Row label={quantity > 1 ? `${quantity} free drink inclusi` : 'Free drink incluso'} value="✓" accent />
                )}
              </>
            )}
            {table && (
              <Row
                label={tableName ? `${table.label} · "${tableName}" (caparra)` : `${table.label} (caparra)`}
                value={`€${tableDeposit}`}
              />
            )}

            {appliedPromo && (
              <>
                <View style={styles.divider} />
                <Row label={`Codice promo (${appliedPromo.label})`} value={`-€${discount}`} success />
              </>
            )}

            <View style={styles.divider} />
            <Row label="Commissione servizio (8%)" value={`€${commission}`} muted />
            <Row label="Totale" value={`€${total}`} bold />
          </View>
        </View>

        {/* Codice promo — solo per biglietti */}
        {!isTableOnly && <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hai un codice promo?</Text>
          <View style={styles.promoRow}>
            <TextInput
              style={[styles.promoInput, appliedPromo && styles.promoInputSuccess]}
              value={promoInput}
              onChangeText={(v) => { setPromoInput(v); setPromoError(''); }}
              placeholder="Inserisci il codice"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!appliedPromo}
            />
            {appliedPromo ? (
              <TouchableOpacity
                style={styles.promoRemoveBtn}
                onPress={() => { setAppliedPromo(null); setPromoInput(''); }}
              >
                <Ionicons name="close" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.promoApplyBtn}
                onPress={handleApplyPromo}
                disabled={promoLoading || !promoInput.trim()}
                activeOpacity={0.8}
              >
                {promoLoading ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.promoApplyText}>Applica</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
          {appliedPromo && (
            <View style={styles.promoSuccess}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
              <Text style={styles.promoSuccessText}>Codice applicato: {appliedPromo.label}</Text>
            </View>
          )}
          {promoError ? (
            <View style={styles.promoErrorRow}>
              <Ionicons name="close-circle" size={14} color={Colors.error} />
              <Text style={styles.promoErrorText}>{promoError}</Text>
            </View>
          ) : null}
        </View>}

        {/* Disclaimer */}
        <View style={styles.section}>
          <View style={styles.disclaimer}>
            <Ionicons name="warning-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.disclaimerText}>
              Il buttafuori ha il diritto di negare l'accesso (dress code, stato del cliente).
              In caso di diniego non è previsto alcun rimborso. Acquistando accetti questa policy.
            </Text>
          </View>
        </View>

        {/* Metodi di pagamento */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paga con</Text>
          <PayMethod icon="logo-apple" label="Apple Pay" active={selectedMethod === 'apple'} onPress={() => { Haptics.selectionAsync(); setSelectedMethod('apple'); }} />
          <PayMethod icon="card-outline" label="Carta di credito / debito" active={selectedMethod === 'card'} onPress={() => { Haptics.selectionAsync(); setSelectedMethod('card'); }} />
          <PayMethod icon="phone-portrait-outline" label="Google Pay" active={selectedMethod === 'google'} onPress={() => { Haptics.selectionAsync(); setSelectedMethod('google'); }} />
        </View>

      </ScrollView>

      <View style={styles.ctaContainer}>
        <TouchableOpacity style={[styles.ctaButton, paying && { opacity: 0.7 }]} activeOpacity={0.85} onPress={handlePay} disabled={paying}>
          {paying ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <Ionicons
                name={selectedMethod === 'apple' ? 'logo-apple' : selectedMethod === 'google' ? 'phone-portrait-outline' : 'card-outline'}
                size={16}
                color={Colors.white}
              />
              <Text style={styles.ctaText}>
                {selectedMethod === 'apple' ? 'Paga con Apple Pay' : selectedMethod === 'google' ? 'Paga con Google Pay' : `Paga €${total}`}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
    </View>
    </>
  );
}

function Row({
  label, value, bold, muted, accent, success,
}: {
  label: string; value: string;
  bold?: boolean; muted?: boolean; accent?: boolean; success?: boolean;
}) {
  return (
    <View style={rowStyles.row}>
      <Text style={[rowStyles.label, muted && rowStyles.muted]}>{label}</Text>
      <Text style={[rowStyles.value, bold && rowStyles.bold, muted && rowStyles.muted, accent && rowStyles.accent, success && rowStyles.success]}>
        {value}
      </Text>
    </View>
  );
}

function PayMethod({ icon, label, active, onPress }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.payMethod, active && styles.payMethodActive]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <Ionicons name={icon} size={20} color={active ? Colors.accent : Colors.textSecondary} />
      <Text style={[styles.payLabel, active && styles.payLabelActive]}>{label}</Text>
      {active
        ? <Ionicons name="checkmark-circle" size={18} color={Colors.accent} />
        : <Ionicons name="radio-button-off" size={18} color={Colors.border} />
      }
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  label: { fontSize: 14, color: Colors.textSecondary },
  value: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  bold: { fontSize: 16, fontWeight: '800' },
  muted: { color: Colors.textMuted, fontSize: 12 },
  accent: { color: Colors.success },
  success: { color: Colors.success, fontWeight: '700' },
});

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: Colors.background },
  bgGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 16, fontFamily: Font.bold, color: Colors.textPrimary },
  backButton: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  scroll: { padding: 20, paddingBottom: 120 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontFamily: Font.bold, color: Colors.textPrimary, marginBottom: 12 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    padding: 16,
  },
  eventName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  clubName: { fontSize: 13, color: Colors.textSecondary, marginBottom: 14 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 12 },

  // Promo code
  promoRow: { flexDirection: 'row', gap: 10 },
  promoInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 14, color: Colors.textPrimary,
    fontWeight: '700', letterSpacing: 1,
  },
  promoInputSuccess: { borderColor: Colors.success },
  promoApplyBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14, paddingHorizontal: 18,
    justifyContent: 'center', alignItems: 'center',
    minWidth: 80,
  },
  promoApplyText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  promoRemoveBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  promoSuccess: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  promoSuccessText: { fontSize: 13, color: Colors.success, fontWeight: '500' },
  promoErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  promoErrorText: { fontSize: 13, color: Colors.error },

  disclaimer: {
    flexDirection: 'row', gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    padding: 14,
  },
  disclaimerText: { flex: 1, fontSize: 12, color: Colors.textMuted, lineHeight: 18 },
  payMethod: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    padding: 14, marginBottom: 8,
  },
  payMethodActive: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(168,85,247,0.07)',
  },
  payLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  payLabelActive: { color: Colors.accent, fontWeight: '700' },
  ctaContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  ctaButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 16, paddingVertical: 16,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  ctaText: { fontSize: 16, fontFamily: Font.extraBold, color: Colors.white },

  // Success overlay
  successOverlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 28,
  },
  successCard: {
    width: '100%', backgroundColor: '#111118',
    borderRadius: 28, borderWidth: 1, borderColor: 'rgba(168,85,247,0.25)',
    padding: 32, alignItems: 'center', overflow: 'hidden',
  },
  successGradient: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 160,
  },
  successIconRing: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.accent,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 24,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 12,
  },
  successTitle: {
    fontSize: 22, fontFamily: Font.extraBold, color: Colors.white,
    marginBottom: 8,
  },
  successEventName: {
    fontSize: 16, fontFamily: Font.bold, color: Colors.textPrimary,
    textAlign: 'center', marginBottom: 4,
  },
  successMeta: {
    fontSize: 13, color: Colors.textMuted, marginBottom: 24, textAlign: 'center',
  },
  successDivider: {
    width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 20,
  },
  successDetail: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10,
  },
  successDetailText: {
    fontSize: 14, color: Colors.textSecondary, fontFamily: Font.semiBold,
  },
  successBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 16, paddingVertical: 15, paddingHorizontal: 28,
    marginTop: 24, width: '100%',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  successBtnText: { fontSize: 15, fontFamily: Font.bold, color: Colors.white },
});
