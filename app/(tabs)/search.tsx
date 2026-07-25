import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/colors';
import { Font } from '../../constants/typography';
import EventListItem from '../../components/EventListItem';
import { useRecentlyViewed } from '../../contexts/RecentlyViewedContext';
import { useEvents } from '../../contexts/EventsContext';
import { useTabBarScroll } from '../../contexts/TabBarContext';
import AppHeader from '../../components/AppHeader';
import { ALL_GENRES, GENRE_CONFIG } from '../../constants/genres';
import { Genre, Event } from '../../types';
import { versionedImageUrl } from '../../lib/imageUrl';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DELETE_BTN_WIDTH = 80;
const ITEM_MARGIN_BOTTOM = 10;
const TREND_CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.55);
const TREND_CARD_HEIGHT = 168;
const GENRE_CARD_SIZE = Math.floor((SCREEN_WIDTH - 40 - 20) / 3);

// ─── Swipeable recent item (unchanged) ───────────────────────────────────────

function SwipeableRecentItem({
  event, onDelete, resetKey,
}: {
  event: { id: string }; onDelete: () => void; resetKey: number;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const startValue = useRef(0);

  useEffect(() => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 100, friction: 12 }).start();
    startValue.current = 0;
  }, [resetKey]);

  const triggerDeleteRef = useRef(() => {});
  triggerDeleteRef.current = () => {
    Animated.timing(translateX, { toValue: -SCREEN_WIDTH, duration: 200, useNativeDriver: true }).start(onDelete);
  };

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > Math.abs(g.dy) * 2 && Math.abs(g.dx) > 5,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      translateX.stopAnimation();
      // @ts-ignore
      startValue.current = translateX._value;
    },
    onPanResponderMove: (_, g) => {
      const alreadyOpen = startValue.current <= -DELETE_BTN_WIDTH;
      const minX = alreadyOpen ? -SCREEN_WIDTH : -DELETE_BTN_WIDTH;
      translateX.setValue(Math.max(minX, Math.min(0, startValue.current + g.dx)));
    },
    onPanResponderRelease: (_, g) => {
      const alreadyOpen = startValue.current <= -DELETE_BTN_WIDTH;
      if (alreadyOpen && g.dx < -50) { triggerDeleteRef.current(); return; }
      const projected = startValue.current + g.dx;
      const target = projected < -(DELETE_BTN_WIDTH / 2) ? -DELETE_BTN_WIDTH : 0;
      startValue.current = target;
      Animated.spring(translateX, { toValue: target, useNativeDriver: true, tension: 100, friction: 12 }).start();
    },
    onPanResponderTerminate: () => {
      // @ts-ignore
      const cur = translateX._value;
      const target = cur < -DELETE_BTN_WIDTH / 2 ? -DELETE_BTN_WIDTH : 0;
      startValue.current = target;
      Animated.spring(translateX, { toValue: target, useNativeDriver: true }).start();
    },
  })).current;

  const deleteOpacity = translateX.interpolate({
    inputRange: [-DELETE_BTN_WIDTH, -16, 0],
    outputRange: [1, 0.3, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ position: 'relative', overflow: 'hidden', borderRadius: 14 }}>
      <Animated.View style={[swipeStyles.deleteBtn, { opacity: deleteOpacity }]}>
        <TouchableOpacity onPress={() => triggerDeleteRef.current()} style={swipeStyles.deleteBtnInner} activeOpacity={0.8}>
          <Ionicons name="trash-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <EventListItem event={event as any} />
      </Animated.View>
    </View>
  );
}

const swipeStyles = StyleSheet.create({
  deleteBtn: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: ITEM_MARGIN_BOTTOM,
    backgroundColor: '#ef4444',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: (DELETE_BTN_WIDTH - 20) / 2,
  },
  deleteBtnInner: { justifyContent: 'center', alignItems: 'center' },
});

// ─── Trending card (compact horizontal) ─────────────────────────────────────

function TrendingCard({ event }: { event: Event }) {
  const router = useRouter();
  const { t } = useTranslation();
  const hasTickets = event.ticketTypes.length > 0;
  const minPrice = hasTickets ? Math.min(...event.ticketTypes.map((tk) => tk.price)) : 0;
  const isSoldOut = hasTickets && event.ticketTypes.every((tk) => tk.available === 0);

  return (
    <TouchableOpacity style={trendStyles.card} activeOpacity={0.82} onPress={() => router.push(`/event/${event.id}`)}>
      <Image
        source={{ uri: versionedImageUrl(event.imageUrl, event.updatedAt) }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <LinearGradient
        colors={['transparent', 'rgba(7,8,15,0.92)']}
        locations={[0.25, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={trendStyles.content}>
        <Text style={trendStyles.club} numberOfLines={1}>{event.club?.name}</Text>
        <Text style={trendStyles.name} numberOfLines={2}>{event.name}</Text>
        {isSoldOut ? (
          <Text style={trendStyles.soldOut}>{t('common.sold_out')}</Text>
        ) : hasTickets ? (
          <Text style={trendStyles.price}>{t('common.from_price')} €{minPrice}</Text>
        ) : (
          <Text style={trendStyles.free}>{t('common.free_entry')}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const trendStyles = StyleSheet.create({
  card: {
    width: TREND_CARD_WIDTH,
    height: TREND_CARD_HEIGHT,
    borderRadius: 18,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: Colors.surface,
  },
  content: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12 },
  club: { fontSize: 10, fontFamily: Font.semiBold, color: Colors.accent, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
  name: { fontSize: 14, fontFamily: Font.extraBold, color: Colors.white, lineHeight: 18, marginBottom: 5 },
  price: { fontSize: 12, fontFamily: Font.semiBold, color: 'rgba(255,255,255,0.65)' },
  soldOut: { fontSize: 12, fontFamily: Font.bold, color: Colors.error },
  free: { fontSize: 12, fontFamily: Font.bold, color: Colors.textMuted },
});

// ─── Club pill (horizontal scroll) ──────────────────────────────────────────

function ClubPill({ club }: { club: NonNullable<Event['club']> }) {
  const router = useRouter();
  return (
    <TouchableOpacity style={clubStyles.pill} activeOpacity={0.8} onPress={() => router.push(`/club/${club.id}`)}>
      <View style={clubStyles.iconBox}>
        <Ionicons name="business" size={18} color={Colors.accent} />
      </View>
      <View>
        <Text style={clubStyles.name} numberOfLines={1}>{club.name}</Text>
        <Text style={clubStyles.city}>{club.city}</Text>
      </View>
    </TouchableOpacity>
  );
}

const clubStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    paddingVertical: 11, paddingHorizontal: 12,
    marginRight: 10, minWidth: 148,
  },
  iconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.accentBg,
    justifyContent: 'center', alignItems: 'center',
  },
  name: { fontSize: 13, fontFamily: Font.semiBold, color: Colors.textPrimary },
  city: { fontSize: 11, color: Colors.textMuted },
});

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [resetKey, setResetKey] = useState(0);
  const { recentIds, removeRecentlyViewed, clearRecentlyViewed } = useRecentlyViewed();
  const { events } = useEvents();
  const { onScroll } = useTabBarScroll();

  useFocusEffect(useCallback(() => {
    return () => setResetKey((k) => k + 1);
  }, []));

  const recentEvents = recentIds
    .map((id) => events.find((e) => e.id === id))
    .filter(Boolean) as typeof events;

  const clubs = events
    .map((e) => e.club)
    .filter((c, i, arr) => c && arr.findIndex((x) => x?.id === c.id) === i)
    .filter((c): c is NonNullable<Event['club']> => !!c);

  const trendingEvents = events.slice(0, 6);

  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed
    ? events.filter(
        (e) =>
          e.name.toLowerCase().includes(trimmed) ||
          e.club?.name.toLowerCase().includes(trimmed) ||
          e.genres.some((g) => g.toLowerCase().includes(trimmed))
      )
    : null;

  const filteredClubs = trimmed
    ? clubs.filter((c) =>
        c.name.toLowerCase().includes(trimmed) ||
        c.city.toLowerCase().includes(trimmed)
      )
    : null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(168,85,247,0.22)', 'transparent']}
        style={styles.bgGradient}
        pointerEvents="none"
      />
      <SafeAreaView style={{ flex: 1 }}>
        <AppHeader />

        {/* Search bar */}
        <View style={styles.searchBarWrapper}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('search.placeholder')}
              placeholderTextColor={Colors.textMuted}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {filtered !== null ? (
            // ── Risultati ricerca ──
            <>
              {filteredClubs && filteredClubs.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('search.section_clubs')}</Text>
                  {filteredClubs.map((club) => (
                    <TouchableOpacity key={club.id} style={styles.clubRow} activeOpacity={0.8} onPress={() => router.push(`/club/${club.id}`)}>
                      <View style={styles.clubRowIcon}>
                        <Ionicons name="business" size={18} color={Colors.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.clubRowName}>{club.name}</Text>
                        <Text style={styles.clubRowCity}>{club.city}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {filtered.length} {filtered.length === 1 ? t('search.event_singular') : t('search.event_plural')}
                  {trimmed ? ` ${t('search.results_for')} "${query}"` : ''}
                </Text>
                {filtered.length === 0 ? (
                  <View style={styles.empty}>
                    <Ionicons name="search-outline" size={40} color={Colors.textMuted} />
                    <Text style={styles.emptyText}>{t('search.no_results')}</Text>
                    <Text style={styles.emptySub}>{t('search.no_results_sub')}</Text>
                  </View>
                ) : (
                  filtered.map((event) => <EventListItem key={event.id} event={event} />)
                )}
              </View>
            </>
          ) : (
            // ── Stato di default ──
            <>
              {/* Visti di recente */}
              {recentEvents.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionTitle}>{t('search.section_recently_viewed')}</Text>
                    <TouchableOpacity onPress={clearRecentlyViewed} activeOpacity={0.7}>
                      <Text style={styles.clearAll}>{t('search.clear_all')}</Text>
                    </TouchableOpacity>
                  </View>
                  {recentEvents.map((event) => (
                    <SwipeableRecentItem
                      key={event.id}
                      event={event}
                      onDelete={() => removeRecentlyViewed(event.id)}
                      resetKey={resetKey}
                    />
                  ))}
                </View>
              )}

              {/* Di tendenza */}
              {trendingEvents.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Di tendenza</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll} contentContainerStyle={{ paddingRight: 20 }}>
                    {trendingEvents.map((event) => (
                      <TrendingCard key={event.id} event={event} />
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Esplora per genere */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('search.section_browse_by_genre')}</Text>
                <View style={styles.genreGrid}>
                  {[...ALL_GENRES].sort().map((genre) => {
                    const cfg = GENRE_CONFIG[genre];
                    return (
                      <TouchableOpacity
                        key={genre}
                        style={[styles.genreCard, { width: GENRE_CARD_SIZE, height: GENRE_CARD_SIZE }]}
                        activeOpacity={0.75}
                        onPress={() => setQuery(genre)}
                      >
                        <LinearGradient
                          colors={[cfg.color.replace(/[\d.]+\)$/, '0.30)'), cfg.colorEnd]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={StyleSheet.absoluteFill}
                        />
                        <Text style={styles.genreCardText}>{genre}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Club nella tua città */}
              {clubs.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Club nella tua città</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll} contentContainerStyle={{ paddingRight: 20 }}>
                    {clubs.map((club) => (
                      <ClubPill key={club.id} club={club} />
                    ))}
                  </ScrollView>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  bgGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },

  searchBarWrapper: { paddingHorizontal: 20, marginTop: 14, marginBottom: 16 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.textPrimary, fontFamily: Font.regular },

  scroll: { paddingHorizontal: 20, paddingBottom: 110 },
  section: { marginBottom: 32 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontFamily: Font.extraBold, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
  clearAll: { fontSize: 13, fontFamily: Font.semiBold, color: Colors.accent },

  hScroll: { marginHorizontal: -20, paddingLeft: 20 },

  // Genre grid — 3 colonne
  genreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  genreCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 11,
  },
  genreCardText: { fontSize: 13, fontFamily: Font.bold, color: Colors.textPrimary, letterSpacing: 0.1 },

  // Club row (search results)
  clubRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    padding: 14, marginBottom: 8,
  },
  clubRowIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.accentBg,
    justifyContent: 'center', alignItems: 'center',
  },
  clubRowName: { fontSize: 14, fontFamily: Font.semiBold, color: Colors.textPrimary, marginBottom: 2 },
  clubRowCity: { fontSize: 12, color: Colors.textMuted },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 15, fontFamily: Font.bold, color: Colors.textMuted },
  emptySub: { fontSize: 13, color: Colors.textMuted },
});
