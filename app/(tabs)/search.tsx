import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Colors } from '../../constants/colors';
import { Font } from '../../constants/typography';
import EventListItem from '../../components/EventListItem';
import { MOCK_EVENTS, MOCK_CLUBS } from '../../lib/mockData';
import { useRecentlyViewed } from '../../contexts/RecentlyViewedContext';
import AppHeader from '../../components/AppHeader';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const { recentIds } = useRecentlyViewed();

  const recentEvents = recentIds
    .map((id) => MOCK_EVENTS.find((e) => e.id === id))
    .filter(Boolean) as typeof MOCK_EVENTS;

  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed
    ? MOCK_EVENTS.filter(
        (e) =>
          e.name.toLowerCase().includes(trimmed) ||
          e.club?.name.toLowerCase().includes(trimmed) ||
          e.genres.some((g) => g.toLowerCase().includes(trimmed))
      )
    : null;

  const filteredClubs = trimmed
    ? MOCK_CLUBS.filter(
        (c) =>
          c.name.toLowerCase().includes(trimmed) ||
          c.city.toLowerCase().includes(trimmed)
      )
    : null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(168,85,247,0.12)', 'transparent']}
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
                    <View key={club.id} style={styles.clubRow}>
                      <View style={styles.clubIcon}>
                        <Ionicons name="business" size={18} color={Colors.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.clubName}>{club.name}</Text>
                        <Text style={styles.clubCity}>{club.city}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                    </View>
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
                  <Text style={styles.sectionTitle}>Visualizzati di recente</Text>
                  {recentEvents.map((event) => (
                    <EventListItem key={event.id} event={event} />
                  ))}
                </View>
              )}

              {/* Browse all genres */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Esplora per genere</Text>
                <View style={styles.genreGrid}>
                  {(['Techno','House','Deep House','Latin','Hip-Hop','Pop','R&B','Reggaeton','Commercial'] as const).map((genre) => {
                    const count = MOCK_EVENTS.filter((e) => e.genres.includes(genre)).length;
                    return (
                      <TouchableOpacity
                        key={genre}
                        style={styles.genreCard}
                        activeOpacity={0.8}
                        onPress={() => setQuery(genre)}
                      >
                        <Text style={styles.genreCardText}>{genre}</Text>
                        <Text style={styles.genreCardCount}>{count} serate</Text>
                      </TouchableOpacity>
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
  sectionTitle: { fontSize: 14, fontFamily: Font.extraBold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },

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
  genreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  genreCard: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    padding: 16,
  },
  genreCardText: { fontSize: 14, fontFamily: Font.bold, color: Colors.textPrimary, marginBottom: 4 },
  genreCardCount: { fontSize: 12, color: Colors.accent },
});
