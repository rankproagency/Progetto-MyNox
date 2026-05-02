import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { Font } from '../../constants/typography';
import { useTickets } from '../../contexts/TicketsContext';
import { useCountdown } from '../../hooks/useCountdown';
export default function TicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { tickets, markDrinkUsed, markTicketUsed } = useTickets();
  const ticket = tickets.find((t) => t.id === id);
  const [activeQR, setActiveQR] = useState<'entry' | 'drink'>('entry');

  const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
  const isEventToday = ticket?.rawDate === today;

  if (!ticket) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Biglietto non trovato</Text>
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
        <Text style={styles.headerTitle}>{ticket.type === 'table' ? 'La mia prenotazione' : 'Il mio biglietto'}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Info evento — centrata sopra la card */}
        <View style={styles.eventInfo}>
          {ticket.eventImageUrl ? (
            <Image source={{ uri: ticket.eventImageUrl }} style={styles.eventThumbnail} resizeMode="cover" />
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
                  color={Colors.white}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.ticketBadgeText}>
                  {ticket.ticketLabel}
                </Text>
              </View>
              <CountdownInline rawDate={ticket.rawDate} startTime={ticket.startTime} />
            </View>
          </View>
        </View>

        {/* Ticket card — solo QR */}
        <View style={styles.ticketCard}>

          {/* Toggle drink — solo per prevendita */}
          {ticket.type === 'ticket' && (
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
                <Text style={[styles.toggleText, activeQR === 'entry' && styles.toggleTextActive]}>Ingresso</Text>
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
                <Text style={[styles.toggleText, activeQR === 'drink' && styles.toggleTextActive]}>Free drink</Text>
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
                  <Text style={styles.tableCardTitle}>{ticket.ticketLabel}</Text>
                  {ticket.tableSection ? (
                    <View style={styles.tableSectionRow}>
                      <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
                      <Text style={styles.tableSectionText}>{ticket.tableSection}</Text>
                    </View>
                  ) : null}
                  {ticket.tableName ? (
                    <Text style={styles.tableCardSub}>Prenotazione: "{ticket.tableName}"</Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.tableCardBadgesCol}>
                {ticket.tableCapacity != null && (
                  <View style={styles.capacityBadge}>
                    <Ionicons name="people-outline" size={12} color={Colors.textSecondary} style={{ marginRight: 3 }} />
                    <Text style={styles.capacityBadgeText}>{ticket.tableCapacity} posti</Text>
                  </View>
                )}
                <View style={styles.tableCardBadge}>
                  <Text style={styles.tableCardBadgeText}>Solo ingresso</Text>
                </View>
              </View>
            </View>
          )}

          {/* Separatore perforato */}
          <View style={styles.perforationRow}>
            <View style={[styles.notch, styles.notchLeft]} />
            <View style={styles.dashedLine} />
            <View style={[styles.notch, styles.notchRight]} />
          </View>

          {/* QR area */}
          <View style={styles.qrContainer}>
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
                      <Text style={styles.usedText}>USATO</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.qrLabel}>
                  {ticket.status === 'used' ? 'Biglietto già scansionato' : 'Mostra questo QR al buttafuori'}
                </Text>
                {ticket.status === 'used' ? (
                  <View style={[styles.usedBadge, { marginBottom: 8 }]}>
                    <Ionicons name="close-circle" size={14} color={Colors.error} />
                    <Text style={styles.usedBadgeText}> Ingresso effettuato</Text>
                  </View>
                ) : (
                  <>
                    <View style={[styles.validBadge, { marginBottom: 8 }]}>
                      <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                      <Text style={styles.validText}> Valido</Text>
                    </View>
                    {isEventToday && (
                      <>
                        <TouchableOpacity
                          style={styles.bouncerBtn}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            Alert.alert(
                              'Conferma ingresso',
                              'Stai per segnare questo biglietto come usato. L\'operazione è irreversibile.',
                              [
                                {
                                  text: 'Conferma ingresso',
                                  style: 'destructive',
                                  onPress: () => {
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                    markTicketUsed(ticket.id);
                                  },
                                },
                                { text: 'Annulla', style: 'cancel' },
                              ]
                            );
                          }}
                        >
                          <Ionicons name="shield-checkmark-outline" size={16} color={Colors.white} />
                          <Text style={styles.bouncerBtnText}>Segna come usato (buttafuori)</Text>
                        </TouchableOpacity>
                        <View style={styles.actionDisclaimer}>
                          <Ionicons name="warning-outline" size={12} color={Colors.warning} />
                          <Text style={styles.actionDisclaimerText}>
                            Attenzione: una volta segnato come usato non è possibile riattivare il biglietto.
                          </Text>
                        </View>
                      </>
                    )}
                  </>
                )}
              </>
            ) : ticket.type === 'ticket' ? (
              <>
                <View style={[styles.qrWrapper, ticket.drinkUsed && styles.qrUsed]}>
                  <QRCode
                    value={ticket.drinkQrCode!}
                    size={210}
                    backgroundColor="white"
                    color={ticket.drinkUsed ? '#aaa' : 'black'}
                  />
                  {ticket.drinkUsed && (
                    <View style={styles.usedOverlay}>
                      <Text style={styles.usedText}>USATO</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.qrLabel}>
                  {ticket.drinkUsed ? 'Free drink già riscattato' : 'Mostra questo QR al barista'}
                </Text>
                {ticket.drinkUsed ? (
                  <View style={[styles.usedBadge, { marginBottom: 8 }]}>
                    <Ionicons name="close-circle" size={14} color={Colors.error} />
                    <Text style={styles.usedBadgeText}> Usato</Text>
                  </View>
                ) : (
                  <View style={[styles.validBadge, { marginBottom: 8 }]}>
                    <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                    <Text style={styles.validText}> Disponibile</Text>
                  </View>
                )}
                {!ticket.drinkUsed && isEventToday && (
                  <>
                    <TouchableOpacity
                      style={styles.baristaBtm}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        Alert.alert(
                          'Conferma free drink',
                          'Stai per segnare il free drink come riscattato. L\'operazione è irreversibile.',
                          [
                            {
                              text: 'Conferma riscatto',
                              style: 'destructive',
                              onPress: () => {
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                markDrinkUsed(ticket.id);
                              },
                            },
                            { text: 'Annulla', style: 'cancel' },
                          ]
                        );
                      }}
                    >
                      <Ionicons name="checkmark" size={16} color={Colors.white} />
                      <Text style={styles.baristaText}>Segna come usato (barista)</Text>
                    </TouchableOpacity>
                    <View style={styles.actionDisclaimer}>
                      <Ionicons name="warning-outline" size={12} color={Colors.warning} />
                      <Text style={styles.actionDisclaimerText}>
                        Attenzione: una volta riscattato il drink non può essere riutilizzato.
                      </Text>
                    </View>
                  </>
                )}
              </>
            ) : null}
          </View>

        </View>

        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.disclaimerText}>
            Il buttafuori può negare l'accesso per dress code o stato del cliente. Nessun rimborso previsto.
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
  tableSectionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 3,
  },
  tableSectionText: {
    fontSize: 11, color: Colors.textMuted,
  },
  tableCardSub: {
    fontSize: 11,
    color: Colors.accent,
    marginTop: 1,
  },
  tableCardBadgesCol: {
    alignItems: 'flex-end',
    gap: 5,
  },
  capacityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  capacityBadgeText: {
    fontSize: 11,
    fontFamily: Font.semiBold,
    color: Colors.textSecondary,
  },
  tableCardBadge: {
    backgroundColor: Colors.accentBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tableCardBadgeText: {
    fontSize: 11,
    fontFamily: Font.bold,
    color: Colors.accent,
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
});
