import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';
import { useEvents } from '../contexts/EventsContext';
import { notifyTicketConfirmed, scheduleEventReminders } from '../hooks/useNotifications';
import { useTickets } from '../contexts/TicketsContext';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const PROMO_CODES: Record<string, { type: 'percent' | 'flat'; value: number; label: string }> = {
  LAUNCH10: { type: 'percent', value: 10, label: '10% di sconto' },
  VIP20:    { type: 'percent', value: 20, label: '20% di sconto' },
  PADOVA:   { type: 'flat',    value: 5,  label: '€5 di sconto' },
  FRIENDS:  { type: 'percent', value: 15, label: '15% di sconto' },
};

export default function CheckoutScreen() {
  const { eventId, ticketId, tableId, qty } = useLocalSearchParams<{
    eventId: string;
    ticketId: string;
    tableId: string;
    qty: string;
  }>();
  const router = useRouter();
  const { addTickets } = useTickets();

  const { events } = useEvents();
  const event = events.find((e) => e.id === eventId);
  const ticket = event?.ticketTypes.find((t) => t.id === ticketId);
  const table = tableId ? event?.tables.find((t) => t.id === tableId) : null;
  const quantity = Math.max(1, parseInt(qty ?? '1', 10));

  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<(typeof PROMO_CODES)[string] | null>(null);
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'apple' | 'card' | 'google'>('apple');

  if (!event || !ticket) return null;

  const ticketSubtotal = ticket.price * quantity;
  const discount = appliedPromo
    ? appliedPromo.type === 'percent'
      ? parseFloat(((ticketSubtotal * appliedPromo.value) / 100).toFixed(2))
      : Math.min(appliedPromo.value, ticketSubtotal)
    : 0;
  const discountedSubtotal = ticketSubtotal - discount;
  const tableDeposit = table?.deposit ?? 0;
  const commission = parseFloat(((discountedSubtotal + tableDeposit) * 0.08).toFixed(2));
  const total = parseFloat((discountedSubtotal + tableDeposit + commission).toFixed(2));

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

  function handlePay() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Pagamento simulato',
      'In produzione qui si apre Stripe. Per ora procediamo come se il pagamento fosse andato a buon fine.',
      [
        {
          text: 'Conferma acquisto',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            try {
              await notifyTicketConfirmed(event!.id, event!.name, event!.club?.name ?? '');
              await scheduleEventReminders(event!.id, event!.name, event!.club?.name ?? '', event!.date, event!.startTime);
            } catch (_) {
              // notification failure must not block ticket creation
            }
            const formatted = formatDate(event!.date);
            const newTickets = Array.from({ length: quantity }, () => {
              const id = generateId();
              return {
                id,
                eventId: event!.id,
                eventName: event!.name,
                clubName: event!.club?.name ?? '',
                rawDate: event!.date,
                date: formatted,
                startTime: event!.startTime,
                ticketLabel: ticket!.label,
                qrCode: `MYNOX-TICKET-${id}`,
                drinkQrCode: `MYNOX-DRINK-${id}`,
                drinkUsed: false,
                status: 'valid' as const,
              };
            });
            await addTickets(newTickets);
            router.replace('/(tabs)/tickets');
          },
        },
        { text: 'Annulla', style: 'cancel' },
      ]
    );
  }

  return (
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
        <Text style={styles.headerTitle}>Checkout</Text>
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

            {quantity > 1 ? (
              <Row label={`Biglietto ${ticket.label} × ${quantity}`} value={`€${ticketSubtotal}`} />
            ) : (
              <Row label={`Biglietto ${ticket.label}`} value={`€${ticket.price}`} />
            )}
            {ticket.includesDrink && (
              <Row label={quantity > 1 ? `${quantity} free drink inclusi` : 'Free drink incluso'} value="✓" accent />
            )}
            {table && <Row label={`${table.label} (caparra)`} value={`€${tableDeposit}`} />}

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

        {/* Codice promo */}
        <View style={styles.section}>
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
        </View>

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
        <TouchableOpacity style={styles.ctaButton} activeOpacity={0.85} onPress={handlePay}>
          <Ionicons
            name={selectedMethod === 'apple' ? 'logo-apple' : selectedMethod === 'google' ? 'phone-portrait-outline' : 'card-outline'}
            size={16}
            color={Colors.white}
          />
          <Text style={styles.ctaText}>
            {selectedMethod === 'apple' ? 'Paga con Apple Pay' : selectedMethod === 'google' ? 'Paga con Google Pay' : `Paga €${total}`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
    </View>
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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
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
});
