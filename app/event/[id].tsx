import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
import { Image } from 'expo-image';
import { versionedImageUrl } from '../../lib/imageUrl';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { getLocale } from '../../lib/i18n';
import { Colors } from '../../constants/colors';
import { Font } from '../../constants/typography';
import { GENRE_CONFIG } from '../../constants/genres';
import { useEvents } from '../../contexts/EventsContext';
import { TicketType, Table, Genre } from '../../types';
import TableMap from '../../components/TableMap';
import { useFavorites } from '../../contexts/FavoritesContext';
import { useRecentlyViewed } from '../../contexts/RecentlyViewedContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTickets } from '../../contexts/TicketsContext';
import { scheduleFavoriteReminder, cancelFavoriteReminder } from '../../hooks/useNotifications';

const { width } = Dimensions.get('window');

export default function EventScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isFavorite, toggleFavorite } = useFavorites();
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
  const [orderedExtras, setOrderedExtras] = useState<Record<string, number>>({});
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [floorPlanModalVisible, setFloorPlanModalVisible] = useState(false);
  const [extrasModalVisible, setExtrasModalVisible] = useState(false);

  const availableExtras = (event?.extras ?? []).filter((e) => e.isAvailable);
  const extrasDeposit = availableExtras.reduce((sum, e) => sum + (orderedExtras[e.id] ?? 0) * e.deposit, 0);

  function switchMode(mode: 'ticket' | 'table') {
    setBookingMode(mode);
    setSelectedTicket(null);
    setSelectedTable(null);
    setTableName('');
    setTicketQty(1);
    setOrderedExtras({});
  }

  if (isLoading) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>{t('event.loading')}</Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>{t('event.load_error')}</Text>
        <TouchableOpacity onPress={reload} style={styles.retryBtn}>
          <Text style={styles.retryText}>{t('event.retry_btn')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>{t('event.not_found')}</Text>
      </View>
    );
  }

  const ticketSubtotal = (selectedTicket?.price ?? 0) * ticketQty;
  const tableSubtotal = selectedTable?.deposit ?? 0;
  const total = bookingMode === 'table'
    ? tableSubtotal + extrasDeposit
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
  const totalTicketSlots = event.ticketTypes.reduce((sum, t) => sum + t.available, 0) + event.ticketsSold;
  const soldPercent = totalTicketSlots > 0 ? Math.round((event.ticketsSold / totalTicketSlots) * 100) : 0;
  const remaining = totalTicketSlots - event.ticketsSold;
  const isLowStock = soldPercent >= 80;
  const isMediumStock = soldPercent >= 50 && soldPercent < 80;
  const showScarcity = hasTickets && !isSoldOut;

  async function handleShare() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const e = event!;
    const dateStr = new Date(e.date).toLocaleDateString(getLocale(), { weekday: 'short', day: 'numeric', month: 'short' });
    await Share.share({
      message:
        `MYNOX ✦\n\n` +
        `${t('event.share_invite')}\n\n` +
        `${e.name.toUpperCase()}\n` +
        `📍 ${e.club?.name}  ·  ${dateStr}  ·  ${e.startTime}\n\n` +
        `${t('event.share_buy_cta')}`,
      title: e.name,
    });
  }

  return (
    <>
      {/* Modal immagine fullscreen — fuori dal KAV per evitare interferenze touch */}
      <Modal visible={imageModalVisible} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.imageModal}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setImageModalVisible(false)} />
          <Image source={{ uri: versionedImageUrl(event.imageUrl, event.updatedAt) }} style={styles.imageModalImg} contentFit="contain" cachePolicy="memory-disk" />
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
                <Text style={styles.floorModalTitle}>{t('event.floor_plan_modal_title')}</Text>
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

      {/* Modal extras — bottom sheet dopo "Compra ora" */}
      <Modal visible={extrasModalVisible} transparent animationType="slide" statusBarTranslucent>
        <View style={styles.extrasModalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setExtrasModalVisible(false)} />
          <View style={[styles.extrasModalSheet, { paddingBottom: insets.bottom + 16 }]}>
            {/* Handle */}
            <View style={styles.extrasModalHandle} />

            {/* Header */}
            <View style={styles.extrasModalHeader}>
              <View>
                <Text style={styles.extrasModalTitle}>{t('extras.section_title')}</Text>
                <Text style={styles.extrasModalSub}>{selectedTable?.label} · {t('extras.section_subtitle')}</Text>
              </View>
              <TouchableOpacity onPress={() => setExtrasModalVisible(false)} style={styles.extrasModalCloseBtn}>
                <Ionicons name="close" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Lista extras */}
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
              {availableExtras.map((extra) => {
                const qty = orderedExtras[extra.id] ?? 0;
                const effectiveMax = extra.availableStock !== null ? extra.availableStock : 99;
                const isOutOfStock = extra.availableStock !== null && extra.availableStock <= 0;
                const isLowStock = extra.availableStock !== null && extra.availableStock > 0 && extra.availableStock <= 3;
                return (
                  <View key={extra.id} style={[styles.extraRow, isOutOfStock && { opacity: 0.45 }]}>
                    <View style={styles.extraInfo}>
                      <Text style={styles.extraName}>{extra.label}</Text>
                      <Text style={styles.extraPrice}>€{extra.deposit.toFixed(2)} {t('extras.deposit_label')} · {t('extras.rest_in_venue')}</Text>
                      {isOutOfStock && <Text style={styles.extraStockOut}>{t('extras.out_of_stock')}</Text>}
                      {isLowStock && <Text style={styles.extraStockLow}>{extra.availableStock} {t('extras.remaining')}</Text>}
                    </View>
                    <View style={styles.extraQty}>
                      <TouchableOpacity
                        style={[styles.qtyBtn, (qty <= 0 || isOutOfStock) && styles.qtyBtnDisabled]}
                        disabled={qty <= 0 || isOutOfStock}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setOrderedExtras((prev) => ({ ...prev, [extra.id]: Math.max(0, (prev[extra.id] ?? 0) - 1) })); }}
                      >
                        <Ionicons name="remove" size={16} color={qty > 0 && !isOutOfStock ? Colors.accent : Colors.textMuted} />
                      </TouchableOpacity>
                      <Text style={[styles.qtyValue, qty > 0 && { color: Colors.accent }]}>{qty}</Text>
                      <TouchableOpacity
                        style={[styles.qtyBtn, (qty >= effectiveMax || isOutOfStock) && styles.qtyBtnDisabled]}
                        disabled={qty >= effectiveMax || isOutOfStock}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setOrderedExtras((prev) => ({ ...prev, [extra.id]: Math.min(effectiveMax, (prev[extra.id] ?? 0) + 1) })); }}
                      >
                        <Ionicons name="add" size={16} color={qty >= effectiveMax || isOutOfStock ? Colors.textMuted : Colors.accent} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* CTA */}
            <View style={styles.extrasModalCta}>
              {extrasDeposit > 0 && (
                <View style={styles.extrasModalTotal}>
                  <Text style={styles.extrasModalTotalLabel}>{t('extras.deposit_label')}</Text>
                  <Text style={styles.extrasModalTotalAmount}>+€{extrasDeposit.toFixed(2)}</Text>
                </View>
              )}
              <View style={styles.extrasModalBtns}>
                <TouchableOpacity
                  style={styles.extrasModalSkip}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setOrderedExtras({});
                    setExtrasModalVisible(false);
                    router.push({ pathname: '/checkout', params: { eventId: event.id, ticketId: '', tableId: selectedTable?.id ?? '', tableName: tableName.trim(), qty: '1', extras: '' } });
                  }}
                >
                  <Text style={styles.extrasModalSkipText}>{t('extras.skip')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.extrasModalConfirm}
                  activeOpacity={0.85}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    const orderedList = availableExtras.filter((e) => (orderedExtras[e.id] ?? 0) > 0).map((e) => ({ extraId: e.id, label: e.label, quantity: orderedExtras[e.id], unitDeposit: e.deposit }));
                    setExtrasModalVisible(false);
                    router.push({ pathname: '/checkout', params: { eventId: event.id, ticketId: '', tableId: selectedTable?.id ?? '', tableName: tableName.trim(), qty: '1', extras: orderedList.length > 0 ? JSON.stringify(orderedList) : '' } });
                  }}
                >
                  <Text style={styles.extrasModalConfirmText}>{t('extras.confirm')}</Text>
                  <Ionicons name="arrow-forward" size={16} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
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

        {/* Hero — locandina verticale intera */}
        <View style={styles.hero}>
          <Image
            source={{ uri: versionedImageUrl(event.imageUrl, event.updatedAt) }}
            style={styles.heroImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          {/* Gradient: scuro in alto per i pulsanti, fade in basso per la transizione */}
          <LinearGradient
            colors={['rgba(7,8,15,0.6)', 'transparent', 'transparent', 'rgba(7,8,15,0.85)']}
            locations={[0, 0.25, 0.72, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        </View>

        {/* Info evento */}
        <View style={styles.infoSection}>
          <Text style={styles.infoEventName}>{event.name}</Text>

          <TouchableOpacity activeOpacity={0.75} onPress={() => router.push(`/club/${event.clubId}`)}>
            <Text style={styles.infoClubName}>{event.club?.name}</Text>
          </TouchableOpacity>

          {event.club?.address && (
            <TouchableOpacity
              style={styles.infoAddressRow}
              activeOpacity={0.75}
              onPress={() => {
                const query = encodeURIComponent(event.club!.address);
                Linking.openURL(`https://maps.apple.com/?q=${query}`);
              }}
            >
              <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.infoAddressText}>{event.club.address}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.infoMetaRow}>
            <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.infoMetaText}>{formatDate(event.date)}</Text>
            <Text style={styles.infoMetaDot}>·</Text>
            <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.infoMetaText}>
              {event.endTime ? `${event.startTime} – ${event.endTime}` : event.startTime}
            </Text>
            <Text style={styles.infoMetaDot}>·</Text>
            <Text style={styles.infoMetaText}>{event.dressCode}</Text>
            <Text style={styles.infoMetaDot}>·</Text>
            <Text style={[styles.infoMetaText, event.minAge < 18 && { color: Colors.warning }]}>
              {event.minAge}+
            </Text>
          </View>

          {event.genres.length > 0 && (
            <View style={styles.infoGenres}>
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
                <Text style={styles.blockLabel}>{t('event.lineup_label')}</Text>
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
              <Text style={[styles.soldOutText, { color: Colors.textMuted }]}>{t('event.event_ended')}</Text>
            </View>
          ) : !hasTickets && !hasTables ? (
            <View style={styles.soldOutBox}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.accent} />
              <Text style={[styles.soldOutText, { color: Colors.accent }]}>{t('event.free_entry_no_tickets')}</Text>
            </View>
          ) : isSoldOut ? (
            event.doorEntryAvailable ? (
              <View style={styles.doorEntryCard}>
                <View style={styles.doorEntryIconBox}>
                  <Ionicons name="location" size={22} color={Colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.doorEntryTitle}>{t('event.event_sold_out_app_only')}</Text>
                  <Text style={styles.doorEntryBody}>{t('event.event_door_entry_hint')}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.soldOutBox}>
                <Ionicons name="close-circle" size={20} color={Colors.error} />
                <Text style={styles.soldOutText}>{t('event.event_sold_out')}</Text>
              </View>
            )
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
                      {t('event.booking_mode_ticket')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.bookingToggleBtn, bookingMode === 'table' && styles.bookingToggleActive]}
                    onPress={() => { Haptics.selectionAsync(); switchMode('table'); }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="grid-outline" size={15} color={bookingMode === 'table' ? Colors.white : Colors.textMuted} />
                    <Text style={[styles.bookingToggleText, bookingMode === 'table' && styles.bookingToggleTextActive]}>
                      {t('event.booking_mode_table')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Prevendita */}
              {bookingMode === 'ticket' && (
                <>
                  {hasTickets && event.ticketTypes.every((tk) => tk.includesDrink) && (
                    <View style={styles.drinkBadge}>
                      <Ionicons name="wine-outline" size={13} color={Colors.accent} />
                      <Text style={styles.drinkBadgeText}>{t('event.every_ticket_includes_drink')}</Text>
                    </View>
                  )}
                  {/* Scarsità */}
                  {showScarcity && (
                    <View style={styles.scarcityBox}>
                      {isLowStock || isMediumStock ? (
                        <>
                          <View style={styles.soldRow}>
                            <View style={styles.soldLeft}>
                              <Ionicons name="flame" size={15} color={isLowStock ? '#ef4444' : '#f59e0b'} />
                              <Text style={[styles.soldCount, { color: isLowStock ? '#ef4444' : '#f59e0b' }]}>
                                {isLowStock ? t('event.scarcity_low_stock') : t('event.scarcity_medium_stock')}
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
                          <Text style={styles.scarcityNeutralText}>{t('event.scarcity_ok')}</Text>
                        </View>
                      )}
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
                          <Text style={styles.ticketDrink}>{t('event.ticket_drink_extra')}</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                  {selectedTicket && (
                    <View style={styles.qtyRow}>
                      <Text style={styles.qtyLabel}>{t('event.how_many_tickets')}</Text>
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
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sectionSubtitle}>{t('event.table_deposit_only')}</Text>
                      {availableExtras.length > 0 && (
                        <View style={styles.extrasBadgeHint}>
                          <Ionicons name="sparkles-outline" size={11} color={Colors.accent} />
                          <Text style={styles.extrasBadgeHintText}>{t('extras.select_table_hint')}</Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.expandMapBtn}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFloorPlanModalVisible(true); }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="expand-outline" size={15} color={Colors.accent} />
                      <Text style={styles.expandMapBtnText}>{t('event.table_open_map')}</Text>
                    </TouchableOpacity>
                  </View>
                  <TableMap
                    tables={event.tables}
                    selected={selectedTable}
                    onSelect={(tbl) => { setSelectedTable(tbl); if (!tbl) setTableName(''); }}
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
            <Text style={[styles.ctaText, { color: Colors.textMuted }]}>{t('event.event_ended')}</Text>
          </View>
        ) : !hasTickets && !hasTables ? null : isSoldOut ? (
          event.doorEntryAvailable ? (
            <TouchableOpacity
              style={[styles.ctaButton, { backgroundColor: Colors.accent }]}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                const address = event.club?.address;
                const lat = event.club?.latitude;
                const lng = event.club?.longitude;
                const url = lat && lng
                  ? `https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(event.club?.name ?? '')}`
                  : address
                  ? `https://maps.apple.com/?q=${encodeURIComponent(address)}`
                  : null;
                if (url) Linking.openURL(url);
              }}
            >
              <Ionicons name="location-outline" size={16} color={Colors.white} />
              <Text style={styles.ctaText}>{t('event.door_entry_cta')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.ctaButton, styles.ctaDisabled]}>
              <Ionicons name="close-circle-outline" size={16} color={Colors.textMuted} />
              <Text style={[styles.ctaText, { color: Colors.textMuted }]}>{t('event.event_sold_out')}</Text>
            </View>
          )
        ) : (!hasTickets && bookingMode === 'ticket') ? null : (
          <>
            {selectedTable && (
              <View style={styles.tableNameBox}>
                <Ionicons name="bookmark-outline" size={16} color={Colors.accent} />
                <TextInput
                  style={styles.tableNameInput}
                  value={tableName}
                  onChangeText={setTableName}
                  placeholder={t('event.table_name_placeholder')}
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
                    {selectedTable ? selectedTable.label : ticketQty > 1 ? `${ticketQty}${t('event.tickets_count_label')}` : t('event.total_label')}
                  </Text>
                  <Text style={styles.ctaTotal}>€{total}</Text>
                </>
              ) : (
                <Text style={styles.ctaHint}>
                  {bookingMode === 'ticket'
                    ? t('event.select_ticket_hint')
                    : t('event.select_table_hint')}
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
                    t('event.auth_required_title'),
                    t('event.auth_required_body'),
                    [
                      { text: t('common.cancel'), style: 'cancel' },
                      { text: t('event.auth_sign_in_btn'), onPress: () => router.push('/login') },
                    ]
                  );
                  return;
                }
                if (bookingMode === 'table' && selectedTable && availableExtras.length > 0) {
                  setExtrasModalVisible(true);
                  return;
                }
                const orderedList = availableExtras
                  .filter((e) => (orderedExtras[e.id] ?? 0) > 0)
                  .map((e) => ({ extraId: e.id, label: e.label, quantity: orderedExtras[e.id], unitDeposit: e.deposit }));
                router.push({
                  pathname: '/checkout',
                  params: {
                    eventId: event.id,
                    ticketId: selectedTicket?.id ?? '',
                    tableId: selectedTable?.id ?? '',
                    tableName: tableName.trim(),
                    qty: String(ticketQty),
                    extras: orderedList.length > 0 ? JSON.stringify(orderedList) : '',
                  },
                });
              }}
            >
              <Text style={styles.ctaText}>{t('event.buy_now_btn')}</Text>
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
  return new Date(dateStr).toLocaleDateString(getLocale(), { weekday: 'short', day: 'numeric', month: 'short' });
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

  // Hero — locandina portrait
  hero: { width, height: width * 1.35, position: 'relative', backgroundColor: Colors.background },
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

  // Info evento (sotto l'immagine)
  infoSection: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  infoEventName: {
    fontSize: 24, fontFamily: Font.black, color: Colors.white,
    lineHeight: 30, marginBottom: 10, letterSpacing: 0.2,
  },
  infoClubName: {
    fontSize: 17, fontFamily: Font.bold, color: Colors.accent, marginBottom: 6,
  },
  infoAddressRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 14,
  },
  infoAddressText: {
    fontSize: 13, color: Colors.textMuted, fontFamily: Font.regular,
  },
  infoMetaRow: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 14,
  },
  infoMetaText: {
    fontSize: 14, fontFamily: Font.semiBold, color: Colors.textPrimary,
  },
  infoMetaDot: {
    fontSize: 14, color: 'rgba(255,255,255,0.25)',
  },
  infoGenres: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 4,
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
    marginTop: 24,
    marginBottom: 24,
    height: 1,
    backgroundColor: Colors.border,
  },

  // Sezione prenotazione
  bookingSection: { paddingHorizontal: 20 },
  bookingLabel: {
    fontSize: 11, fontFamily: Font.bold, color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
  },
  scarcityBox: { marginBottom: 14, marginTop: 2 },
  drinkBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: Colors.accentBg,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.accentBorder,
    paddingHorizontal: 12, paddingVertical: 9,
    marginBottom: 10,
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
  extrasBadgeHint: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5,
  },
  extrasBadgeHintText: {
    fontSize: 11, color: Colors.accent, fontFamily: Font.semiBold,
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

  // Extras modal
  extrasModalOverlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)',
  },
  extrasModalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 20, paddingTop: 12,
  },
  extrasModalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 16,
  },
  extrasModalHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: 20,
  },
  extrasModalTitle: { fontSize: 18, fontFamily: Font.bold, color: Colors.textPrimary },
  extrasModalSub: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  extrasModalCloseBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center', alignItems: 'center',
  },
  extrasModalCta: { marginTop: 16 },
  extrasModalTotal: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 14,
    backgroundColor: Colors.accentBg,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.accentBorder,
    marginBottom: 12,
  },
  extrasModalTotalLabel: { fontSize: 13, color: Colors.textSecondary },
  extrasModalTotalAmount: { fontSize: 16, fontFamily: Font.bold, color: Colors.accent },
  extrasModalBtns: { flexDirection: 'row', gap: 10 },
  extrasModalSkip: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  extrasModalSkipText: { fontSize: 14, fontFamily: Font.semiBold, color: Colors.textMuted },
  extrasModalConfirm: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  extrasModalConfirmText: { fontSize: 15, fontFamily: Font.bold, color: Colors.white },

  // Extras & Upsell (legacy — non più usato nella pagina)
  extrasSection: { marginTop: 16, paddingBottom: 8 },
  extrasSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  extrasSectionTitle: { fontSize: 14, fontFamily: Font.bold, color: Colors.accent },
  extrasSectionSub: { fontSize: 12, color: Colors.textMuted, marginBottom: 12 },
  extraRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8,
  },
  extraInfo: { flex: 1, marginRight: 12 },
  extraName: { fontSize: 14, fontFamily: Font.semiBold, color: Colors.textPrimary },
  extraPrice: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  extraStockLow: { fontSize: 11, color: '#f59e0b', fontFamily: Font.semiBold, marginTop: 3 },
  extraStockOut: { fontSize: 11, color: Colors.error, fontFamily: Font.semiBold, marginTop: 3 },
  extraQty: { flexDirection: 'row', alignItems: 'center', gap: 0 },

  // Sold out
  soldOutBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 12, borderWidth: 1, borderColor: Colors.error,
    padding: 14, marginBottom: 4,
  },
  soldOutText: { fontSize: 15, fontFamily: Font.bold, color: Colors.error },
  doorEntryCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: Colors.accentBg,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.accentBorder,
    padding: 16, marginBottom: 4,
  },
  doorEntryIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(168,85,247,0.15)',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  doorEntryTitle: {
    fontSize: 15, fontFamily: Font.bold, color: Colors.accent, marginBottom: 5,
  },
  doorEntryBody: {
    fontSize: 13, color: Colors.textSecondary, lineHeight: 20,
  },
});
