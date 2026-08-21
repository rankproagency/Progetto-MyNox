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
  BackHandler,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getLocale } from '../lib/i18n';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';
import { useStripe } from '@stripe/stripe-react-native';
import { useEvents } from '../contexts/EventsContext';
import { useAuth } from '../contexts/AuthContext';
import { PriceTier } from '../types';
import { supabase } from '../lib/supabase';

function getEffectivePrice(price: number, priceTiers: PriceTier[], eventDate: string): number {
  if (!priceTiers.length) return price;
  const now = new Date();
  const base = new Date(eventDate + 'T00:00:00');
  for (const tier of priceTiers) {
    const [hh, mm] = tier.until.split(':').map(Number);
    const t = new Date(base);
    if (hh < 12) t.setDate(t.getDate() + 1);
    t.setHours(hh, mm, 0, 0);
    if (now <= t) return tier.price;
  }
  return price;
}
import { notifyTicketConfirmed, scheduleEventReminders } from '../hooks/useNotifications';
import { useTickets, MockTicket } from '../contexts/TicketsContext';

const PROXY_URL = 'https://mynox-stripe-proxy.onrender.com';

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 12000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('Il server non risponde. Riprova tra qualche secondo.');
    throw err;
  } finally {
    clearTimeout(id);
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(getLocale(), { weekday: 'short', day: 'numeric', month: 'short' });
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
    extras: Array.isArray(row.extras) && row.extras.length > 0 ? row.extras : undefined,
  };
}

function getUserAge(dateOfBirth?: string): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

type PromoResult = { type: 'percent' | 'flat'; value: number; label: string; promoId?: string };

export default function CheckoutScreen() {
  const { t } = useTranslation();
  const { eventId, ticketId, tableId, tableName, qty, extras: extrasParam } = useLocalSearchParams<{
    eventId: string;
    ticketId: string;
    tableId: string;
    tableName: string;
    qty: string;
    extras: string;
  }>();
  const router = useRouter();
  const { addTickets } = useTickets();

  const { user, pauseSessionValidation, resumeSessionValidation } = useAuth();
  const { events } = useEvents();
  const event = events.find((e) => e.id === eventId);
  const ticket = ticketId ? event?.ticketTypes.find((t) => t.id === ticketId) : null;
  const table = tableId ? event?.tables.find((t) => t.id === tableId) : null;
  const quantity = Math.max(1, parseInt(qty ?? '1', 10));
  const isTableOnly = !ticket && !!table;
  const parsedExtras: { extraId: string; label: string; quantity: number; unitDeposit: number }[] =
    extrasParam ? (() => { try { return JSON.parse(extrasParam); } catch { return []; } })() : [];

  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoResult | null>(null);
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'apple' | 'card' | 'google'>('apple');
  const [showSuccess, setShowSuccess] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);
  const [paying, setPaying] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termsConfirmed, setTermsConfirmed] = useState(false);

  const hasDob = !!user?.dateOfBirth;
  const userAge = getUserAge(user?.dateOfBirth);
  const isTooYoung = hasDob && userAge !== null && !!event && userAge < event.minAge;
  const needsAgeConfirm = hasDob && userAge !== null && userAge < 18 && !isTooYoung;

  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  function confirmLeave() {
    if (paying || showSuccess) return;
    Alert.alert(
      t('checkout.leave_title'),
      t('checkout.leave_body'),
      [
        { text: t('checkout.leave_stay'), style: 'cancel' },
        { text: t('checkout.leave_exit'), style: 'destructive', onPress: () => router.back() },
      ]
    );
  }

  // Android hardware back
  useEffect(() => {
    // Render.com free tier si spegne dopo inattività: lo svegliamo in background
    // mentre l'utente legge il checkout, così "Paga" trova il server già caldo.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 50000);
    fetch(`${PROXY_URL}/health`, { method: 'GET', signal: controller.signal })
      .catch(() => {})
      .finally(() => clearTimeout(timer));
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showSuccess) return false;
      confirmLeave();
      return true;
    });
    return () => sub.remove();
  }, [paying, showSuccess]);

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

  const ticketSubtotal = ticket ? getEffectivePrice(ticket.price, ticket.priceTiers, event.date) * quantity : 0;
  const discount = appliedPromo && !isTableOnly
    ? appliedPromo.type === 'percent'
      ? parseFloat(((ticketSubtotal * appliedPromo.value) / 100).toFixed(2))
      : Math.min(appliedPromo.value, ticketSubtotal)
    : 0;
  const discountedSubtotal = ticketSubtotal - discount;
  const tableDeposit = table?.deposit ?? 0;
  const extrasTotal = parsedExtras.reduce((sum, e) => sum + e.quantity * e.unitDeposit, 0);
  const base = isTableOnly ? tableDeposit + extrasTotal : discountedSubtotal + tableDeposit + extrasTotal;
  // 5% min €1.00 on tickets only — paid by customer
  // Extras and table deposits: 10% paid by club server-side, customer pays face value
  const commissionable = ticket ? discountedSubtotal : 0;
  const commission = commissionable > 0
    ? parseFloat((Math.max(commissionable * 0.05, 1.00)).toFixed(2))
    : 0;
  const total = parseFloat((base + commission).toFixed(2));

  async function handleApplyPromo() {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true);
    try {
      const res = await fetchWithTimeout(`${PROXY_URL}/validate-promo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, club_id: event?.clubId, event_id: event?.id }),
      }, 8000);
      const json = await res.json() as { valid?: boolean; type?: string; value?: number; label?: string; promo_id?: string; error?: string };
      if (json.valid) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setAppliedPromo({ type: json.type as 'percent' | 'flat', value: json.value!, label: json.label!, promoId: json.promo_id });
        setAppliedPromoCode(code);
        setPromoError('');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setPromoError(json.error ?? t('checkout.promo_code_invalid'));
        setAppliedPromo(null);
        setAppliedPromoCode(null);
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPromoError(t('checkout.promo_verify_error'));
      setAppliedPromo(null);
      setAppliedPromoCode(null);
    } finally {
      setPromoLoading(false);
    }
  }

  async function handlePay() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPaying(true);
    pauseSessionValidation();

    try {
      const userId = user?.id ?? '';
      if (!userId) {
        Alert.alert(t('common.error'), t('checkout.auth_required'));
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token ?? '';

      // 1. Crea PaymentIntent tramite Edge Function
      const metadata: Record<string, string> = {
        event_id: event!.id,
        user_id: userId,
        quantity: String(quantity),
        includes_drink: String(ticket?.includesDrink ?? false),
        event_date: event!.date,
      };
      if (ticket) metadata.ticket_type_id = ticket.id;
      if (tableId) {
        metadata.table_id = tableId;
        metadata.table_name = tableName?.trim() ?? '';
      }
      if (parsedExtras.length > 0) metadata.extras = JSON.stringify(parsedExtras);
      if (appliedPromo?.promoId) metadata.promo_id = appliedPromo.promoId;
      // Subtotale biglietti (senza tavolo/extras) usato dal webhook per calcolare price_paid corretto
      metadata.ticket_subtotal_cents = String(Math.round(ticketSubtotal * 100));

      let createdTickets: any[];

      if (total === 0) {
        // Biglietto gratuito — bypass Stripe
        const freeRes = await fetchWithTimeout(`${PROXY_URL}/create-free-ticket`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
          body: JSON.stringify({ metadata }),
        });
        const freeJson = await freeRes.json() as { tickets?: any[]; error?: string };
        if (!freeJson.tickets || freeJson.tickets.length === 0) {
          Alert.alert(t('common.error'), freeJson.error ?? t('checkout.free_ticket_error'));
          return;
        }
        createdTickets = freeJson.tickets;
        // Il promo (se presente) è stato consumato atomicamente nel proxy tramite metadata.promo_id.
      } else {
        // Flusso Stripe normale
        const rawBaseCents = Math.round((ticketSubtotal + tableDeposit + extrasTotal) * 100);
        const fnRes = await fetchWithTimeout(`${PROXY_URL}/create-payment-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
          body: JSON.stringify({
            base_amount_cents: rawBaseCents,
            ticket_subtotal_cents: Math.round(ticketSubtotal * 100),
            promo_code: appliedPromoCode ?? undefined,
            club_id: event?.clubId,
            metadata,
          }),
        }, 30000);

        const fnJson = await fnRes.json() as { clientSecret?: string; paymentIntentId?: string; error?: string };

        if (!fnJson.clientSecret || !fnJson.paymentIntentId) {
          Alert.alert(t('checkout.payment_error'), fnJson.error ?? 'Nessun client secret');
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
          Alert.alert(t('common.error'), initError.message);
          return;
        }

        const { error: payError } = await presentPaymentSheet();

        if (payError) {
          if (payError.code !== 'Canceled') {
            Alert.alert(t('checkout.payment_error'), payError.message);
          }
          return;
        }

        let confirmedTickets: any[] | null = null;
        let fatalError: string | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            if (attempt > 0) await new Promise((r) => setTimeout(r, 2500));
            const confirmRes = await fetchWithTimeout(`${PROXY_URL}/confirm-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
              body: JSON.stringify({ payment_intent_id: fnJson.paymentIntentId }),
            }, attempt === 0 ? 12000 : 8000);
            const confirmJson = await confirmRes.json() as { tickets?: any[]; error?: string };
            if (confirmJson.tickets && confirmJson.tickets.length > 0) {
              confirmedTickets = confirmJson.tickets;
              break;
            }
            // 4xx = errore non recuperabile, non ha senso ritentare
            if (confirmRes.status >= 400 && confirmRes.status < 500) {
              fatalError = confirmJson.error ?? t('checkout.unknown_error');
              break;
            }
          } catch (_) {}
        }

        if (fatalError) {
          // Il server ha emesso un rimborso automatico (sold_out / table_already_booked / extra_sold_out).
          const isTableBooked = fatalError.includes('table_already_booked');
          const isExtraSoldOut = fatalError.includes('extra_sold_out');
          Alert.alert(
            isTableBooked
              ? t('checkout.table_taken_title')
              : isExtraSoldOut
              ? t('checkout.extra_soldout_title')
              : t('checkout.tickets_issue_title'),
            isTableBooked
              ? t('checkout.table_taken_body')
              : isExtraSoldOut
              ? t('checkout.extra_soldout_body')
              : t('checkout.tickets_issue_body'),
            [{ text: t('common.ok') }]
          );
          return;
        }

        if (confirmedTickets) {
          createdTickets = confirmedTickets;
        } else {
          // Timeout — pagamento avvenuto, il webhook Stripe creerà il biglietto.
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setPaymentPending(true);
          setShowSuccess(true);
          return;
        }

        // Il promo è già stato consumato atomicamente in create-payment-intent.
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
      Alert.alert(t('common.error'), String(err));
    } finally {
      setPaying(false);
      resumeSessionValidation();
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
              colors={[Colors.accentBgMid, 'transparent']}
              style={styles.successGradient}
              pointerEvents="none"
            />
            <View style={styles.successIconRing}>
              <Ionicons name={paymentPending ? 'time-outline' : 'checkmark'} size={38} color={Colors.white} />
            </View>
            <Text style={styles.successTitle}>
              {paymentPending ? t('checkout.success_pending_title') : t('checkout.success_title')}
            </Text>
            <Text style={styles.successEventName}>{event!.name}</Text>
            <Text style={styles.successMeta}>{event!.club?.name} · {formatDate(event!.date)}</Text>
            <View style={styles.successDivider} />
            {paymentPending ? (
              <View style={styles.successDetail}>
                <Ionicons name="hourglass-outline" size={14} color={Colors.accent} />
                <Text style={styles.successDetailText}>{t('checkout.success_pending_detail')}</Text>
              </View>
            ) : (
              <>
                <View style={styles.successDetail}>
                  <Ionicons name="ticket-outline" size={14} color={Colors.accent} />
                  <Text style={styles.successDetailText}>{successLabel}</Text>
                </View>
                <View style={styles.successDetail}>
                  <Ionicons name="card-outline" size={14} color={Colors.accent} />
                  <Text style={styles.successDetailText}>{t('checkout.success_paid', { total })}</Text>
                </View>
              </>
            )}
            <TouchableOpacity
              style={styles.successBtn}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.replace('/(tabs)/tickets');
              }}
            >
              <Text style={styles.successBtnText}>{t('checkout.success_view_tickets')}</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.white} />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

    <View style={styles.outerContainer}>
      <LinearGradient
        colors={[Colors.accentBgMid, 'transparent']}
        style={styles.bgGradient}
        pointerEvents="none"
      />
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={confirmLeave} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isTableOnly ? t('checkout.header_title_table') : t('checkout.header_title_checkout')}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Riepilogo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('checkout.section_order_summary')}</Text>
          <View style={styles.card}>
            <Text style={styles.eventName}>{event.name}</Text>
            <Text style={styles.clubName}>{event.club?.name} · {formatDate(event.date)}</Text>
            <View style={styles.divider} />

            {ticket && (
              <>
                {quantity > 1 ? (
                  <Row label={`${t('checkout.ticket_label_prefix')}${ticket.label} × ${quantity}`} value={`€${ticketSubtotal}`} />
                ) : (
                  <Row label={`${t('checkout.ticket_label_prefix')}${ticket.label}`} value={`€${getEffectivePrice(ticket.price, ticket.priceTiers, event.date)}`} />
                )}
                {ticket.includesDrink && (
                  <Row label={quantity > 1 ? `${quantity} ${t('checkout.free_drink_plural')}` : t('checkout.free_drink_single')} value="✓" accent />
                )}
              </>
            )}
            {table && (
              <Row
                label={tableName ? `${table.label} · "${tableName}"${t('checkout.deposit_label_suffix')}` : `${table.label}${t('checkout.deposit_label_suffix')}`}
                value={`€${tableDeposit}`}
              />
            )}
            {parsedExtras.map((e) => (
              <Row
                key={e.extraId}
                label={`${e.label} × ${e.quantity}${t('checkout.deposit_label_suffix')}`}
                value={`€${(e.quantity * e.unitDeposit).toFixed(2)}`}
              />
            ))}

            {appliedPromo && (
              <>
                <View style={styles.divider} />
                <Row label={`${t('checkout.promo_applied_prefix')}${appliedPromo.label}`} value={`-€${discount}`} success />
              </>
            )}

            <View style={styles.divider} />
            {commission > 0 && <Row label={t('checkout.service_fee')} value={`€${commission}`} muted />}
            <Row label={t('checkout.total')} value={`€${total}`} bold />
          </View>
        </View>

        {/* Codice promo — solo per biglietti */}
        {!isTableOnly && <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('checkout.promo_code_section')}</Text>
          <View style={styles.promoRow}>
            <TextInput
              style={[styles.promoInput, appliedPromo && styles.promoInputSuccess]}
              value={promoInput}
              onChangeText={(v) => { setPromoInput(v); setPromoError(''); }}
              placeholder={t('checkout.promo_placeholder')}
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!appliedPromo}
            />
            {appliedPromo ? (
              <TouchableOpacity
                style={styles.promoRemoveBtn}
                onPress={() => { setAppliedPromo(null); setAppliedPromoCode(null); setPromoInput(''); }}
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
                  <Text style={styles.promoApplyText}>{t('checkout.promo_apply_btn')}</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
          {appliedPromo && (
            <View style={styles.promoSuccess}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
              <Text style={styles.promoSuccessText}>{t('checkout.promo_applied_prefix')}{appliedPromo.label}</Text>
            </View>
          )}
          {promoError ? (
            <View style={styles.promoErrorRow}>
              <Ionicons name="close-circle" size={14} color={Colors.error} />
              <Text style={styles.promoErrorText}>{promoError}</Text>
            </View>
          ) : null}
        </View>}

        {/* Disclaimer + T&C checkbox */}
        <View style={styles.section}>
          <View style={styles.disclaimer}>
            <Ionicons name="warning-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.disclaimerText}>
              {t('checkout.disclaimer_text')}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.ageCheckRow, { marginTop: 12 }, !termsConfirmed && styles.ageCheckRowError]}
            activeOpacity={0.7}
            onPress={() => { Haptics.selectionAsync(); setTermsConfirmed((v) => !v); }}
          >
            <View style={[styles.ageCheckbox, termsConfirmed && styles.ageCheckboxChecked]}>
              {termsConfirmed && <Ionicons name="checkmark" size={12} color={Colors.white} />}
            </View>
            <Text style={styles.ageCheckLabel}>
              {t('checkout.terms_confirm_prefix')}
              <Text style={[styles.ageCheckBold, { color: Colors.accent }]} onPress={() => router.push('/terms')}>
                {t('checkout.terms_confirm_link')}
              </Text>
              {t('checkout.terms_confirm_suffix')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* DOB mancante — blocco acquisto con rimando al profilo */}
        {!hasDob && (
          <View style={styles.section}>
            <View style={styles.dobMissingBanner}>
              <Ionicons name="calendar-outline" size={18} color="#f59e0b" />
              <View style={{ flex: 1 }}>
                <Text style={styles.dobMissingTitle}>{t('checkout.dob_missing_title')}</Text>
                <Text style={styles.dobMissingText}>
                  {t('checkout.dob_missing_text')}
                  <Text style={styles.dobMissingLink} onPress={() => router.push('/edit-profile')}>
                    {t('checkout.dob_missing_link')}
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Consenso genitore — minorenne con capacità contrattuale (evento ok, ma < 18) */}
        {needsAgeConfirm && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.ageCheckRow, !ageConfirmed && styles.ageCheckRowError]}
              activeOpacity={0.7}
              onPress={() => { Haptics.selectionAsync(); setAgeConfirmed((v) => !v); }}
            >
              <View style={[styles.ageCheckbox, ageConfirmed && styles.ageCheckboxChecked]}>
                {ageConfirmed && <Ionicons name="checkmark" size={12} color={Colors.white} />}
              </View>
              <Text style={styles.ageCheckLabel}>
                {t('checkout.age_confirm_label')}
                <Text style={styles.ageCheckBold}>{t('checkout.age_confirm_bold')}</Text>
                {t('checkout.age_confirm_suffix')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Blocco età — utente troppo giovane per questo evento */}
        {isTooYoung && (
          <View style={styles.section}>
            <View style={styles.tooYoungBanner}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.error} />
              <View style={{ flex: 1 }}>
                <Text style={styles.tooYoungTitle}>{t('checkout.too_young_title', { minAge: event!.minAge })}</Text>
                <Text style={styles.tooYoungText}>{t('checkout.too_young_text', { minAge: event!.minAge })}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Metodi di pagamento */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('checkout.pay_with')}</Text>
          <PayMethod icon="logo-apple" label={t('checkout.pay_apple')} active={selectedMethod === 'apple'} onPress={() => { Haptics.selectionAsync(); setSelectedMethod('apple'); }} />
          <PayMethod icon="card-outline" label={t('checkout.pay_card')} active={selectedMethod === 'card'} onPress={() => { Haptics.selectionAsync(); setSelectedMethod('card'); }} />
          <PayMethod icon="phone-portrait-outline" label={t('checkout.pay_google')} active={selectedMethod === 'google'} onPress={() => { Haptics.selectionAsync(); setSelectedMethod('google'); }} />
        </View>

      </ScrollView>

      <View style={styles.ctaContainer}>
        <TouchableOpacity
          style={[styles.ctaButton, (paying || !hasDob || !termsConfirmed || isTooYoung || (needsAgeConfirm && !ageConfirmed)) && { opacity: 0.5 }]}
          activeOpacity={0.85}
          onPress={handlePay}
          disabled={paying || !hasDob || !termsConfirmed || isTooYoung || (needsAgeConfirm && !ageConfirmed)}
        >
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
                {selectedMethod === 'apple' ? t('checkout.pay_btn_apple') : selectedMethod === 'google' ? t('checkout.pay_btn_google') : t('checkout.pay_btn_card', { total })}
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
  value: { fontSize: 14, color: Colors.textPrimary, fontFamily: Font.medium },
  bold: { fontSize: 16, fontFamily: Font.extraBold },
  muted: { color: Colors.textMuted, fontSize: 12 },
  accent: { color: Colors.success },
  success: { color: Colors.success, fontFamily: Font.bold },
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
  eventName: { fontSize: 16, fontFamily: Font.bold, color: Colors.textPrimary, marginBottom: 4 },
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
    fontFamily: Font.bold, letterSpacing: 1,
  },
  promoInputSuccess: { borderColor: Colors.success },
  promoApplyBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14, paddingHorizontal: 18,
    justifyContent: 'center', alignItems: 'center',
    minWidth: 80,
  },
  promoApplyText: { fontSize: 14, fontFamily: Font.bold, color: Colors.white },
  promoRemoveBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  promoSuccess: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  promoSuccessText: { fontSize: 13, color: Colors.success, fontFamily: Font.medium },
  promoErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  promoErrorText: { fontSize: 13, color: Colors.error },

  disclaimer: {
    flexDirection: 'row', gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    padding: 14,
  },
  disclaimerText: { flex: 1, fontSize: 12, color: Colors.textMuted, lineHeight: 18 },

  dobMissingBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
    padding: 14,
  },
  dobMissingTitle: { fontSize: 13, fontFamily: Font.bold, color: '#f59e0b', marginBottom: 3 },
  dobMissingText: { fontSize: 12, color: Colors.textMuted, lineHeight: 18 },
  dobMissingLink: { color: '#f59e0b', fontFamily: Font.semiBold },
  tooYoungBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    padding: 14,
  },
  tooYoungTitle: { fontSize: 13, fontFamily: Font.bold, color: Colors.error, marginBottom: 3 },
  tooYoungText: { fontSize: 12, color: Colors.textMuted, lineHeight: 18 },

  ageCheckRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    padding: 14,
  },
  ageCheckRowError: {
    borderColor: Colors.error,
    backgroundColor: 'rgba(239,68,68,0.06)',
  },
  ageCheckbox: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.background,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 1, flexShrink: 0,
  },
  ageCheckboxChecked: {
    backgroundColor: Colors.accent, borderColor: Colors.accent,
  },
  ageCheckLabel: {
    flex: 1, fontSize: 12, color: Colors.textMuted, lineHeight: 18,
  },
  ageCheckBold: {
    color: Colors.textPrimary, fontFamily: Font.bold,
  },
  payMethod: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    padding: 14, marginBottom: 8,
  },
  payMethodActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentBg,
  },
  payLabel: { flex: 1, fontSize: 14, fontFamily: Font.medium, color: Colors.textPrimary },
  payLabelActive: { color: Colors.accent, fontFamily: Font.bold },
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
    backgroundColor: Colors.overlay,
    paddingHorizontal: 28,
  },
  successCard: {
    width: '100%', backgroundColor: '#111118',
    borderRadius: 28, borderWidth: 1, borderColor: Colors.accentBorder,
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
