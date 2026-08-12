import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Image } from 'expo-image';
import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getLocale } from '../lib/i18n';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Event } from '../types';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';
import { useFavorites } from '../contexts/FavoritesContext';
import { versionedImageUrl } from '../lib/imageUrl';
import { formatMinAge } from '../lib/formatAge';

interface Props {
  event: Event;
  isLive?: boolean;
}

export default function EventListItem({ event, isLive }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { isFavorite, toggleFavorite } = useFavorites();
  const scale = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const livePulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isLive) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(livePulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isLive]);

  const onPressIn = () => Animated.timing(scale, { toValue: 0.97, duration: 100, useNativeDriver: true }).start();
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
  const isSoldOut = hasTickets && event.ticketTypes.every((t) => !t.isUnlimited && t.available === 0);
  const atDoor = isSoldOut && !!event.doorEntryAvailable;

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => router.push(`/event/${event.id}`)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
    <Animated.View style={[styles.container, { transform: [{ scale }] }]}>
      <View style={styles.imageWrapper}>
        <Image source={{ uri: versionedImageUrl(event.imageUrl, event.updatedAt) }} style={styles.image} contentFit="cover" cachePolicy="memory-disk" />
        {isSoldOut && !atDoor && (
          <View style={styles.soldOverlay}>
            <Text style={styles.soldOverlayText}>SOLD</Text>
          </View>
        )}
        {isLive && (
          <View style={styles.liveBadge}>
            <Animated.View style={[styles.liveDot, { opacity: livePulse }]} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{event.name}</Text>
        <TouchableOpacity onPress={() => router.push(`/club/${event.clubId}`)}>
          <Text style={styles.club} numberOfLines={1}>{event.club?.name}</Text>
        </TouchableOpacity>
        <View style={styles.metaRow}>
          <Text style={styles.time}>{formatDate(event.date)}</Text>
          <Text style={styles.timeSep}>·</Text>
          <Text style={styles.time}>{event.startTime}</Text>
          <Text style={styles.timeSep}>·</Text>
          <Text style={[styles.time, event.minAge > 18 && { color: Colors.warning }]}>
            {formatMinAge(event.minAge)}
          </Text>
        </View>
      </View>
      <View style={styles.right}>
        {atDoor ? (
          <Text style={styles.atDoorText}>{t('common.at_door')}</Text>
        ) : isSoldOut ? (
          <Text style={styles.soldText}>{t('common.sold_out')}</Text>
        ) : !hasTickets ? (
          <Text style={styles.freeText}>{t('common.free_entry')}</Text>
        ) : (
          <Text style={styles.price}>{t('common.from_price')}€{minPrice}</Text>
        )}
        <TouchableOpacity onPress={onHeartPress} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Ionicons
              name={isFavorite(event.id) ? 'heart' : 'heart-outline'}
              size={16}
              color={isFavorite(event.id) ? Colors.accent : Colors.textMuted}
            />
          </Animated.View>
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </View>
    </Animated.View>
    </TouchableOpacity>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(getLocale(), { weekday: 'short', day: 'numeric', month: 'short' });
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
  liveBadge: {
    position: 'absolute', bottom: 4, left: 4,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(239,68,68,0.88)',
    paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6,
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' },
  liveText: { fontSize: 9, fontFamily: Font.bold, color: '#fff', letterSpacing: 0.3 },
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
    color: Colors.textSecondary,
  },
  timeSep: {
    fontSize: 11,
    color: Colors.textSecondary,
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
  atDoorText: {
    fontSize: 12,
    fontFamily: Font.bold,
    color: Colors.accent,
  },
  soldText: {
    fontSize: 12,
    fontFamily: Font.bold,
    color: Colors.error,
  },
  freeText: {
    fontSize: 12,
    fontFamily: Font.bold,
    color: Colors.textMuted,
  },
});
