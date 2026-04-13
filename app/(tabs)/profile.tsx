import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { useProfile } from '../../contexts/ProfileContext';
import { useTickets } from '../../contexts/TicketsContext';
import { useAuth } from '../../contexts/AuthContext';
import AppHeader from '../../components/AppHeader';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const { tickets } = useTickets();
  const { user, logout } = useAuth();

  const displayName = user?.name ?? profile.name;
  const displayEmail = user?.email ?? profile.email;
  const totalSpent = profile.totalSpent;
  const eventsAttended = profile.eventsAttended + tickets.length;

  function handleLogout() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Esci dall\'account',
      'Sei sicuro di voler uscire?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Esci',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  }

  function handlePrivacy() {
    router.push('/privacy');
  }

  function handleSupport() {
    Linking.openURL('mailto:assistenza@mynox.it?subject=Assistenza%20MyNox');
  }

  function handleNotifications() {
    Linking.openSettings();
  }

  return (
    <View style={styles.outerContainer}>
      <LinearGradient
        colors={['rgba(168,85,247,0.22)', 'transparent']}
        style={styles.bgGradient}
        pointerEvents="none"
      />
      <SafeAreaView style={{ flex: 1 }}>
        <AppHeader />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Avatar + nome */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.email}>{displayEmail}</Text>
            <Text style={styles.since}>Membro da {profile.memberSince}</Text>
          </View>

          {/* Statistiche */}
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statCard} activeOpacity={0.8} onPress={() => router.push('/(tabs)/tickets')}>
              <Text style={styles.statValue}>{eventsAttended}</Text>
              <Text style={styles.statLabel}>Serate</Text>
            </TouchableOpacity>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>€{totalSpent}</Text>
              <Text style={styles.statLabel}>Spesa totale</Text>
            </View>
            <TouchableOpacity style={styles.statCard} activeOpacity={0.8} onPress={() => router.push('/(tabs)/tickets')}>
              <Text style={[styles.statValue, styles.statValueSmall]}>{tickets.length > 0 ? tickets.length : '—'}</Text>
              <Text style={styles.statLabel}>Biglietti attivi</Text>
            </TouchableOpacity>
          </View>

          {/* Storico eventi */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Storico serate</Text>
            {tickets.length === 0 ? (
              <View style={styles.historyEmpty}>
                <Ionicons name="calendar-outline" size={32} color={Colors.textMuted} />
                <Text style={styles.historyEmptyText}>Nessuna serata ancora</Text>
                <Text style={styles.historyEmptySubtext}>I tuoi biglietti acquistati appariranno qui</Text>
              </View>
            ) : (
              tickets.slice().reverse().map((ticket) => (
                <TouchableOpacity
                  key={ticket.id}
                  style={styles.historyItem}
                  activeOpacity={0.8}
                  onPress={() => router.push(`/event/${ticket.eventId}`)}
                >
                  <View style={[styles.historyDot, ticket.status === 'used' && styles.historyDotUsed]} />
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyEvent} numberOfLines={1}>{ticket.eventName}</Text>
                    <Text style={styles.historyMeta}>{ticket.clubName} · {ticket.date}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Azioni account */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <AccountRow
              icon="person-outline"
              label="Modifica profilo"
              onPress={() => router.push('/edit-profile')}
            />
            <AccountRow
              icon="notifications-outline"
              label="Notifiche"
              onPress={handleNotifications}
            />
            <AccountRow
              icon="shield-outline"
              label="Privacy e sicurezza"
              onPress={handlePrivacy}
            />
            <AccountRow
              icon="help-circle-outline"
              label="Assistenza"
              onPress={handleSupport}
            />
            <AccountRow
              icon="log-out-outline"
              label="Esci"
              danger
              onPress={handleLogout}
            />
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function StatCard({ value, label, small }: { value: string | number; label: string; small?: boolean }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, small && styles.statValueSmall]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function AccountRow({
  icon,
  label,
  danger,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  danger?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.accountRow} activeOpacity={0.8} onPress={onPress}>
      <Ionicons name={icon} size={18} color={danger ? Colors.error : Colors.textSecondary} />
      <Text style={[styles.accountLabel, danger && styles.accountLabelDanger]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: Colors.background },
  bgGradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 300,
  },
  scroll: { paddingBottom: 40 },

  // Avatar
  avatarSection: { alignItems: 'center', paddingTop: 32, paddingBottom: 24, paddingHorizontal: 20 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.accent,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  avatarInitial: { fontSize: 32, fontWeight: '800', color: Colors.white },
  name: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  email: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  since: { fontSize: 12, color: Colors.textMuted },

  // Stats
  statsRow: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, marginBottom: 28,
  },
  statCard: {
    flex: 1, backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    padding: 14, alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '800', color: Colors.accent, marginBottom: 4 },
  statValueSmall: { fontSize: 14 },
  statLabel: { fontSize: 11, color: Colors.textMuted, textAlign: 'center' },

  // Sections
  section: { paddingHorizontal: 20, marginBottom: 28 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 14 },

  // History
  historyEmpty: {
    alignItems: 'center', paddingVertical: 28, gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
  },
  historyEmptyText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  historyEmptySubtext: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 20 },
  historyDotUsed: { backgroundColor: Colors.textMuted },
  historyItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    padding: 12, marginBottom: 8,
  },
  historyDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.accent,
    flexShrink: 0,
  },
  historyInfo: { flex: 1 },
  historyEvent: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginBottom: 3 },
  historyMeta: { fontSize: 11, color: Colors.textMuted },

  // Account rows
  accountRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    padding: 14, marginBottom: 8,
  },
  accountLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  accountLabelDanger: { color: Colors.error },
});
