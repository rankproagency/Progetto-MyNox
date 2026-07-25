import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Modal,
  RefreshControl,
  Dimensions as RNDimensions,
  Switch,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { getLocale } from '../../lib/i18n';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { Font } from '../../constants/typography';
import EventCard from '../../components/EventCard';
import EventListItem from '../../components/EventListItem';
import TonightHero from '../../components/TonightHero';
import { ALL_GENRES } from '../../constants/genres';
import { useEvents } from '../../contexts/EventsContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTabBarScroll } from '../../contexts/TabBarContext';
import { Event, Genre } from '../../types';
import AppHeader from '../../components/AppHeader';
import HomeSkeletonLoader from '../../components/HomeSkeletonLoader';

const CARD_WIDTH = Math.round(RNDimensions.get('window').width * 0.70);

const CITIES = [
  { id: 'padova', name: 'Padova', available: true },
  { id: 'venezia', name: 'Venezia', available: false },
  { id: 'verona', name: 'Verona', available: false },
  { id: 'milano', name: 'Milano', available: false },
  { id: 'roma', name: 'Roma', available: false },
];

const DAY_LABELS_IT = ['L','M','M','G','V','S','D'];
const DAY_LABELS_EN = ['M','T','W','T','F','S','S'];

const MAX_PRICE_OPTIONS_VALUES = [null, 10, 15, 20];
const MAX_PRICE_OPTION_LABELS = ['≤ €10', '≤ €15', '≤ €20'];

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getCalendarGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const grid: { date: Date; isCurrentMonth: boolean }[][] = [];
  let day = 1 - startDow;

  for (let week = 0; week < 6; week++) {
    const row: { date: Date; isCurrentMonth: boolean }[] = [];
    for (let dow = 0; dow < 7; dow++) {
      const date = new Date(year, month, day);
      row.push({ date, isCurrentMonth: date.getMonth() === month });
      day++;
    }
    grid.push(row);
    if (day > daysInMonth + startDow) break;
  }
  return grid;
}

// eventDateSet viene calcolato dinamicamente dentro il componente

type AgeFilter = 'all' | 'adult' | 'minor';

function applyFilters(
  events: Event[],
  maxPrice: number | null,
  onlyAvailable: boolean,
  selectedGenres: Genre[],
  ageFilter: AgeFilter
): Event[] {
  return events.filter((e) => {
    if (onlyAvailable && e.ticketTypes.length > 0 && e.ticketTypes.every((t) => t.available === 0)) return false;
    if (maxPrice !== null) {
      const minPrice = e.ticketTypes.length > 0 ? Math.min(...e.ticketTypes.map((t) => t.price)) : 0;
      if (minPrice > maxPrice) return false;
    }
    if (selectedGenres.length > 0 && !selectedGenres.some((g) => e.genres.includes(g))) return false;
    if (ageFilter === 'adult' && e.minAge < 18) return false;
    if (ageFilter === 'minor' && e.minAge >= 18) return false;
    return true;
  });
}

function getEventsByDayFromList(events: ReturnType<typeof useEvents>['events']) {
  const groups: Record<string, typeof events> = {};
  for (const event of events) {
    if (!groups[event.date]) groups[event.date] = [];
    groups[event.date].push(event);
  }
  const locale = getLocale();
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, evs]) => {
      const d = new Date(date);
      const label = d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
      return { day: date, label, events: evs };
    });
}

function AnimatedListItem({ children, index }: { children: React.ReactNode; index: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        delay: Math.min(index * 55, 360),
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        delay: Math.min(index * 55, 360),
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const locale = getLocale();
  const DAY_LABELS = i18n.language === 'en' ? DAY_LABELS_EN : DAY_LABELS_IT;
  const { musicGenres } = useAuth();
  const { onScroll } = useTabBarScroll();
  const { events, isLoading: eventsLoading, hasError: eventsError, reload } = useEvents();

  const eventsByDay = getEventsByDayFromList(events);
  const eventDateSet = new Set(events.map((e) => e.date));

  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState(CITIES[0]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Filter state (applicato alla lista)
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>([]);
  const [ageFilter, setAgeFilter] = useState<AgeFilter>('all');

  // Draft state (usato solo dentro il modal, applicato solo al tap su "Applica")
  const [draftMaxPrice, setDraftMaxPrice] = useState<number | null>(null);
  const [draftOnlyAvailable, setDraftOnlyAvailable] = useState(false);
  const [draftSelectedGenres, setDraftSelectedGenres] = useState<Genre[]>([]);
  const [draftAgeFilter, setDraftAgeFilter] = useState<AgeFilter>('all');

  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }

  function toggleGenre(genre: Genre) {
    Haptics.selectionAsync();
    setDraftSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  }

  const today = toDateKey(new Date());
  const hasActiveFilters = maxPrice !== null || onlyAvailable || selectedGenres.length > 0 || ageFilter !== 'all';

  const filteredEvents = applyFilters(events, maxPrice, onlyAvailable, selectedGenres, ageFilter);
  const filteredEventsByDay = getEventsByDayFromList(filteredEvents);

  const isAvailable = (e: (typeof filteredEvents)[number]) =>
    e.ticketTypes.length === 0 || e.ticketTypes.some((t) => t.available > 0);

  const tonightEvent = filteredEvents.find((e) => e.date === today && isAvailable(e)) ?? null;

  const recommended = musicGenres.length > 0
    ? filteredEvents.filter((e) =>
        e.genres.some((g) => (musicGenres as string[]).includes(g)) && isAvailable(e)
      )
    : [];

  const eventsForSelectedDate = selectedDate
    ? applyFilters(
        events.filter((e) => e.date === selectedDate),
        maxPrice, onlyAvailable, selectedGenres, ageFilter
      )
    : null;

  const calendarGrid = getCalendarGrid(calendarMonth.year, calendarMonth.month);

  const now = new Date();
  const isCurrentMonth = calendarMonth.year === now.getFullYear() && calendarMonth.month === now.getMonth();

  function prevMonth() {
    if (isCurrentMonth) return;
    setCalendarMonth((prev) =>
      prev.month === 0 ? { year: prev.year - 1, month: 11 } : { ...prev, month: prev.month - 1 }
    );
  }
  function nextMonth() {
    setCalendarMonth((prev) =>
      prev.month === 11 ? { year: prev.year + 1, month: 0 } : { ...prev, month: prev.month + 1 }
    );
  }

  function selectDate(dateKey: string) {
    Haptics.selectionAsync();
    setSelectedDate(dateKey === selectedDate ? null : dateKey);
    setCalendarOpen(false);
  }

  const selectedDateLabel = selectedDate
    ? (() => {
        const d = new Date(selectedDate + 'T12:00:00');
        return d.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
      })()
    : null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.accentBgMid, 'transparent']}
        style={styles.bgGradient}
        pointerEvents="none"
      />

      <SafeAreaView style={{ flex: 1 }}>

        {/* ── Modal città ── */}
        <Modal visible={cityModalOpen} transparent animationType="slide">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCityModalOpen(false)}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>{t('home.city_modal_title')}</Text>
              {CITIES.map((city) => (
                <TouchableOpacity
                  key={city.id}
                  style={[styles.cityRowItem, selectedCity.id === city.id && styles.cityRowItemActive]}
                  activeOpacity={city.available ? 0.8 : 1}
                  onPress={() => {
                    if (!city.available) return;
                    setSelectedCity(city);
                    setCityModalOpen(false);
                  }}
                >
                  <View style={styles.cityLeft}>
                    <Ionicons name="location-sharp" size={16} color={city.available ? Colors.accent : Colors.textMuted} />
                    <Text style={[styles.cityName, !city.available && styles.cityNameMuted]}>{city.name}</Text>
                    {!city.available && (
                      <View style={styles.comingSoonBadge}>
                        <Text style={styles.comingSoonText}>{t('common.coming_soon')}</Text>
                      </View>
                    )}
                  </View>
                  {selectedCity.id === city.id && <Ionicons name="checkmark" size={18} color={Colors.accent} />}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* ── Modal calendario (bottom sheet grande) ── */}
        <Modal visible={calendarOpen} transparent animationType="slide">
          <TouchableOpacity style={styles.calOverlay} activeOpacity={1} onPress={() => setCalendarOpen(false)}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={styles.calSheet}>
                <View style={styles.calHandleRow}>
                  <View style={styles.calHandle} />
                </View>

                {/* Navigazione mese */}
                <View style={styles.calHeader}>
                  <TouchableOpacity onPress={prevMonth} style={[styles.calNavBtn, isCurrentMonth && styles.calNavBtnDisabled]} disabled={isCurrentMonth}>
                    <Ionicons name="chevron-back" size={20} color={isCurrentMonth ? Colors.border : Colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.calMonthLabel}>
                    {new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
                  </Text>
                  <TouchableOpacity onPress={nextMonth} style={styles.calNavBtn}>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                {/* Intestazioni giorni */}
                <View style={styles.calDayHeaders}>
                  {DAY_LABELS.map((d, i) => (
                    <Text key={i} style={styles.calDayHeader}>{d}</Text>
                  ))}
                </View>

                {/* Griglia giorni */}
                {calendarGrid.map((week, wi) => (
                  <View key={wi} style={styles.calWeekRow}>
                    {week.map(({ date, isCurrentMonth }, di) => {
                      const key = toDateKey(date);
                      const isSelected = key === selectedDate;
                      const isToday = key === today;
                      const hasEvents = eventDateSet.has(key) && isCurrentMonth;
                      return (
                        <TouchableOpacity
                          key={di}
                          style={[
                            styles.calDay,
                            isSelected && styles.calDaySelected,
                            isToday && !isSelected && styles.calDayToday,
                          ]}
                          onPress={() => isCurrentMonth && selectDate(key)}
                          activeOpacity={isCurrentMonth ? 0.7 : 1}
                        >
                          <Text style={[
                            styles.calDayText,
                            !isCurrentMonth && styles.calDayTextOther,
                            isSelected && styles.calDayTextSelected,
                            isToday && !isSelected && styles.calDayTextToday,
                          ]}>
                            {date.getDate()}
                          </Text>
                          {hasEvents && (
                            <View style={[styles.calDot, isSelected && styles.calDotSelected]} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}

                {selectedDate && (
                  <TouchableOpacity
                    style={styles.calClearBtn}
                    onPress={() => { setSelectedDate(null); setCalendarOpen(false); }}
                  >
                    <Ionicons name="close-circle-outline" size={16} color={Colors.accent} />
                    <Text style={styles.calClearText}>{t('home.calendar_clear_date')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* ── Modal filtri (bottom sheet) ── */}
        <Modal visible={filterOpen} transparent animationType="slide">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFilterOpen(false)}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={styles.filterSheet}>
                <View style={styles.filterHandleRow}>
                  <View style={styles.modalHandle} />
                </View>
                <View style={styles.filterTitleRow}>
                  <Text style={styles.filterTitle}>{t('home.filter_title')}</Text>
                  {(draftMaxPrice !== null || draftOnlyAvailable || draftSelectedGenres.length > 0 || draftAgeFilter !== 'all') && (
                    <TouchableOpacity onPress={() => {
                      setDraftMaxPrice(null);
                      setDraftOnlyAvailable(false);
                      setDraftSelectedGenres([]);
                      setDraftAgeFilter('all');
                    }}>
                      <Text style={styles.filterReset}>{t('home.filter_reset')}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Prezzo massimo */}
                <Text style={styles.filterLabel}>{t('home.filter_max_price')}</Text>
                <View style={styles.priceRow}>
                  {MAX_PRICE_OPTIONS_VALUES.map((val, idx) => {
                    const label = val === null ? t('home.filter_price_all') : MAX_PRICE_OPTION_LABELS[idx - 1];
                    return (
                      <TouchableOpacity
                        key={String(val)}
                        style={[styles.priceChip, draftMaxPrice === val && styles.priceChipActive]}
                        onPress={() => { Haptics.selectionAsync(); setDraftMaxPrice(val); }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.priceChipText, draftMaxPrice === val && styles.priceChipTextActive]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Solo disponibili */}
                <View style={styles.toggleRow}>
                  <View>
                    <Text style={styles.toggleLabel}>{t('home.filter_only_available')}</Text>
                    <Text style={styles.toggleSub}>{t('home.filter_only_available_sub')}</Text>
                  </View>
                  <Switch
                    value={draftOnlyAvailable}
                    onValueChange={(v) => { Haptics.selectionAsync(); setDraftOnlyAvailable(v); }}
                    trackColor={{ false: Colors.border, true: Colors.accent }}
                    thumbColor={Colors.white}
                  />
                </View>

                {/* Età */}
                <Text style={[styles.filterLabel, { marginTop: 16 }]}>{t('home.filter_age')}</Text>
                <View style={styles.priceRow}>
                  {([
                    { label: t('home.filter_age_all'), value: 'all' },
                    { label: t('home.filter_age_adult'), value: 'adult' },
                    { label: t('home.filter_age_minor'), value: 'minor' },
                  ] as { label: string; value: AgeFilter }[]).map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.priceChip, draftAgeFilter === opt.value && styles.priceChipActive]}
                      onPress={() => { Haptics.selectionAsync(); setDraftAgeFilter(opt.value); }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.priceChipText, draftAgeFilter === opt.value && styles.priceChipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Generi */}
                <Text style={[styles.filterLabel, { marginTop: 16 }]}>{t('home.filter_genres')}</Text>
                <View style={styles.genreGrid}>
                  {ALL_GENRES.map((genre) => (
                    <TouchableOpacity
                      key={genre}
                      style={[styles.genreChip, draftSelectedGenres.includes(genre) && styles.genreChipActive]}
                      onPress={() => toggleGenre(genre)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.genreChipText, draftSelectedGenres.includes(genre) && styles.genreChipTextActive]}>
                        {genre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.filterApplyBtn}
                  onPress={() => {
                    setMaxPrice(draftMaxPrice);
                    setOnlyAvailable(draftOnlyAvailable);
                    setSelectedGenres(draftSelectedGenres);
                    setAgeFilter(draftAgeFilter);
                    setFilterOpen(false);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.filterApplyText}>{t('home.filter_apply')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Image
              source={require('../../assets/logo-cropped.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <TouchableOpacity style={styles.citySelector} onPress={() => setCityModalOpen(true)} activeOpacity={0.8}>
              <Ionicons name="location-sharp" size={12} color={Colors.accent} />
              <Text style={styles.citySelectorText}>{selectedCity.name}</Text>
              <Ionicons name="chevron-down" size={12} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.iconBtn, selectedDate !== null && styles.iconBtnActive]}
              onPress={() => { Haptics.selectionAsync(); setCalendarOpen(true); }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="calendar-outline"
                size={18}
                color={selectedDate !== null ? Colors.white : Colors.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconBtn, hasActiveFilters && styles.iconBtnActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setDraftMaxPrice(maxPrice);
                setDraftOnlyAvailable(onlyAvailable);
                setDraftSelectedGenres([...selectedGenres]);
                setDraftAgeFilter(ageFilter);
                setFilterOpen(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="options-outline"
                size={18}
                color={hasActiveFilters ? Colors.white : Colors.textSecondary}
              />
              {hasActiveFilters && <View style={styles.filterDot} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => { Haptics.selectionAsync(); router.push('/favorites'); }}
              activeOpacity={0.8}
            >
              <Ionicons name="heart-outline" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Date chip attivo */}
        {selectedDateLabel && (
          <View style={styles.dateChipRow}>
            <View style={styles.dateChip}>
              <Ionicons name="calendar" size={12} color={Colors.accent} />
              <Text style={styles.dateChipText}>{selectedDateLabel}</Text>
              <TouchableOpacity onPress={() => setSelectedDate(null)}>
                <Ionicons name="close" size={14} color={Colors.accent} />
              </TouchableOpacity>
            </View>
            {hasActiveFilters && (
              <View style={[styles.dateChip, { marginLeft: 8 }]}>
                <Ionicons name="options" size={12} color={Colors.accent} />
                <Text style={styles.dateChipText}>{t('home.active_filters')}</Text>
              </View>
            )}
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} colors={[Colors.accent]} />
          }
        >
          {eventsLoading ? (
            <HomeSkeletonLoader />
          ) : eventsError ? (
            <View style={styles.errorState}>
              <Ionicons name="cloud-offline-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.errorTitle}>{t('home.error_no_connection')}</Text>
              <Text style={styles.errorSub}>{t('home.error_no_connection_sub')}</Text>
              <TouchableOpacity style={styles.errorBtn} onPress={onRefresh} activeOpacity={0.8}>
                <Ionicons name="refresh" size={15} color={Colors.white} />
                <Text style={styles.errorBtnText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : eventsForSelectedDate !== null ? (
            <View>
              <Text style={styles.sectionTitle}>
                {eventsForSelectedDate.length} {eventsForSelectedDate.length === 1 ? t('home.events_count_on_date') : t('home.events_count_on_date_plural')} — {selectedDateLabel}
              </Text>
              {eventsForSelectedDate.length === 0 ? (
                <View style={styles.noResults}>
                  <Ionicons name="calendar-outline" size={40} color={Colors.textMuted} />
                  <Text style={styles.noResultsText}>{t('home.no_events_found')}</Text>
                  <Text style={styles.noResultsSub}>{t('home.no_events_change_filters_or_date')}</Text>
                </View>
              ) : (
                eventsForSelectedDate.map((event) => <EventListItem key={event.id} event={event} />)
              )}
            </View>
          ) : (
            <>
              {/* Stasera */}
              {tonightEvent && (
                <>
                  <Text style={styles.sectionTitle}>{t('home.section_tonight')}</Text>
                  <TonightHero event={tonightEvent} />
                </>
              )}

              {/* Carousel contestuale: "Per te" se ha generi, "In evidenza" altrimenti */}
              {recommended.length > 0 ? (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitleInline}>{t('home.section_for_you')}</Text>
                    <View style={styles.forYouBadge}>
                      <Ionicons name="sparkles" size={12} color={Colors.accent} />
                      <Text style={styles.forYouText}>
                        {musicGenres.slice(0, 2).join(' · ')}
                      </Text>
                    </View>
                  </View>
                  <FlatList
                    data={recommended}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <EventCard event={item} />}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.carouselContainer}
                    snapToInterval={CARD_WIDTH + 14}
                    decelerationRate="fast"
                  />
                </>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>{t('home.section_featured')}</Text>
                  <FlatList
                    data={filteredEvents.slice(0, 5)}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <EventCard event={item} />}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.carouselContainer}
                    snapToInterval={CARD_WIDTH + 14}
                    decelerationRate="fast"
                  />
                </>
              )}

              {/* Prossimi eventi */}
              <Text style={[styles.sectionTitle, styles.sectionSpacing, { marginTop: 28 }]}>{t('home.section_upcoming')}</Text>
              {filteredEventsByDay.length === 0 ? (
                <View style={styles.noResults}>
                  <Ionicons name="search-outline" size={40} color={Colors.textMuted} />
                  <Text style={styles.noResultsText}>{t('home.no_events_found')}</Text>
                  <Text style={styles.noResultsSub}>{t('home.no_events_change_filters')}</Text>
                </View>
              ) : (() => {
                const listKey = `${maxPrice}|${onlyAvailable}|${selectedGenres.join(',')}|${ageFilter}`;
                let animIdx = 0;
                return filteredEventsByDay.map(({ day, label, events: dayEvents }) => (
                  <View key={day} style={styles.dayGroup}>
                    <View style={styles.dayHeader}>
                      <Text style={styles.dayLabel}>{label}</Text>
                      <View style={styles.dayLine} />
                    </View>
                    {dayEvents.map((event) => {
                      const idx = animIdx++;
                      return (
                        <AnimatedListItem key={`${listKey}-${event.id}`} index={idx}>
                          <EventListItem event={event} />
                        </AnimatedListItem>
                      );
                    })}
                  </View>
                ));
              })()}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  bgGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
  scroll: { paddingBottom: 120 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10,
  },
  headerLogo: { width: 90, height: 26, marginBottom: 8 },
  citySelector: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  citySelectorText: { fontSize: 13, fontFamily: Font.semiBold, color: Colors.textSecondary },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: 'rgba(168,85,247,0.35)',
    justifyContent: 'center', alignItems: 'center',
  },
  iconBtnActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterDot: {
    position: 'absolute', top: 7, right: 7,
    width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.white,
  },

  // Date chip
  dateChipRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10 },
  dateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: Colors.accentBg, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.accentBorder,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  dateChipText: { fontSize: 13, fontFamily: Font.semiBold, color: Colors.accent },

  // No results
  noResults: { alignItems: 'center', paddingTop: 48, gap: 10 },
  noResultsText: { fontSize: 15, fontFamily: Font.bold, color: Colors.textMuted },
  noResultsSub: { fontSize: 13, color: Colors.textMuted },

  // Sections
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 14,
  },
  sectionTitleInline: { fontSize: 18, fontFamily: Font.extraBold, color: Colors.textPrimary },
  sectionTitle: { fontSize: 18, fontFamily: Font.extraBold, color: Colors.textPrimary, paddingHorizontal: 20, marginBottom: 14 },
  forYouBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.accentBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  forYouText: { fontSize: 11, fontFamily: Font.semiBold, color: Colors.accent },
  sectionSpacing: { marginTop: 28 },
  carouselContainer: { paddingLeft: 20, paddingRight: 6 },
  dayGroup: { paddingHorizontal: 20, marginBottom: 8 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dayLabel: {
    fontSize: 12, fontFamily: Font.extraBold, color: Colors.accent,
    marginRight: 10, textTransform: 'uppercase', letterSpacing: 1.2,
  },
  dayLine: { flex: 1, height: 1, backgroundColor: Colors.border },

  // City modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: Colors.overlay },
  modalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: Colors.border, padding: 24, paddingBottom: 48,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontFamily: Font.bold, color: Colors.textPrimary, marginBottom: 16 },
  cityRowItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, marginBottom: 6,
    backgroundColor: Colors.surfaceElevated,
  },
  cityRowItemActive: { borderWidth: 1, borderColor: Colors.accent },
  cityLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cityName: { fontSize: 15, fontFamily: Font.semiBold, color: Colors.textPrimary },
  cityNameMuted: { color: Colors.textMuted },
  comingSoonBadge: { backgroundColor: Colors.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  comingSoonText: { fontSize: 10, fontFamily: Font.semiBold, color: Colors.textMuted },

  // Calendario bottom sheet
  calOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: Colors.overlay },
  calSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 20, paddingBottom: 40,
  },
  calHandleRow: { alignItems: 'center', paddingVertical: 12 },
  calHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  calNavBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 10, backgroundColor: Colors.surfaceElevated },
  calNavBtnDisabled: { opacity: 0.4 },
  calMonthLabel: { fontSize: 18, fontFamily: Font.bold, color: Colors.textPrimary },
  calDayHeaders: { flexDirection: 'row', marginBottom: 8 },
  calDayHeader: {
    flex: 1, textAlign: 'center', fontSize: 12,
    fontFamily: Font.semiBold, color: Colors.textMuted, textTransform: 'uppercase', paddingVertical: 4,
  },
  calWeekRow: { flexDirection: 'row', marginBottom: 4 },
  calDay: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  calDaySelected: { backgroundColor: Colors.accent },
  calDayToday: { borderWidth: 1.5, borderColor: Colors.accent },
  calDayText: { fontSize: 15, fontFamily: Font.medium, color: Colors.textPrimary },
  calDayTextOther: { color: Colors.border },
  calDayTextSelected: { color: Colors.white, fontFamily: Font.bold },
  calDayTextToday: { color: Colors.accent, fontFamily: Font.bold },
  calDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.accent, marginTop: 3 },
  calDotSelected: { backgroundColor: Colors.white },
  calClearBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, marginTop: 8,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  calClearText: { fontSize: 14, fontFamily: Font.semiBold, color: Colors.accent },

  // Filter bottom sheet
  filterSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 20, paddingBottom: 40,
  },
  filterHandleRow: { alignItems: 'center', paddingVertical: 12 },
  filterTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  filterTitle: { fontSize: 18, fontFamily: Font.bold, color: Colors.textPrimary },
  filterReset: { fontSize: 14, fontFamily: Font.semiBold, color: Colors.accent },
  filterLabel: {
    fontSize: 11, fontFamily: Font.semiBold, color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },
  priceRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  priceChip: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceElevated,
  },
  priceChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  priceChipText: { fontSize: 13, fontFamily: Font.semiBold, color: Colors.textMuted },
  priceChipTextActive: { color: Colors.white },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  toggleLabel: { fontSize: 14, fontFamily: Font.semiBold, color: Colors.textPrimary },
  toggleSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  genreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  genreChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.accentBorder, backgroundColor: Colors.accentBg,
  },
  genreChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  genreChipText: { fontSize: 13, fontFamily: Font.semiBold, color: Colors.accent },
  genreChipTextActive: { color: Colors.white },
  filterApplyBtn: {
    backgroundColor: Colors.accent, borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  filterApplyText: { fontSize: 15, fontFamily: Font.bold, color: Colors.white },

  // Error state
  errorState: {
    alignItems: 'center', paddingTop: 80, paddingHorizontal: 40, gap: 10,
  },
  errorTitle: { fontSize: 18, fontFamily: Font.bold, color: Colors.textPrimary, marginTop: 8 },
  errorSub: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  errorBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.accent, borderRadius: 14,
    paddingHorizontal: 22, paddingVertical: 12, marginTop: 16,
  },
  errorBtnText: { fontSize: 14, fontFamily: Font.bold, color: Colors.white },
});
