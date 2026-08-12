import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { getLocale } from '../../lib/i18n';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, ActivityIndicator, ScrollView,
  PanResponder, Linking, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { versionedImageUrl } from '../../lib/imageUrl';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Font } from '../../constants/typography';
import { useEvents } from '../../contexts/EventsContext';
import { useClubs } from '../../contexts/ClubsContext';
import { formatMinAge } from '../../lib/formatAge';
import { Club, Event } from '../../types';

const PADOVA_REGION: Region = {
  latitude: 45.4064,
  longitude: 11.8768,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const DARK_MAP_STYLE = [
  // Base — blu-viola medio, leggibile in piena luce
  { elementType: 'geometry', stylers: [{ color: '#1e2040' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#c0b0e0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1e2040' }] },
  // Paesaggio — strato distinto sopra il fondo
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#262848' }] },
  // Amministrative — nascoste
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d4c8f0' }] },
  // POI — tutti nascosti
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  // Strade secondarie
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#3d3468' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#302a58' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#a090cc' }] },
  { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#1e2040' }] },
  // Strade principali — viola medio
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#5e4590' }] },
  { featureType: 'road.arterial', elementType: 'geometry.stroke', stylers: [{ color: '#4a3578' }] },
  // Autostrade — viola pieno saturo
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#8850c8' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#6535a0' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#ecdcff' }] },
  // Transit — nascosto
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  // Acqua — scura per contrasto netto col suolo
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c0f20' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4060a8' }] },
];

const TAB_BAR_HEIGHT = 110;
const CLUB_LIST_HEIGHT = 100;
const MAX_CHIPS = 8;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function openMaps(lat: number, lng: number, name: string) {
  const label = encodeURIComponent(name);
  const url =
    Platform.OS === 'ios'
      ? `maps:?q=${label}&ll=${lat},${lng}`
      : `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
  Linking.openURL(url);
}

function getNextEvent(clubId: string, events: Event[]): Event | null {
  const today = new Date().toISOString().split('T')[0];
  return (
    events
      .filter((e) => e.clubId === clubId && e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
  );
}

function isTonight(event: Event): boolean {
  return event.date === new Date().toISOString().split('T')[0];
}

function formatEventDate(dateStr: string, tonightLabel: string): string {
  if (dateStr === new Date().toISOString().split('T')[0]) return tonightLabel;
  return new Date(dateStr).toLocaleDateString(getLocale(), {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

function getMinPrice(event: Event): number | null {
  if (!event.ticketTypes || event.ticketTypes.length === 0) return null;
  const available = event.ticketTypes.filter((t) => t.available > 0);
  if (available.length === 0) return null;
  return Math.min(...available.map((t) => t.price));
}

// ── ClubMarker ────────────────────────────────────────────────────────────────

const ClubMarker = memo(function ClubMarker({
  club,
  isSelected,
  tonight,
  onPress,
}: {
  club: Club;
  isSelected: boolean;
  tonight: boolean;
  onPress: (club: Club) => void;
}) {
  const { t } = useTranslation();
  const [imageLoaded, setImageLoaded] = useState(false);
  const handlePress = useCallback(() => onPress(club), [club, onPress]);

  return (
    <Marker
      coordinate={{ latitude: club.latitude!, longitude: club.longitude! }}
      onPress={handlePress}
      tracksViewChanges={!imageLoaded}
      anchor={{ x: 0.5, y: 1 }}
    >
      <View pointerEvents="none" style={styles.pinWrapper}>
        {tonight && (
          <View style={styles.pinBadge}>
            <View style={styles.pinBadgeDot} />
            <Text style={styles.pinBadgeText}>{t('map.badge_tonight')}</Text>
          </View>
        )}
        <View style={[styles.pinOuter, isSelected && styles.pinOuterSelected]}>
          {club.imageUrl ? (
            <Image
              source={{ uri: versionedImageUrl(club.imageUrl, club.updatedAt) }}
              style={styles.pinImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              onLoad={() => setImageLoaded(true)}
            />
          ) : (
            <View style={styles.pinFallback}>
              <Ionicons name="musical-notes" size={20} color={Colors.accent} />
            </View>
          )}
        </View>
        <View style={[styles.pinTail, isSelected && styles.pinTailSelected]} />
      </View>
    </Marker>
  );
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function MapScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { events } = useEvents();
  const { clubs, isLoading } = useClubs();
  const [locationGranted, setLocationGranted] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [tonightOnly, setTonightOnly] = useState(false);
  const mapRef = useRef<MapView>(null);
  const cardAnim = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const isSwipeClosing = useRef(false);

  // Mappa club→nextEvent calcolata una volta sola quando events/clubs cambiano
  const nextEventByClub = useMemo(() => {
    const map = new Map<string, Event | null>();
    for (const club of clubs) {
      map.set(club.id, getNextEvent(club.id, events));
    }
    return map;
  }, [clubs, events]);

  const mappableClubs = useMemo(
    () => clubs.filter((c) => c.latitude != null && c.longitude != null),
    [clubs]
  );

  const visibleClubs = useMemo(() => {
    if (!tonightOnly) return mappableClubs;
    return mappableClubs.filter((c) => {
      const next = nextEventByClub.get(c.id) ?? null;
      return next !== null && isTonight(next);
    });
  }, [mappableClubs, tonightOnly, nextEventByClub]);

  const showNoCoords = !isLoading && mappableClubs.length === 0 && clubs.length > 0;
  const showNoClubs = !isLoading && clubs.length === 0;
  const showNoTonightEvents =
    !isLoading && tonightOnly && visibleClubs.length === 0 && mappableClubs.length > 0;
  const showClubList = !selectedClub && visibleClubs.length > 0;

  // ── Location ────────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationGranted(true);
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = loc.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        mapRef.current?.animateToRegion(
          { latitude, longitude, latitudeDelta: 0.08, longitudeDelta: 0.08 },
          800
        );
      }
    })();
  }, []);

  // ── Card animation ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (isSwipeClosing.current) {
      // La card è già uscita dallo schermo via dragY — reset istantaneo, nessun flash
      cardAnim.setValue(0);
      dragY.setValue(0);
      isSwipeClosing.current = false;
    } else {
      dragY.setValue(0);
      Animated.spring(cardAnim, {
        toValue: selectedClub ? 1 : 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    }
  }, [selectedClub]);

  const cardSlide = useRef(cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [320, 0],
  })).current;

  // ── Swipe fluido ─────────────────────────────────────────────────────────────

  const swipePan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        gs.dy > 6 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.5,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) dragY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 100 || gs.vy > 0.8) {
          // chiudi con animazione verso il basso — segnala al useEffect di non rianimare
          isSwipeClosing.current = true;
          Animated.timing(dragY, {
            toValue: 420,
            duration: 180,
            useNativeDriver: true,
          }).start(() => setSelectedClub(null));
        } else {
          // snap-back elastico
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
          }).start();
        }
      },
    })
  ).current;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleMarkerPress = useCallback((club: Club) => {
    setSelectedClub(club);
    mapRef.current?.animateToRegion(
      {
        latitude: (club.latitude ?? 0) - 0.012,
        longitude: club.longitude ?? 0,
        latitudeDelta: 0.045,
        longitudeDelta: 0.045,
      },
      450
    );
  }, []);

  const closeCard = useCallback(() => {
    dragY.setValue(0);
    setSelectedClub(null);
  }, []);

  const handleLocateMe = useCallback(() => {
    if (!locationGranted) return;
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then((loc) => {
      const { latitude, longitude } = loc.coords;
      setUserLocation({ lat: latitude, lng: longitude });
      mapRef.current?.animateToRegion(
        { latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 },
        600
      );
    });
  }, [locationGranted]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={PADOVA_REGION}
        customMapStyle={DARK_MAP_STYLE}
        showsUserLocation={locationGranted}
        showsMyLocationButton={false}
        showsCompass={false}
        showsPointsOfInterest={false}
        pitchEnabled={false}
        rotateEnabled={false}
      >
        {visibleClubs.map((club) => {
          const nextEvent = nextEventByClub.get(club.id) ?? null;
          const tonight = nextEvent !== null && isTonight(nextEvent);
          const isSelected = selectedClub?.id === club.id;

          return (
            <ClubMarker
              key={club.id}
              club={club}
              isSelected={isSelected}
              tonight={tonight}
              onPress={handleMarkerPress}
            />
          );
        })}
      </MapView>

      {/* Overlay per chiudere la card */}
      {selectedClub && (
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={closeCard}
        />
      )}

      {/* Stato vuoto: nessun club */}
      {(showNoCoords || showNoClubs) && (
        <View style={styles.emptyOverlay} pointerEvents="none">
          <View style={styles.emptyBox}>
            <Ionicons name="map-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>{t('map.no_clubs_on_map_title')}</Text>
            <Text style={styles.emptySub}>
              {showNoClubs
                ? t('map.no_clubs_registered')
                : t('map.no_clubs_address')}
            </Text>
          </View>
        </View>
      )}

      {/* Header */}
      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        <View style={styles.header}>
          {/* Pillola sinistra — contatore */}
          <View style={styles.headerPill}>
            {isLoading ? (
              <ActivityIndicator size="small" color={Colors.accent} />
            ) : (
              <>
                <View style={styles.headerDot} />
                <Text style={styles.headerPillText}>{visibleClubs.length} club</Text>
              </>
            )}
          </View>

          {/* Pillola destra — filtro stasera */}
          <TouchableOpacity
            style={[styles.filterBtn, tonightOnly && styles.filterBtnActive]}
            onPress={() => {
              setSelectedClub(null);
              setTonightOnly((v) => !v);
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="moon"
              size={13}
              color={tonightOnly ? Colors.white : Colors.textMuted}
            />
            <Text style={[styles.filterText, tonightOnly && styles.filterTextActive]}>
              {t('map.filter_tonight')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Pillola centrata sotto l'header quando filtro stasera è attivo senza risultati */}
        {showNoTonightEvents && (
          <View style={styles.tonightBanner} pointerEvents="none">
            <Ionicons name="moon-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.tonightBannerText}>{t('map.no_tonight_events')}</Text>
          </View>
        )}
      </SafeAreaView>

      {/* Localizzami — nascosto quando la card è aperta */}
      {!selectedClub && (
        <TouchableOpacity
          style={[
            styles.locateBtn,
            { bottom: showClubList ? TAB_BAR_HEIGHT + CLUB_LIST_HEIGHT + 12 : TAB_BAR_HEIGHT + 16 },
          ]}
          onPress={handleLocateMe}
          activeOpacity={0.8}
        >
          <Ionicons
            name={locationGranted ? 'locate' : 'locate-outline'}
            size={20}
            color={locationGranted ? Colors.accent : Colors.textMuted}
          />
        </TouchableOpacity>
      )}

      {/* Lista orizzontale club */}
      {showClubList && (
        <View style={[styles.clubListContainer, { bottom: TAB_BAR_HEIGHT - 14 }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.clubListContent}
          >
            {[...visibleClubs]
              .sort((a, b) => {
                const aTonight = (() => { const e = nextEventByClub.get(a.id); return e ? isTonight(e) : false; })();
                const bTonight = (() => { const e = nextEventByClub.get(b.id); return e ? isTonight(e) : false; })();
                if (aTonight !== bTonight) return aTonight ? -1 : 1;
                return a.name.localeCompare(b.name);
              })
              .slice(0, MAX_CHIPS)
              .map((club) => {
                const nextEvent = nextEventByClub.get(club.id) ?? null;
                const tonight = nextEvent !== null && isTonight(nextEvent);
                const minPrice = nextEvent ? getMinPrice(nextEvent) : null;

                return (
                  <TouchableOpacity
                    key={club.id}
                    style={[styles.clubChip, tonight && styles.clubChipTonight]}
                    onPress={() => handleMarkerPress(club)}
                    activeOpacity={0.85}
                  >
                    {club.imageUrl ? (
                      <Image source={{ uri: versionedImageUrl(club.imageUrl, club.updatedAt) }} style={styles.chipImage} contentFit="cover" cachePolicy="memory-disk" />
                    ) : (
                      <View style={[styles.chipImage, styles.chipImageFallback]}>
                        <Ionicons name="musical-notes" size={16} color={Colors.accent} />
                      </View>
                    )}
                    <View style={styles.chipInfo}>
                      <Text style={styles.chipName} numberOfLines={1}>
                        {club.name}
                      </Text>
                      {nextEvent ? (
                        <View style={styles.chipEventRow}>
                          <View
                            style={[styles.chipDot, tonight && { backgroundColor: Colors.success }]}
                          />
                          <Text
                            style={[styles.chipEventText, tonight && { color: Colors.success }]}
                            numberOfLines={1}
                          >
                            {formatEventDate(nextEvent.date, t('map.badge_tonight'))}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.chipNoEvent}>{t('map.no_event')}</Text>
                      )}
                      {minPrice !== null
                        ? <Text style={styles.chipPrice}>{t('common.from_price')}€{minPrice}</Text>
                        : nextEvent && nextEvent.ticketTypes.length === 0
                          ? <Text style={[styles.chipPrice, { color: Colors.textMuted }]}>{t('common.free_entry')}</Text>
                          : null
                      }
                    </View>
                  </TouchableOpacity>
                );
              })}
            {visibleClubs.length > MAX_CHIPS && (
              <View style={styles.chipMore}>
                <Text style={styles.chipMoreText}>+{visibleClubs.length - MAX_CHIPS}</Text>
                <Text style={styles.chipMoreSub}>{t('common.others') ?? 'altri'}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Card bottom sheet */}
      <Animated.View
        style={[
          styles.card,
          { bottom: 0, transform: [{ translateY: cardSlide }, { translateY: dragY }] },
        ]}
        pointerEvents={selectedClub ? 'box-none' : 'none'}
      >
        {selectedClub && (
          <ClubCard
            club={selectedClub}
            nextEvent={getNextEvent(selectedClub.id, events)}
            userLocation={userLocation}
            onClose={closeCard}
            onNavigate={() => router.push(`/club/${selectedClub.id}`)}
            swipePanHandlers={swipePan.panHandlers}
          />
        )}
      </Animated.View>
    </View>
  );
}

// ── ClubCard ──────────────────────────────────────────────────────────────────

function ClubCard({
  club,
  nextEvent,
  userLocation,
  onClose,
  onNavigate,
  swipePanHandlers,
}: {
  club: Club;
  nextEvent: Event | null;
  userLocation: { lat: number; lng: number } | null;
  onClose: () => void;
  onNavigate: () => void;
  swipePanHandlers: object;
}) {
  const { t } = useTranslation();
  const tonight = nextEvent !== null && isTonight(nextEvent);
  const minPrice = nextEvent ? getMinPrice(nextEvent) : null;

  const distance =
    userLocation && club.latitude != null && club.longitude != null
      ? formatDistance(
          getDistance(userLocation.lat, userLocation.lng, club.latitude, club.longitude)
        )
      : null;

  return (
    <View style={styles.cardInner} {...swipePanHandlers}>
      <View style={styles.cardHandle} />

      <View style={styles.cardContent}>
        {club.imageUrl ? (
          <Image source={{ uri: versionedImageUrl(club.imageUrl, club.updatedAt) }} style={styles.cardImage} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={[styles.cardImage, styles.cardImageFallback]}>
            <Ionicons name="musical-notes" size={28} color={Colors.accent} />
          </View>
        )}

        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {club.name}
          </Text>
          <View style={styles.cardMeta}>
            <Ionicons name="location-sharp" size={12} color={Colors.accent} />
            <Text style={styles.cardMetaText} numberOfLines={1}>
              {club.address}
            </Text>
            {distance && (
              <>
                <Text style={styles.cardMetaDot}>·</Text>
                <Text style={styles.cardDistance}>{distance}</Text>
              </>
            )}
          </View>

          {nextEvent ? (
            <View style={styles.eventRow}>
              <View style={styles.eventBadge}>
                <View style={[styles.eventDot, tonight && styles.eventDotTonight]} />
                <Text
                  style={[styles.eventBadgeText, tonight && styles.eventBadgeTextTonight]}
                  numberOfLines={1}
                >
                  {formatEventDate(nextEvent.date, t('map.badge_tonight'))} · {nextEvent.name}
                </Text>
              </View>
              <View style={styles.eventMetaRow}>
                <Text style={[styles.ageText, nextEvent.minAge > 18 && { color: Colors.warning }]}>
                  {formatMinAge(nextEvent.minAge)}
                </Text>
                {minPrice !== null ? (
                  <View style={styles.priceBadge}>
                    <Text style={styles.priceText}>{t('common.from_price')}€{minPrice}</Text>
                  </View>
                ) : nextEvent.ticketTypes.length === 0 ? (
                  <Text style={[styles.priceText, { color: Colors.textMuted }]}>{t('common.free_entry')}</Text>
                ) : null}
              </View>
            </View>
          ) : (
            <Text style={styles.noEventsText}>{t('common.no_events_scheduled')}</Text>
          )}
        </View>

        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* CTA row */}
      <View style={styles.ctaRow}>
        {club.latitude != null && club.longitude != null && (
          <TouchableOpacity
            style={styles.ctaSecondary}
            onPress={() => openMaps(club.latitude!, club.longitude!, club.name)}
            activeOpacity={0.85}
          >
            <Ionicons name="navigate" size={15} color={Colors.accent} />
            <Text style={styles.ctaSecondaryText}>{t('map.navigate_to')}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.ctaPrimary, club.latitude == null && styles.ctaPrimaryFull]}
          onPress={onNavigate}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaPrimaryText}>{t('map.open_club')}</Text>
          <Ionicons name="chevron-forward" size={15} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  overlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(7,8,15,0.88)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  headerPillText: { fontSize: 13, fontFamily: Font.semiBold, color: Colors.textPrimary },

  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(7,8,15,0.88)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterBtnActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterText: { fontSize: 12, fontFamily: Font.semiBold, color: Colors.textMuted },
  filterTextActive: { color: Colors.white },

  locateBtn: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(7,8,15,0.9)',
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Stato vuoto ──────────────────────────────────────────────────────────────
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBox: {
    backgroundColor: 'rgba(7,8,15,0.88)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 28,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
    maxWidth: 280,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: Font.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
  tonightBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(7,8,15,0.88)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tonightBannerText: {
    fontSize: 13,
    fontFamily: Font.semiBold,
    color: Colors.textMuted,
  },

  // ── Lista orizzontale ────────────────────────────────────────────────────────
  clubListContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: CLUB_LIST_HEIGHT,
  },
  clubListContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    alignItems: 'center',
  },
  clubChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(12,10,22,0.96)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: 195,
  },
  clubChipTonight: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(168,85,247,0.10)',
  },
  chipImage: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
    flexShrink: 0,
  },
  chipImageFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipInfo: { flex: 1, gap: 3 },
  chipName: { fontSize: 13, fontFamily: Font.bold, color: Colors.textPrimary },
  chipEventRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  chipDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.textMuted,
    flexShrink: 0,
  },
  chipEventText: { fontSize: 11, fontFamily: Font.medium, color: Colors.textMuted, flex: 1 },
  chipNoEvent: { fontSize: 11, color: Colors.textMuted, fontFamily: Font.regular },
  chipPrice: { fontSize: 11, fontFamily: Font.semiBold, color: Colors.accent },
  chipMore: {
    width: 64,
    height: 72,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.25)',
    backgroundColor: 'rgba(168,85,247,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  chipMoreText: { fontSize: 18, fontFamily: Font.extraBold, color: Colors.accent },
  chipMoreSub: { fontSize: 10, fontFamily: Font.medium, color: Colors.textMuted },

  // ── Pin ──────────────────────────────────────────────────────────────────────
  pinWrapper: { alignItems: 'center' },
  pinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accent,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginBottom: 5,
  },
  pinBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  pinBadgeText: { fontSize: 10, fontFamily: Font.bold, color: Colors.white },
  pinOuter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: Colors.accent,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceElevated,
  },
  pinOuterSelected: {
    borderColor: Colors.white,
    borderWidth: 3.5,
  },
  pinImage: { width: '100%', height: '100%' },
  pinFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.accent,
    marginTop: -1,
  },
  pinTailSelected: { borderTopColor: Colors.white },

  // ── Card ─────────────────────────────────────────────────────────────────────
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  cardInner: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.border,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: TAB_BAR_HEIGHT + 4,
    gap: 14,
  },
  cardHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: 4,
  },
  cardContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardImage: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: Colors.surfaceElevated,
  },
  cardImageFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: { flex: 1, gap: 5 },
  cardName: { fontSize: 16, fontFamily: Font.bold, color: Colors.textPrimary },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMetaText: { fontSize: 11, color: Colors.textMuted, fontFamily: Font.regular, flex: 1 },
  cardMetaDot: { fontSize: 11, color: Colors.textMuted },
  cardDistance: { fontSize: 11, fontFamily: Font.semiBold, color: Colors.accent, flexShrink: 0 },

  eventRow: { gap: 5 },
  eventMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ageText: { fontSize: 12, fontFamily: Font.semiBold, color: Colors.textMuted },
  eventBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textMuted,
    flexShrink: 0,
  },
  eventDotTonight: { backgroundColor: Colors.success },
  eventBadgeText: { fontSize: 12, fontFamily: Font.semiBold, color: Colors.textMuted, flex: 1 },
  eventBadgeTextTonight: { color: Colors.success },

  priceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accentBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  priceText: { fontSize: 11, fontFamily: Font.bold, color: Colors.accent },

  noEventsText: { fontSize: 12, color: Colors.textMuted, fontFamily: Font.regular },

  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // CTA row
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  ctaSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
    borderRadius: 14,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    backgroundColor: Colors.accentBg,
  },
  ctaSecondaryText: {
    fontSize: 14,
    fontFamily: Font.bold,
    color: Colors.accent,
  },
  ctaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
  },
  ctaPrimaryFull: { flex: 1 },
  ctaPrimaryText: { fontSize: 14, fontFamily: Font.bold, color: Colors.white },
});
