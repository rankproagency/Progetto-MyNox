import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { getClubById, getEventsByClub } from '../../lib/mockData';
import EventListItem from '../../components/EventListItem';

const { width } = Dimensions.get('window');

export default function ClubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const club = getClubById(id);
  const events = getEventsByClub(id);

  if (!club) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Club non trovato</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <Image source={{ uri: club.imageUrl }} style={styles.heroImage} resizeMode="cover" />
          <LinearGradient
            colors={['rgba(7,8,15,0.35)', 'transparent', 'rgba(7,8,15,0.97)']}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView style={styles.heroTop}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </SafeAreaView>
          <View style={styles.heroBottom}>
            <Text style={styles.clubName}>{club.name}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-sharp" size={13} color={Colors.accent} />
              <Text style={styles.locationText}> {club.address}</Text>
            </View>
          </View>
        </View>

        {/* Social & Contatti */}
        {(club.instagram || club.tiktok || club.email || club.phone) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contatti</Text>
            <View style={styles.contactCard}>
              {(club.instagram || club.tiktok) && (
                <View style={styles.socialRow}>
                  {club.instagram && (
                    <TouchableOpacity
                      style={styles.socialBtn}
                      onPress={() => Linking.openURL(`https://instagram.com/${club.instagram}`)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="logo-instagram" size={18} color={Colors.textPrimary} />
                      <Text style={styles.socialLabel}>@{club.instagram}</Text>
                    </TouchableOpacity>
                  )}
                  {club.tiktok && (
                    <TouchableOpacity
                      style={styles.socialBtn}
                      onPress={() => Linking.openURL(`https://tiktok.com/@${club.tiktok}`)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="logo-tiktok" size={18} color={Colors.textPrimary} />
                      <Text style={styles.socialLabel}>@{club.tiktok}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              {club.email && (
                <TouchableOpacity
                  style={styles.contactRow}
                  onPress={() => Linking.openURL(`mailto:${club.email}`)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="mail-outline" size={15} color={Colors.accent} />
                  <Text style={styles.contactText}>{club.email}</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
              {club.phone && (
                <TouchableOpacity
                  style={styles.contactRow}
                  onPress={() => Linking.openURL(`tel:${club.phone}`)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="call-outline" size={15} color={Colors.accent} />
                  <Text style={styles.contactText}>{club.phone}</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Prossimi eventi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prossimi eventi</Text>
          {events.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={36} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Nessun evento in programma</Text>
            </View>
          ) : (
            events.map((event) => <EventListItem key={event.id} event={event} />)
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  notFoundText: { color: Colors.textMuted },
  scroll: { paddingBottom: 100 },

  hero: { width, height: 300, position: 'relative' },
  heroImage: { ...StyleSheet.absoluteFillObject },
  heroTop: { paddingHorizontal: 20 },
  backButton: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(7,8,15,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroBottom: {
    position: 'absolute', bottom: 20, left: 20, right: 20,
  },
  clubName: { fontSize: 28, fontWeight: '900', color: Colors.white, marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationText: { fontSize: 13, color: Colors.textSecondary },

  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 14 },
  empty: { alignItems: 'center', paddingTop: 32, gap: 10 },
  emptyText: { fontSize: 14, color: Colors.textMuted },

  contactCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  socialRow: { flexDirection: 'row' },
  socialBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 14, paddingHorizontal: 14,
  },
  socialLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  contactRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 14,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  contactText: { flex: 1, fontSize: 13, color: Colors.textSecondary },
});
