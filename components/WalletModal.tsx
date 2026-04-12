import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';

interface Props {
  visible: boolean;
  onClose: () => void;
  ticket: {
    eventName: string;
    clubName: string;
    date: string;
    startTime: string;
    ticketLabel: string;
    qrCode: string;
  };
}

export default function WalletModal({ visible, onClose, ticket }: Props) {
  async function handleWallet(platform: 'apple' | 'google') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        title: `MyNox — ${ticket.eventName}`,
        message:
          `🎫 BIGLIETTO MYNOX\n\n` +
          `Evento: ${ticket.eventName}\n` +
          `Club: ${ticket.clubName}\n` +
          `Data: ${ticket.date} · ${ticket.startTime}\n` +
          `Tipo: ${ticket.ticketLabel}\n\n` +
          `Codice QR: ${ticket.qrCode}\n\n` +
          `Apri MyNox per mostrare il QR all'ingresso.`,
      });
    } catch {
      // share dismissed
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>

        {/* Handle */}
        <View style={styles.handle} />

        {/* Title */}
        <Text style={styles.title}>Aggiungi al Wallet</Text>
        <Text style={styles.subtitle}>Tieni il biglietto sempre a portata di mano</Text>

        {/* Ticket card preview */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardEvent} numberOfLines={1}>{ticket.eventName}</Text>
              <Text style={styles.cardClub}>{ticket.clubName}</Text>
              <Text style={styles.cardMeta}>{ticket.date} · {ticket.startTime}</Text>
            </View>
            <View style={styles.cardBadge}>
              <Text style={styles.cardBadgeText}>{ticket.ticketLabel}</Text>
            </View>
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.qrArea}>
            <QRCode value={ticket.qrCode} size={90} backgroundColor="white" color="black" />
          </View>
        </View>

        {/* Wallet buttons */}
        <TouchableOpacity
          style={[styles.walletBtn, styles.appleBtn]}
          activeOpacity={0.85}
          onPress={() => handleWallet('apple')}
        >
          <Ionicons name="logo-apple" size={20} color="#000" />
          <Text style={styles.appleBtnText}>Aggiungi ad Apple Wallet</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.walletBtn, styles.googleBtn]}
          activeOpacity={0.85}
          onPress={() => handleWallet('google')}
        >
          <Ionicons name="card-outline" size={20} color={Colors.textPrimary} />
          <Text style={styles.googleBtnText}>Aggiungi a Google Wallet</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          L'integrazione nativa con Apple e Google Wallet sarà disponibile nella versione finale con backend attivo.
        </Text>

        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.closeBtnText}>Chiudi</Text>
        </TouchableOpacity>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderBottomWidth: 0, borderColor: Colors.border,
    padding: 24, paddingBottom: 40,
    gap: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.border, marginBottom: 8,
  },
  title: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginBottom: 4 },

  card: {
    backgroundColor: Colors.background,
    borderRadius: 18, borderWidth: 1, borderColor: Colors.accent,
    padding: 16, marginVertical: 4,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardEvent: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginBottom: 2, maxWidth: 200 },
  cardClub: { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  cardMeta: { fontSize: 11, color: Colors.textMuted },
  cardBadge: {
    backgroundColor: Colors.accent,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  cardBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.white },
  cardDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 12 },
  qrArea: { alignItems: 'center', padding: 4, backgroundColor: 'white', borderRadius: 12, alignSelf: 'center' },

  walletBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderRadius: 16, paddingVertical: 15,
  },
  appleBtn: { backgroundColor: '#ffffff' },
  appleBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
  googleBtn: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderColor: Colors.border,
  },
  googleBtnText: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },

  note: {
    fontSize: 11, color: Colors.textMuted, textAlign: 'center',
    lineHeight: 16, paddingHorizontal: 8,
  },
  closeBtn: { alignItems: 'center', paddingVertical: 4 },
  closeBtnText: { fontSize: 14, color: Colors.textMuted },
});
