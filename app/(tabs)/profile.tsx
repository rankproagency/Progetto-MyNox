import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { versionedImageUrl } from '../../lib/imageUrl';
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
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../../lib/i18n';
import { useTabBarScroll } from '../../contexts/TabBarContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const { tickets } = useTickets();
  const { user, logout, deleteAccount, musicGenres } = useAuth();
  const { favoriteIds, favoriteClubs } = useFavorites();
  const { events } = useEvents();
  const { t, i18n } = useTranslation();
  const { onScroll } = useTabBarScroll();

  const displayName = user?.name ?? '—';
  const displayEmail = user?.email ?? '—';
  function isTicketPast(t: typeof tickets[number]): boolean {
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
  }

  const pastTickets = tickets.filter(isTicketPast);
  const eventsAttended = new Set(pastTickets.map((t) => t.eventId).filter(Boolean)).size;
  const uniqueClubs = new Set(pastTickets.map((t) => t.clubName).filter(Boolean)).size;

  function isEventPast(event: typeof events[number]): boolean {
    const date = new Date(event.date);
    if (event.endTime) {
      const [hh, mm] = event.endTime.split(':').map(Number);
      if (hh < 12) date.setDate(date.getDate() + 1);
      date.setHours(hh, mm, 0, 0);
    } else {
      date.setDate(date.getDate() + 1);
      date.setHours(12, 0, 0, 0);
    }
    return new Date() > date;
  }

  const allFavoriteEvents = events.filter((e) => favoriteIds.includes(e.id));
  const favoriteEvents = allFavoriteEvents.filter((e) => !isEventPast(e));

  function handleLogout() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('profile.logout_title'),
      t('profile.logout_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.logout_confirm_btn'),
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  }

  function handlePrivacy() {
    router.push('/privacy');
  }

  function handleTerms() {
    router.push('/terms');
  }

  function handleSupport() {
    Linking.openURL('mailto:mynoxsupport@gmail.com?subject=Assistenza%20MyNox');
  }

  function handleNotifications() {
    Linking.openSettings();
  }

  function handleDeleteAccount() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Elimina account',
      'Questa azione è irreversibile. Tutti i tuoi dati personali verranno eliminati entro 30 giorni, ad eccezione delle transazioni che devono essere conservate per obblighi fiscali. Vuoi procedere?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina definitivamente',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Sei sicuro?',
              'Scrivi "ELIMINA" per confermare la cancellazione permanente del tuo account.',
              [
                { text: 'Annulla', style: 'cancel' },
                {
                  text: 'Conferma eliminazione',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteAccount();
                    } catch {
                      Alert.alert('Errore', 'Impossibile eliminare l\'account. Contatta il supporto: mynoxsupport@gmail.com');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }

  return (
    <View style={styles.outerContainer}>
      <LinearGradient
        colors={[Colors.accentBgMid, 'transparent']}
        style={styles.bgGradient}
        pointerEvents="none"
      />
      <SafeAreaView style={{ flex: 1 }}>
        <AppHeader />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}>

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
              <Text style={styles.since}>{t('profile.member_since')}{profile.memberSince}</Text>
            )}

            {/* Stats inline */}
            <View style={styles.statsInline}>
              <TouchableOpacity
                style={styles.statItem}
                activeOpacity={0.8}
                onPress={() => router.push('/(tabs)/tickets')}
              >
                <Text style={styles.statValue}>{eventsAttended}</Text>
                <Text style={styles.statLabel}>{t('profile.stat_nights')}</Text>
              </TouchableOpacity>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <Text style={styles.statValue}>{uniqueClubs}</Text>
                <Text style={styles.statLabel}>{t('profile.stat_clubs_visited')}</Text>
              </View>

              <View style={styles.statDivider} />

              <TouchableOpacity
                style={styles.statItem}
                activeOpacity={0.8}
                onPress={() => router.push('/(tabs)/tickets')}
              >
                <Text style={styles.statValue}>{tickets.length}</Text>
                <Text style={styles.statLabel}>{t('profile.stat_tickets')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Generi musicali */}
          {musicGenres.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('profile.section_genres')}</Text>
              <View style={styles.genresList}>
                {musicGenres.map((genre) => {
                  const cfg = GENRE_CONFIG[genre as Genre];
                  const bg = cfg ? cfg.color.replace(/[\d.]+\)$/, '0.10)') : Colors.accentBg;
                  const border = cfg ? cfg.color.replace(/[\d.]+\)$/, '0.35)') : Colors.accentBorder;
                  const text = cfg ? cfg.color.replace(/[\d.]+\)$/, '1)') : Colors.accent;
                  return (
                    <View key={genre} style={[styles.genreTag, { backgroundColor: bg, borderColor: border }]}>
                      <Text style={[styles.genreTagText, { color: text }]}>{genre}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Preferiti */}
          {(favoriteClubs.length > 0 || favoriteIds.length > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('profile.section_favorites')}</Text>

              {favoriteClubs.length > 0 && (
                <>
                  <Text style={styles.subSectionTitle}>{t('profile.favorites_sub_clubs')}</Text>
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
                          source={{ uri: versionedImageUrl(club.imageUrl, club.updatedAt) }}
                          style={styles.favClubImage}
                          contentFit="cover"
                          cachePolicy="memory-disk"
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

              <>
                <Text style={[styles.subSectionTitle, favoriteClubs.length > 0 && { marginTop: 16 }]}>
                  {t('profile.favorites_sub_events')}
                </Text>
                {favoriteIds.length === 0 ? (
                  <Text style={styles.favEventHint}>{t('profile.favorites_events_empty_hint')}</Text>
                ) : favoriteEvents.length === 0 ? (
                  <Text style={styles.favEventHint}>{t('profile.favorites_events_all_past')}</Text>
                ) : (
                  favoriteEvents.map((event) => {
                    const isSoldOut = event.ticketTypes.length > 0 && event.ticketTypes.every((t) => t.available === 0);
                    return (
                      <TouchableOpacity
                        key={event.id}
                        style={styles.favEventRow}
                        activeOpacity={0.8}
                        onPress={() => router.push(`/event/${event.id}`)}
                      >
                        <Image
                          source={{ uri: versionedImageUrl(event.imageUrl, event.updatedAt) }}
                          style={[styles.favEventThumb, isSoldOut && { opacity: 0.5 }]}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                        />
                        <View style={styles.favEventInfo}>
                          <Text style={styles.favEventName} numberOfLines={1}>{event.name}</Text>
                          <Text style={styles.favEventMeta}>{event.club?.name} · {event.date}</Text>
                        </View>
                        {isSoldOut
                          ? <View style={styles.soldOutBadge}><Text style={styles.soldOutText}>{t('profile.sold_out_badge')}</Text></View>
                          : <Ionicons name="heart" size={14} color={Colors.accent} />
                        }
                      </TouchableOpacity>
                    );
                  })
                )}
              </>
            </View>
          )}

          {/* Serate passate — memory card */}
          {pastTickets.length > 0 && (() => {
            const sorted = [...pastTickets].sort((a, b) => b.rawDate.localeCompare(a.rawDate));
            const thumbs = sorted.filter((t) => t.eventImageUrl).slice(0, 3);
            const bgImage = sorted.find((t) => t.eventImageUrl)?.eventImageUrl;

            return (
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.memoryCard}
                  activeOpacity={0.88}
                  onPress={() => router.push({ pathname: '/(tabs)/tickets', params: { tab: 'past', t: String(Date.now()) } })}
                >
                  {/* Sfondo — ultimo evento */}
                  {bgImage && (
                    <Image source={{ uri: bgImage }} style={styles.memoryBg} contentFit="cover" cachePolicy="memory-disk" />
                  )}
                  <LinearGradient
                    colors={['rgba(7,8,15,0.3)', 'rgba(7,8,15,0.92)']}
                    style={StyleSheet.absoluteFillObject}
                  />

                  {/* Contenuto */}
                  <View style={styles.memoryContent}>
                    <View style={styles.memoryTop}>
                      <View style={styles.memoryBadge}>
                        <Ionicons name="time-outline" size={11} color={Colors.accent} />
                        <Text style={styles.memoryBadgeText}>{t('profile.history_badge')}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.5)" />
                    </View>

                    <View style={styles.memoryBottom}>
                      {/* Thumbnail sovrapposti */}
                      {thumbs.length > 0 && (
                        <View style={styles.thumbStack}>
                          {thumbs.map((t, i) => (
                            <Image
                              key={t.id}
                              source={{ uri: t.eventImageUrl }}
                              style={[styles.thumbStackItem, { marginLeft: i === 0 ? 0 : -10, zIndex: thumbs.length - i }]}
                              contentFit="cover"
                              cachePolicy="memory-disk"
                            />
                          ))}
                        </View>
                      )}

                      <View style={styles.memoryStats}>
                        <Text style={styles.memoryCount}>
                          {eventsAttended} {eventsAttended === 1 ? t('profile.night_singular') : t('profile.night_plural')}
                        </Text>
                        <Text style={styles.memorySubCount}>
                          in {uniqueClubs} {uniqueClubs === 1 ? t('common.club_singular') : t('common.club_plural')}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            );
          })()}

          {/* Azioni account */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('profile.section_account')}</Text>

            <Text style={styles.accountGroupLabel}>{t('profile.group_settings')}</Text>
            <AccountRow
              icon="person-outline"
              label={t('profile.account_edit_profile')}
              onPress={() => router.push('/edit-profile')}
            />
            <AccountRow
              icon="notifications-outline"
              label={t('profile.account_notifications')}
              onPress={handleNotifications}
            />
            <AccountRow
              icon="language-outline"
              label="Lingua"
              value={SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language)?.label ?? 'Italiano'}
              onPress={() => router.push('/language')}
            />
            <AccountRow
              icon="shield-outline"
              label={t('profile.account_privacy')}
              onPress={handlePrivacy}
            />

            <Text style={styles.accountGroupLabel}>{t('profile.group_support')}</Text>
            <AccountRow
              icon="document-text-outline"
              label={t('profile.account_terms')}
              onPress={handleTerms}
            />
            <AccountRow
              icon="help-circle-outline"
              label={t('profile.account_support')}
              onPress={handleSupport}
            />

            <View style={{ marginTop: 8 }}>
              <AccountRow
                icon="log-out-outline"
                label={t('profile.account_logout')}
                danger
                onPress={handleLogout}
              />
              <AccountRow
                icon="trash-outline"
                label="Elimina account"
                danger
                onPress={handleDeleteAccount}
              />
            </View>
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
  value,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  danger?: boolean;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.accountRow} activeOpacity={0.8} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: danger ? 'rgba(239,68,68,0.12)' : 'rgba(168,85,247,0.10)' }]}>
        <Ionicons name={icon} size={16} color={danger ? Colors.error : '#c084fc'} />
      </View>
      <Text style={[styles.accountLabel, danger && styles.accountLabelDanger]}>{label}</Text>
      <View style={styles.accountRowRight}>
        {value && <Text style={styles.accountRowValue}>{value}</Text>}
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </View>
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
  scroll: { paddingBottom: 120 },

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
  avatarInitial: { fontSize: 40, fontFamily: Font.extraBold, color: Colors.white },
  name: { fontSize: 22, fontFamily: Font.extraBold, color: Colors.textPrimary, marginBottom: 4 },
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
    fontFamily: Font.extraBold,
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
  sectionTitle: { fontSize: 16, fontFamily: Font.bold, color: Colors.textPrimary, marginBottom: 14 },
  subSectionTitle: { fontSize: 12, fontFamily: Font.semiBold, color: Colors.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 },

  // Generi
  genresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreTag: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  genreTagText: {
    fontSize: 13,
    fontFamily: Font.semiBold,
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
    fontFamily: Font.bold,
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
  favEventName: { fontSize: 13, fontFamily: Font.semiBold, color: Colors.textPrimary, marginBottom: 3 },
  favEventMeta: { fontSize: 11, color: Colors.textMuted },
  favEventHint: { fontSize: 12, color: Colors.textMuted, lineHeight: 18 },
  soldOutBadge: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 6, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    paddingHorizontal: 8, paddingVertical: 3,
  },
  soldOutText: { fontSize: 11, fontFamily: Font.bold, color: Colors.error },

  // Memory card — serate passate
  memoryCard: {
    height: 140,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  memoryBg: {
    ...StyleSheet.absoluteFillObject,
  },
  memoryContent: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  memoryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.accentBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  memoryBadgeText: {
    fontSize: 11,
    fontFamily: Font.semiBold,
    color: Colors.accent,
  },
  memoryBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  thumbStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbStackItem: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.background,
    backgroundColor: Colors.surface,
  },
  memoryStats: { alignItems: 'flex-end' },
  memoryCount: {
    fontSize: 20,
    fontFamily: Font.extraBold,
    color: Colors.white,
  },
  memorySubCount: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    fontFamily: Font.regular,
  },

  // Account rows
  accountGroupLabel: {
    fontSize: 11, fontFamily: Font.semiBold, color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: 16, marginBottom: 8, paddingHorizontal: 2,
  },
  accountRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    padding: 14, marginBottom: 8,
  },
  iconContainer: {
    width: 32, height: 32, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },
  accountLabel: { flex: 1, fontSize: 14, fontFamily: Font.medium, color: Colors.textPrimary },
  accountLabelDanger: { color: Colors.error },
  accountRowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  accountRowValue: { fontSize: 13, fontFamily: Font.medium, color: Colors.textMuted },
});
