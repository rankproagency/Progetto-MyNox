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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { Font } from '../../constants/typography';
import { useEvents } from '../../contexts/EventsContext';
import { TicketType, Table } from '../../types';
import TableMap from '../../components/TableMap';
import { useFavorites } from '../../contexts/FavoritesContext';
import { useWaitlist } from '../../contexts/WaitlistContext';
import { useRecentlyViewed } from '../../contexts/RecentlyViewedContext';

const { width } = Dimensions.get('window');

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isOnWaitlist, addToWaitlist, removeFromWaitlist } = useWaitlist();
  const { addRecentlyViewed } = useRecentlyViewed();
  const { events } = useEvents();
  const event = events.find((e) => e.id === id);

  useEffect(() => {
    if (id) addRecentlyViewed(id);
  }, [id]);
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [ticketQty, setTicketQty] = useState(1);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  if (!event) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Evento non trovato</Text>
      </View>
    );
  }

  const total = (selectedTicket?.price ?? 0) * ticketQty + (selectedTable?.deposit ?? 0);
  const isSoldOut = event?.ticketTypes.every((t) => t.available === 0) ?? false;
  const onWaitlist = event ? isOnWaitlist(event.id) : false;
  const soldPercent = Math.round((event.ticketsSold / event.capacity) * 100);

  async function handleShare() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Share.share({
      message: `Vieni con me a ${event!.name} @ ${event!.club?.name}!\nCompra il biglietto su MyNox`,
      title: event!.name,
    });
  }

  return (
    <View style={styles.container}>

      {/* Modal immagine fullscreen */}
      <Modal visible={imageModalVisible} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.imageModal}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setImageModalVisible(false)} />
          <Image source={{ uri: event.imageUrl }} style={styles.imageModalImg} resizeMode="contain" />
          <TouchableOpacity style={styles.imageModalClose} onPress={() => setImageModalVisible(false)} activeOpacity={0.8}>
            <Ionicons name="close" size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <Image source={{ uri: event.imageUrl }} style={styles.heroImage} resizeMode="cover" />
          <LinearGradient
            colors={['rgba(7,8,15,0.2)', 'transparent', 'rgba(7,8,15,0.75)', 'rgba(7,8,15,0.98)']}
            locations={[0, 0.35, 0.72, 1]}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView style={styles.heroTop}>
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
                  toggleFavorite(event.id);
                }}
              >
                <Ionicons
                  name={isFavorite(event.id) ? 'heart' : 'heart-outline'}
                  size={20}
                  color={isFavorite(event.id) ? Colors.accent : Colors.textPrimary}
                />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
          <View style={styles.heroBottom}>
            <Text style={styles.eventName}>{event.name}</Text>
            <View style={styles.heroBottomRow}>
              <TouchableOpacity onPress={() => router.push(`/club/${event.clubId}`)}>
                <Text style={styles.clubName}>{event.club?.name}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.posterBtn}
                onPress={() => { Haptics.selectionAsync(); setImageModalVisible(true); }}
                activeOpacity={0.8}
              >
                <Ionicons name="expand-outline" size={13} color={Colors.white} />
                <Text style={styles.posterBtnText}>Locandina</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Info rapide */}
        <View style={styles.infoRow}>
          <InfoChip icon="calendar-outline" label={formatDate(event.date)} />
          <InfoChip icon="time-outline" label={event.startTime} />
          <InfoChip icon="people-outline" label={`${event.capacity} cap.`} />
        </View>

        {/* Venue */}
        {event.club?.address && (
          <TouchableOpacity
            style={styles.venueRow}
            activeOpacity={0.8}
            onPress={() => {
              const query = encodeURIComponent(event.club!.address);
              Linking.openURL(`https://maps.apple.com/?q=${query}`);
            }}
          >
            <Ionicons name="location-outline" size={15} color={Colors.accent} />
            <Text style={styles.venueText}>{event.club.address}</Text>
            <View style={styles.mapsBtn}>
              <Text style={styles.mapsBtnText}>Apri</Text>
              <Ionicons name="navigate-outline" size={12} color={Colors.accent} />
            </View>
          </TouchableOpacity>
        )}

        {/* Generi + Dress code */}
        <View style={styles.section}>
          <View style={styles.tagsRow}>
            {event.genres.map((g) => (
              <View key={g} style={styles.genreTag}>
                <Text style={styles.genreTagText}>{g}</Text>
              </View>
            ))}
            <View style={styles.dressCodeChip}>
              <Ionicons name="shirt-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.dressCodeText}> {event.dressCode}</Text>
            </View>
          </View>
        </View>

        {/* Descrizione */}
        {event.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>L'evento</Text>
            <Text style={styles.descriptionText}>{event.description}</Text>
          </View>
        ) : null}

        {/* Lineup */}
        {event.lineup.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lineup</Text>
            <View style={styles.lineupCard}>
              {event.lineup.map((artist, i) => (
                <View key={artist.name} style={[styles.lineupRow, i > 0 && styles.lineupRowBorder]}>
                  <View style={styles.lineupDot} />
                  <Text style={styles.lineupTime}>{artist.time}</Text>
                  <Text style={styles.lineupName}>{artist.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Performers — DJ e Vocalist */}
        {event.performers?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Artisti</Text>
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
          </View>
        )}

        {/* Contatore disponibilità */}
        <View style={styles.section}>
          <View style={styles.soldRow}>
            <View style={styles.soldLeft}>
              <Ionicons name="flame" size={16} color={Colors.accent} />
              {event.ticketsSold > 0 ? (
                <Text style={styles.soldText}>
                  <Text style={styles.soldCount}>{event.ticketsSold}</Text> persone hanno già acquistato
                </Text>
              ) : (
                <Text style={styles.soldText}>
                  <Text style={styles.soldCount}>{event.capacity}</Text> posti disponibili
                </Text>
              )}
            </View>
            <Text style={styles.soldPercent}>
              {event.ticketsSold > 0 ? `${soldPercent}%` : 'Biglietti aperti'}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={['#a855f7', '#ec4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${Math.min(soldPercent, 100)}%` }]}
            />
          </View>
        </View>

        {/* Social & Contatti club */}
        {event.club && (event.club.instagram || event.club.tiktok || event.club.email || event.club.phone) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contatti</Text>
            <View style={styles.contactCard}>
              <View style={styles.socialRow}>
                {event.club.instagram && (
                  <TouchableOpacity
                    style={styles.socialBtn}
                    onPress={() => Linking.openURL(`https://instagram.com/${event.club!.instagram}`)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="logo-instagram" size={18} color={Colors.textPrimary} />
                    <Text style={styles.socialLabel}>@{event.club.instagram}</Text>
                  </TouchableOpacity>
                )}
                {event.club.tiktok && (
                  <TouchableOpacity
                    style={styles.socialBtn}
                    onPress={() => Linking.openURL(`https://tiktok.com/@${event.club!.tiktok}`)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="logo-tiktok" size={18} color={Colors.textPrimary} />
                    <Text style={styles.socialLabel}>@{event.club.tiktok}</Text>
                  </TouchableOpacity>
                )}
              </View>
              {(event.club.email || event.club.phone) && (
                <View style={styles.contactDivider} />
              )}
              {event.club.email && (
                <TouchableOpacity
                  style={styles.contactRow}
                  onPress={() => Linking.openURL(`mailto:${event.club!.email}`)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="mail-outline" size={15} color={Colors.accent} />
                  <Text style={styles.contactText}>{event.club.email}</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
              {event.club.phone && (
                <TouchableOpacity
                  style={styles.contactRow}
                  onPress={() => Linking.openURL(`tel:${event.club!.phone}`)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="call-outline" size={15} color={Colors.accent} />
                  <Text style={styles.contactText}>{event.club.phone}</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Invita un amico */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.inviteButton} onPress={handleShare} activeOpacity={0.85}>
            <Ionicons name="person-add-outline" size={18} color={Colors.accent} />
            <View style={styles.inviteText}>
              <Text style={styles.inviteTitle}>Invita un amico</Text>
              <Text style={styles.inviteSubtitle}>Condividi l'evento e venite insieme</Text>
            </View>
            <Ionicons name="share-social-outline" size={18} color={Colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Selezione biglietto */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scegli il biglietto</Text>
          {isSoldOut ? (
            <View style={styles.soldOutBox}>
              <Ionicons name="close-circle" size={20} color={Colors.error} />
              <Text style={styles.soldOutText}>Evento esaurito</Text>
            </View>
          ) : (
            <Text style={styles.sectionSubtitle}>Ogni biglietto include 1 free drink</Text>
          )}
          {!isSoldOut && event.ticketTypes.map((ticket) => (
            <TouchableOpacity
              key={ticket.id}
              style={[styles.ticketOption, selectedTicket?.id === ticket.id && styles.ticketSelected]}
              onPress={() => { setSelectedTicket(ticket); setTicketQty(1); }}
              activeOpacity={0.8}
            >
              <View style={styles.ticketLeft}>
                <View style={[styles.radio, selectedTicket?.id === ticket.id && styles.radioActive]}>
                  {selectedTicket?.id === ticket.id && <View style={styles.radioDot} />}
                </View>
                <View>
                  <Text style={styles.ticketLabel}>{ticket.label}</Text>
                </View>
              </View>
              <View style={styles.ticketRight}>
                <Text style={styles.ticketPrice}>€{ticket.price}</Text>
                <Text style={styles.ticketDrink}>+ drink</Text>
              </View>
            </TouchableOpacity>
          ))}
          {!isSoldOut && selectedTicket && (
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
        </View>

        {/* Tavoli (se disponibili) */}
        {event.tables.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prenota un tavolo</Text>
            <Text style={styles.sectionSubtitle}>
              Tocca un tavolo sulla mappa per selezionarlo · Solo caparra, il resto in loco
            </Text>
            <TableMap
              tables={event.tables}
              selected={selectedTable}
              onSelect={setSelectedTable}
            />
          </View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* CTA sticky */}
      <View style={styles.ctaContainer}>
        {isSoldOut ? (
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
        ) : (
          <>
            <View style={styles.ctaInfo}>
              {selectedTicket ? (
                <>
                  <Text style={styles.ctaLabel}>{ticketQty > 1 ? `${ticketQty} biglietti` : 'Totale'}</Text>
                  <Text style={styles.ctaTotal}>€{total}</Text>
                </>
              ) : (
                <Text style={styles.ctaHint}>Seleziona un biglietto</Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.ctaButton, !selectedTicket && styles.ctaDisabled]}
              activeOpacity={0.85}
              disabled={!selectedTicket}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push({
                  pathname: '/checkout',
                  params: {
                    eventId: event.id,
                    ticketId: selectedTicket!.id,
                    tableId: selectedTable?.id ?? '',
                    qty: String(ticketQty),
                  },
                });
              }}
            >
              <Text style={styles.ctaText}>Compra ora</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.white} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

function InfoChip({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={13} color={Colors.accent} />
      <Text style={styles.chipText}> {label}</Text>
    </View>
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
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  notFoundText: { color: Colors.textMuted },
  scroll: { paddingBottom: 120 },

  // Hero
  hero: { width, height: 430, position: 'relative' },
  heroImage: { ...StyleSheet.absoluteFillObject },
  heroTop: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
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
    position: 'absolute', bottom: 20, left: 20, right: 20,
  },
  heroBottomRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  eventName: { fontSize: 28, fontFamily: Font.black, color: Colors.white, marginBottom: 6, letterSpacing: 0.2 },
  clubName: { fontSize: 14, fontFamily: Font.semiBold, color: Colors.accent },
  posterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  posterBtnText: { fontSize: 12, fontFamily: Font.semiBold, color: Colors.white },

  // Info row
  infoRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 4,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  chipText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },

  // Venue
  venueRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginTop: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  venueText: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  mapsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(168,85,247,0.1)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  mapsBtnText: { fontSize: 12, fontWeight: '700', color: Colors.accent },

  // Tags row
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genreTag: {
    backgroundColor: 'rgba(168,85,247,0.12)',
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)',
    paddingHorizontal: 12, paddingVertical: 5,
  },
  genreTagText: { fontSize: 12, fontWeight: '700', color: Colors.accent },
  dressCodeChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  dressCodeText: { fontSize: 12, color: Colors.textMuted },

  // Description
  descriptionText: {
    fontSize: 14, color: Colors.textSecondary,
    lineHeight: 22,
  },

  // Lineup
  lineupCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  lineupRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  lineupRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  lineupDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.accent,
    flexShrink: 0,
  },
  lineupTime: {
    fontSize: 13, fontWeight: '700', color: Colors.textMuted,
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
    backgroundColor: 'rgba(168,85,247,0.15)',
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
  soldCount: { fontWeight: '700', color: Colors.textPrimary },
  soldPercent: { fontSize: 12, fontWeight: '700', color: Colors.accent },
  progressBar: {
    height: 8, borderRadius: 4,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: 4,
  },

  // Contact card
  contactCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  socialRow: { flexDirection: 'row' },
  socialBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 14, paddingHorizontal: 14,
  },
  socialLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  contactDivider: { height: 1, backgroundColor: Colors.border },
  contactRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 14,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  contactText: { flex: 1, fontSize: 13, color: Colors.textSecondary },

  // Invite button
  inviteButton: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.accent,
    padding: 14,
  },
  inviteText: { flex: 1 },
  inviteTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  inviteSubtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  // Sections
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontSize: 16, fontFamily: Font.extraBold, color: Colors.textPrimary, marginBottom: 4 },
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
  ticketLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  ticketAvailable: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  ticketPrice: { fontSize: 16, fontWeight: '700', color: Colors.accent },
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
  qtyLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  qtyStepper: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  qtyBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  qtyBtnDisabled: { borderColor: Colors.border, opacity: 0.4 },
  qtyValue: {
    fontSize: 18, fontWeight: '800', color: Colors.textPrimary,
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    paddingBottom: 32,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  ctaInfo: {},
  ctaLabel: { fontSize: 11, color: Colors.textMuted },
  ctaTotal: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
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

  // Sold out
  soldOutBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 12, borderWidth: 1, borderColor: Colors.error,
    padding: 14, marginBottom: 4,
  },
  soldOutText: { fontSize: 15, fontWeight: '700', color: Colors.error },
});
