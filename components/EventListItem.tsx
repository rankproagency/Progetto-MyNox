import { View, Text, StyleSheet, Image, TouchableOpacity, Animated } from 'react-native';
import { useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Event } from '../types';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';
import { useFavorites } from '../contexts/FavoritesContext';

interface Props {
  event: Event;
}

export default function EventListItem({ event }: Props) {
  const router = useRouter();
  const { isFavorite, toggleFavorite } = useFavorites();
  const scale = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(1)).current;

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
  const isSoldOut = hasTickets && event.ticketTypes.every((t) => t.available === 0);

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => router.push(`/event/${event.id}`)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
    <Animated.View style={[styles.container, { transform: [{ scale }] }]}>
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
          <Text style={styles.timeSep}>·</Text>
          <Text style={[styles.time, event.minAge > 18 && { color: Colors.warning }]}>
            {event.minAge}+
          </Text>
        </View>
      </View>
      <View style={styles.right}>
        {isSoldOut ? (
          <Text style={styles.soldText}>Esaurito</Text>
        ) : !hasTickets ? (
          <Text style={styles.freeText}>Ingresso libero</Text>
        ) : (
          <Text style={styles.price}>da €{minPrice}</Text>
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
  freeText: {
    fontSize: 12,
    fontFamily: Font.bold,
    color: Colors.textMuted,
  },
});
