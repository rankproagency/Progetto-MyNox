import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useRef, useEffect } from 'react';
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

interface Props {
  event: Event;
  isLive?: boolean;
  cardWidth?: number;
}

export default function TonightHero({ event, isLive, cardWidth }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { isFavorite, toggleFavorite } = useFavorites();
  const livePulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isLive) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, { toValue: 0.35, duration: 700, useNativeDriver: true }),
        Animated.timing(livePulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isLive]);

  const hasTickets = event.ticketTypes.length > 0;
  const minPrice = hasTickets ? Math.min(...event.ticketTypes.map((t) => t.price)) : 0;
  const isSoldOut = hasTickets && event.ticketTypes.every((t) => !t.isUnlimited && t.available === 0);
  const firstArtist = event.lineup[0];

  const containerStyle = cardWidth
    ? [styles.container, { width: cardWidth, marginHorizontal: 0, marginRight: 14 }]
    : styles.container;

  return (
    <TouchableOpacity
      style={containerStyle}
      activeOpacity={0.92}
      onPress={() => router.push(`/event/${event.id}`)}
    >
      <Image source={{ uri: versionedImageUrl(event.imageUrl, event.updatedAt) }} style={styles.image} contentFit="cover" cachePolicy="memory-disk" />
      <LinearGradient
        colors={['transparent', 'transparent', 'rgba(7,8,15,0.55)', 'rgba(7,8,15,0.97)']}
        locations={[0, 0.38, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Top row: live badge + heart */}
      <View style={styles.topRow}>
        {isLive ? (
          <View style={styles.liveBadge}>
            <Animated.View style={[styles.liveDot, { opacity: livePulse }]} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        ) : <View />}
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
              · {formatMinAge(event.minAge)}
            </Text>
          </View>
          {isSoldOut ? (
            <View style={styles.soldOutBtn}>
              <Text style={styles.soldOutBtnText}>{t('common.sold_out')}</Text>
            </View>
          ) : !hasTickets ? (
            <View style={styles.priceButton}>
              <Text style={styles.priceText}>{t('common.free_entry')}</Text>
              <Ionicons name="arrow-forward" size={13} color={Colors.white} />
            </View>
          ) : (
            <View style={styles.priceButton}>
              <Text style={styles.priceText}>{t('common.from_price')}€{minPrice}</Text>
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
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(239,68,68,0.88)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  liveDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.white,
  },
  liveText: {
    fontSize: 11, fontFamily: Font.extraBold,
    color: Colors.white, letterSpacing: 1,
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
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
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
    color: 'rgba(255,255,255,0.65)',
  },
  timeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    fontFamily: Font.medium,
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
