import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';
import EventListItem from '../components/EventListItem';
import { useFavorites } from '../contexts/FavoritesContext';
import { useEvents } from '../contexts/EventsContext';

type Tab = 'serate' | 'discoteche';

export default function FavoritesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('serate');
  const { favoriteIds, favoriteClubs } = useFavorites();
  const { events } = useEvents();

  const favoriteEvents = favoriteIds
    .map((id) => events.find((e) => e.id === id))
    .filter(Boolean) as typeof events;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(168,85,247,0.22)', 'transparent']}
        style={styles.bgGradient}
        pointerEvents="none"
      />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Salvati</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'serate' && styles.tabActive]}
            onPress={() => setActiveTab('serate')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'serate' && styles.tabTextActive]}>
              Serate
            </Text>
            {favoriteEvents.length > 0 && (
              <View style={[styles.badge, activeTab === 'serate' && styles.badgeActive]}>
                <Text style={styles.badgeText}>{favoriteEvents.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'discoteche' && styles.tabActive]}
            onPress={() => setActiveTab('discoteche')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'discoteche' && styles.tabTextActive]}>
              Discoteche
            </Text>
            {favoriteClubs.length > 0 && (
              <View style={[styles.badge, activeTab === 'discoteche' && styles.badgeActive]}>
                <Text style={styles.badgeText}>{favoriteClubs.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === 'serate' ? (
          favoriteEvents.length === 0 ? (
            <EmptyState
              icon="musical-notes-outline"
              title="Nessuna serata salvata"
              sub="Tocca il cuore su un evento per salvarlo qui"
              btnLabel="Esplora gli eventi"
              onPress={() => router.back()}
            />
          ) : (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.count}>
                {favoriteEvents.length} {favoriteEvents.length === 1 ? 'serata salvata' : 'serate salvate'}
              </Text>
              {favoriteEvents.map((event) => (
                <EventListItem key={event.id} event={event} />
              ))}
            </ScrollView>
          )
        ) : (
          favoriteClubs.length === 0 ? (
            <EmptyState
              icon="business-outline"
              title="Nessuna discoteca seguita"
              sub="Apri la pagina di una discoteca e tocca il cuore per seguirla"
              btnLabel="Esplora le discoteche"
              onPress={() => router.back()}
            />
          ) : (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.count}>
                {favoriteClubs.length} {favoriteClubs.length === 1 ? 'discoteca seguita' : 'discoteche seguite'}
              </Text>
              {favoriteClubs.map((club) => {
                const clubEvents = events.filter((e) => e.clubId === club.id);
                return (
                  <TouchableOpacity
                    key={club.id}
                    style={styles.clubRow}
                    activeOpacity={0.85}
                    onPress={() => router.push(`/club/${club.id}`)}
                  >
                    <Image
                      source={{ uri: club.imageUrl }}
                      style={styles.clubThumb}
                    />
                    <View style={styles.clubInfo}>
                      <Text style={styles.clubName} numberOfLines={1}>{club.name}</Text>
                      <View style={styles.clubMeta}>
                        <Ionicons name="location-sharp" size={11} color={Colors.accent} />
                        <Text style={styles.clubCity}>{club.city}</Text>
                      </View>
                      {clubEvents.length > 0 ? (
                        <Text style={styles.clubEvents}>
                          {clubEvents.length} {clubEvents.length === 1 ? 'evento in programma' : 'eventi in programma'}
                        </Text>
                      ) : (
                        <Text style={styles.clubEventsNone}>Nessun evento in programma</Text>
                      )}
                    </View>
                    <View style={styles.clubArrow}>
                      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )
        )}
      </SafeAreaView>
    </View>
  );
}

function EmptyState({
  icon, title, sub, btnLabel, onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  sub: string;
  btnLabel: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={52} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{sub}</Text>
      <TouchableOpacity style={styles.exploreBtn} onPress={onPress}>
        <Text style={styles.exploreBtnText}>{btnLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  bgGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 16, fontFamily: Font.bold, color: Colors.textPrimary },

  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 10, gap: 6,
  },
  tabActive: { backgroundColor: Colors.accent },
  tabText: { fontSize: 14, fontFamily: Font.semiBold, color: Colors.textMuted },
  tabTextActive: { color: Colors.white },
  badge: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(168,85,247,0.25)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  badgeText: { fontSize: 10, fontFamily: Font.bold, color: Colors.white },

  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  count: { fontSize: 13, color: Colors.textMuted, marginBottom: 16 },

  // Club row
  clubRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    padding: 12, marginBottom: 10,
  },
  clubThumb: {
    width: 72, height: 72, borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
  },
  clubInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
  clubName: { fontSize: 15, fontFamily: Font.bold, color: Colors.textPrimary, marginBottom: 4 },
  clubMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 5 },
  clubCity: { fontSize: 12, color: Colors.accent, fontFamily: Font.medium },
  clubEvents: { fontSize: 11, color: Colors.textMuted, fontFamily: Font.medium },
  clubEventsNone: { fontSize: 11, color: Colors.textMuted },
  clubArrow: {},

  // Empty state
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontFamily: Font.bold, color: Colors.textPrimary, marginTop: 16, marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginBottom: 28 },
  exploreBtn: { backgroundColor: Colors.accent, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  exploreBtnText: { fontSize: 14, fontFamily: Font.bold, color: Colors.white },
});
