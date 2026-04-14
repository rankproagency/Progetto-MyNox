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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { Font } from '../../constants/typography';
import EventCard from '../../components/EventCard';
import EventListItem from '../../components/EventListItem';
import TonightHero from '../../components/TonightHero';
import { ALL_GENRES } from '../../constants/genres';
import { useEvents } from '../../contexts/EventsContext';
import { useAuth } from '../../contexts/AuthContext';
import { Event, Genre } from '../../types';
import AppHeader from '../../components/AppHeader';

const CARD_WIDTH = Math.round(RNDimensions.get('window').width * 0.78);

const CITIES = [
  { id: 'padova', name: 'Padova', available: true },
  { id: 'venezia', name: 'Venezia', available: false },
  { id: 'verona', name: 'Verona', available: false },
  { id: 'milano', name: 'Milano', available: false },
  { id: 'roma', name: 'Roma', available: false },
];

const MONTH_NAMES = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const DAY_LABELS = ['L','M','M','G','V','S','D'];

const MAX_PRICE_OPTIONS = [
  { label: 'Tutti', value: null },
  { label: '≤ €10', value: 10 },
  { label: '≤ €15', value: 15 },
  { label: '≤ €20', value: 20 },
];

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

function applyFilters(
  events: Event[],
  maxPrice: number | null,
  onlyAvailable: boolean,
  selectedGenres: Genre[]
): Event[] {
  return events.filter((e) => {
    if (onlyAvailable && e.ticketTypes.every((t) => t.available === 0)) return false;
    if (maxPrice !== null) {
      const minPrice = Math.min(...e.ticketTypes.map((t) => t.price));
      if (minPrice > maxPrice) return false;
    }
    if (selectedGenres.length > 0 && !selectedGenres.some((g) => e.genres.includes(g))) return false;
    return true;
  });
}

function getEventsByDayFromList(events: ReturnType<typeof useEvents>['events']) {
  const groups: Record<string, typeof events> = {};
  for (const event of events) {
    if (!groups[event.date]) groups[event.date] = [];
    groups[event.date].push(event);
  }
  const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  const MONTH_NAMES = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, evs]) => {
      const d = new Date(date);
      const label = `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
      return { day: date, label, events: evs };
    });
}

export default function HomeScreen() {
  const router = useRouter();
  const { musicGenres } = useAuth();
  const { events, isLoading: eventsLoading } = useEvents();

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

  // Filter state
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>([]);

  const [refreshing, setRefreshing] = useState(false);

  function onRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }

  function toggleGenre(genre: Genre) {
    Haptics.selectionAsync();
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  }

  const hasActiveFilters = maxPrice !== null || onlyAvailable || selectedGenres.length > 0;

  const tonightEvent = events.find((e) => e.date === today && e.ticketTypes.some((t) => t.available > 0)) ?? null;

  const recommended = musicGenres.length > 0
    ? events.filter((e) =>
        e.genres.some((g) => (musicGenres as string[]).includes(g)) &&
        e.ticketTypes.some((t) => t.available > 0)
      )
    : [];

  const eventsForSelectedDate = selectedDate
    ? applyFilters(
        events.filter((e) => e.date === selectedDate),
        maxPrice, onlyAvailable, selectedGenres
      )
    : null;

  const calendarGrid = getCalendarGrid(calendarMonth.year, calendarMonth.month);
  const today = toDateKey(new Date());

  function prevMonth() {
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
        return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
      })()
    : null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(168,85,247,0.22)', 'transparent']}
        style={styles.bgGradient}
        pointerEvents="none"
      />

      <SafeAreaView style={{ flex: 1 }}>

        {/* ── Modal città ── */}
        <Modal visible={cityModalOpen} transparent animationType="slide">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCityModalOpen(false)}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Scegli la città</Text>
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
                        <Text style={styles.comingSoonText}>Presto</Text>
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
                  <TouchableOpacity onPress={prevMonth} style={styles.calNavBtn}>
                    <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.calMonthLabel}>
                    {MONTH_NAMES[calendarMonth.month]} {calendarMonth.year}
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
                    <Text style={styles.calClearText}>Rimuovi filtro data</Text>
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
                  <Text style={styles.filterTitle}>Filtra eventi</Text>
                  {hasActiveFilters && (
                    <TouchableOpacity onPress={() => {
                      setMaxPrice(null);
                      setOnlyAvailable(false);
                      setSelectedGenres([]);
                    }}>
                      <Text style={styles.filterReset}>Azzera</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Prezzo massimo */}
                <Text style={styles.filterLabel}>Prezzo massimo</Text>
                <View style={styles.priceRow}>
                  {MAX_PRICE_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={String(opt.value)}
                      style={[styles.priceChip, maxPrice === opt.value && styles.priceChipActive]}
                      onPress={() => { Haptics.selectionAsync(); setMaxPrice(opt.value); }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.priceChipText, maxPrice === opt.value && styles.priceChipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Solo disponibili */}
                <View style={styles.toggleRow}>
                  <View>
                    <Text style={styles.toggleLabel}>Solo disponibili</Text>
                    <Text style={styles.toggleSub}>Nasconde eventi esauriti</Text>
                  </View>
                  <Switch
                    value={onlyAvailable}
                    onValueChange={(v) => { Haptics.selectionAsync(); setOnlyAvailable(v); }}
                    trackColor={{ false: Colors.border, true: Colors.accent }}
                    thumbColor={Colors.white}
                  />
                </View>

                {/* Generi */}
                <Text style={[styles.filterLabel, { marginTop: 8 }]}>Generi</Text>
                <View style={styles.genreGrid}>
                  {ALL_GENRES.map((genre) => (
                    <TouchableOpacity
                      key={genre}
                      style={[styles.genreChip, selectedGenres.includes(genre) && styles.genreChipActive]}
                      onPress={() => toggleGenre(genre)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.genreChipText, selectedGenres.includes(genre) && styles.genreChipTextActive]}>
                        {genre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.filterApplyBtn}
                  onPress={() => setFilterOpen(false)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.filterApplyText}>Applica filtri</Text>
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
              <Ionicons name="chevron-down" size={11} color={Colors.textMuted} />
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
              onPress={() => { Haptics.selectionAsync(); setFilterOpen(true); }}
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
                <Text style={styles.dateChipText}>Filtri attivi</Text>
              </View>
            )}
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} colors={[Colors.accent]} />
          }
        >
          {/* Vista per data selezionata */}
          {eventsForSelectedDate !== null ? (
            <View>
              <Text style={styles.sectionTitle}>
                {eventsForSelectedDate.length} {eventsForSelectedDate.length === 1 ? 'evento' : 'eventi'} — {selectedDateLabel}
              </Text>
              {eventsForSelectedDate.length === 0 ? (
                <View style={styles.noResults}>
                  <Ionicons name="calendar-outline" size={40} color={Colors.textMuted} />
                  <Text style={styles.noResultsText}>Nessun evento trovato</Text>
                  <Text style={styles.noResultsSub}>Prova a cambiare i filtri o la data</Text>
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
                  <Text style={styles.sectionTitle}>Stasera</Text>
                  <TonightHero event={tonightEvent} />
                </>
              )}

              {/* Consigliati per te */}
              {recommended.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitleInline}>Consigliati per te</Text>
                    <View style={styles.forYouBadge}>
                      <Ionicons name="sparkles" size={11} color={Colors.accent} />
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
              )}

              {/* In evidenza */}
              <Text style={[styles.sectionTitle, recommended.length > 0 && styles.sectionSpacing]}>In evidenza</Text>
              <FlatList
                data={events.slice(0, 3)}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <EventCard event={item} />}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselContainer}
                snapToInterval={CARD_WIDTH + 14}
                decelerationRate="fast"
              />

              {/* Questa settimana */}
              <Text style={[styles.sectionTitle, styles.sectionSpacing]}>Questa settimana</Text>
              {eventsByDay.map(({ day, label, events: dayEvents }) => (
                <View key={day} style={styles.dayGroup}>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayLabel}>{label}</Text>
                    <View style={styles.dayLine} />
                  </View>
                  {dayEvents.map((event) => (
                    <EventListItem key={event.id} event={event} />
                  ))}
                </View>
              ))}
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
  scroll: { paddingBottom: 100 },

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
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
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
    backgroundColor: 'rgba(168,85,247,0.1)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)',
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
    backgroundColor: 'rgba(168,85,247,0.1)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
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
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
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
  comingSoonText: { fontSize: 10, fontWeight: '600', color: Colors.textMuted },

  // Calendario bottom sheet
  calOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  calSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 20, paddingBottom: 40,
  },
  calHandleRow: { alignItems: 'center', paddingVertical: 12 },
  calHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  calNavBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 10, backgroundColor: Colors.surfaceElevated },
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
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)', backgroundColor: 'rgba(168,85,247,0.06)',
  },
  genreChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  genreChipText: { fontSize: 13, fontFamily: Font.semiBold, color: Colors.accent },
  genreChipTextActive: { color: Colors.white },
  filterApplyBtn: {
    backgroundColor: Colors.accent, borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  filterApplyText: { fontSize: 15, fontFamily: Font.bold, color: Colors.white },
});
