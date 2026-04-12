import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Event } from '../types';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';
import { useFavorites } from '../contexts/FavoritesContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.78;
const CARD_HEIGHT = 220;

interface Props {
  event: Event;
}

export default function EventCard({ event }: Props) {
  const router = useRouter();
  const { isFavorite, toggleFavorite } = useFavorites();
  const minPrice = Math.min(...event.ticketTypes.map((t) => t.price));
  const isSoldOut = event.ticketTypes.every((t) => t.available === 0);

  return (
    <TouchableOpacity
      style={styles.cardWrapper}
      activeOpacity={0.9}
      onPress={() => router.push(`/event/${event.id}`)}
    >
      <View style={styles.glow} />

      <View style={styles.card}>
        <Image source={{ uri: event.imageUrl }} style={styles.image} resizeMode="cover" />
        <LinearGradient
          colors={['transparent', 'rgba(7,8,15,0.6)', 'rgba(7,8,15,0.97)']}
          style={styles.gradient}
        />
        <View style={styles.content}>
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.clubBadge}
              onPress={() => router.push(`/club/${event.clubId}`)}
              activeOpacity={0.8}
            >
              <Text style={styles.clubName}>{event.club?.name}</Text>
            </TouchableOpacity>
            {isSoldOut ? (
              <View style={styles.soldOutBadge}>
                <Text style={styles.soldOutText}>Esaurito</Text>
              </View>
            ) : (
              <View style={styles.priceBadge}>
                <Text style={styles.priceText}>da €{minPrice}</Text>
              </View>
            )}
          </View>
          <Text style={styles.eventName} numberOfLines={1}>{event.name}</Text>
          <View style={styles.bottomRow}>
            <View style={styles.genreRow}>
              {event.genres.slice(0, 2).map((g) => (
                <View key={g} style={styles.genreTag}>
                  <Text style={styles.genreText}>{g}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.meta}>{event.startTime}</Text>
          </View>
        </View>

        {/* Heart button */}
        <TouchableOpacity
          style={styles.heartButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toggleFavorite(event.id);
          }}
        >
          <Ionicons
            name={isFavorite(event.id) ? 'heart' : 'heart-outline'}
            size={20}
            color={isFavorite(event.id) ? Colors.accent : Colors.white}
          />
        </TouchableOpacity>
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
  glow: {
    position: 'absolute',
    bottom: -10,
    left: 20,
    right: 20,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.accent,
    opacity: 0.35,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 20,
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
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clubBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  clubName: {
    color: Colors.textPrimary,
    fontSize: 11,
    fontFamily: Font.semiBold,
  },
  priceBadge: {
    backgroundColor: Colors.accent,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  priceText: {
    color: Colors.white,
    fontSize: 11,
    fontFamily: Font.bold,
  },
  eventName: {
    fontSize: 20,
    fontFamily: Font.extraBold,
    color: Colors.white,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  soldOutBadge: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.error,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  soldOutText: {
    color: Colors.error,
    fontSize: 11,
    fontFamily: Font.bold,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  genreRow: {
    flexDirection: 'row',
    gap: 6,
  },
  genreTag: {
    backgroundColor: 'rgba(168,85,247,0.18)',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  genreText: {
    color: Colors.accent,
    fontSize: 10,
    fontWeight: '700',
  },
  meta: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
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
