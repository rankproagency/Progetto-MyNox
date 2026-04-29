import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Share, Image, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Colors } from '../../constants/colors';
import { Font } from '../../constants/typography';
import { useTickets, MockTicket } from '../../contexts/TicketsContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCountdown } from '../../hooks/useCountdown';
import AppHeader from '../../components/AppHeader';

type Tab = 'future' | 'past';

function CountdownBadge({ rawDate, startTime }: { rawDate: string; startTime: string }) {
  const { label, isExpired } = useCountdown(rawDate, startTime);
  if (isExpired) return null;
  return (
    <View style={countdownStyles.badge}>
      <Ionicons name="timer-outline" size={11} color={Colors.accent} />
      <Text style={countdownStyles.text}>{label}</Text>
    </View>
  );
}

const countdownStyles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  text: { fontSize: 11, fontWeight: '700', color: Colors.accent },
});

function isDatePast(rawDate: string, endTime?: string): boolean {
  if (!rawDate) return false;
  if (endTime) {
    // L'endTime è nel formato HH:MM. Se è <= "12:00" assume che la serata
    // finisca il giorno dopo (es. "05:00" → giorno +1 alle 05:00).
    const [hh, mm] = endTime.split(':').map(Number);
    const cutoff = new Date(rawDate);
    const endsNextDay = hh < 12;
    if (endsNextDay) cutoff.setDate(cutoff.getDate() + 1);
    cutoff.setHours(hh, mm, 0, 0);
    return new Date() > cutoff;
  }
  // Fallback: mezzogiorno del giorno successivo
  const cutoff = new Date(rawDate);
  cutoff.setDate(cutoff.getDate() + 1);
  cutoff.setHours(12, 0, 0, 0);
  return new Date() > cutoff;
}

function categorize(ticket: MockTicket): Tab {
  if (ticket.status === 'used' || isDatePast(ticket.rawDate, ticket.endTime)) return 'past';
  return 'future';
}

const TAB_CONFIG: { key: Tab; label: string }[] = [
  { key: 'future', label: 'Futuri' },
  { key: 'past', label: 'Passati' },
];

export default function TicketsScreen() {
  const router = useRouter();
  const { tickets, removeTicket, refreshTickets } = useTickets();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('future');
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimCode, setClaimCode] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);

  const filtered = tickets.filter((t) => categorize(t) === activeTab);
  const counts: Record<Tab, number> = {
    future: tickets.filter((t) => categorize(t) === 'future').length,
    past: tickets.filter((t) => categorize(t) === 'past').length,
  };

  async function handleGift(ticket: MockTicket) {
    if (!user?.id) { Alert.alert('Accedi per regalare un biglietto'); return; }

    Alert.alert(
      'Regala biglietto',
      `Attenzione: se regali questo biglietto non potrai più usarlo tu. Il biglietto verrà trasferito alla persona che inserisce il codice.\n\nVuoi continuare?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Sì, regala',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            try {
              const res = await fetch('https://mynox-stripe-proxy.onrender.com/gift-ticket', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticket_id: ticket.id, gifter_id: user.id }),
              });
              const json = await res.json() as { code?: string; error?: string };
              if (!json.code) { Alert.alert('Errore', json.error ?? 'Impossibile creare il codice regalo'); return; }

              // Rimuovi subito il biglietto dalla lista del regalante
              removeTicket(ticket.id);

              await Share.share({
                message:
                  `🎁 Ti regalo un biglietto per ${ticket.eventName} @ ${ticket.clubName}!\n\n` +
                  `Il tuo codice regalo è: ${json.code}\n\n` +
                  `Scarica MyNox, vai su "I miei biglietti" → "Riscatta regalo" e inserisci il codice.`,
                title: `Biglietto per ${ticket.eventName}`,
              });
            } catch {
              Alert.alert('Errore', 'Impossibile creare il codice regalo');
            }
          },
        },
      ]
    );
  }

  async function handleClaim() {
    if (!user?.id) { Alert.alert('Accedi per riscattare un regalo'); return; }
    if (!claimCode.trim()) return;
    setClaimLoading(true);
    try {
      const res = await fetch('https://mynox-stripe-proxy.onrender.com/claim-gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: claimCode.trim().toUpperCase(), claimer_id: user.id }),
      });
      const json = await res.json() as { success?: boolean; error?: string };
      setClaimLoading(false);
      if (!json.success) { Alert.alert('Errore', json.error ?? 'Codice non valido'); return; }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setClaimModalOpen(false);
      setClaimCode('');
      await refreshTickets();
      Alert.alert('🎁 Biglietto ricevuto!', 'Il biglietto è stato aggiunto ai tuoi biglietti.');
    } catch {
      setClaimLoading(false);
      Alert.alert('Errore', 'Impossibile riscattare il codice');
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['rgba(168,85,247,0.22)', 'transparent']} style={styles.bgGradient} pointerEvents="none" />
      <SafeAreaView style={{ flex: 1 }}>
        <AppHeader />

        {/* Riscatta regalo */}
        <TouchableOpacity style={styles.claimBanner} onPress={() => setClaimModalOpen(true)} activeOpacity={0.8}>
          <Ionicons name="gift-outline" size={16} color={Colors.accent} />
          <Text style={styles.claimBannerText}>Hai ricevuto un codice regalo? <Text style={{ color: Colors.accent }}>Riscatta qui</Text></Text>
        </TouchableOpacity>

        {/* Sub-tabs */}
        <View style={styles.tabBar}>
          {TAB_CONFIG.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.tab, activeTab === key && styles.tabActive]}
              onPress={() => { Haptics.selectionAsync(); setActiveTab(key); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>
                {label}
              </Text>
              {counts[key] > 0 && (
                <View style={[styles.tabBadge, activeTab === key && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, activeTab === key && styles.tabBadgeTextActive]}>
                    {counts[key]}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {filtered.length === 0 ? (
            <EmptyState tab={activeTab} onExplore={() => router.push('/(tabs)')} />
          ) : (
            filtered.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                tab={activeTab}
                onPress={() => router.push(`/ticket/${ticket.id}`)}
                onGift={() => handleGift(ticket)}
              />
            ))
          )}
        </ScrollView>

      </SafeAreaView>

      {/* Modal riscatta codice regalo */}
      <Modal visible={claimModalOpen} transparent animationType="fade" onRequestClose={() => setClaimModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Riscatta regalo</Text>
            <Text style={styles.modalSub}>Inserisci il codice che hai ricevuto</Text>
            <TextInput
              style={styles.codeInput}
              value={claimCode}
              onChangeText={(t) => setClaimCode(t.toUpperCase())}
              placeholder="Es. AB12CD34"
              placeholderTextColor="#475569"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
            />
            <TouchableOpacity
              style={[styles.claimBtn, claimLoading && { opacity: 0.6 }]}
              onPress={handleClaim}
              disabled={claimLoading}
              activeOpacity={0.8}
            >
              {claimLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.claimBtnText}>Riscatta biglietto</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setClaimModalOpen(false); setClaimCode(''); }} style={{ marginTop: 12 }}>
              <Text style={{ color: '#64748b', fontSize: 14, textAlign: 'center' }}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

function TicketCard({
  ticket, tab, onPress, onGift,
}: {
  ticket: MockTicket;
  tab: Tab;
  onPress: () => void;
  onGift: () => void;
}) {
  const isPast = tab === 'past';
  const isPending = false;

  return (
    <View style={[styles.ticketCard, isPast && styles.ticketCardPast]}>
      <TouchableOpacity style={styles.ticketMain} activeOpacity={0.85} onPress={onPress}>
        <View style={styles.ticketLeft}>
          {ticket.imageUrl ? (
            <View style={styles.thumbnailWrapper}>
              <Image source={{ uri: ticket.imageUrl }} style={styles.thumbnail} resizeMode="cover" />
              <View style={[
                styles.statusDotOnThumb,
                isPast && styles.statusDotUsed,
                isPending && styles.statusDotPending,
              ]} />
            </View>
          ) : (
            <View style={[
              styles.statusDot,
              isPast && styles.statusDotUsed,
              isPending && styles.statusDotPending,
            ]} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.ticketEvent, isPast && styles.ticketEventMuted]} numberOfLines={1}>
              {ticket.eventName}
            </Text>
            <Text style={styles.ticketClub}>{ticket.clubName}</Text>
            <View style={styles.ticketMeta}>
              <Ionicons name="calendar-outline" size={11} color={Colors.textMuted} />
              <Text style={styles.ticketMetaText}> {ticket.date} · {ticket.startTime}</Text>
            </View>
            {!isPast && !isPending && (
              <CountdownBadge rawDate={ticket.rawDate} startTime={ticket.startTime} />
            )}
            {isPending && (
              <View style={styles.pendingRow}>
                <Ionicons name="time-outline" size={11} color={Colors.warning} />
                <Text style={styles.pendingText}>Pagamento in elaborazione</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.ticketRight}>
          <View style={[styles.typeBadge, isPending && styles.typeBadgePending]}>
            <Text style={styles.typeBadgeText}>{ticket.ticketLabel}</Text>
          </View>
          {!isPending && (
            <View style={styles.drinkStatus}>
              <Ionicons
                name={ticket.drinkUsed ? 'checkmark-circle' : 'wine-outline'}
                size={14}
                color={ticket.drinkUsed ? Colors.textMuted : Colors.success}
              />
              <Text style={[styles.drinkText, ticket.drinkUsed && styles.drinkUsedText]}>
                {ticket.drinkUsed ? 'Usato' : 'Drink'}
              </Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={{ marginTop: 4 }} />
        </View>
      </TouchableOpacity>

      {!isPast && !isPending && (
        <TouchableOpacity style={styles.giftButton} activeOpacity={0.8} onPress={onGift}>
          <Ionicons name="gift-outline" size={14} color={Colors.accent} />
          <Text style={styles.giftText}>Regala questo biglietto</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function EmptyState({ tab, onExplore }: { tab: Tab; onExplore: () => void }) {
  const config = {
    future: {
      icon: 'ticket-outline' as const,
      title: 'Nessun biglietto futuro',
      sub: 'I tuoi prossimi eventi appariranno qui',
    },
past: {
      icon: 'calendar-outline' as const,
      title: 'Nessuna serata passata',
      sub: 'Il tuo storico eventi sarà visibile qui',
    },
  }[tab];

  return (
    <View style={styles.empty}>
      <Ionicons name={config.icon} size={48} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>{config.title}</Text>
      <Text style={styles.emptySubtitle}>{config.sub}</Text>
      {tab === 'future' && (
        <TouchableOpacity style={styles.exploreBtn} onPress={onExplore}>
          <Text style={styles.exploreBtnText}>Esplora gli eventi</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  bgGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },

  // Sub-tabs
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20, marginTop: 14, marginBottom: 16, gap: 8,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  tabActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  tabText: { fontSize: 13, fontFamily: Font.semiBold, color: Colors.textMuted },
  tabTextActive: { color: Colors.white },
  tabBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabBadgeText: { fontSize: 10, fontFamily: Font.bold, color: Colors.textMuted },
  tabBadgeTextActive: { color: Colors.white },

  scroll: { padding: 20, paddingTop: 0 },

  // Ticket card
  ticketCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    marginBottom: 12, overflow: 'hidden',
  },
  ticketCardPast: { opacity: 0.65 },
  ticketMain: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16,
  },
  ticketLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  thumbnailWrapper: { position: 'relative', flexShrink: 0 },
  thumbnail: { width: 52, height: 52, borderRadius: 10 },
  statusDotOnThumb: {
    position: 'absolute', bottom: -2, right: -2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: Colors.success,
    borderWidth: 2, borderColor: Colors.surface,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success, flexShrink: 0, marginTop: 4 },
  statusDotUsed: { backgroundColor: Colors.textMuted },
  statusDotPending: { backgroundColor: Colors.warning },
  ticketEvent: { fontSize: 14, fontFamily: Font.bold, color: Colors.textPrimary, marginBottom: 3 },
  ticketEventMuted: { color: Colors.textSecondary },
  ticketClub: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  ticketMeta: { flexDirection: 'row', alignItems: 'center' },
  ticketMetaText: { fontSize: 11, color: Colors.textMuted },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  pendingText: { fontSize: 11, fontFamily: Font.semiBold, color: Colors.warning },
  ticketRight: { alignItems: 'flex-end', gap: 6 },
  typeBadge: { backgroundColor: Colors.accent, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgePending: { backgroundColor: Colors.warning },
  typeBadgeText: { fontSize: 11, fontFamily: Font.bold, color: Colors.white },
  drinkStatus: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  drinkText: { fontSize: 11, color: Colors.success, fontWeight: '500' },
  drinkUsedText: { color: Colors.textMuted },
  giftButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  giftText: { fontSize: 13, fontFamily: Font.semiBold, color: Colors.accent },

  // Empty state
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontFamily: Font.bold, color: Colors.textPrimary, marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginBottom: 24 },
  exploreBtn: { backgroundColor: Colors.accent, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  exploreBtnText: { fontSize: 14, fontFamily: Font.bold, color: Colors.white },

  // Riscatta regalo
  claimBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: 'rgba(168,85,247,0.08)',
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  claimBannerText: { fontSize: 13, color: Colors.textMuted, flex: 1 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#111118', borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)', borderRadius: 20, padding: 28, width: '100%' },
  modalTitle: { fontSize: 20, fontFamily: Font.bold, color: Colors.textPrimary, marginBottom: 6 },
  modalSub: { fontSize: 14, color: Colors.textMuted, marginBottom: 20 },
  codeInput: {
    backgroundColor: '#0d0d14', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 22, fontFamily: Font.bold, color: Colors.textPrimary,
    textAlign: 'center', letterSpacing: 4, marginBottom: 16,
  },
  claimBtn: { backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  claimBtnText: { fontSize: 15, fontFamily: Font.bold, color: Colors.white },
});
