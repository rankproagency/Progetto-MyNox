import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Event, Genre } from '../types';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';
import { useFavorites } from '../contexts/FavoritesContext';
import { GENRE_CONFIG } from '../constants/genres';

const { width } = Dimensions.get('window');

interface Props {
  event: Event;
}

export default function TonightHero({ event }: Props) {
  const router = useRouter();
  const { isFavorite, toggleFavorite } = useFavorites();
  const hasTickets = event.ticketTypes.length > 0;
  const minPrice = hasTickets ? Math.min(...event.ticketTypes.map((t) => t.price)) : 0;
  const isSoldOut = hasTickets && event.ticketTypes.every((t) => t.available === 0);
  const firstArtist = event.lineup[0];

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.92}
      onPress={() => router.push(`/event/${event.id}`)}
    >
      <Image source={{ uri: event.imageUrl }} style={styles.image} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(7,8,15,0.1)', 'rgba(7,8,15,0.45)', 'rgba(7,8,15,0.97)']}
        style={StyleSheet.absoluteFill}
      />

      {/* Top row: badge + heart */}
      <View style={styles.topRow}>
        <View style={styles.tonightBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.tonightText}>STASERA</Text>
        </View>
        <TouchableOpacity
          style={styles.heartButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toggleFavorite(event.id);
          }}
        >
          <Ionicons
            name={isFavorite(event.id) ? 'heart' : 'heart-outline'}
            size={18}
            color={isFavorite(event.id) ? Colors.accent : Colors.white}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Club name */}
        <TouchableOpacity onPress={() => router.push(`/club/${event.clubId}`)}>
          <Text style={styles.clubName}>{event.club?.name}</Text>
        </TouchableOpacity>

        {/* Event name */}
        <Text style={styles.eventName}>{event.name}</Text>

        {/* Genre tags */}
        <View style={styles.genreRow}>
          {event.genres.slice(0, 2).map((g) => {
            const cfg = GENRE_CONFIG[g as Genre];
            const bg = cfg ? cfg.color.replace(/[\d.]+\)$/, '0.10)') : Colors.accentBg;
            const border = cfg ? cfg.color.replace(/[\d.]+\)$/, '0.35)') : Colors.accentBorder;
            const text = cfg ? cfg.color.replace(/[\d.]+\)$/, '1)') : Colors.accent;
            return (
              <View key={g} style={[styles.genreTag, { backgroundColor: bg, borderColor: border }]}>
                <Text style={[styles.genreText, { color: text }]}>{g}</Text>
              </View>
            );
          })}
        </View>

        {/* Bottom: lineup preview + CTA */}
        <View style={styles.bottomRow}>
          <View style={styles.lineupPreview}>
            {firstArtist && (
              <>
                <Ionicons name="musical-note" size={12} color={Colors.textMuted} />
                <Text style={styles.lineupText}>
                  {firstArtist.name}
                  {event.lineup.length > 1 ? ` +${event.lineup.length - 1}` : ''}
                </Text>
              </>
            )}
            <Text style={styles.timeText}>· {event.startTime}</Text>
            <Text style={[styles.timeText, event.minAge > 18 && { color: Colors.warning }]}>
              · {event.minAge}+
            </Text>
          </View>
          {isSoldOut ? (
            <View style={styles.soldOutBtn}>
              <Text style={styles.soldOutBtnText}>Esaurito</Text>
            </View>
          ) : !hasTickets ? (
            <View style={styles.priceButton}>
              <Text style={styles.priceText}>Ingresso libero</Text>
              <Ionicons name="arrow-forward" size={13} color={Colors.white} />
            </View>
          ) : (
            <View style={styles.priceButton}>
              <Text style={styles.priceText}>da €{minPrice}</Text>
              <Ionicons name="arrow-forward" size={13} color={Colors.white} />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    height: 300,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    marginBottom: 28,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  image: { ...StyleSheet.absoluteFillObject },

  topRow: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tonightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentBgMid,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  liveDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  tonightText: {
    fontSize: 11,
    fontFamily: Font.extraBold,
    color: Colors.accent,
    letterSpacing: 1.5,
  },
  heartButton: {
    backgroundColor: 'rgba(7,8,15,0.5)',
    borderRadius: 20,
    padding: 8,
  },

  content: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  clubName: {
    fontSize: 12,
    fontFamily: Font.semiBold,
    color: Colors.accent,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  eventName: {
    fontSize: 26,
    fontFamily: Font.black,
    color: Colors.white,
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  genreRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  genreTag: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  genreText: {
    fontSize: 11,
    fontFamily: Font.bold,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lineupPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  lineupText: {
    fontSize: 12,
    fontFamily: Font.semiBold,
    color: Colors.textSecondary,
  },
  timeText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  priceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
  },
  priceText: {
    fontSize: 13,
    fontFamily: Font.bold,
    color: Colors.white,
  },
  soldOutBtn: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.error,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  soldOutBtnText: {
    fontSize: 13,
    fontFamily: Font.bold,
    color: Colors.error,
  },
});
