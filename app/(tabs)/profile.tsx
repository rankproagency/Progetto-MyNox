import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Image,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { Font } from '../../constants/typography';
import { useProfile } from '../../contexts/ProfileContext';
import { useTickets } from '../../contexts/TicketsContext';
import { useAuth } from '../../contexts/AuthContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import { useEvents } from '../../contexts/EventsContext';
import AppHeader from '../../components/AppHeader';
import { GENRE_CONFIG } from '../../constants/genres';
import { Genre } from '../../types';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const { tickets } = useTickets();
  const { user, logout, musicGenres } = useAuth();
  const { favoriteIds, favoriteClubs } = useFavorites();
  const { events } = useEvents();

  const displayName = user?.name ?? '—';
  const displayEmail = user?.email ?? '—';
  const eventsAttended = new Set(tickets.filter((t) => t.status === 'used').map((t) => t.eventId).filter(Boolean)).size;
  const uniqueClubs = new Set(tickets.filter((t) => t.status === 'used').map((t) => t.clubName).filter(Boolean)).size;

  const favoriteEvents = events.filter((e) => favoriteIds.includes(e.id));

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
    Linking.openURL('mailto:mynoxsupport@gmail.com?subject=Assistenza%20MyNox');
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

          {/* Header premium */}
          <View style={styles.headerSection}>
            <View style={styles.avatarWrapper}>
              <LinearGradient
                colors={[Colors.accent, '#9333ea', '#06b6d4']}
                style={styles.avatarRing}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={styles.avatar}>
                <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>
            </View>

            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.email}>{displayEmail}</Text>
            {profile.memberSince && (
              <Text style={styles.since}>Membro da {profile.memberSince}</Text>
            )}

            {/* Stats inline */}
            <View style={styles.statsInline}>
              <TouchableOpacity
                style={styles.statItem}
                activeOpacity={0.8}
                onPress={() => router.push('/(tabs)/tickets')}
              >
                <Text style={styles.statValue}>{eventsAttended}</Text>
                <Text style={styles.statLabel}>Serate</Text>
              </TouchableOpacity>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <Text style={styles.statValue}>{uniqueClubs}</Text>
                <Text style={styles.statLabel}>Club visitati</Text>
              </View>

              <View style={styles.statDivider} />

              <TouchableOpacity
                style={styles.statItem}
                activeOpacity={0.8}
                onPress={() => router.push('/(tabs)/tickets')}
              >
                <Text style={styles.statValue}>{tickets.length}</Text>
                <Text style={styles.statLabel}>Biglietti</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Generi musicali */}
          {musicGenres.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>I tuoi generi</Text>
              <View style={styles.genresList}>
                {musicGenres.map((genre) => {
                  const cfg = GENRE_CONFIG[genre as Genre] ?? { color: '#a855f7', colorEnd: '#6d28d9' };
                  return (
                    <LinearGradient
                      key={genre}
                      colors={[cfg.color, cfg.colorEnd]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.genreTag}
                    >
                      <Text style={styles.genreTagText}>{genre}</Text>
                    </LinearGradient>
                  );
                })}
              </View>
            </View>
          )}

          {/* Preferiti */}
          {(favoriteEvents.length > 0 || favoriteClubs.length > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Preferiti</Text>

              {favoriteClubs.length > 0 && (
                <>
                  <Text style={styles.subSectionTitle}>Club</Text>
                  <FlatList
                    data={favoriteClubs}
                    keyExtractor={(c) => c.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.favHorizontalList}
                    renderItem={({ item: club }) => (
                      <TouchableOpacity
                        style={styles.favClubCard}
                        activeOpacity={0.85}
                        onPress={() => router.push(`/club/${club.id}`)}
                      >
                        <Image
                          source={{ uri: club.imageUrl }}
                          style={styles.favClubImage}
                          resizeMode="cover"
                        />
                        <LinearGradient
                          colors={['transparent', 'rgba(7,8,15,0.85)']}
                          style={StyleSheet.absoluteFillObject}
                        />
                        <Text style={styles.favClubName} numberOfLines={1}>{club.name}</Text>
                        <Text style={styles.favClubCity}>{club.city}</Text>
                      </TouchableOpacity>
                    )}
                    scrollEnabled={favoriteClubs.length > 2}
                  />
                </>
              )}

              {favoriteEvents.length > 0 && (
                <>
                  <Text style={[styles.subSectionTitle, favoriteClubs.length > 0 && { marginTop: 16 }]}>
                    Eventi
                  </Text>
                  {favoriteEvents.map((event) => (
                    <TouchableOpacity
                      key={event.id}
                      style={styles.favEventRow}
                      activeOpacity={0.8}
                      onPress={() => router.push(`/event/${event.id}`)}
                    >
                      <Image
                        source={{ uri: event.imageUrl }}
                        style={styles.favEventThumb}
                        resizeMode="cover"
                      />
                      <View style={styles.favEventInfo}>
                        <Text style={styles.favEventName} numberOfLines={1}>{event.name}</Text>
                        <Text style={styles.favEventMeta}>{event.club?.name} · {event.date}</Text>
                      </View>
                      <Ionicons name="heart" size={14} color={Colors.accent} />
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>
          )}

          {/* Storico serate */}
          {(() => {
            const past = tickets.filter((t) => {
              if (!t.rawDate) return false;
              if (t.endTime) {
                const [hh, mm] = t.endTime.split(':').map(Number);
                const cutoff = new Date(t.rawDate);
                if (hh < 12) cutoff.setDate(cutoff.getDate() + 1);
                cutoff.setHours(hh, mm, 0, 0);
                return new Date() > cutoff;
              }
              const cutoff = new Date(t.rawDate);
              cutoff.setDate(cutoff.getDate() + 1);
              cutoff.setHours(12, 0, 0, 0);
              return new Date() > cutoff;
            });
            return (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Storico serate</Text>
                {past.length === 0 ? (
                  <View style={styles.historyEmpty}>
                    <Ionicons name="calendar-outline" size={32} color={Colors.textMuted} />
                    <Text style={styles.historyEmptyText}>Nessuna serata ancora</Text>
                    <Text style={styles.historyEmptySubtext}>Le serate passate appariranno qui</Text>
                  </View>
                ) : (
                  past.map((ticket) => (
                    <View key={ticket.id} style={styles.historyItem}>
                      <View style={[styles.historyDot, ticket.status === 'used' && styles.historyDotUsed]} />
                      <View style={styles.historyInfo}>
                        <Text style={styles.historyEvent} numberOfLines={1}>{ticket.eventName}</Text>
                        <Text style={styles.historyMeta}>{ticket.clubName} · {ticket.date}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            );
          })()}

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
    height: 320,
  },
  scroll: { paddingBottom: 40 },

  // Header premium
  headerSection: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  avatarWrapper: {
    position: 'relative',
    width: 114,
    height: 114,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRing: {
    position: 'absolute',
    width: 114,
    height: 114,
    borderRadius: 57,
  },
  avatar: {
    width: 106,
    height: 106,
    borderRadius: 53,
    backgroundColor: '#1a1025',
    borderWidth: 3,
    borderColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { fontSize: 40, fontWeight: '800', color: Colors.white },
  name: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  email: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  since: { fontSize: 12, color: Colors.textMuted, marginBottom: 20 },

  // Stats inline
  statsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 16,
    paddingHorizontal: 8,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.accent,
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },

  // Sections
  section: { paddingHorizontal: 20, marginBottom: 28 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 14 },
  subSectionTitle: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 },

  // Generi
  genresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreTag: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  genreTagText: {
    fontSize: 13,
    fontFamily: Font.semiBold,
    color: '#ffffff',
  },

  // Favoriti club
  favHorizontalList: {
    gap: 10,
  },
  favClubCard: {
    width: 130,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    justifyContent: 'flex-end',
    padding: 8,
  },
  favClubImage: {
    ...StyleSheet.absoluteFillObject,
  },
  favClubName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  favClubCity: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 1,
  },

  // Favoriti eventi
  favEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
    marginBottom: 8,
  },
  favEventThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  favEventInfo: { flex: 1 },
  favEventName: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginBottom: 3 },
  favEventMeta: { fontSize: 11, color: Colors.textMuted },

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
