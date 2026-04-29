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
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Font } from '../../constants/typography';
import EventListItem from '../../components/EventListItem';
import { useRecentlyViewed } from '../../contexts/RecentlyViewedContext';
import { useEvents } from '../../contexts/EventsContext';
import AppHeader from '../../components/AppHeader';
import { ALL_GENRES, GENRE_CONFIG } from '../../constants/genres';
import { Genre } from '../../types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DELETE_BTN_WIDTH = 80;
const ITEM_MARGIN_BOTTOM = 10; // corrisponde a marginBottom di EventListItem

function SwipeableRecentItem({
  event, onDelete, resetKey,
}: {
  event: { id: string }; onDelete: () => void; resetKey: number;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const startValue = useRef(0);

  // Reset fluido quando si torna sulla schermata
  useEffect(() => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 100, friction: 12 }).start();
    startValue.current = 0;
  }, [resetKey]);

  // Ref sempre aggiornato a onDelete corrente (evita stale closure nel panResponder)
  const triggerDeleteRef = useRef(() => {});
  triggerDeleteRef.current = () => {
    Animated.timing(translateX, { toValue: -SCREEN_WIDTH, duration: 200, useNativeDriver: true }).start(onDelete);
  };

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    // Cattura qualsiasi gesto chiaramente orizzontale (sia apertura che chiusura)
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
      // Se già aperto, permetti di scorrere ulteriormente a sinistra per il delete
      const minX = alreadyOpen ? -SCREEN_WIDTH : -DELETE_BTN_WIDTH;
      translateX.setValue(Math.max(minX, Math.min(0, startValue.current + g.dx)));
    },
    onPanResponderRelease: (_, g) => {
      const alreadyOpen = startValue.current <= -DELETE_BTN_WIDTH;
      // Secondo swipe a sinistra > 50px con bottone già aperto → elimina
      if (alreadyOpen && g.dx < -50) {
        triggerDeleteRef.current();
        return;
      }
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
      {/* Layer rosso a piena larghezza — la card lo copre scorrendo, l'icona resta fissa a destra */}
      <Animated.View style={[swipeStyles.deleteBtn, { opacity: deleteOpacity }]}>
        <TouchableOpacity
          onPress={() => triggerDeleteRef.current()}
          style={swipeStyles.deleteBtnInner}
          activeOpacity={0.8}
        >
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
    // Copre tutta la larghezza — la card la nasconde scorrendo sopra
    position: 'absolute', left: 0, right: 0, top: 0, bottom: ITEM_MARGIN_BOTTOM,
    backgroundColor: '#ef4444',
    borderRadius: 14,
    justifyContent: 'center',
    // Icona centrata nell'area destra di DELETE_BTN_WIDTH
    alignItems: 'flex-end',
    paddingRight: (DELETE_BTN_WIDTH - 20) / 2,
  },
  deleteBtnInner: { justifyContent: 'center', alignItems: 'center' },
});

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [resetKey, setResetKey] = useState(0);
  const { recentIds, removeRecentlyViewed, clearRecentlyViewed } = useRecentlyViewed();
  const { events } = useEvents();

  // Quando si esce dalla schermata, resetta le posizioni di tutti gli item
  useFocusEffect(useCallback(() => {
    return () => setResetKey((k) => k + 1);
  }, []));

  const recentEvents = recentIds
    .map((id) => events.find((e) => e.id === id))
    .filter(Boolean) as typeof events;

  const clubs = events
    .map((e) => e.club)
    .filter((c, i, arr) => c && arr.findIndex((x) => x?.id === c.id) === i);

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
    ? clubs.filter(
        (c): c is NonNullable<typeof c> =>
          !!c && (
            c.name.toLowerCase().includes(trimmed) ||
            c.city.toLowerCase().includes(trimmed)
          )
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
              placeholder="Serate, discoteche, generi..."
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

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Risultati ricerca */}
          {filtered !== null ? (
            <>
              {/* Clubs */}
              {filteredClubs && filteredClubs.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Discoteche</Text>
                  {filteredClubs.map((club) => (
                    <TouchableOpacity key={club.id} style={styles.clubRow} activeOpacity={0.8} onPress={() => router.push(`/club/${club.id}`)}>
                      <View style={styles.clubIcon}>
                        <Ionicons name="business" size={18} color={Colors.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.clubName}>{club.name}</Text>
                        <Text style={styles.clubCity}>{club.city}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Events */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {filtered.length} {filtered.length === 1 ? 'evento' : 'eventi'}
                  {trimmed ? ` per "${query}"` : ''}
                </Text>
                {filtered.length === 0 ? (
                  <View style={styles.empty}>
                    <Ionicons name="search-outline" size={40} color={Colors.textMuted} />
                    <Text style={styles.emptyText}>Nessun risultato</Text>
                    <Text style={styles.emptySub}>Prova con un altro termine</Text>
                  </View>
                ) : (
                  filtered.map((event) => <EventListItem key={event.id} event={event} />)
                )}
              </View>
            </>
          ) : (
            <>
              {/* Recently viewed */}
              {recentEvents.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionTitle}>Visualizzati di recente</Text>
                    <TouchableOpacity onPress={clearRecentlyViewed} activeOpacity={0.7}>
                      <Text style={styles.clearAll}>Cancella tutti</Text>
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

              {/* Browse all genres */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Esplora per genere</Text>
                <View style={styles.genreGrid}>
                  {[...ALL_GENRES].sort().map((genre) => {
                    const count = events.filter((e) => e.genres.includes(genre)).length;
                    const cfg = GENRE_CONFIG[genre];
                    return (
                      <View key={genre} style={[styles.genreCardOuter, { shadowColor: cfg.color }]}>
                        <TouchableOpacity
                          style={styles.genreCard}
                          activeOpacity={0.75}
                          onPress={() => setQuery(genre)}
                        >
                          <LinearGradient
                            colors={[cfg.color, cfg.colorEnd, '#07080f']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1.4 }}
                            style={StyleSheet.absoluteFill}
                          />
                          <Text style={styles.genreCardText}>{genre}</Text>
                          <Text style={styles.genreCardCount}>
                            {`${count} serate`}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </View>
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

  scroll: { paddingHorizontal: 20, paddingBottom: 100 },
  section: { marginBottom: 28 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontFamily: Font.extraBold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
  clearAll: { fontSize: 13, fontFamily: Font.semiBold, color: Colors.accent },

  // Club row
  clubRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    padding: 14, marginBottom: 8,
  },
  clubIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(168,85,247,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  clubName: { fontSize: 14, fontFamily: Font.semiBold, color: Colors.textPrimary, marginBottom: 2 },
  clubCity: { fontSize: 12, color: Colors.textMuted },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 15, fontFamily: Font.bold, color: Colors.textMuted },
  emptySub: { fontSize: 13, color: Colors.textMuted },

  // Genre grid
  genreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 60 },
  genreCardOuter: {
    width: '47%',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  genreCard: {
    height: 110,
    backgroundColor: '#0d0d18',
    borderRadius: 16,
    padding: 14,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    gap: 3,
  },
  genreCardText: {
    fontSize: 16, fontFamily: Font.extraBold, color: '#ffffff',
    textTransform: 'uppercase', letterSpacing: 1.5,
  },
  genreCardCount: { fontSize: 11, fontFamily: Font.medium, color: 'rgba(255,255,255,0.45)' },
});
