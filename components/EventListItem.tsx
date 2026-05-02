import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Event, Genre } from '../types';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';
import { useFavorites } from '../contexts/FavoritesContext';
import { GENRE_CONFIG } from '../constants/genres';

interface Props {
  event: Event;
}

export default function EventListItem({ event }: Props) {
  const router = useRouter();
  const { isFavorite, toggleFavorite } = useFavorites();
  const minPrice = Math.min(...event.ticketTypes.map((t) => t.price));
  const isSoldOut = event.ticketTypes.every((t) => t.available === 0);

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.8}
      onPress={() => router.push(`/event/${event.id}`)}
    >
      <View style={styles.imageWrapper}>
        <Image source={{ uri: event.imageUrl }} style={styles.image} resizeMode="cover" />
        {isSoldOut && (
          <View style={styles.soldOverlay}>
            <Text style={styles.soldOverlayText}>SOLD</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{event.name}</Text>
        <TouchableOpacity onPress={() => router.push(`/club/${event.clubId}`)}>
          <Text style={styles.club} numberOfLines={1}>{event.club?.name}</Text>
        </TouchableOpacity>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
          <Text style={styles.time}> {formatDate(event.date)}</Text>
          <Text style={styles.timeSep}>·</Text>
          <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
          <Text style={styles.time}> {event.startTime}</Text>
          {event.genres.slice(0, 1).map((g) => {
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
      </View>
      <View style={styles.right}>
        {isSoldOut ? (
          <Text style={styles.soldText}>Esaurito</Text>
        ) : (
          <Text style={styles.price}>da €{minPrice}</Text>
        )}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toggleFavorite(event.id);
          }}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons
            name={isFavorite(event.id) ? 'heart' : 'heart-outline'}
            size={16}
            color={isFavorite(event.id) ? Colors.accent : Colors.textMuted}
          />
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  imageWrapper: {
    position: 'relative',
    width: 72,
    height: 72,
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
  },
  soldOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  soldOverlayText: {
    fontSize: 9,
    fontFamily: Font.black,
    color: Colors.error,
    letterSpacing: 1,
  },
  info: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  name: {
    fontSize: 14,
    fontFamily: Font.bold,
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  club: {
    fontSize: 12,
    color: Colors.accent,
    marginBottom: 5,
    fontFamily: Font.medium,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  time: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  timeSep: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  genreTag: {
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  genreText: {
    fontSize: 10,
    fontFamily: Font.bold,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  price: {
    fontSize: 13,
    fontFamily: Font.bold,
    color: Colors.accent,
  },
  soldText: {
    fontSize: 12,
    fontFamily: Font.bold,
    color: Colors.error,
  },
});
