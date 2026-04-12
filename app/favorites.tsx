import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';
import EventListItem from '../components/EventListItem';
import { MOCK_EVENTS } from '../lib/mockData';
import { useFavorites } from '../contexts/FavoritesContext';

export default function FavoritesScreen() {
  const router = useRouter();
  const { favoriteIds } = useFavorites();

  const favorites = favoriteIds
    .map((id) => MOCK_EVENTS.find((e) => e.id === id))
    .filter(Boolean) as typeof MOCK_EVENTS;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(168,85,247,0.12)', 'transparent']}
        style={styles.bgGradient}
        pointerEvents="none"
      />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Salvati</Text>
          <View style={{ width: 38 }} />
        </View>

        {favorites.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="heart-outline" size={52} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Nessun evento salvato</Text>
            <Text style={styles.emptySub}>
              Tocca il cuore su una serata per salvarla qui
            </Text>
            <TouchableOpacity style={styles.exploreBtn} onPress={() => router.back()}>
              <Text style={styles.exploreBtnText}>Esplora gli eventi</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.count}>
              {favorites.length} {favorites.length === 1 ? 'serata salvata' : 'serate salvate'}
            </Text>
            {favorites.map((event) => (
              <EventListItem key={event.id} event={event} />
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  bgGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 16, fontFamily: Font.bold, color: Colors.textPrimary },

  scroll: { padding: 20 },
  count: { fontSize: 13, color: Colors.textMuted, marginBottom: 16 },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontFamily: Font.bold, color: Colors.textPrimary, marginTop: 16, marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginBottom: 28 },
  exploreBtn: { backgroundColor: Colors.accent, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  exploreBtnText: { fontSize: 14, fontFamily: Font.bold, color: Colors.white },
});
