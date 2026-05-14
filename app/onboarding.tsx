import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Image,
  Animated,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';
import { useAuth } from '../contexts/AuthContext';
import { ALL_GENRES } from '../constants/genres';
import { Genre } from '../types';

const { width } = Dimensions.get('window');
const TOTAL_SLIDES = 3;
const TOTAL_STEPS = TOTAL_SLIDES + 1;

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 0 — Discover
// ─────────────────────────────────────────────────────────────────────────────
function SlideDiscover() {
  const cardY = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.loop(Animated.sequence([
      Animated.timing(cardY, { toValue: -10, duration: 3200, useNativeDriver: true }),
      Animated.timing(cardY, { toValue: 0, duration: 3200, useNativeDriver: true }),
    ])).start();
  }, []);

  return (
    <View style={sdi.container}>
      <Animated.View style={[sdi.header, { opacity: fadeIn }]}>
        <Text style={sdi.eyebrow}>SERATE</Text>
        <Text style={sdi.title}>Le migliori serate,{'\n'}tutte in un posto.</Text>
      </Animated.View>

      <Animated.View style={[sdi.cardShadowWrap, { transform: [{ translateY: cardY }] }]}>
        <LinearGradient
          colors={['rgba(148,65,237,0.75)', 'rgba(55,12,105,0.98)']}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={sdi.card}
        >
          <Text style={sdi.cardTag}>TECHNO · HOUSE</Text>
          <Text style={sdi.cardName}>SATURNO</Text>
          <Text style={sdi.cardVenue}>Discoteca Anima</Text>
          <View style={sdi.freeDrinkBadge}>
            <Text style={sdi.freeDrinkEmoji}>🥂</Text>
            <Text style={sdi.freeDrinkText}>Free drink incluso</Text>
          </View>
          <View style={sdi.cardFooter}>
            <View style={sdi.dateBadge}>
              <Text style={sdi.dateBadgeText}>Sab 26 Apr</Text>
            </View>
            <View style={sdi.priceBadge}>
              <Text style={sdi.priceBadgeText}>da 12€</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.View style={[sdi.filters, { opacity: fadeIn }]}>
        <Text style={sdi.filtersLabel}>Filtrabili per</Text>
        <View style={sdi.filterTags}>
          {['🎵 Genere', '💶 Prezzo', '📍 Città'].map((f) => (
            <View key={f} style={sdi.filterTag}>
              <Text style={sdi.filterTagText}>{f}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const sdi = StyleSheet.create({
  container: { width, flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 28, paddingBottom: 170 },
  header: { alignItems: 'center', marginBottom: 28, width: '100%' },
  eyebrow: { fontSize: 11, fontFamily: Font.bold, color: Colors.accent, letterSpacing: 3, marginBottom: 12 },
  title: {
    fontSize: 34, fontFamily: Font.black, color: Colors.textPrimary,
    textAlign: 'center', lineHeight: 41,
  },
  cardShadowWrap: {
    width: width - 48, borderRadius: 24,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.55, shadowRadius: 36, elevation: 20,
    marginBottom: 28,
  },
  card: { padding: 28, minHeight: 196, justifyContent: 'space-between', borderRadius: 24 },
  cardTag: {
    fontSize: 10, fontFamily: Font.bold, color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2.5, marginBottom: 8,
  },
  cardName: { fontSize: 46, fontFamily: Font.black, color: Colors.white, marginBottom: 4 },
  cardVenue: { fontSize: 14, fontFamily: Font.medium, color: 'rgba(255,255,255,0.5)', marginBottom: 10 },
  freeDrinkBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderRadius: 50, borderWidth: 1, borderColor: 'rgba(34,197,94,0.35)',
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 14,
  },
  freeDrinkEmoji: { fontSize: 12 },
  freeDrinkText: { fontSize: 11, fontFamily: Font.semiBold, color: Colors.success },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 50, paddingHorizontal: 14, paddingVertical: 6,
  },
  dateBadgeText: { fontSize: 13, fontFamily: Font.semiBold, color: 'rgba(255,255,255,0.65)' },
  priceBadge: {
    backgroundColor: Colors.white,
    borderRadius: 50, paddingHorizontal: 16, paddingVertical: 6,
  },
  priceBadgeText: { fontSize: 13, fontFamily: Font.bold, color: Colors.accentDark },
  filters: { alignItems: 'center', gap: 10 },
  filtersLabel: { fontSize: 12, fontFamily: Font.medium, color: Colors.textSecondary },
  filterTags: { flexDirection: 'row', gap: 8 },
  filterTag: {
    backgroundColor: 'rgba(168,85,247,0.15)',
    borderRadius: 50, borderWidth: 1, borderColor: 'rgba(168,85,247,0.4)',
    paddingHorizontal: 14, paddingVertical: 7,
  },
  filterTagText: { fontSize: 13, fontFamily: Font.semiBold, color: Colors.accent },
});

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 1 — Tavoli
// ─────────────────────────────────────────────────────────────────────────────
function SlideTavoli() {
  const cardY = useRef(new Animated.Value(0)).current;
  const vipGlow = useRef(new Animated.Value(0.4)).current;
  const vipPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(cardY, { toValue: -8, duration: 3200, useNativeDriver: true }),
      Animated.timing(cardY, { toValue: 0, duration: 3200, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(vipGlow, { toValue: 1, duration: 1400, useNativeDriver: true }),
      Animated.timing(vipGlow, { toValue: 0.3, duration: 1400, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(vipPulse, { toValue: 1.1, duration: 1400, useNativeDriver: true }),
      Animated.timing(vipPulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
    ])).start();
  }, []);

  const T = () => <View style={stv.table} />;
  const Gap = () => <View style={stv.tableGap} />;

  return (
    <View style={stv.container}>
      <Text style={stv.eyebrow}>TAVOLI</Text>
      <Text style={stv.title}>Scegli il tavolo.{'\n'}Nessun intermediario.</Text>

      <Animated.View style={[stv.card, { transform: [{ translateY: cardY }] }]}>
        {/* Header */}
        <View style={stv.cardHeader}>
          <Text style={stv.cardHeaderEvent}>SATURNO · Discoteca Anima</Text>
          <View style={stv.liveBadge}>
            <View style={stv.liveDot} />
            <Text style={stv.liveText}>Live</Text>
          </View>
        </View>

        {/* Floor plan */}
        <View style={stv.floor}>
          <View style={stv.floorRow}><T /><T /><Gap /><T /><T /><Gap /><T /></View>
          <View style={stv.floorRow}>
            <T />
            {/* VIP table — selected */}
            <View style={stv.vipWrap}>
              <Animated.View style={[stv.vipGlowRing, { opacity: vipGlow }]} />
              <Animated.View style={[stv.vipTable, { transform: [{ scale: vipPulse }] }]}>
                <Text style={stv.vipLabel}>VIP</Text>
              </Animated.View>
            </View>
            <T /><Gap /><T /><T />
          </View>
          <View style={stv.floorRow}><T /><T /><Gap /><T /><Gap /><T /><T /></View>

          {/* DJ Booth */}
          <View style={stv.booth}>
            <View style={stv.boothLine} />
            <Text style={stv.boothLabel}>DJ BOOTH</Text>
            <View style={stv.boothLine} />
          </View>
        </View>

        {/* Selection bar */}
        <View style={stv.selBar}>
          <View>
            <Text style={stv.selTitle}>Tavolo VIP · 6 persone</Text>
            <Text style={stv.selSub}>Caparra 50€ · Resto in loco</Text>
          </View>
          <View style={stv.prenotaBtn}>
            <Text style={stv.prenotaText}>Prenota</Text>
            <Ionicons name="arrow-forward" size={11} color={Colors.white} />
          </View>
        </View>
      </Animated.View>

      <View style={stv.benefits}>
        {([
          { icon: 'ban-outline', label: 'Nessun PR' },
          { icon: 'chatbubble-ellipses-outline', label: 'Nessuna telefonata' },
          { icon: 'flash-outline', label: 'Prenota in 30s' },
        ] as { icon: 'ban-outline' | 'chatbubble-ellipses-outline' | 'flash-outline'; label: string }[]).map(({ icon, label }) => (
          <View key={label} style={stv.benefit}>
            <Ionicons name={icon} size={14} color={Colors.accent} />
            <Text style={stv.benefitText}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const stv = StyleSheet.create({
  container: { width, flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 170 },
  eyebrow: { fontSize: 11, fontFamily: Font.bold, color: Colors.accent, letterSpacing: 3, marginBottom: 10 },
  title: {
    fontSize: 32, fontFamily: Font.black, color: Colors.textPrimary,
    textAlign: 'center', lineHeight: 39, marginBottom: 18,
  },

  card: {
    width: width - 48, borderRadius: 20, overflow: 'hidden',
    backgroundColor: 'rgba(22,10,46,0.97)',
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)',
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45, shadowRadius: 28, elevation: 16,
    marginBottom: 20,
  },

  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: 'rgba(168,85,247,0.15)',
  },
  cardHeaderEvent: { fontSize: 11, fontFamily: Font.bold, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  liveText: { fontSize: 10, fontFamily: Font.bold, color: Colors.success },

  floor: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10, gap: 9 },
  floorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  table: {
    width: 30, height: 30, borderRadius: 7,
    backgroundColor: 'rgba(168,85,247,0.09)',
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.28)',
  },
  tableGap: { width: 14 },

  vipWrap: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  vipGlowRing: {
    position: 'absolute', width: 54, height: 54, borderRadius: 27,
    backgroundColor: 'rgba(168,85,247,0.38)',
  },
  vipTable: {
    width: 36, height: 36, borderRadius: 9,
    backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(220,180,255,0.7)',
  },
  vipLabel: { fontSize: 9, fontFamily: Font.black, color: Colors.white, letterSpacing: 0.5 },

  booth: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 4, paddingHorizontal: 4,
  },
  boothLine: { flex: 1, height: 1, backgroundColor: 'rgba(168,85,247,0.18)' },
  boothLabel: { fontSize: 9, fontFamily: Font.bold, color: 'rgba(255,255,255,0.22)', letterSpacing: 2 },

  selBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 11,
    borderTopWidth: 1, borderTopColor: 'rgba(168,85,247,0.15)',
    backgroundColor: 'rgba(168,85,247,0.07)',
  },
  selTitle: { fontSize: 13, fontFamily: Font.bold, color: Colors.white },
  selSub: { fontSize: 11, fontFamily: Font.medium, color: 'rgba(255,255,255,0.38)', marginTop: 2 },
  prenotaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.accent, borderRadius: 50,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  prenotaText: { fontSize: 12, fontFamily: Font.bold, color: Colors.white },

  benefits: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', justifyContent: 'center' },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  benefitText: { fontSize: 12, fontFamily: Font.medium, color: Colors.textMuted },
});

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 2 — Ticket
// ─────────────────────────────────────────────────────────────────────────────
const QR_GRID = [
  [1,1,1,1,1,1,1,0,1,0],
  [1,0,0,0,0,0,1,1,0,1],
  [1,0,1,1,1,0,1,0,1,0],
  [1,0,1,1,1,0,1,0,0,1],
  [1,0,1,1,1,0,1,1,0,0],
  [1,0,0,0,0,0,1,0,1,1],
  [1,1,1,1,1,1,1,0,0,1],
  [0,1,0,0,1,0,0,1,0,0],
  [1,0,0,1,0,1,0,0,1,1],
  [0,1,1,0,0,0,1,1,0,1],
];

function SlideTicket() {
  const cardY = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(cardY, { toValue: -9, duration: 3400, useNativeDriver: true }),
      Animated.timing(cardY, { toValue: 0, duration: 3400, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glowOpacity, { toValue: 1, duration: 2000, useNativeDriver: true }),
      Animated.timing(glowOpacity, { toValue: 0.4, duration: 2000, useNativeDriver: true }),
    ])).start();
  }, []);

  return (
    <View style={st.container}>
      <Text style={st.eyebrow}>INGRESSO</Text>
      <Text style={st.title}>Il tuo biglietto.{'\n'}Sempre con te.</Text>

      <View style={st.ticketOuter}>
        <Animated.View style={[st.ticketGlow, { opacity: glowOpacity }]} />
        <Animated.View style={[st.ticketWrap, { transform: [{ translateY: cardY }] }]}>
          <View style={st.ticket}>
            <LinearGradient
              colors={['rgba(168,85,247,0.5)', 'rgba(120,50,200,0.32)']}
              style={st.ticketHeader}
            >
              <View style={st.ticketHeaderRow}>
                <View>
                  <Text style={st.ticketEventName}>SATURNO</Text>
                  <Text style={st.ticketMeta}>Discoteca Anima · Sab 26 Apr</Text>
                </View>
                <View style={st.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
                  <Text style={st.verifiedText}>Valido</Text>
                </View>
              </View>
            </LinearGradient>

            <View style={st.divider}>
              <View style={st.cutLeft} />
              <View style={st.dashedLine} />
              <View style={st.cutRight} />
            </View>

            <View style={st.ticketBody}>
              <View style={st.ticketBodyRow}>
                <View style={st.qrBox}>
                  {QR_GRID.map((row, ri) => (
                    <View key={ri} style={st.qrRow}>
                      {row.map((cell, ci) => (
                        <View
                          key={ci}
                          style={[st.qrCell, { backgroundColor: cell ? '#07080f' : 'transparent' }]}
                        />
                      ))}
                    </View>
                  ))}
                </View>
                <View style={st.ticketSideInfo}>
                  <View style={st.drinkHighlight}>
                    <Text style={st.drinkBigEmoji}>🥂</Text>
                    <Text style={st.drinkHighlightLabel}>Free drink</Text>
                    <Text style={st.drinkHighlightSub}>incluso nel biglietto</Text>
                  </View>
                  <View style={st.sideFeature}>
                    <Ionicons name="flash-outline" size={13} color={Colors.accent} />
                    <Text style={st.sideFeatureText}>Istantaneo</Text>
                  </View>
                  <View style={st.sideFeature}>
                    <Ionicons name="shield-checkmark-outline" size={13} color={Colors.accent} />
                    <Text style={st.sideFeatureText}>QR sicuro</Text>
                  </View>
                </View>
              </View>
              <Text style={st.scanLabel}>Scansiona per entrare</Text>
            </View>
          </View>
        </Animated.View>
      </View>

      <View style={st.featureRow}>
        <Ionicons name="people-outline" size={14} color={Colors.accent} />
        <Text style={st.featureRowText}>Zero code all'ingresso</Text>
      </View>
      <View style={st.paymentBadge}>
        <Ionicons name="lock-closed" size={11} color={Colors.textMuted} />
        <Text style={st.paymentBadgeText}>Pagamenti protetti e crittografati</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { width, flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 28, paddingBottom: 170 },
  eyebrow: { fontSize: 11, fontFamily: Font.bold, color: Colors.accent, letterSpacing: 3, marginBottom: 12 },
  title: {
    fontSize: 36, fontFamily: Font.black, color: Colors.textPrimary,
    textAlign: 'center', lineHeight: 43, marginBottom: 24,
  },
  ticketOuter: { width: width * 0.76, marginBottom: 28, alignItems: 'center' },
  ticketGlow: {
    position: 'absolute', top: 16, left: -14, right: -14, bottom: -14,
    backgroundColor: 'rgba(168,85,247,0.18)',
    borderRadius: 28,
  },
  ticketWrap: { width: '100%' },
  ticket: {
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.45)',
    backgroundColor: 'rgba(35,18,65,0.97)',
  },
  ticketHeader: { padding: 20 },
  ticketHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  ticketEventName: { fontSize: 22, fontFamily: Font.black, color: Colors.white },
  ticketMeta: { fontSize: 11, fontFamily: Font.medium, color: 'rgba(255,255,255,0.45)', marginTop: 4 },
  verifiedBadge: { alignItems: 'center', gap: 2 },
  verifiedText: { fontSize: 9, fontFamily: Font.bold, color: Colors.success, letterSpacing: 1 },
  divider: { flexDirection: 'row', alignItems: 'center', overflow: 'visible' },
  cutLeft: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: Colors.background, marginLeft: -7,
  },
  dashedLine: {
    flex: 1, height: 1, borderStyle: 'dashed', borderWidth: 0.5,
    borderColor: 'rgba(168,85,247,0.2)', marginHorizontal: 4,
  },
  cutRight: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: Colors.background, marginRight: -7,
  },
  ticketBody: { padding: 16, backgroundColor: 'rgba(168,85,247,0.06)', gap: 10, alignItems: 'center' },
  ticketBodyRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  qrBox: {
    backgroundColor: Colors.white, borderRadius: 8,
    padding: 7, gap: 2,
  },
  qrRow: { flexDirection: 'row', gap: 2 },
  qrCell: { width: 6.5, height: 6.5, borderRadius: 1 },
  ticketSideInfo: { flex: 1, gap: 10 },
  drinkHighlight: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.28)',
    padding: 10, alignItems: 'center', gap: 2,
  },
  drinkBigEmoji: { fontSize: 20 },
  drinkHighlightLabel: { fontSize: 13, fontFamily: Font.bold, color: Colors.success },
  drinkHighlightSub: { fontSize: 10, fontFamily: Font.medium, color: 'rgba(34,197,94,0.7)', textAlign: 'center' },
  sideFeature: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sideFeatureText: { fontSize: 11, fontFamily: Font.medium, color: Colors.textMuted },
  scanLabel: { fontSize: 11, fontFamily: Font.medium, color: Colors.textMuted },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  featureRowText: { fontSize: 12, fontFamily: Font.medium, color: Colors.textMuted },
  paymentBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  paymentBadgeText: { fontSize: 11, fontFamily: Font.medium, color: Colors.textMuted },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding, setMusicGenres, updateDateOfBirth, user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  const MAX_DOB = new Date();
  MAX_DOB.setFullYear(MAX_DOB.getFullYear() - 14);

  const [showDobModal, setShowDobModal] = useState(false);
  const [dobTempDate, setDobTempDate] = useState<Date>(MAX_DOB);
  const [dobSaving, setDobSaving] = useState(false);

  const isGenreStep = currentIndex === TOTAL_SLIDES;

  function toggleGenre(genre: Genre) {
    Haptics.selectionAsync();
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  }

  function goBack() {
    Haptics.selectionAsync();
    if (isGenreStep) {
      setCurrentIndex(TOTAL_SLIDES - 1);
    } else if (currentIndex > 0) {
      const prev = currentIndex - 1;
      setCurrentIndex(prev);
      scrollRef.current?.scrollTo({ x: prev * width, animated: true });
    }
  }

  function goNext() {
    Haptics.selectionAsync();
    if (currentIndex < TOTAL_SLIDES - 1) {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
    } else if (currentIndex === TOTAL_SLIDES - 1) {
      setCurrentIndex(TOTAL_SLIDES);
    } else {
      handleStart();
    }
  }

  async function finishOnboarding() {
    if (selectedGenres.length > 0) setMusicGenres(selectedGenres);
    completeOnboarding();
    router.replace(user ? '/(tabs)' : '/login');
  }

  function handleStart() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (user && !user.dateOfBirth) {
      setShowDobModal(true);
    } else {
      finishOnboarding();
    }
  }

  async function handleDobConfirm() {
    setDobSaving(true);
    try {
      await updateDateOfBirth(dobTempDate);
    } finally {
      setDobSaving(false);
      setShowDobModal(false);
      finishOnboarding();
    }
  }

  function handleScroll(e: { nativeEvent: { contentOffset: { x: number } } }) {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    if (index < TOTAL_SLIDES && index !== currentIndex) {
      Haptics.selectionAsync();
      setCurrentIndex(index);
    }
  }

  const SLIDE_COMPONENTS = [
    <SlideDiscover key="discover" />,
    <SlideTicket key="ticket" />,
    <SlideTavoli key="tavoli" />,
  ];

  const SLIDE_GRADIENTS: [string, string, string][] = [
    ['rgba(148,65,237,0.20)', 'rgba(59,130,246,0.04)', 'transparent'],
    ['rgba(168,85,247,0.18)', 'rgba(168,85,247,0.05)', 'transparent'],
    ['rgba(100,30,180,0.22)', 'rgba(168,85,247,0.06)', 'transparent'],
    ['rgba(168,85,247,0.16)', 'rgba(168,85,247,0.03)', 'transparent'],
  ];

  const gradientIndex = Math.min(currentIndex, SLIDE_GRADIENTS.length - 1);

  const ctaLabel = isGenreStep
    ? 'Inizia ora'
    : currentIndex === TOTAL_SLIDES - 1
    ? 'Scegli i tuoi generi'
    : 'Avanti';

  return (
    <View style={styles.container}>
      {/* Modal data di nascita — mostrato solo per utenti senza DOB (es. staff) */}
      <Modal visible={showDobModal} transparent animationType="slide" onRequestClose={() => {}}>
        <View style={styles.dobOverlay}>
          <View style={styles.dobSheet}>
            <View style={styles.dobHandle} />
            <Text style={styles.dobTitle}>Un'ultima cosa</Text>
            <Text style={styles.dobSubtitle}>
              Inserisci la tua data di nascita per verificare l'età agli eventi.
            </Text>
            <DateTimePicker
              value={dobTempDate}
              mode="date"
              display="spinner"
              maximumDate={MAX_DOB}
              minimumDate={new Date(1920, 0, 1)}
              onChange={(_, date) => { if (date) setDobTempDate(date); }}
              textColor={Colors.textPrimary}
              locale="it-IT"
              style={styles.dobPicker}
            />
            <TouchableOpacity
              style={[styles.dobConfirmBtn, dobSaving && { opacity: 0.6 }]}
              onPress={handleDobConfirm}
              disabled={dobSaving}
              activeOpacity={0.85}
            >
              {dobSaving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.dobConfirmText}>Conferma e inizia</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <LinearGradient
        colors={SLIDE_GRADIENTS[gradientIndex]}
        style={styles.bgGradient}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.logoBar}>
        <View style={styles.logoRow}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={goBack}
            activeOpacity={0.7}
            disabled={currentIndex === 0 && !isGenreStep}
          >
            {(currentIndex > 0 || isGenreStep) && (
              <Ionicons name="chevron-back" size={24} color={Colors.textSecondary} />
            )}
          </TouchableOpacity>
          <Image
            source={require('../assets/logo-cropped.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View style={styles.navBtn} />
        </View>
      </SafeAreaView>

      {!isGenreStep ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
          style={styles.slider}
        >
          {SLIDE_COMPONENTS}
        </ScrollView>
      ) : (
        <View style={styles.genreStep}>
          <Text style={styles.genreTitle}>Che musica ti piace?</Text>
          <Text style={styles.genreSubtitle}>
            Seleziona i generi che ami — ti mostriamo gli eventi giusti per te.
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.genreScroll}>
            <View style={styles.genreGrid}>
              {ALL_GENRES.map((genre) => {
                const active = selectedGenres.includes(genre);
                return (
                  <TouchableOpacity
                    key={genre}
                    style={[styles.genreChip, active && styles.genreChipActive]}
                    onPress={() => toggleGenre(genre)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.genreChipText, active && styles.genreChipTextActive]}>
                      {genre}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {selectedGenres.length > 0 && (
              <Text style={styles.genreCount}>{selectedGenres.length} selezionati ✦</Text>
            )}
          </ScrollView>
        </View>
      )}

      <View style={styles.dots}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === currentIndex && styles.dotActive,
              i < currentIndex && styles.dotDone,
            ]}
          />
        ))}
      </View>

      <SafeAreaView style={styles.footer} edges={['bottom']}>
        <TouchableOpacity style={styles.ctaButton} onPress={goNext} activeOpacity={0.85}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
          <Ionicons
            name={isGenreStep ? 'checkmark' : 'arrow-forward'}
            size={18}
            color={Colors.white}
          />
        </TouchableOpacity>

        {(!isGenreStep || selectedGenres.length === 0) && (
          <TouchableOpacity style={styles.skipButton} onPress={handleStart} activeOpacity={0.7}>
            <Text style={styles.skipText}>
              {isGenreStep ? 'Salta per ora' : 'Salta intro'}
            </Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  bgGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 520 },

  logoBar: { paddingBottom: 8 },
  logoRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingTop: 4,
  },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  logoImage: { width: 180, height: 50 },

  slider: { flex: 1 },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  dotActive: { width: 22, backgroundColor: Colors.accent },
  dotDone: { backgroundColor: 'rgba(168,85,247,0.4)' },

  genreStep: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  genreTitle: {
    fontSize: 28, fontFamily: Font.black, color: Colors.textPrimary,
    textAlign: 'center', marginBottom: 10,
  },
  genreSubtitle: {
    fontSize: 14, fontFamily: Font.regular, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 22, marginBottom: 20,
  },
  genreScroll: { paddingBottom: 12 },
  genreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  genreChip: {
    paddingHorizontal: 18, paddingVertical: 11, borderRadius: 50,
    borderWidth: 1.5, borderColor: 'rgba(168,85,247,0.35)',
    backgroundColor: 'rgba(168,85,247,0.07)',
  },
  genreChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  genreChipText: { fontSize: 14, fontFamily: Font.bold, color: Colors.accent },
  genreChipTextActive: { color: Colors.white },
  genreCount: {
    textAlign: 'center', marginTop: 20,
    fontSize: 13, color: Colors.accent, fontFamily: Font.bold,
  },

  dobOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  dobSheet: {
    backgroundColor: '#111120',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12,
    alignItems: 'center',
  },
  dobHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 20 },
  dobTitle: { fontSize: 22, fontFamily: Font.black, color: Colors.textPrimary, marginBottom: 8 },
  dobSubtitle: { fontSize: 14, fontFamily: Font.regular, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 8 },
  dobPicker: { width: '100%', height: 180 },
  dobConfirmBtn: {
    backgroundColor: Colors.accent, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
    width: '100%', marginTop: 8,
  },
  dobConfirmText: { fontSize: 16, fontFamily: Font.extraBold, color: Colors.white },

  footer: { paddingHorizontal: 24, paddingBottom: 8, gap: 8 },
  ctaButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.accent, borderRadius: 18, paddingVertical: 18,
  },
  ctaText: { fontSize: 17, fontFamily: Font.extraBold, color: Colors.white },
  skipButton: { alignItems: 'center', paddingVertical: 10 },
  skipText: { fontSize: 14, fontFamily: Font.medium, color: Colors.textMuted },
});
