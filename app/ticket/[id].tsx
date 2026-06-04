import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Animated } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useState, useRef, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/colors';
import { Font } from '../../constants/typography';
import { useTickets } from '../../contexts/TicketsContext';
import { useCountdown } from '../../hooks/useCountdown';
export default function TicketScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { tickets, markDrinkUsed, markTicketUsed } = useTickets();
  const ticket = tickets.find((t) => t.id === id);
  const [activeQR, setActiveQR] = useState<'entry' | 'drink'>('entry');

  const qrAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    qrAnim.setValue(0);
    Animated.spring(qrAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 14,
      stiffness: 220,
    }).start();
  }, [activeQR]);

  const today = new Date().toISOString().split('T')[0];
  const isEventToday = ticket?.rawDate === today;

  function isDatePast(rawDate: string, endTime?: string): boolean {
    if (!rawDate) return false;
    if (endTime) {
      const [hh, mm] = endTime.split(':').map(Number);
      const cutoff = new Date(rawDate);
      if (hh < 12) cutoff.setDate(cutoff.getDate() + 1);
      cutoff.setHours(hh, mm, 0, 0);
      return new Date() > cutoff;
    }
    const cutoff = new Date(rawDate);
    cutoff.setDate(cutoff.getDate() + 1);
    cutoff.setHours(12, 0, 0, 0);
    return new Date() > cutoff;
  }

  const isPast = ticket ? isDatePast(ticket.rawDate, ticket.endTime) : false;

  if (!ticket) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>{t('ticket_detail.not_found')}</Text>
        </View>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{ticket.type === 'table' ? t('ticket_detail.header_title_booking') : t('ticket_detail.header_title_ticket')}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Info evento — centrata sopra la card */}
        <View style={styles.eventInfo}>
          {ticket.eventImageUrl ? (
            <Image source={{ uri: ticket.eventImageUrl }} style={styles.eventThumbnail} contentFit="cover" cachePolicy="memory-disk" />
          ) : (
            <View style={styles.eventThumbnailFallback}>
              <Ionicons name="business-outline" size={22} color={Colors.textMuted} />
            </View>
          )}
          <View style={styles.eventTextGroup}>
            <Text style={styles.eventName} numberOfLines={2}>{ticket.eventName}</Text>
            <Text style={styles.eventMeta}>{ticket.clubName} · {ticket.date} · {ticket.startTime}</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.ticketBadge, ticket.type === 'table' && styles.tableBadge]}>
                <Ionicons
                  name={ticket.type === 'table' ? 'grid-outline' : 'ticket-outline'}
                  size={12}
                  color={ticket.type === 'table' ? Colors.accent : Colors.white}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.ticketBadgeText, ticket.type === 'table' && { color: Colors.accent }]}>
                  {ticket.type === 'table' ? `${t('ticket_detail.table_sub_label')}${ticket.ticketLabel}` : ticket.ticketLabel}
                </Text>
              </View>
              <CountdownInline rawDate={ticket.rawDate} startTime={ticket.startTime} />
            </View>
          </View>
        </View>

        {/* Ticket card — solo QR */}
        <View style={styles.ticketCard}>

          {/* Toggle drink — solo per prevendita con drink incluso */}
          {ticket.type === 'ticket' && !!ticket.drinkQrCode && (
            <View style={styles.toggle}>
              <TouchableOpacity
                style={[styles.toggleBtn, activeQR === 'entry' && styles.toggleActive]}
                onPress={() => { Haptics.selectionAsync(); setActiveQR('entry'); }}
              >
                <Ionicons
                  name="scan-outline"
                  size={14}
                  color={activeQR === 'entry' ? Colors.white : Colors.textMuted}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.toggleText, activeQR === 'entry' && styles.toggleTextActive]}>{t('ticket_detail.toggle_entry')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, activeQR === 'drink' && styles.toggleActive]}
                onPress={() => { Haptics.selectionAsync(); setActiveQR('drink'); }}
              >
                <Ionicons
                  name="wine-outline"
                  size={14}
                  color={activeQR === 'drink' ? Colors.white : Colors.textMuted}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.toggleText, activeQR === 'drink' && styles.toggleTextActive]}>{t('ticket_detail.toggle_drink')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Intestazione tavolo — solo per prenotazioni */}
          {ticket.type === 'table' && (
            <View style={styles.tableCardHeader}>
              <View style={styles.tableCardHeaderLeft}>
                <View style={styles.tableIconBox}>
                  <Ionicons name="grid-outline" size={18} color={Colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tableCardTitle}>
                    {ticket.tableName ?? ticket.ticketLabel}
                  </Text>
                  <Text style={styles.tableCardSub}>{t('ticket_detail.table_sub_label')}{ticket.ticketLabel}</Text>
                  <View style={styles.bottleServiceRow}>
                    <Ionicons name="wine-outline" size={11} color={Colors.textMuted} />
                    <Text style={styles.bottleServiceText}>{t('ticket_detail.table_bottle_service')}</Text>
                  </View>
                </View>
              </View>
              {ticket.tableCapacity != null && (
                <View style={styles.capacityBlock}>
                  <Text style={styles.capacityNumber}>{ticket.tableCapacity}</Text>
                  <Text style={styles.capacityLabel}>{t('ticket_detail.capacity_label')}</Text>
                </View>
              )}
            </View>
          )}

          {/* Separatore perforato */}
          <View style={styles.perforationRow}>
            <View style={[styles.notch, styles.notchLeft]} />
            <View style={styles.dashedLine} />
            <View style={[styles.notch, styles.notchRight]} />
          </View>

          {/* QR area */}
          <Animated.View style={[styles.qrContainer, {
            opacity: qrAnim,
            transform: [{
              scale: qrAnim.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }),
            }],
          }]}>
            {activeQR === 'entry' ? (
              <>
                <View style={[styles.qrWrapper, ticket.status === 'used' && styles.qrUsed]}>
                  <QRCode
                    value={ticket.qrCode}
                    size={210}
                    backgroundColor="white"
                    color={ticket.status === 'used' ? '#aaa' : 'black'}
                  />
                  {ticket.status === 'used' && (
                    <View style={styles.usedOverlay}>
                      <Text style={styles.usedText}>{t('ticket_detail.used_overlay')}</Text>
                    </View>
                  )}
                </View>
                {ticket.entryCode && ticket.status !== 'used' && (
                  <View style={styles.entryCodeBox}>
                    <Text style={styles.entryCodeLabel}>{t('ticket_detail.manual_code_label')}</Text>
                    <Text style={styles.entryCodeText}>{ticket.entryCode}</Text>
                    <Text style={styles.entryCodeHint}>{t('ticket_detail.manual_code_hint')}</Text>
                  </View>
                )}
                <Text style={styles.qrLabel}>
                  {ticket.status === 'used'
                    ? t('ticket_detail.qr_already_scanned')
                    : ticket.type === 'table'
                    ? t('ticket_detail.qr_label_entry_table')
                    : t('ticket_detail.qr_label_entry')}
                </Text>
                {ticket.status === 'used' ? (
                  <View style={[styles.usedBadge, { marginBottom: 8 }]}>
                    <Ionicons name="close-circle" size={14} color={Colors.error} />
                    <Text style={styles.usedBadgeText}>{t('ticket_detail.status_used')}</Text>
                  </View>
                ) : isPast ? (
                  <View style={[styles.usedBadge, { marginBottom: 8 }]}>
                    <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                    <Text style={[styles.usedBadgeText, { color: Colors.textMuted }]}>{t('ticket_detail.status_event_ended')}</Text>
                  </View>
                ) : (
                  <>
                    <View style={[styles.validBadge, { marginBottom: 8 }]}>
                      <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                      <Text style={styles.validText}>{t('ticket_detail.status_valid')}</Text>
                    </View>
                    {isEventToday && !isPast && (
                      <>
                        <TouchableOpacity
                          style={styles.bouncerBtn}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            Alert.alert(
                              t('ticket_detail.bouncer_confirm_title'),
                              t('ticket_detail.bouncer_confirm_body'),
                              [
                                {
                                  text: t('ticket_detail.bouncer_confirm_btn'),
                                  style: 'destructive',
                                  onPress: async () => {
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                    try {
                                      await markTicketUsed(ticket.id);
                                    } catch {
                                      Alert.alert(t('common.error'), t('ticket_detail.bouncer_error'));
                                    }
                                  },
                                },
                                { text: t('common.cancel'), style: 'cancel' },
                              ]
                            );
                          }}
                        >
                          <Ionicons name="shield-checkmark-outline" size={16} color={Colors.white} />
                          <Text style={styles.bouncerBtnText}>{t('ticket_detail.bouncer_mark_used')}</Text>
                        </TouchableOpacity>
                        <View style={styles.actionDisclaimer}>
                          <Ionicons name="warning-outline" size={12} color={Colors.warning} />
                          <Text style={styles.actionDisclaimerText}>
                            {t('ticket_detail.bouncer_disclaimer')}
                          </Text>
                        </View>
                      </>
                    )}
                  </>
                )}
              </>
            ) : ticket.type === 'ticket' && ticket.drinkQrCode ? (
              <>
                <View style={[styles.qrWrapper, ticket.drinkUsed && styles.qrUsed]}>
                  <QRCode
                    value={ticket.drinkQrCode}
                    size={210}
                    backgroundColor="white"
                    color={ticket.drinkUsed ? '#aaa' : 'black'}
                  />
                  {ticket.drinkUsed && (
                    <View style={styles.usedOverlay}>
                      <Text style={styles.usedText}>{t('ticket_detail.used_overlay')}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.qrLabel}>
                  {ticket.drinkUsed ? t('ticket_detail.qr_drink_already_used') : t('ticket_detail.qr_label_drink')}
                </Text>
                {ticket.drinkUsed ? (
                  <View style={[styles.usedBadge, { marginBottom: 8 }]}>
                    <Ionicons name="close-circle" size={14} color={Colors.error} />
                    <Text style={styles.usedBadgeText}>{t('ticket_detail.status_drink_used')}</Text>
                  </View>
                ) : (
                  <View style={[styles.validBadge, { marginBottom: 8 }]}>
                    <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                    <Text style={styles.validText}>{t('ticket_detail.status_drink_available')}</Text>
                  </View>
                )}
                {!ticket.drinkUsed && isEventToday && (
                  <>
                    <TouchableOpacity
                      style={styles.baristaBtm}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        Alert.alert(
                          t('ticket_detail.barista_confirm_title'),
                          t('ticket_detail.barista_confirm_body'),
                          [
                            {
                              text: t('ticket_detail.barista_confirm_btn'),
                              style: 'destructive',
                              onPress: async () => {
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                try {
                                  await markDrinkUsed(ticket.id);
                                } catch {
                                  Alert.alert(t('common.error'), t('ticket_detail.barista_error'));
                                }
                              },
                            },
                            { text: t('common.cancel'), style: 'cancel' },
                          ]
                        );
                      }}
                    >
                      <Ionicons name="checkmark" size={16} color={Colors.white} />
                      <Text style={styles.baristaText}>{t('ticket_detail.barista_mark_used')}</Text>
                    </TouchableOpacity>
                    <View style={styles.actionDisclaimer}>
                      <Ionicons name="warning-outline" size={12} color={Colors.warning} />
                      <Text style={styles.actionDisclaimerText}>
                        {t('ticket_detail.barista_disclaimer')}
                      </Text>
                    </View>
                  </>
                )}
              </>
            ) : null}
          </Animated.View>

        </View>

        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.disclaimerText}>
            {t('ticket_detail.disclaimer_text')}
          </Text>
        </View>

      </ScrollView>

    </SafeAreaView>
  );
}

function CountdownInline({ rawDate, startTime }: { rawDate: string; startTime: string }) {
  const { label, isExpired } = useCountdown(rawDate, startTime);
  if (isExpired) return null;
  return (
    <View style={inlineStyles.badge}>
      <Ionicons name="timer-outline" size={12} color={Colors.accent} />
      <Text style={inlineStyles.text}>{label}</Text>
    </View>
  );
}

const inlineStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.accentBg,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  text: { fontSize: 12, fontFamily: Font.bold, color: Colors.accent },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFoundText: { color: Colors.textMuted },
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
  scroll: { padding: 20, paddingBottom: 110, alignItems: 'center' },

  // Info evento centrata sopra la card
  eventInfo: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 14,
    width: '100%', marginBottom: 24,
  },
  eventThumbnail: {
    width: 56, height: 56, borderRadius: 14, flexShrink: 0,
  },
  eventThumbnailFallback: {
    width: 56, height: 56, borderRadius: 14, flexShrink: 0,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  eventTextGroup: { flexShrink: 1 },
  eventName: {
    fontSize: 19, fontFamily: Font.extraBold, color: Colors.textPrimary,
    marginBottom: 3, lineHeight: 24,
  },
  eventMeta: { fontSize: 12, color: Colors.textSecondary, marginBottom: 8 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  ticketBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.accent,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4,
  },
  tableBadge: {
    backgroundColor: Colors.accentBorder,
    borderWidth: 1, borderColor: Colors.accent,
  },
  ticketBadgeText: { fontSize: 12, fontFamily: Font.bold, color: Colors.white },

  ticketCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    padding: 4, margin: 16,
  },
  toggleBtn: {
    flex: 1, flexDirection: 'row', paddingVertical: 10,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  toggleActive: { backgroundColor: Colors.accent },
  toggleText: { fontSize: 14, fontFamily: Font.semiBold, color: Colors.textMuted },
  toggleTextActive: { color: Colors.white },

  tableCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  tableCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
    marginRight: 12,
  },
  tableIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.accentBg,
    borderWidth: 1, borderColor: Colors.accentBorder,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  tableCardTitle: {
    fontSize: 15,
    fontFamily: Font.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  tableCardSub: {
    fontSize: 11,
    color: Colors.accent,
    marginTop: 1,
  },
  capacityBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
  },
  capacityNumber: {
    fontSize: 36,
    fontFamily: Font.extraBold,
    color: Colors.textPrimary,
    lineHeight: 40,
  },
  capacityLabel: {
    fontSize: 11,
    fontFamily: Font.semiBold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bottleServiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  bottleServiceText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: Font.semiBold,
  },

  perforationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 0,
  },
  notch: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.background,
    borderWidth: 1, borderColor: Colors.border,
  },
  notchLeft: { marginLeft: -11 },
  notchRight: { marginRight: -11 },
  dashedLine: {
    flex: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
  },

  qrContainer: { alignItems: 'center', padding: 20, paddingTop: 20 },
  qrWrapper: {
    padding: 14, backgroundColor: Colors.white, borderRadius: 16,
    marginBottom: 14, position: 'relative',
  },
  qrUsed: { opacity: 0.5 },
  usedOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20,
  },
  usedText: { fontSize: 28, fontFamily: Font.black, color: Colors.error, letterSpacing: 4 },
  qrLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 8, textAlign: 'center' },
  validBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  validText: { fontSize: 13, color: Colors.success, fontFamily: Font.semiBold },
  usedBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  usedBadgeText: { fontSize: 13, color: Colors.error, fontFamily: Font.semiBold },
  baristaBtm: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 13, marginBottom: 10,
  },
  baristaText: { fontSize: 14, fontFamily: Font.bold, color: Colors.white },
  bouncerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 13, marginBottom: 10,
  },
  bouncerBtnText: { fontSize: 14, fontFamily: Font.bold, color: Colors.white },
  actionDisclaimer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)',
    paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 20, width: '100%',
  },
  actionDisclaimerText: {
    flex: 1, fontSize: 11, color: Colors.warning, lineHeight: 16,
  },


  disclaimer: {
    flexDirection: 'row', gap: 8, width: '100%',
    paddingHorizontal: 4, paddingTop: 4,
  },
  disclaimerText: { flex: 1, fontSize: 12, color: Colors.textMuted, lineHeight: 18 },

  entryCodeBox: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(168,85,247,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.2)',
    marginBottom: 12,
    width: '100%',
  },
  entryCodeLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  entryCodeText: {
    fontSize: 28,
    fontFamily: Font.black,
    color: Colors.textPrimary,
    letterSpacing: 6,
  },
  entryCodeHint: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
});
