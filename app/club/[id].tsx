import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, Linking, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import EventListItem from '../../components/EventListItem';
import { Club, Event, TicketType, Table } from '../../types';
import { useFavorites } from '../../contexts/FavoritesContext';

const { width } = Dimensions.get('window');

export default function ClubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isFavoriteClub, toggleFavoriteClub } = useFavorites();
  const [club, setClub] = useState<Club | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [clubRes, eventsRes] = await Promise.all([
        supabase.from('clubs').select('*').eq('id', id).single(),
        supabase
          .from('events')
          .select('*, clubs(*), ticket_types(*), tables(*)')
          .eq('club_id', id)
          .eq('is_published', true)
          .order('date', { ascending: true }),
      ]);

      if (clubRes.data) {
        const r = clubRes.data;
        setClub({
          id: r.id,
          name: r.name,
          city: r.city,
          address: r.address ?? '',
          imageUrl: r.image_url ?? '',
          instagram: r.instagram,
          tiktok: r.tiktok,
          email: r.email,
          phone: r.phone,
        });
      }

      if (eventsRes.data) {
        setEvents(eventsRes.data.map((row: any) => ({
          id: row.id,
          clubId: row.club_id,
          club: {
            id: row.clubs?.id ?? '',
            name: row.clubs?.name ?? '',
            city: row.clubs?.city ?? 'Padova',
            imageUrl: row.clubs?.image_url ?? '',
            address: row.clubs?.address ?? '',
          },
          name: row.name,
          date: row.date,
          startTime: row.start_time,
          imageUrl: row.image_url ?? '',
          dressCode: row.dress_code ?? 'No dress code',
          capacity: row.capacity ?? 500,
          ticketsSold: row.tickets_sold ?? 0,
          genres: row.genres ?? [],
          description: row.description ?? '',
          lineup: Array.isArray(row.lineup) ? row.lineup : [],
          ticketTypes: (row.ticket_types ?? []).map((t: any): TicketType => ({
            id: t.id,
            eventId: row.id,
            label: t.label,
            gender: t.label.toLowerCase().includes('donna') ? 'female'
                  : t.label.toLowerCase().includes('uomo') ? 'male' : 'any',
            price: Number(t.price),
            includesDrink: t.includes_drink,
            available: (t.total_quantity ?? 999) - (t.sold_quantity ?? 0),
          })),
          tables: (row.tables ?? []).map((t: any): Table => ({
            id: t.id,
            eventId: row.id,
            label: t.label,
            capacity: t.capacity,
            deposit: Number(t.deposit),
            available: t.is_available,
          })),
        })));
      }

      setLoading(false);
    }

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.notFound}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

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
            {club && (
              <TouchableOpacity
                style={styles.followButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleFavoriteClub({
                    id: club.id,
                    name: club.name,
                    imageUrl: club.imageUrl,
                    city: club.city,
                  });
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isFavoriteClub(club.id) ? 'heart' : 'heart-outline'}
                  size={18}
                  color={isFavoriteClub(club.id) ? Colors.accent : Colors.textPrimary}
                />
              </TouchableOpacity>
            )}
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
  heroTop: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(7,8,15,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },
  followButton: {
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
