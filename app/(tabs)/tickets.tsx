import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Share, Modal, TextInput, Alert, ActivityIndicator, RefreshControl, Animated } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useState, useEffect, useRef } from 'react';
import { Colors } from '../../constants/colors';
import { Font } from '../../constants/typography';
import { useTickets, MockTicket } from '../../contexts/TicketsContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCountdown } from '../../hooks/useCountdown';
import AppHeader from '../../components/AppHeader';
import { useTranslation } from 'react-i18next';
import { getLocale } from '../../lib/i18n';
import { useTabBarScroll, useTabBarCollapsed } from '../../contexts/TabBarContext';

type Tab = 'future' | 'past';

function CountdownBadge({ rawDate, startTime }: { rawDate: string; startTime: string }) {
  const { label, isExpired } = useCountdown(rawDate, startTime);
  if (isExpired) return null;
  return (
    <View style={countdownStyles.badge}>
      <Ionicons name="timer-outline" size={12} color={Colors.accent} />
      <Text style={countdownStyles.text}>{label}</Text>
    </View>
  );
}

const countdownStyles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  text: { fontSize: 11, fontFamily: Font.bold, color: Colors.accent },
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

export default function TicketsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { tab: tabParam, t: tParam } = useLocalSearchParams<{ tab?: string; t?: string }>();
  const { onScroll } = useTabBarScroll();
  const { collapsed } = useTabBarCollapsed();

  const claimBannerBottom = collapsed.interpolate({
    inputRange: [0, 1],
    outputRange: [109, 93],
  });

  const TAB_CONFIG: { key: Tab; label: string }[] = [
    { key: 'future', label: t('tickets.tab_future') },
    { key: 'past', label: t('tickets.tab_past') },
  ];
  const { tickets, removeTicket, markTicketGifted, markTicketReclaimed, refreshTickets } = useTickets();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('future');

  useEffect(() => {
    if (!tParam) return;
    if (tabParam === 'past') setActiveTab('past');
    else if (tabParam === 'future') setActiveTab('future');
  }, [tParam]);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimCode, setClaimCode] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const filtered = tickets.filter((t) => categorize(t) === activeTab);
  const counts: Record<Tab, number> = {
    future: tickets.filter((t) => categorize(t) === 'future').length,
    past: tickets.filter((t) => categorize(t) === 'past').length,
  };

  function buildGiftMessage(ticket: MockTicket, code: string): string {
    return (
      `✦ MYNOX ✦\n` +
      `―――――――――――――――\n\n` +
      `${t('tickets.gift_message_intro')}\n\n` +
      `*${ticket.eventName.toUpperCase()}*\n` +
      `📍 ${ticket.clubName}  ·  ${ticket.date}  ·  ${ticket.startTime}\n\n` +
      `${t('tickets.gift_message_code_label')}\n` +
      `*[ ${code} ]*\n\n` +
      `―――――――――――――――\n` +
      `${t('tickets.gift_message_cta')}`
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
      t('tickets.reclaim_alert_title'),
      t('tickets.reclaim_alert_body'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('tickets.reclaim_confirm_btn'),
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
                Alert.alert(t('common.error'), json.error ?? t('tickets.reclaim_error_generic'));
                return;
              }
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await markTicketReclaimed(ticket.id);
            } catch {
              Alert.alert(t('common.error'), t('tickets.reclaim_error_generic'));
            }
          },
        },
      ]
    );
  }

  async function handleGift(ticket: MockTicket) {
    if (!user?.id) { Alert.alert(t('tickets.gift_login_required')); return; }

    Alert.alert(
      t('tickets.gift_alert_title'),
      t('tickets.gift_alert_body'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('tickets.gift_confirm_btn'),
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            try {
              const res = await fetch('https://mynox-stripe-proxy.onrender.com/gift-ticket', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticket_id: ticket.id, gifter_id: user.id }),
              });
              const json = await res.json() as { code?: string; expires_at?: string; error?: string };
              if (!json.code) { Alert.alert(t('common.error'), json.error ?? t('tickets.gift_error_code')); return; }

              await markTicketGifted(ticket.id, json.code, json.expires_at);

              await Share.share({
                message: buildGiftMessage(ticket, json.code),
                title: `Biglietto per ${ticket.eventName}`,
              });
            } catch {
              Alert.alert(t('common.error'), t('tickets.gift_error_code'));
            }
          },
        },
      ]
    );
  }

  async function handleClaim() {
    if (!user?.id) { Alert.alert(t('tickets.claim_login_required')); return; }
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
      if (!json.success) { Alert.alert(t('common.error'), json.error ?? t('tickets.claim_error_invalid')); return; }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setClaimModalOpen(false);
      setClaimCode('');
      await refreshTickets();
      Alert.alert(t('tickets.claim_success_title'), t('tickets.claim_success_body'));
    } catch {
      setClaimLoading(false);
      Alert.alert(t('common.error'), t('tickets.claim_error_generic'));
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.accentBgMid, 'transparent']} style={styles.bgGradient} pointerEvents="none" />
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

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => { setRefreshing(true); await refreshTickets(); setRefreshing(false); }}
              tintColor={Colors.accent}
              colors={[Colors.accent]}
            />
          }
        >
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
      <Animated.View style={[styles.claimBanner, { bottom: claimBannerBottom }]}>
        <TouchableOpacity style={styles.claimBannerInner} onPress={() => setClaimModalOpen(true)} activeOpacity={0.8}>
          <Ionicons name="gift-outline" size={15} color={Colors.accent} />
          <Text style={styles.claimBannerText}>{t('tickets.claim_banner_text')}<Text style={{ color: Colors.accent, fontFamily: Font.semiBold }}>{t('tickets.claim_banner_link')}</Text></Text>
          <Ionicons name="chevron-forward" size={13} color={Colors.accent} />
        </TouchableOpacity>
      </Animated.View>

      {/* Modal riscatta codice regalo */}
      <Modal visible={claimModalOpen} transparent animationType="fade" onRequestClose={() => setClaimModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('tickets.claim_modal_title')}</Text>
            <Text style={styles.modalSub}>{t('tickets.claim_modal_sub')}</Text>
            <TextInput
              style={styles.codeInput}
              value={claimCode}
              onChangeText={(v) => setClaimCode(v.toUpperCase())}
              placeholder={t('tickets.claim_code_placeholder')}
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
                : <Text style={styles.claimBtnText}>{t('tickets.claim_btn')}</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setClaimModalOpen(false); setClaimCode(''); }} style={{ marginTop: 12 }}>
              <Text style={{ color: '#64748b', fontSize: 14, textAlign: 'center' }}>{t('common.cancel')}</Text>
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
  const { t } = useTranslation();
  const isPast = tab === 'past';
  const isPending = ticket.status === 'pending';
  const isGifted = ticket.status === 'gifted';
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.timing(scale, { toValue: 0.97, duration: 100, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 200 }).start();

  return (
    <Animated.View style={[styles.ticketCard, isPast && styles.ticketCardPast, isGifted && styles.ticketCardGifted, { transform: [{ scale }] }]}>
      <TouchableOpacity style={styles.ticketMain} activeOpacity={1} onPressIn={isGifted ? undefined : onPressIn} onPressOut={isGifted ? undefined : onPressOut} onPress={isGifted ? undefined : onPress}>
        <View style={styles.ticketLeft}>
          {ticket.eventImageUrl ? (
            <View style={styles.thumbnailWrapper}>
              <Image source={{ uri: ticket.eventImageUrl }} style={styles.thumbnail} contentFit="cover" cachePolicy="memory-disk" />
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
            {ticket.type === 'table' && ticket.tableName && (
              <Text style={styles.tableLabel} numberOfLines={1}>{ticket.tableName}</Text>
            )}
            <View style={styles.ticketMeta}>
              <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.ticketMetaText}> {ticket.date} · {ticket.startTime}</Text>
            </View>
            {!isPast && !isPending && !isGifted && (
              <CountdownBadge rawDate={ticket.rawDate} startTime={ticket.startTime} />
            )}
            {isPending && (
              <View style={styles.pendingRow}>
                <Ionicons name="time-outline" size={12} color={Colors.warning} />
                <Text style={styles.pendingText}>{t('tickets.payment_processing')}</Text>
              </View>
            )}
            {isGifted && (
              <View style={styles.pendingRow}>
                <Ionicons name="gift-outline" size={12} color={Colors.accent} />
                <Text style={styles.giftedText}>{t('tickets.gift_pending')}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.ticketRight}>
          <View style={[styles.typeBadge, isPending && styles.typeBadgePending, isGifted && styles.typeBadgeGifted, ticket.type === 'table' && styles.typeBadgeTable]}>
            {ticket.type === 'table' && !isGifted ? (
              <Text style={[styles.typeBadgeText, { color: Colors.accent }]}>{t('tickets.table_label')}</Text>
            ) : (
              <Text style={styles.typeBadgeText}>{isGifted ? t('tickets.gift_label') : ticket.ticketLabel}</Text>
            )}
          </View>
          {!isPending && !isGifted && ticket.type !== 'table' && (
            <View style={styles.drinkStatus}>
              <Ionicons
                name={ticket.drinkUsed ? 'checkmark-circle' : 'wine-outline'}
                size={14}
                color={ticket.drinkUsed ? Colors.textMuted : Colors.success}
              />
              <Text style={[styles.drinkText, ticket.drinkUsed && styles.drinkUsedText]}>
                {ticket.drinkUsed ? t('tickets.drink_used') : t('tickets.drink_available')}
              </Text>
            </View>
          )}
          {!isGifted && (
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={{ marginTop: 4 }} />
          )}
        </View>
      </TouchableOpacity>

      {isGifted && (
        <>
          {ticket.giftCode && (
            <View style={styles.giftCodeRow}>
              <View style={styles.giftCodeBox}>
                <Text style={styles.giftCodeLabel}>{t('tickets.gift_code_label')}</Text>
                <Text style={styles.giftCodeValue}>{ticket.giftCode}</Text>
                {ticket.giftCodeExpiresAt && (
                  <Text style={styles.giftCodeExpiry}>
                    {t('tickets.gift_code_expires')}{new Date(ticket.giftCodeExpiresAt).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' })}
                  </Text>
                )}
              </View>
              <TouchableOpacity style={styles.reshareBtn} activeOpacity={0.8} onPress={onReshare}>
                <Ionicons name="share-outline" size={15} color={Colors.accent} />
                <Text style={styles.reshareText}>{t('tickets.gift_share_btn')}</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={styles.reclaimButton} activeOpacity={0.8} onPress={onReclaim}>
            <Ionicons name="arrow-undo-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.reclaimText}>{t('tickets.reclaim_ticket_btn')}</Text>
          </TouchableOpacity>
        </>
      )}

      {!isPast && !isPending && !isGifted && (
        <TouchableOpacity style={styles.giftButton} activeOpacity={0.8} onPress={onGift}>
          <Ionicons name="gift-outline" size={14} color={Colors.accent} />
          <Text style={styles.giftText}>{t('tickets.gift_ticket_btn')}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

function EmptyState({ tab, onExplore }: { tab: Tab; onExplore: () => void }) {
  const { t } = useTranslation();
  const config = {
    future: {
      icon: 'ticket-outline' as const,
      title: t('tickets.empty_future_title'),
      sub: t('tickets.empty_future_sub'),
    },
    past: {
      icon: 'calendar-outline' as const,
      title: t('tickets.empty_past_title'),
      sub: t('tickets.empty_past_sub'),
    },
  }[tab];

  return (
    <View style={styles.empty}>
      <Ionicons name={config.icon} size={48} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>{config.title}</Text>
      <Text style={styles.emptySubtitle}>{config.sub}</Text>
      {tab === 'future' && (
        <TouchableOpacity style={styles.exploreBtn} onPress={onExplore}>
          <Text style={styles.exploreBtnText}>{t('tickets.explore_events_btn')}</Text>
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

  scroll: { padding: 20, paddingTop: 0, paddingBottom: 170 },

  // Ticket card
  ticketCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    marginBottom: 12, overflow: 'hidden',
  },
  ticketCardPast: { opacity: 0.65 },
  ticketCardGifted: { borderColor: Colors.accentBorder },
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
  tableLabel: { fontSize: 13, fontFamily: Font.bold, color: Colors.accent, marginBottom: 4 },
  ticketMeta: { flexDirection: 'row', alignItems: 'center' },
  ticketMetaText: { fontSize: 11, color: Colors.textMuted },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  pendingText: { fontSize: 11, fontFamily: Font.semiBold, color: Colors.warning },
  giftedText: { fontSize: 11, fontFamily: Font.semiBold, color: Colors.accent },
  ticketRight: { alignItems: 'flex-end', gap: 6 },
  typeBadge: { backgroundColor: Colors.accent, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgePending: { backgroundColor: Colors.warning },
  typeBadgeGifted: { backgroundColor: Colors.accentBgMid, borderWidth: 1, borderColor: Colors.accentBorder },
  typeBadgeTable: { backgroundColor: Colors.accentBg, borderWidth: 1, borderColor: Colors.accentBorder },
  typeBadgeText: { fontSize: 11, fontFamily: Font.bold, color: Colors.white },
  drinkStatus: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  drinkText: { fontSize: 11, color: Colors.success, fontFamily: Font.medium },
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
    borderTopWidth: 1, borderTopColor: Colors.accentBg,
    backgroundColor: Colors.accentBg,
  },
  giftCodeBox: { flex: 1 },
  giftCodeLabel: { fontSize: 10, fontFamily: Font.semiBold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  giftCodeValue: { fontSize: 18, fontFamily: Font.bold, color: Colors.accent, letterSpacing: 3 },
  giftCodeExpiry: { fontSize: 10, fontFamily: Font.regular, color: Colors.textMuted, marginTop: 3 },
  reshareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: Colors.accentBg,
    borderWidth: 1, borderColor: Colors.accentBorder,
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
    position: 'absolute', left: 20, right: 20,
    borderRadius: 14,
    borderWidth: 1, borderColor: Colors.accentBorder,
    backgroundColor: Colors.accentBg,
    overflow: 'hidden',
  },
  claimBannerInner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  claimBannerText: { fontSize: 13, fontFamily: Font.regular, color: Colors.textMuted, flex: 1 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#111118', borderWidth: 1, borderColor: Colors.accentBgMid, borderRadius: 20, padding: 28, width: '100%' },
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
