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
  // I biglietti regalati ma non ancora riscattati restano nei futuri
  return 'future';
}

const TAB_CONFIG: { key: Tab; label: string }[] = [
  { key: 'future', label: 'Futuri' },
  { key: 'past', label: 'Passati' },
];

export default function TicketsScreen() {
  const router = useRouter();
  const { tickets, removeTicket, markTicketGifted, markTicketReclaimed, refreshTickets } = useTickets();
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

  function buildGiftMessage(ticket: MockTicket, code: string): string {
    return (
      `MYNOX ✦\n\n` +
      `Ti mando un posto per questa serata.\n\n` +
      `${ticket.eventName.toUpperCase()}\n` +
      `📍 ${ticket.clubName}  ·  ${ticket.date}  ·  ${ticket.startTime}\n\n` +
      `Il tuo codice:\n` +
      `[ ${code} ]\n\n` +
      `Scarica MyNox → Biglietti → Riscatta regalo.`
    );
  }

  async function handleReshare(ticket: MockTicket) {
    if (!ticket.giftCode) return;
    await Share.share({
      message: buildGiftMessage(ticket, ticket.giftCode),
      title: `Biglietto per ${ticket.eventName}`,
    });
  }

  async function handleReclaim(ticket: MockTicket) {
    if (!user?.id) return;
    Alert.alert(
      'Riprendi biglietto',
      'Sei sicuro? Il codice regalo verrà annullato e il biglietto tornerà a te. Funziona solo se il destinatario non lo ha ancora riscattato.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Riprendi',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            try {
              const res = await fetch('https://mynox-stripe-proxy.onrender.com/cancel-gift', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticket_id: ticket.id, gifter_id: user.id }),
              });
              const json = await res.json() as { success?: boolean; error?: string };
              if (!json.success) {
                Alert.alert('Errore', json.error ?? 'Impossibile riprendere il biglietto. Potrebbe essere già stato riscattato.');
                return;
              }
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              markTicketReclaimed(ticket.id);
            } catch {
              Alert.alert('Errore', 'Impossibile completare l\'operazione');
            }
          },
        },
      ]
    );
  }

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

              // Segna il biglietto come regalato (resta visibile finché non viene riscattato)
              markTicketGifted(ticket.id, json.code);

              await Share.share({
                message: buildGiftMessage(ticket, json.code),
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
                onReshare={() => handleReshare(ticket)}
                onReclaim={() => handleReclaim(ticket)}
              />
            ))
          )}
        </ScrollView>

      </SafeAreaView>

      {/* Riscatta regalo — ancorato sopra la tab bar */}
      <TouchableOpacity style={styles.claimBanner} onPress={() => setClaimModalOpen(true)} activeOpacity={0.8}>
        <Ionicons name="gift-outline" size={15} color={Colors.accent} />
        <Text style={styles.claimBannerText}>Hai un codice regalo? <Text style={{ color: Colors.accent, fontFamily: Font.semiBold }}>Riscatta qui</Text></Text>
        <Ionicons name="chevron-forward" size={13} color={Colors.accent} />
      </TouchableOpacity>

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
  ticket, tab, onPress, onGift, onReshare, onReclaim,
}: {
  ticket: MockTicket;
  tab: Tab;
  onPress: () => void;
  onGift: () => void;
  onReshare: () => void;
  onReclaim: () => void;
}) {
  const isPast = tab === 'past';
  const isPending = ticket.status === 'pending';
  const isGifted = ticket.status === 'gifted';

  return (
    <View style={[styles.ticketCard, isPast && styles.ticketCardPast, isGifted && styles.ticketCardGifted]}>
      <TouchableOpacity style={styles.ticketMain} activeOpacity={isGifted ? 1 : 0.85} onPress={isGifted ? undefined : onPress}>
        <View style={styles.ticketLeft}>
          {ticket.imageUrl ? (
            <View style={styles.thumbnailWrapper}>
              <Image source={{ uri: ticket.imageUrl }} style={styles.thumbnail} resizeMode="cover" />
              <View style={[
                styles.statusDotOnThumb,
                isPast && styles.statusDotUsed,
                isPending && styles.statusDotPending,
                isGifted && styles.statusDotGifted,
              ]} />
            </View>
          ) : (
            <View style={[
              styles.statusDot,
              isPast && styles.statusDotUsed,
              isPending && styles.statusDotPending,
              isGifted && styles.statusDotGifted,
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
            {!isPast && !isPending && !isGifted && (
              <CountdownBadge rawDate={ticket.rawDate} startTime={ticket.startTime} />
            )}
            {isPending && (
              <View style={styles.pendingRow}>
                <Ionicons name="time-outline" size={11} color={Colors.warning} />
                <Text style={styles.pendingText}>Pagamento in elaborazione</Text>
              </View>
            )}
            {isGifted && (
              <View style={styles.pendingRow}>
                <Ionicons name="gift-outline" size={11} color={Colors.accent} />
                <Text style={styles.giftedText}>In attesa di riscatto</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.ticketRight}>
          <View style={[styles.typeBadge, isPending && styles.typeBadgePending, isGifted && styles.typeBadgeGifted]}>
            <Text style={styles.typeBadgeText}>{isGifted ? 'Regalo' : ticket.ticketLabel}</Text>
          </View>
          {!isPending && !isGifted && (
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
          {!isGifted && (
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={{ marginTop: 4 }} />
          )}
        </View>
      </TouchableOpacity>

      {isGifted && ticket.giftCode && (
        <>
          <View style={styles.giftCodeRow}>
            <View style={styles.giftCodeBox}>
              <Text style={styles.giftCodeLabel}>Codice regalo</Text>
              <Text style={styles.giftCodeValue}>{ticket.giftCode}</Text>
            </View>
            <TouchableOpacity style={styles.reshareBtn} activeOpacity={0.8} onPress={onReshare}>
              <Ionicons name="share-outline" size={15} color={Colors.accent} />
              <Text style={styles.reshareText}>Condividi</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.reclaimButton} activeOpacity={0.8} onPress={onReclaim}>
            <Ionicons name="arrow-undo-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.reclaimText}>Riprendi biglietto</Text>
          </TouchableOpacity>
        </>
      )}

      {!isPast && !isPending && !isGifted && (
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

  scroll: { padding: 20, paddingTop: 0, paddingBottom: 140 },

  // Ticket card
  ticketCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    marginBottom: 12, overflow: 'hidden',
  },
  ticketCardPast: { opacity: 0.65 },
  ticketCardGifted: { borderColor: 'rgba(168,85,247,0.35)' },
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
  statusDotGifted: { backgroundColor: Colors.accent },
  ticketEvent: { fontSize: 14, fontFamily: Font.bold, color: Colors.textPrimary, marginBottom: 3 },
  ticketEventMuted: { color: Colors.textSecondary },
  ticketClub: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  ticketMeta: { flexDirection: 'row', alignItems: 'center' },
  ticketMetaText: { fontSize: 11, color: Colors.textMuted },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  pendingText: { fontSize: 11, fontFamily: Font.semiBold, color: Colors.warning },
  giftedText: { fontSize: 11, fontFamily: Font.semiBold, color: Colors.accent },
  ticketRight: { alignItems: 'flex-end', gap: 6 },
  typeBadge: { backgroundColor: Colors.accent, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgePending: { backgroundColor: Colors.warning },
  typeBadgeGifted: { backgroundColor: 'rgba(168,85,247,0.2)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.4)' },
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

  giftCodeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(168,85,247,0.15)',
    backgroundColor: 'rgba(168,85,247,0.05)',
  },
  giftCodeBox: { flex: 1 },
  giftCodeLabel: { fontSize: 10, fontFamily: Font.semiBold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  giftCodeValue: { fontSize: 18, fontFamily: Font.bold, color: Colors.accent, letterSpacing: 3 },
  reshareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: 'rgba(168,85,247,0.1)',
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)',
    borderRadius: 10,
  },
  reshareText: { fontSize: 12, fontFamily: Font.semiBold, color: Colors.accent },
  reclaimButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  reclaimText: { fontSize: 13, fontFamily: Font.semiBold, color: Colors.textMuted },

  // Empty state
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontFamily: Font.bold, color: Colors.textPrimary, marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginBottom: 24 },
  exploreBtn: { backgroundColor: Colors.accent, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  exploreBtnText: { fontSize: 14, fontFamily: Font.bold, color: Colors.white },

  // Riscatta regalo — box floating sopra la tab bar
  claimBanner: {
    position: 'absolute', left: 20, right: 20, bottom: 96,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.25)',
    backgroundColor: 'rgba(168,85,247,0.08)',
  },
  claimBannerText: { fontSize: 13, fontFamily: Font.regular, color: Colors.textMuted, flex: 1 },

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
