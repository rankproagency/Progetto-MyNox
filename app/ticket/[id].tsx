import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { useTickets } from '../../contexts/TicketsContext';
import { useCountdown } from '../../hooks/useCountdown';
import WalletModal from '../../components/WalletModal';

export default function TicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { tickets, markDrinkUsed, markTicketUsed } = useTickets();
  const ticket = tickets.find((t) => t.id === id);
  const [activeQR, setActiveQR] = useState<'entry' | 'drink'>('entry');
  const [walletVisible, setWalletVisible] = useState(false);

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

  async function handleGift() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Share.share({
      message:
        `Ti regalo un biglietto per ${ticket!.eventName} @ ${ticket!.clubName}!\n\n` +
        `Codice: ${ticket!.qrCode}\n\n` +
        `Scarica MyNox e usa questo codice per riscattare il biglietto.`,
      title: `Biglietto per ${ticket!.eventName}`,
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/tickets')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Il mio biglietto</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleGift}>
          <Ionicons name="gift-outline" size={20} color={Colors.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Info evento */}
        <View style={styles.eventInfo}>
          <Text style={styles.eventName}>{ticket.eventName}</Text>
          <Text style={styles.eventMeta}>
            {ticket.clubName} · {ticket.date} · {ticket.startTime}
          </Text>
          <View style={styles.badgeRow}>
            <View style={styles.ticketBadge}>
              <Text style={styles.ticketBadgeText}>{ticket.ticketLabel}</Text>
            </View>
            <CountdownInline rawDate={ticket.rawDate} startTime={ticket.startTime} />
          </View>
        </View>

        {/* Toggle QR */}
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, activeQR === 'entry' && styles.toggleActive]}
            onPress={() => { Haptics.selectionAsync(); setActiveQR('entry'); }}
          >
            <Text style={[styles.toggleText, activeQR === 'entry' && styles.toggleTextActive]}>Ingresso</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, activeQR === 'drink' && styles.toggleActive]}
            onPress={() => { Haptics.selectionAsync(); setActiveQR('drink'); }}
          >
            <Text style={[styles.toggleText, activeQR === 'drink' && styles.toggleTextActive]}>Free drink</Text>
          </TouchableOpacity>
        </View>

        {/* QR Code */}
        <View style={styles.qrContainer}>
          {activeQR === 'entry' ? (
            <>
              <View style={[styles.qrWrapper, ticket.status === 'used' && styles.qrUsed]}>
                <QRCode
                  value={ticket.qrCode}
                  size={220}
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
                <View style={[styles.usedBadge, { marginBottom: 24 }]}>
                  <Ionicons name="close-circle" size={14} color={Colors.error} />
                  <Text style={styles.usedBadgeText}> Ingresso effettuato</Text>
                </View>
              ) : (
                <>
                  <View style={[styles.validBadge, { marginBottom: 16 }]}>
                    <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                    <Text style={styles.validText}> Valido</Text>
                  </View>
                  {isEventToday && (
                    <>
                      <TouchableOpacity
                        style={styles.bouncerBtn}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          markTicketUsed(ticket.id);
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
          ) : (
            <>
              <View style={[styles.qrWrapper, ticket.drinkUsed && styles.qrUsed]}>
                <QRCode
                  value={ticket.drinkQrCode}
                  size={220}
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
                <View style={styles.usedBadge}>
                  <Ionicons name="close-circle" size={14} color={Colors.error} />
                  <Text style={styles.usedBadgeText}> Usato</Text>
                </View>
              ) : (
                <View style={styles.validBadge}>
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
                      markDrinkUsed(ticket.id);
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
          )}
        </View>

        {/* Action buttons */}
        <TouchableOpacity
          style={styles.walletButton}
          onPress={() => { Haptics.selectionAsync(); setWalletVisible(true); }}
          activeOpacity={0.85}
        >
          <Ionicons name="wallet-outline" size={18} color={Colors.white} />
          <Text style={styles.walletButtonText}>Aggiungi al Wallet</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.giftButton} onPress={handleGift} activeOpacity={0.85}>
          <Ionicons name="gift-outline" size={18} color={Colors.accent} />
          <View style={styles.giftText}>
            <Text style={styles.giftTitle}>Regala questo biglietto</Text>
            <Text style={styles.giftSubtitle}>Condividi il codice con un amico</Text>
          </View>
          <Ionicons name="share-social-outline" size={18} color={Colors.accent} />
        </TouchableOpacity>

        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.disclaimerText}>
            Il buttafuori può negare l'accesso per dress code o stato del cliente. Nessun rimborso previsto.
          </Text>
        </View>

      </ScrollView>

      <WalletModal
        visible={walletVisible}
        onClose={() => setWalletVisible(false)}
        ticket={ticket}
      />
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
    backgroundColor: 'rgba(168,85,247,0.12)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  text: { fontSize: 12, fontWeight: '700', color: Colors.accent },
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
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  backButton: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  scroll: { padding: 20, paddingBottom: 40, alignItems: 'center' },

  eventInfo: { alignItems: 'center', marginBottom: 24 },
  eventName: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: 6 },
  eventMeta: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginBottom: 10 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ticketBadge: {
    backgroundColor: Colors.accent,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4,
  },
  ticketBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.white },

  toggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    padding: 4, marginBottom: 28, width: '100%',
  },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  toggleActive: { backgroundColor: Colors.accent },
  toggleText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  toggleTextActive: { color: Colors.white },

  qrContainer: { alignItems: 'center', width: '100%' },
  qrWrapper: {
    padding: 16, backgroundColor: Colors.white, borderRadius: 20,
    marginBottom: 16, position: 'relative',
  },
  qrUsed: { opacity: 0.5 },
  usedOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20,
  },
  usedText: { fontSize: 28, fontWeight: '900', color: Colors.error, letterSpacing: 4 },
  qrLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 8, textAlign: 'center' },
  validBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  validText: { fontSize: 13, color: Colors.success, fontWeight: '600' },
  usedBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  usedBadgeText: { fontSize: 13, color: Colors.error, fontWeight: '600' },
  baristaBtm: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 13, marginBottom: 10,
  },
  baristaText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  bouncerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 13, marginBottom: 10,
  },
  bouncerBtnText: { fontSize: 14, fontWeight: '700', color: Colors.white },
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

  walletButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 14, paddingVertical: 14,
    width: '100%', marginBottom: 12,
  },
  walletButtonText: { fontSize: 15, fontWeight: '700', color: Colors.white },

  giftButton: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.accent,
    padding: 14, width: '100%', marginBottom: 16,
  },
  giftText: { flex: 1 },
  giftTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  giftSubtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  disclaimer: {
    flexDirection: 'row', gap: 8, width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    padding: 14,
  },
  disclaimerText: { flex: 1, fontSize: 12, color: Colors.textMuted, lineHeight: 18 },
});
