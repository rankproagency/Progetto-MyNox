import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { useRef } from 'react';
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
const CARD_WIDTH = width * 0.70;
const CARD_HEIGHT = 420;

interface Props {
  event: Event;
}

export default function EventCard({ event }: Props) {
  const router = useRouter();
  const { isFavorite, toggleFavorite } = useFavorites();
  const scale = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => Animated.timing(scale, { toValue: 0.96, duration: 100, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 200 }).start();

  const onHeartPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.5, duration: 120, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, damping: 8, stiffness: 200 }),
    ]).start();
    toggleFavorite(event.id);
  };
  const hasTickets = event.ticketTypes.length > 0;
  const minPrice = hasTickets ? Math.min(...event.ticketTypes.map((t) => t.price)) : 0;
  const isSoldOut = hasTickets && event.ticketTypes.every((t) => t.available === 0);

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => router.push(`/event/${event.id}`)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <View style={styles.cardWrapper}>
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <Image source={{ uri: event.imageUrl }} style={styles.image} resizeMode="cover" />
        <LinearGradient
          colors={['transparent', 'transparent', 'rgba(7,8,15,0.7)', 'rgba(7,8,15,0.98)']}
          locations={[0, 0.45, 0.72, 1]}
          style={styles.gradient}
        />

        {/* Data in alto a sinistra */}
        <View style={styles.topRow}>
          <View style={styles.dateBadge}>
            <Text style={styles.dateBadgeText}>{formatDate(event.date)}</Text>
          </View>
        </View>

        {/* Contenuto in basso */}
        <View style={styles.content}>
          <TouchableOpacity onPress={() => router.push(`/club/${event.clubId}`)} activeOpacity={0.8}>
            <Text style={styles.clubName}>{event.club?.name}</Text>
          </TouchableOpacity>
          <Text style={styles.eventName} numberOfLines={2}>{event.name}</Text>
          <View style={styles.bottomRow}>
            <View style={styles.metaLeft}>
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
              <Text style={styles.timeText}>{event.startTime}</Text>
              <Text style={[styles.timeText, event.minAge > 18 && { color: Colors.warning }]}>
                · {event.minAge}+
              </Text>
            </View>
            {isSoldOut ? (
              <Text style={styles.soldOutText}>Esaurito</Text>
            ) : !hasTickets ? (
              <Text style={styles.freeText}>Ingresso libero</Text>
            ) : (
              <View style={styles.priceRow}>
                <Text style={styles.priceFrom}>da </Text>
                <Text style={styles.priceValue}>€{minPrice}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Heart button */}
        <TouchableOpacity style={styles.heartButton} onPress={onHeartPress}>
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Ionicons
              name={isFavorite(event.id) ? 'heart' : 'heart-outline'}
              size={20}
              color={isFavorite(event.id) ? Colors.accent : Colors.white}
            />
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
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
  cardWrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginRight: 14,
    position: 'relative',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  topRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
  },
  dateBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(7,8,15,0.55)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  dateBadgeText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: Font.semiBold,
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  clubName: {
    color: Colors.accent,
    fontSize: 11,
    fontFamily: Font.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  eventName: {
    fontSize: 21,
    fontFamily: Font.extraBold,
    color: Colors.white,
    marginBottom: 10,
    letterSpacing: 0.2,
    lineHeight: 26,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  genreTag: {
    borderRadius: 5,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  genreText: {
    fontSize: 10,
    fontFamily: Font.bold,
  },
  timeText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: Font.medium,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 1,
  },
  priceFrom: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: Font.medium,
  },
  priceValue: {
    fontSize: 18,
    fontFamily: Font.extraBold,
    color: Colors.white,
  },
  soldOutText: {
    color: Colors.error,
    fontSize: 13,
    fontFamily: Font.bold,
  },
  freeText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: Font.bold,
  },
  heartButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(7,8,15,0.55)',
    borderRadius: 20,
    padding: 7,
  },
});
