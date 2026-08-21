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
import { getLocale } from '../../lib/i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DELETE_BTN_WIDTH = 80;
const ITEM_MARGIN_BOTTOM = 10;
const TREND_CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.54);
const TREND_CARD_HEIGHT = 216;
const GENRE_COLS = 3;
const GENRE_GAP = 10;
const GENRE_CARD_W = Math.floor((SCREEN_WIDTH - 40 - GENRE_GAP * (GENRE_COLS - 1)) / GENRE_COLS);
const GENRE_CARD_H = Math.floor(GENRE_CARD_W * 0.72);

// ─── Swipeable recent item ────────────────────────────────────────────────────

function SwipeableRecentItem({
  event, onDelete, resetKey,
}: {
  event: Event; onDelete: () => void; resetKey: number;
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
        <EventListItem event={event} />
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

// ─── Trending card ────────────────────────────────────────────────────────────

function TrendingCard({ event }: { event: Event }) {
  const router = useRouter();
  const { t } = useTranslation();
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.timing(scale, { toValue: 0.96, duration: 100, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 200 }).start();

  const hasTickets = event.ticketTypes.length > 0;
  const minPrice = hasTickets ? Math.min(...event.ticketTypes.map((tk) => tk.price)) : 0;
  const isSoldOut = hasTickets && event.ticketTypes.every((tk) => tk.available === 0);

  const dateLabel = new Date(event.date).toLocaleDateString(getLocale(), { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => router.push(`/event/${event.id}`)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Animated.View style={[trendStyles.card, { transform: [{ scale }] }]}>
        <Image
          source={{ uri: versionedImageUrl(event.imageUrl, event.updatedAt) }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
        <LinearGradient
          colors={['transparent', 'rgba(10,5,20,0.50)', 'rgba(15,6,28,0.88)', 'rgba(18,7,32,0.99)']}
          locations={[0, 0.28, 0.60, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* Content bottom */}
        <View style={trendStyles.content}>
          <Text style={trendStyles.club} numberOfLines={1}>{event.club?.name}</Text>
          <Text style={trendStyles.name} numberOfLines={2}>{event.name}</Text>
          <Text style={trendStyles.date}>{dateLabel}</Text>
          <View style={trendStyles.bottomRow}>
            {isSoldOut ? (
              <View style={trendStyles.priceBadge}>
                <Text style={[trendStyles.priceBadgeText, { color: Colors.error }]}>{t('common.sold_out')}</Text>
              </View>
            ) : hasTickets ? (
              <View style={trendStyles.priceBadge}>
                <Text style={trendStyles.priceBadgeText}>{t('common.from_price')} <Text style={trendStyles.priceValue}>€{minPrice}</Text></Text>
              </View>
            ) : (
              <View style={trendStyles.priceBadge}>
                <Text style={trendStyles.priceBadgeText}>{t('common.free_entry')}</Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const trendStyles = StyleSheet.create({
  card: {
    width: TREND_CARD_WIDTH,
    height: TREND_CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: Colors.surface,
  },
  content: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 },
  club: {
    fontSize: 10, fontFamily: Font.semiBold, color: Colors.accent,
    textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 4,
  },
  name: {
    fontSize: 17, fontFamily: Font.extraBold, color: Colors.white,
    lineHeight: 21, marginBottom: 4, letterSpacing: 0.1,
  },
  date: { fontSize: 11, fontFamily: Font.medium, color: 'rgba(255,255,255,0.40)', marginBottom: 10 },
  bottomRow: { flexDirection: 'row', alignItems: 'center' },
  priceBadge: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10, paddingVertical: 4,
  },
  priceBadgeText: { fontSize: 12, fontFamily: Font.semiBold, color: 'rgba(255,255,255,0.65)' },
  priceValue: { fontSize: 13, fontFamily: Font.extraBold, color: Colors.white },
});

// ─── Club card (full-width featured) ─────────────────────────────────────────

function ClubCard({ club }: { club: NonNullable<Event['club']> }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={clubCardStyles.card}
      activeOpacity={0.82}
      onPress={() => router.push(`/club/${club.id}`)}
    >
      <LinearGradient
        colors={['rgba(168,85,247,0.18)', 'rgba(168,85,247,0.04)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={clubCardStyles.iconBox}>
        <Text style={clubCardStyles.initial}>{club.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={clubCardStyles.info}>
        <Text style={clubCardStyles.name}>{club.name}</Text>
        <Text style={clubCardStyles.city}>{club.city}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const clubCardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.surface,
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(168,85,247,0.18)',
    paddingVertical: 16, paddingHorizontal: 16,
    marginBottom: 10, overflow: 'hidden',
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: 'rgba(168,85,247,0.15)',
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.30)',
    justifyContent: 'center', alignItems: 'center',
  },
  initial: { fontSize: 20, fontFamily: Font.extraBold, color: Colors.accent },
  info: { flex: 1 },
  name: { fontSize: 15, fontFamily: Font.bold, color: Colors.textPrimary, marginBottom: 2 },
  city: { fontSize: 12, fontFamily: Font.regular, color: Colors.textMuted },
});

// ─── Section header with optional CTA ────────────────────────────────────────

function SectionHeader({ title, cta, onCta }: { title: string; cta?: string; onCta?: () => void }) {
  return (
    <View style={sectionHeaderStyles.row}>
      <View style={sectionHeaderStyles.titleRow}>
        <View style={sectionHeaderStyles.accent} />
        <Text style={sectionHeaderStyles.title}>{title}</Text>
      </View>
      {cta && onCta && (
        <TouchableOpacity onPress={onCta} activeOpacity={0.7}>
          <Text style={sectionHeaderStyles.cta}>{cta}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const sectionHeaderStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accent: { width: 3, height: 14, borderRadius: 2, backgroundColor: Colors.accent },
  title: { fontSize: 13, fontFamily: Font.extraBold, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  cta: { fontSize: 13, fontFamily: Font.semiBold, color: Colors.accent },
});

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
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

        {/* Search bar con focus state */}
        <View style={styles.searchBarWrapper}>
          <View style={[
            styles.searchBar,
            searchFocused && { borderColor: 'rgba(168,85,247,0.65)' },
          ]}>
            <Ionicons
              name="search"
              size={16}
              color={searchFocused ? Colors.accent : Colors.textMuted}
            />
            <TextInput
              style={styles.searchInput}
              placeholder={t('search.placeholder')}
              placeholderTextColor={Colors.textMuted}
              value={query}
              onChangeText={setQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
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
                  <SectionHeader title={t('search.section_clubs')} />
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
                <SectionHeader title={
                  `${filtered.length} ${filtered.length === 1 ? t('search.event_singular') : t('search.event_plural')}` +
                  (trimmed ? ` ${t('search.results_for')} "${query}"` : '')
                } />
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
                    <SectionHeader title={t('search.section_recently_viewed')} />
                    <TouchableOpacity onPress={clearRecentlyViewed} activeOpacity={0.7} style={{ marginBottom: 14 }}>
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
                  <SectionHeader
                    title="Di tendenza"
                    cta="Vedi tutti"
                    onCta={() => router.push('/(tabs)')}
                  />
                  <View style={[styles.hScroll, { height: TREND_CARD_HEIGHT }]}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ flex: 1 }}
                      contentContainerStyle={{ paddingLeft: 20, paddingRight: 20 }}
                    >
                      {trendingEvents.map((event) => (
                        <TrendingCard key={event.id} event={event} />
                      ))}
                    </ScrollView>
                  </View>
                </View>
              )}

              {/* Esplora per genere */}
              <View style={styles.section}>
                <SectionHeader title={t('search.section_browse_by_genre')} />
                <View style={styles.genreGrid}>
                  {[...ALL_GENRES].sort().map((genre) => {
                    const cfg = GENRE_CONFIG[genre];
                    return (
                      <TouchableOpacity
                        key={genre}
                        style={[styles.genreCard, {
                          width: GENRE_CARD_W, height: GENRE_CARD_H,
                          borderColor: cfg.color.replace(/[\d.]+\)$/, '0.30)'),
                        }]}
                        activeOpacity={0.75}
                        onPress={() => setQuery(genre)}
                      >
                        <LinearGradient
                          colors={[cfg.color.replace(/[\d.]+\)$/, '0.72)'), cfg.colorEnd]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1.1, y: 1 }}
                          style={StyleSheet.absoluteFill}
                        />
                        <Text style={styles.genreCardText}>{genre}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Scopri i Club */}
              {clubs.length > 0 && (
                <View style={styles.section}>
                  <SectionHeader
                    title="Scopri i Club"
                    cta={clubs.length > 4 ? 'Vedi tutti' : undefined}
                    onCta={() => router.push('/(tabs)/map')}
                  />
                  {clubs.slice(0, 4).map((club) => (
                    <ClubCard key={club.id} club={club} />
                  ))}
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

  // Search bar
  searchBarWrapper: { paddingHorizontal: 20, marginTop: 14, marginBottom: 20 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(168,85,247,0.22)',
    paddingHorizontal: 14, paddingVertical: 13,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.textPrimary, fontFamily: Font.regular },

  scroll: { paddingHorizontal: 20, paddingBottom: 120 },
  section: { marginBottom: 32 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clearAll: { fontSize: 13, fontFamily: Font.semiBold, color: Colors.accent, marginBottom: 14 },

  hScroll: { marginHorizontal: -20 },

  // Genre grid — 3 col landscape
  genreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GENRE_GAP },
  genreCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 11,
  },
  genreCardText: { fontSize: 14, fontFamily: Font.extraBold, color: Colors.white, letterSpacing: 0.1 },

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
