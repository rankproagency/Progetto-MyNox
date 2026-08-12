import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getLocale } from '../lib/i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Event, Genre } from '../types';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';
import { useFavorites } from '../contexts/FavoritesContext';
import { GENRE_CONFIG } from '../constants/genres';
import { versionedImageUrl } from '../lib/imageUrl';
import { formatMinAge } from '../lib/formatAge';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.70;
const CARD_HEIGHT = 420;

interface Props {
  event: Event;
}

function isEventLive(event: Event): boolean {
  const now = new Date();
  const [startH, startM] = event.startTime.split(':').map(Number);
  const base = new Date(event.date + 'T00:00:00');
  const startDt = new Date(base);
  startDt.setHours(startH, startM, 0, 0);
  let endDt: Date;
  if (event.endTime) {
    const [endH, endM] = event.endTime.split(':').map(Number);
    endDt = new Date(base);
    if (endH < 12) endDt.setDate(endDt.getDate() + 1);
    endDt.setHours(endH, endM, 0, 0);
  } else {
    endDt = new Date(startDt.getTime() + 5 * 60 * 60 * 1000);
  }
  return now >= startDt && now < endDt;
}

export default function EventCard({ event }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { isFavorite, toggleFavorite } = useFavorites();
  const scale = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const livePulse = useRef(new Animated.Value(1)).current;

  const live = isEventLive(event);

  useEffect(() => {
    if (!live) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(livePulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [live]);

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
  const atDoor = isSoldOut && !!event.doorEntryAvailable;

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => router.push(`/event/${event.id}`)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <View style={styles.cardWrapper}>
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <Image source={{ uri: versionedImageUrl(event.imageUrl, event.updatedAt) }} style={styles.image} contentFit="cover" cachePolicy="memory-disk" />
        <LinearGradient
          colors={['transparent', 'transparent', 'rgba(7,8,15,0.7)', 'rgba(7,8,15,0.98)']}
          locations={[0, 0.45, 0.72, 1]}
          style={styles.gradient}
        />

        {/* Data in alto a sinistra */}
        <View style={styles.topRow}>
          {live ? (
            <View style={styles.liveBadge}>
              <Animated.View style={[styles.liveDot, { opacity: livePulse }]} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          ) : (
            <Text style={styles.dateBadgeText}>{formatDate(event.date)}</Text>
          )}
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
                · {formatMinAge(event.minAge)}
              </Text>
            </View>
            {atDoor ? (
              <Text style={[styles.soldOutText, { color: Colors.accent }]}>{t('common.at_door')}</Text>
            ) : isSoldOut ? (
              <Text style={styles.soldOutText}>{t('common.sold_out')}</Text>
            ) : !hasTickets ? (
              <Text style={styles.freeText}>{t('common.free_entry')}</Text>
            ) : (
              <View style={styles.priceRow}>
                <Text style={styles.priceFrom}>{t('common.from_price')}</Text>
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
  return new Date(dateStr).toLocaleDateString(getLocale(), { weekday: 'short', day: 'numeric', month: 'short' });
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
  dateBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontFamily: Font.bold,
    textShadowColor: 'rgba(0,0,0,0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(239,68,68,0.85)',
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 20, alignSelf: 'flex-start',
  },
  liveDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.white,
  },
  liveText: {
    color: Colors.white, fontSize: 11,
    fontFamily: Font.bold, letterSpacing: 0.5,
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
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
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
    color: 'rgba(255,255,255,0.65)',
    fontFamily: Font.medium,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 1,
  },
  priceFrom: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
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
