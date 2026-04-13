import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Share, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Colors } from '../../constants/colors';
import { Font } from '../../constants/typography';
import { useTickets, MockTicket } from '../../contexts/TicketsContext';
import { useCountdown } from '../../hooks/useCountdown';
import AppHeader from '../../components/AppHeader';

type Tab = 'future' | 'pending' | 'past';

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

function isDatePast(rawDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(rawDate) < today;
}

function categorize(ticket: MockTicket): Tab {
  if (ticket.status === 'pending') return 'pending';
  if (ticket.status === 'used' || isDatePast(ticket.rawDate)) return 'past';
  return 'future';
}

const TAB_CONFIG: { key: Tab; label: string }[] = [
  { key: 'future', label: 'Futuri' },
  { key: 'pending', label: 'In attesa' },
  { key: 'past', label: 'Passati' },
];

export default function TicketsScreen() {
  const router = useRouter();
  const { tickets } = useTickets();
  const [activeTab, setActiveTab] = useState<Tab>('future');

  const filtered = tickets.filter((t) => categorize(t) === activeTab);
  const counts: Record<Tab, number> = {
    future: tickets.filter((t) => categorize(t) === 'future').length,
    pending: tickets.filter((t) => categorize(t) === 'pending').length,
    past: tickets.filter((t) => categorize(t) === 'past').length,
  };

  async function handleGift(ticket: MockTicket) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Share.share({
      message:
        `Ti regalo un biglietto per ${ticket.eventName} @ ${ticket.clubName}!\n\n` +
        `Codice: ${ticket.qrCode}\n\nScarica MyNox e usa questo codice per riscattare il biglietto.`,
      title: `Biglietto per ${ticket.eventName}`,
    });
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['rgba(168,85,247,0.12)', 'transparent']} style={styles.bgGradient} pointerEvents="none" />
      <SafeAreaView style={{ flex: 1 }}>
        <AppHeader />

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
  const isPending = tab === 'pending';

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
    pending: {
      icon: 'time-outline' as const,
      title: 'Nessun pagamento in attesa',
      sub: 'I pagamenti in elaborazione appariranno qui',
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
});
