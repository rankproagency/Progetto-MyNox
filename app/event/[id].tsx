import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
  Dimensions,
  Share,
  Linking,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { Font } from '../../constants/typography';
import { GENRE_CONFIG } from '../../constants/genres';
import { useEvents } from '../../contexts/EventsContext';
import { TicketType, Table, Genre } from '../../types';
import TableMap from '../../components/TableMap';
import { useFavorites } from '../../contexts/FavoritesContext';
import { useWaitlist } from '../../contexts/WaitlistContext';
import { useRecentlyViewed } from '../../contexts/RecentlyViewedContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTickets } from '../../contexts/TicketsContext';
import { scheduleFavoriteReminder, cancelFavoriteReminder } from '../../hooks/useNotifications';

const { width } = Dimensions.get('window');

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isOnWaitlist, addToWaitlist, removeFromWaitlist } = useWaitlist();
  const { addRecentlyViewed } = useRecentlyViewed();
  const { user } = useAuth();
  const { tickets } = useTickets();
  const { events, isLoading, hasError, reload } = useEvents();
  const event = events.find((e) => e.id === id);

  useEffect(() => {
    if (id) addRecentlyViewed(id);
  }, [id]);

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  const scrollRef = useRef<ScrollView>(null);
  const tableNameRef = useRef<View>(null);
  const hasTables = (event?.tables?.length ?? 0) > 0;
  const hasTickets = (event?.ticketTypes?.length ?? 0) > 0;
  const [bookingMode, setBookingMode] = useState<'ticket' | 'table'>(hasTickets ? 'ticket' : 'table');
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [tableName, setTableName] = useState('');
  const [ticketQty, setTicketQty] = useState(1);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [floorPlanModalVisible, setFloorPlanModalVisible] = useState(false);

  function switchMode(mode: 'ticket' | 'table') {
    setBookingMode(mode);
    setSelectedTicket(null);
    setSelectedTable(null);
    setTableName('');
    setTicketQty(1);
  }

  if (isLoading) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Caricamento...</Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Errore di caricamento</Text>
        <TouchableOpacity onPress={reload} style={styles.retryBtn}>
          <Text style={styles.retryText}>Riprova</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Evento non trovato</Text>
      </View>
    );
  }

  const ticketSubtotal = (selectedTicket?.price ?? 0) * ticketQty;
  const tableSubtotal = selectedTable?.deposit ?? 0;
  const total = bookingMode === 'table'
    ? tableSubtotal
    : ticketSubtotal + tableSubtotal;
  const isSoldOut = hasTickets && (event?.ticketTypes.every((t) => t.available === 0) ?? false);
  const isEventPast = (() => {
    const cutoff = new Date(event.date);
    if (event.endTime) {
      const [hh, mm] = event.endTime.split(':').map(Number);
      if (hh < 12) cutoff.setDate(cutoff.getDate() + 1);
      cutoff.setHours(hh, mm, 0, 0);
    } else {
      cutoff.setDate(cutoff.getDate() + 1);
      cutoff.setHours(12, 0, 0, 0);
    }
    return new Date() > cutoff;
  })();
  const onWaitlist = event ? isOnWaitlist(event.id) : false;
  const soldPercent = event.capacity > 0 ? Math.round((event.ticketsSold / event.capacity) * 100) : 0;
  const remaining = event.capacity > 0 ? event.capacity - event.ticketsSold : 0;
  const isLowStock = soldPercent >= 80;
  const isMediumStock = soldPercent >= 50 && soldPercent < 80;
  const showScarcity = hasTickets && !isSoldOut;

  async function handleShare() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const e = event!;
    const dateStr = new Date(e.date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
    await Share.share({
      message:
        `MYNOX ✦\n\n` +
        `Vieni con me a questa serata.\n\n` +
        `${e.name.toUpperCase()}\n` +
        `📍 ${e.club?.name}  ·  ${dateStr}  ·  ${e.startTime}\n\n` +
        `Compra il biglietto su MyNox.`,
      title: e.name,
    });
  }

  return (
    <>
      {/* Modal immagine fullscreen — fuori dal KAV per evitare interferenze touch */}
      <Modal visible={imageModalVisible} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.imageModal}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setImageModalVisible(false)} />
          <Image source={{ uri: event.imageUrl }} style={styles.imageModalImg} resizeMode="contain" />
          <TouchableOpacity style={styles.imageModalClose} onPress={() => setImageModalVisible(false)} activeOpacity={0.8}>
            <Ionicons name="close" size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Modal piantina fullscreen — fuori dal KAV per evitare interferenze touch */}
      <Modal visible={floorPlanModalVisible} transparent animationType="slide" statusBarTranslucent>
        <View style={styles.floorModal}>
          <View style={[styles.floorModalHeader, { paddingTop: insets.top }]}>
            <View style={styles.floorModalHeaderInner}>
              <View>
                <Text style={styles.floorModalTitle}>Seleziona il tuo tavolo</Text>
                <Text style={styles.floorModalSub}>{event.club?.name}</Text>
              </View>
              <TouchableOpacity style={styles.floorModalClose} onPress={() => setFloorPlanModalVisible(false)} activeOpacity={0.8}>
                <Ionicons name="close" size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.floorModalScrollView}
            contentContainerStyle={styles.floorModalScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.floorModalMap}>
              <TableMap
                tables={event.tables}
                selected={selectedTable}
                onSelect={(t) => {
                  setSelectedTable(t);
                  if (t) setFloorPlanModalVisible(false);
                }}
                floorPlanUrl={event.floorPlanUrl}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >

      {/* Header sticky — sempre visibile sopra lo scroll */}
      <SafeAreaView style={styles.stickyHeader} pointerEvents="box-none">
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.heroTopRight}>
          <TouchableOpacity style={styles.heroIconBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.heroIconBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const wasAlreadyFavorite = isFavorite(event.id);
              toggleFavorite(event.id);
              if (wasAlreadyFavorite) {
                cancelFavoriteReminder(event.id).catch(() => {});
              } else {
                const hasTicket = tickets.some((t) => t.eventId === event.id && t.status !== 'gifted');
                scheduleFavoriteReminder(event.id, event.name, event.club?.name ?? '', event.date, event.startTime, hasTicket).catch(() => {});
              }
            }}
          >
            <Ionicons
              name={isFavorite(event.id) ? 'heart' : 'heart-outline'}
              size={20}
              color={isFavorite(event.id) ? Colors.accent : Colors.textPrimary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.heroIconBtn}
            onPress={() => { Haptics.selectionAsync(); setImageModalVisible(true); }}
            activeOpacity={0.8}
          >
            <Ionicons name="expand-outline" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Hero */}
        <View style={styles.hero}>
          <Image source={{ uri: event.imageUrl }} style={styles.heroImage} resizeMode="cover" />
          <LinearGradient
            colors={['rgba(7,8,15,0.1)', 'transparent', 'rgba(7,8,15,0.6)', 'rgba(7,8,15,0.97)']}
            locations={[0, 0.3, 0.65, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroBottom}>

            {/* Nome evento */}
            <Text style={styles.eventName}>{event.name}</Text>

            {/* Club + indirizzo */}
            <View style={styles.heroClubBlock}>
              <TouchableOpacity activeOpacity={0.75} onPress={() => router.push(`/club/${event.clubId}`)}>
                <Text style={styles.clubName}>{event.club?.name}</Text>
              </TouchableOpacity>
              {event.club?.address && (
                <TouchableOpacity
                  style={styles.heroAddressRow}
                  activeOpacity={0.75}
                  onPress={() => {
                    const query = encodeURIComponent(event.club!.address);
                    Linking.openURL(`https://maps.apple.com/?q=${query}`);
                  }}
                >
                  <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.heroAddressText}>{event.club.address}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Data · orario · dress code · età */}
            <View style={styles.heroMeta}>
              <Text style={styles.heroMetaText}>{formatDate(event.date)}</Text>
              <Text style={styles.heroMetaDot}>·</Text>
              <Text style={styles.heroMetaText}>
                {event.endTime ? `${event.startTime} – ${event.endTime}` : event.startTime}
              </Text>
              <Text style={styles.heroMetaDot}>·</Text>
              <Text style={styles.heroMetaText}>{event.dressCode}</Text>
              <Text style={styles.heroMetaDot}>·</Text>
              <Text style={[styles.heroMetaText, event.minAge < 18 && { color: Colors.warning }]}>
                {event.minAge}+
              </Text>
            </View>

            {/* Generi — dentro l'hero, zero gap */}
            {event.genres.length > 0 && (
              <View style={styles.heroGenres}>
                {event.genres.map((g) => {
                  const cfg = GENRE_CONFIG[g as Genre];
                  const bg = cfg ? cfg.color.replace(/[\d.]+\)$/, '0.10)') : Colors.accentBg;
                  const border = cfg ? cfg.color.replace(/[\d.]+\)$/, '0.35)') : Colors.accentBorder;
                  const text = cfg ? cfg.color.replace(/[\d.]+\)$/, '1)') : Colors.accent;
                  return (
                    <View key={g} style={[styles.heroGenreTag, { backgroundColor: bg, borderColor: border }]}>
                      <Text style={[styles.heroGenreTagText, { color: text }]}>{g}</Text>
                    </View>
                  );
                })}
              </View>
            )}

          </View>
        </View>

        {/* Contenuto principale — non renderizzato se vuoto */}
        {(!!event.description || event.lineup.length > 0 || (event.performers?.length ?? 0) > 0) && (
          <View style={styles.content}>

            {/* Descrizione */}
            {!!event.description && (
              <Text style={styles.descriptionText}>{event.description}</Text>
            )}

            {/* Lineup */}
            {event.lineup.length > 0 && (
              <>
                {!!event.description && <View style={styles.divider} />}
                <Text style={styles.blockLabel}>Lineup</Text>
                {event.lineup.map((artist, i) => (
                  <View key={artist.name} style={[styles.lineupRow, i > 0 && styles.lineupRowBorder]}>
                    <View style={styles.lineupDot} />
                    <Text style={styles.lineupTime}>{artist.time}</Text>
                    <Text style={styles.lineupName}>{artist.name}</Text>
                  </View>
                ))}
              </>
            )}

            {/* Performers */}
            {(event.performers?.length ?? 0) > 0 && (
              <>
                <View style={styles.divider} />
                <View style={styles.performersGrid}>
                  {event.performers.map((p, i) => (
                    <View key={i} style={styles.performerChip}>
                      <View style={[styles.performerBadge, p.role === 'vocalist' && styles.performerBadgeVocalist]}>
                        <Text style={[styles.performerBadgeText, p.role === 'vocalist' && styles.performerBadgeTextVocalist]}>
                          {p.role === 'dj' ? 'DJ' : 'VOCALIST'}
                        </Text>
                      </View>
                      <Text style={styles.performerName}>{p.name}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

          </View>
        )}

        {/* Separatore zona acquisto */}
        <View style={styles.bookingDivider} />

        {/* Prevendita / Tavolo */}
        <View style={styles.bookingSection}>
          {isEventPast ? (
            <View style={styles.soldOutBox}>
              <Ionicons name="time-outline" size={20} color={Colors.textMuted} />
              <Text style={[styles.soldOutText, { color: Colors.textMuted }]}>Evento concluso</Text>
            </View>
          ) : !hasTickets && !hasTables ? (
            <View style={styles.soldOutBox}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.accent} />
              <Text style={[styles.soldOutText, { color: Colors.accent }]}>Ingresso libero — nessuna prevendita</Text>
            </View>
          ) : isSoldOut ? (
            <View style={styles.soldOutBox}>
              <Ionicons name="close-circle" size={20} color={Colors.error} />
              <Text style={styles.soldOutText}>Evento esaurito</Text>
            </View>
          ) : (
            <>
              {/* Segment control — solo se ci sono tavoli */}
              {hasTables && hasTickets && (
                <View style={styles.bookingToggle}>
                  <TouchableOpacity
                    style={[styles.bookingToggleBtn, bookingMode === 'ticket' && styles.bookingToggleActive]}
                    onPress={() => { Haptics.selectionAsync(); switchMode('ticket'); }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="ticket-outline" size={15} color={bookingMode === 'ticket' ? Colors.white : Colors.textMuted} />
                    <Text style={[styles.bookingToggleText, bookingMode === 'ticket' && styles.bookingToggleTextActive]}>
                      Prevendita
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.bookingToggleBtn, bookingMode === 'table' && styles.bookingToggleActive]}
                    onPress={() => { Haptics.selectionAsync(); switchMode('table'); }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="grid-outline" size={15} color={bookingMode === 'table' ? Colors.white : Colors.textMuted} />
                    <Text style={[styles.bookingToggleText, bookingMode === 'table' && styles.bookingToggleTextActive]}>
                      Tavolo
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Scarsità — sopra i biglietti, dove crea urgenza */}
              {showScarcity && bookingMode === 'ticket' && (
                <View style={styles.scarcityBox}>
                  {isLowStock || isMediumStock ? (
                    <>
                      <View style={styles.soldRow}>
                        <View style={styles.soldLeft}>
                          <Ionicons name="flame" size={15} color={isLowStock ? '#ef4444' : '#f59e0b'} />
                          <Text style={styles.soldText}>
                            {isLowStock ? (
                              <><Text style={[styles.soldCount, { color: '#ef4444' }]}>Solo {remaining}</Text>{' posti rimasti!'}</>
                            ) : (
                              'Poca disponibilità — affrettati'
                            )}
                          </Text>
                        </View>
                        <Text style={[styles.soldPercent, isLowStock && { color: '#ef4444' }]}>{soldPercent}%</Text>
                      </View>
                      <View style={styles.progressBar}>
                        <LinearGradient
                          colors={isLowStock ? ['#ef4444', '#dc2626'] : ['#f59e0b', '#d97706']}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          style={[styles.progressFill, { width: `${Math.min(soldPercent, 100)}%` }]}
                        />
                      </View>
                    </>
                  ) : (
                    <View style={styles.soldLeft}>
                      <Ionicons name="checkmark-circle-outline" size={15} color={Colors.success} />
                      <Text style={styles.scarcityNeutralText}>Acquista ora, entra senza fila</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Prevendita */}
              {bookingMode === 'ticket' && (
                <>
                  {!hasTables && <Text style={styles.bookingLabel}>Biglietti</Text>}
                  {hasTickets && event.ticketTypes.every((t) => t.includesDrink) && (
                    <View style={styles.drinkBadge}>
                      <Ionicons name="wine-outline" size={13} color={Colors.accent} />
                      <Text style={styles.drinkBadgeText}>Ogni biglietto include 1 free drink</Text>
                    </View>
                  )}
                  {event.ticketTypes.map((ticket) => (
                    <TouchableOpacity
                      key={ticket.id}
                      style={[styles.ticketOption, selectedTicket?.id === ticket.id && styles.ticketSelected]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        if (selectedTicket?.id === ticket.id) {
                          setSelectedTicket(null);
                          setTicketQty(1);
                        } else {
                          setSelectedTicket(ticket);
                          setTicketQty(1);
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.ticketLeft}>
                        <View style={[styles.radio, selectedTicket?.id === ticket.id && styles.radioActive]}>
                          {selectedTicket?.id === ticket.id && <View style={styles.radioDot} />}
                        </View>
                        <Text style={styles.ticketLabel}>{ticket.label}</Text>
                      </View>
                      <View style={styles.ticketRight}>
                        <Text style={styles.ticketPrice}>€{ticket.price}</Text>
                        {ticket.includesDrink && (
                          <Text style={styles.ticketDrink}>+ drink</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                  {selectedTicket && (
                    <View style={styles.qtyRow}>
                      <Text style={styles.qtyLabel}>Quanti biglietti?</Text>
                      <View style={styles.qtyStepper}>
                        <TouchableOpacity
                          style={[styles.qtyBtn, ticketQty <= 1 && styles.qtyBtnDisabled]}
                          onPress={() => setTicketQty((q) => Math.max(1, q - 1))}
                          disabled={ticketQty <= 1}
                        >
                          <Ionicons name="remove" size={18} color={ticketQty <= 1 ? Colors.textMuted : Colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.qtyValue}>{ticketQty}</Text>
                        <TouchableOpacity
                          style={[styles.qtyBtn, ticketQty >= Math.min(selectedTicket.available, 10) && styles.qtyBtnDisabled]}
                          onPress={() => setTicketQty((q) => Math.min(selectedTicket.available, 10, q + 1))}
                          disabled={ticketQty >= Math.min(selectedTicket.available, 10)}
                        >
                          <Ionicons name="add" size={18} color={ticketQty >= Math.min(selectedTicket.available, 10) ? Colors.textMuted : Colors.textPrimary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </>
              )}

              {/* Tavolo */}
              {bookingMode === 'table' && (
                <>
                  <View style={styles.tableSectionHeader}>
                    <Text style={styles.sectionSubtitle}>Solo caparra · il resto si paga in loco</Text>
                    <TouchableOpacity
                      style={styles.expandMapBtn}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFloorPlanModalVisible(true); }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="expand-outline" size={15} color={Colors.accent} />
                      <Text style={styles.expandMapBtnText}>Apri mappa</Text>
                    </TouchableOpacity>
                  </View>
                  <TableMap
                    tables={event.tables}
                    selected={selectedTable}
                    onSelect={(t) => { setSelectedTable(t); if (!t) setTableName(''); }}
                    floorPlanUrl={event.floorPlanUrl}
                  />
                </>
              )}
            </>
          )}
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* CTA sticky */}
      <View style={[styles.ctaContainer, { bottom: keyboardHeight }]}>
        {isEventPast ? (
          <View style={[styles.ctaButton, styles.ctaDisabled]}>
            <Ionicons name="time-outline" size={16} color={Colors.textMuted} />
            <Text style={[styles.ctaText, { color: Colors.textMuted }]}>Evento concluso</Text>
          </View>
        ) : !hasTickets && !hasTables ? null : isSoldOut ? (
          <TouchableOpacity
            style={[styles.ctaButton, onWaitlist && styles.ctaWaitlistActive]}
            activeOpacity={0.85}
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (onWaitlist) {
                removeFromWaitlist(event.id);
              } else {
                await addToWaitlist(event.id, event.name);
              }
            }}
          >
            <Ionicons
              name={onWaitlist ? 'notifications' : 'notifications-outline'}
              size={16}
              color={Colors.white}
            />
            <Text style={styles.ctaText}>
              {onWaitlist ? 'Sei in lista d\'attesa' : 'Avvisami se si libera un posto'}
            </Text>
          </TouchableOpacity>
        ) : (!hasTickets && bookingMode === 'ticket') ? null : (
          <>
            {selectedTable && (
              <View style={styles.tableNameBox}>
                <Ionicons name="bookmark-outline" size={16} color={Colors.accent} />
                <TextInput
                  style={styles.tableNameInput}
                  value={tableName}
                  onChangeText={setTableName}
                  placeholder="Nome tavolo (es. Compleanno Marco)"
                  placeholderTextColor={Colors.textMuted}
                  autoCorrect={false}
                  returnKeyType="done"
                />
              </View>
            )}
            <View style={styles.ctaRow}>
            <View style={styles.ctaInfo}>
              {selectedTicket || selectedTable ? (
                <>
                  <Text style={styles.ctaLabel}>
                    {selectedTable ? selectedTable.label : ticketQty > 1 ? `${ticketQty} biglietti` : 'Totale'}
                  </Text>
                  <Text style={styles.ctaTotal}>€{total}</Text>
                </>
              ) : (
                <Text style={styles.ctaHint}>
                  {bookingMode === 'ticket'
                    ? 'Seleziona un biglietto'
                    : 'Seleziona un tavolo'}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.ctaButton, (!selectedTicket && !selectedTable || (!!selectedTable && !tableName.trim())) && styles.ctaDisabled]}
              activeOpacity={0.85}
              disabled={!selectedTicket && !selectedTable || (!!selectedTable && !tableName.trim())}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                if (!user) {
                  Alert.alert(
                    'Accedi per continuare',
                    'Devi essere autenticato per acquistare un biglietto.',
                    [
                      { text: 'Annulla', style: 'cancel' },
                      { text: 'Accedi', onPress: () => router.push('/login') },
                    ]
                  );
                  return;
                }
                router.push({
                  pathname: '/checkout',
                  params: {
                    eventId: event.id,
                    ticketId: selectedTicket?.id ?? '',
                    tableId: selectedTable?.id ?? '',
                    tableName: tableName.trim(),
                    qty: String(ticketQty),
                  },
                });
              }}
            >
              <Text style={styles.ctaText}>Compra ora</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.white} />
            </TouchableOpacity>
            </View>
          </>
        )}

      </View>
      </KeyboardAvoidingView>
    </>
  );
}


function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, gap: 14 },
  notFoundText: { color: Colors.textMuted, fontSize: 15, fontFamily: Font.medium },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  retryText: { color: Colors.textPrimary, fontSize: 14, fontFamily: Font.semiBold },
  scroll: { paddingBottom: 120 },

  // Sticky header
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },

  // Hero
  hero: { width, height: 480, position: 'relative' },
  heroImage: { ...StyleSheet.absoluteFillObject },
  heroTopRight: { flexDirection: 'row', gap: 8 },
  backButton: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(7,8,15,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroIconBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(7,8,15,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroBottom: {
    position: 'absolute', bottom: 16, left: 20, right: 20,
  },
  eventName: {
    fontSize: 32, fontFamily: Font.black, color: Colors.white,
    marginBottom: 10, letterSpacing: 0.2, lineHeight: 38,
  },
  heroClubBlock: {
    marginBottom: 12,
  },
  clubName: {
    fontSize: 17, fontFamily: Font.bold, color: Colors.accent, marginBottom: 4,
  },
  heroAddressRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  heroAddressText: {
    fontSize: 13, color: 'rgba(255,255,255,0.55)', fontFamily: Font.regular,
  },
  heroMeta: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6,
    marginBottom: 14,
  },
  heroMetaText: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontFamily: Font.semiBold },
  heroMetaDot: { fontSize: 13, color: 'rgba(255,255,255,0.3)' },
  minAgeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: Colors.accentBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
  },
  minAgeText: {
    fontSize: 12,
    fontFamily: Font.semiBold,
    color: Colors.accent,
  },
  heroGenres: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 7,
  },
  heroGenreTag: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  heroGenreTagText: {
    fontSize: 12, fontFamily: Font.bold,
  },

  // Contenuto principale
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 20,
  },
  blockLabel: {
    fontSize: 11,
    fontFamily: Font.bold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 14,
  },

  // Tags row
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genreTag: {
    backgroundColor: Colors.accentBg,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.accentBorder,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  genreTagText: { fontSize: 12, fontFamily: Font.bold, color: Colors.accent },

  // Description
  descriptionText: {
    fontSize: 14, color: Colors.textSecondary,
    lineHeight: 22,
  },

  // Lineup
  lineupRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12,
  },
  lineupRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  lineupDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.accent,
    flexShrink: 0,
  },
  lineupTime: {
    fontSize: 13, fontFamily: Font.bold, color: Colors.textMuted,
    minWidth: 42,
  },
  lineupName: { fontSize: 14, fontFamily: Font.bold, color: Colors.textPrimary },

  // Performers
  performersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  performerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 9,
  },
  performerBadge: {
    backgroundColor: Colors.accentBg,
    borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2,
  },
  performerBadgeVocalist: { backgroundColor: 'rgba(236,72,153,0.15)' },
  performerBadgeText: { fontSize: 9, fontFamily: Font.extraBold, color: Colors.accent, letterSpacing: 0.5 },
  performerBadgeTextVocalist: { color: '#ec4899' },
  performerName: { fontSize: 13, fontFamily: Font.semiBold, color: Colors.textPrimary },

  // Sold counter
  soldRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8,
  },
  soldLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  soldText: { fontSize: 13, color: Colors.textSecondary },
  soldCount: { fontFamily: Font.bold, color: Colors.textPrimary },
  soldPercent: { fontSize: 12, fontFamily: Font.bold, color: Colors.accent },
  scarcityNeutralText: { fontSize: 13, color: Colors.success, fontFamily: Font.semiBold },
  progressBar: {
    height: 6, borderRadius: 3,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: 3,
  },

  // Separatore zona acquisto
  bookingDivider: {
    marginHorizontal: 20,
    marginTop: 28,
    marginBottom: 28,
    height: 1,
    backgroundColor: Colors.border,
  },

  // Sezione prenotazione
  bookingSection: { paddingHorizontal: 20 },
  bookingLabel: {
    fontSize: 11, fontFamily: Font.bold, color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
  },
  scarcityBox: { marginBottom: 16 },
  drinkBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: Colors.accentBg,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.accentBorder,
    paddingHorizontal: 12, paddingVertical: 9,
    marginBottom: 12,
  },
  drinkBadgeText: { fontSize: 13, fontFamily: Font.semiBold, color: Colors.accent },
  sectionSubtitle: { fontSize: 12, color: Colors.textMuted, marginBottom: 12 },

  // Ticket options
  ticketOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    padding: 14, marginBottom: 8,
  },
  ticketSelected: { borderColor: Colors.accent, backgroundColor: Colors.surfaceElevated },
  ticketDisabled: { opacity: 0.4 },
  noTableOption: { borderColor: Colors.border },
  ticketLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ticketRight: { alignItems: 'flex-end' },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  radioActive: { borderColor: Colors.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.accent },
  ticketLabel: { fontSize: 14, fontFamily: Font.semiBold, color: Colors.textPrimary },
  ticketAvailable: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  ticketPrice: { fontSize: 16, fontFamily: Font.bold, color: Colors.accent },
  ticketDrink: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  soldOut: { fontSize: 11, color: Colors.error, marginTop: 2 },
  disabledText: { color: Colors.textMuted },

  // Qty stepper
  qtyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.accent,
    paddingHorizontal: 16, paddingVertical: 12, marginTop: 4,
  },
  qtyLabel: { fontSize: 14, fontFamily: Font.semiBold, color: Colors.textPrimary },
  qtyStepper: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  qtyBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  qtyBtnDisabled: { borderColor: Colors.border, opacity: 0.4 },
  qtyValue: {
    fontSize: 18, fontFamily: Font.extraBold, color: Colors.textPrimary,
    minWidth: 36, textAlign: 'center',
  },

  bottomPad: { height: 20 },

  // Image modal
  imageModal: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center', alignItems: 'center',
  },
  imageModalImg: { width, height: width * 1.4 },
  imageModalClose: {
    position: 'absolute', top: 56, right: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },

  // CTA
  ctaContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'column',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
    gap: 10,
  },
  ctaRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  ctaInfo: {},
  ctaLabel: { fontSize: 11, color: Colors.textMuted },
  ctaTotal: { fontSize: 20, fontFamily: Font.extraBold, color: Colors.textPrimary },
  ctaHint: { fontSize: 13, color: Colors.textMuted },
  ctaButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.accent,
    borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  ctaDisabled: { backgroundColor: Colors.border },
  ctaWaitlistActive: { backgroundColor: Colors.accentDark },
  ctaText: { fontSize: 15, fontFamily: Font.bold, color: Colors.white },

  // Floor plan modal
  floorModal: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  floorModalHeader: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  floorModalHeaderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  floorModalTitle: {
    fontSize: 16,
    fontFamily: Font.bold,
    color: Colors.textPrimary,
  },
  floorModalSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  floorModalClose: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center', alignItems: 'center',
  },
  floorModalScrollView: {
    flex: 1,
  },
  floorModalScroll: {
    padding: 20,
    paddingBottom: 60,
  },
  floorModalMap: {
    alignItems: 'center',
  },

  // Booking mode toggle
  bookingToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
    marginBottom: 16,
  },
  bookingToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 11,
    borderRadius: 10,
  },
  bookingToggleActive: {
    backgroundColor: Colors.accent,
  },
  bookingToggleText: {
    fontSize: 14,
    fontFamily: Font.semiBold,
    color: Colors.textMuted,
  },
  bookingToggleTextActive: {
    color: Colors.white,
  },

  // Table name input
  tableNameBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  tableNameInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: Font.regular,
  },

  // Table section header
  tableSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  expandMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.accentBg,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    marginTop: 2,
  },
  expandMapBtnText: {
    fontSize: 12,
    fontFamily: Font.semiBold,
    color: Colors.accent,
  },

  // Sold out
  soldOutBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 12, borderWidth: 1, borderColor: Colors.error,
    padding: 14, marginBottom: 4,
  },
  soldOutText: { fontSize: 15, fontFamily: Font.bold, color: Colors.error },
});
