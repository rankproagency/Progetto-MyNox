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
} from 'react-native';
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
const TOTAL_SLIDES = 4;
const TOTAL_STEPS = TOTAL_SLIDES + 1;

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 0 — Welcome
// ─────────────────────────────────────────────────────────────────────────────
function SlideWelcome() {
  const breathe = useRef(new Animated.Value(1)).current;
  const star1Y = useRef(new Animated.Value(0)).current;
  const star2Y = useRef(new Animated.Value(0)).current;
  const star3Y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1.14, duration: 4200, useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 0.88, duration: 4200, useNativeDriver: true }),
    ])).start();

    const float = (val: Animated.Value, delay: number, range: number, dur: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(val, { toValue: -range, duration: dur, useNativeDriver: true }),
        Animated.timing(val, { toValue: 0, duration: dur, useNativeDriver: true }),
      ]));

    float(star1Y, 0, 14, 2800).start();
    float(star2Y, 1100, 10, 3500).start();
    float(star3Y, 450, 8, 2300).start();
  }, []);

  return (
    <View style={sw.container}>
      <View style={sw.orbArea}>
        <View style={sw.halo4} />
        <View style={sw.halo3} />
        <View style={sw.halo2} />
        <Animated.View style={[sw.halo1, { transform: [{ scale: breathe }] }]} />
        <View style={sw.core}>
          <LinearGradient
            colors={['rgba(230,180,255,1)', Colors.accent]}
            style={sw.coreGrad}
          />
        </View>
      </View>

      <Animated.Text style={[sw.star, { top: 52, left: width * 0.13, transform: [{ translateY: star1Y }] }]}>✦</Animated.Text>
      <Animated.Text style={[sw.star, { top: 98, right: width * 0.09, fontSize: 8, opacity: 0.45, transform: [{ translateY: star2Y }] }]}>✦</Animated.Text>
      <Animated.Text style={[sw.star, { top: 230, left: width * 0.71, fontSize: 10, opacity: 0.4, transform: [{ translateY: star3Y }] }]}>✦</Animated.Text>

      <View style={sw.textWrap}>
        <Text style={sw.title}>La nightlife{'\n'}che merita.</Text>
        <Text style={sw.subtitle}>Scopri serate, prenota tavoli,{'\n'}entra senza code.</Text>
      </View>
    </View>
  );
}

const sw = StyleSheet.create({
  container: { width, flex: 1, alignItems: 'center', paddingBottom: 170 },
  orbArea: {
    marginTop: 44,
    width: 280, height: 280,
    alignItems: 'center', justifyContent: 'center',
  },
  halo4: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(168,85,247,0.14)',
  },
  halo3: {
    position: 'absolute', width: 214, height: 214, borderRadius: 107,
    backgroundColor: 'rgba(168,85,247,0.26)',
  },
  halo2: {
    position: 'absolute', width: 152, height: 152, borderRadius: 76,
    backgroundColor: 'rgba(168,85,247,0.42)',
  },
  halo1: {
    position: 'absolute', width: 104, height: 104, borderRadius: 52,
    backgroundColor: 'rgba(168,85,247,0.65)',
  },
  core: {
    width: 62, height: 62, borderRadius: 31, overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(240,200,255,0.7)',
  },
  coreGrad: { flex: 1 },
  star: { position: 'absolute', fontSize: 14, color: Colors.accent, opacity: 0.65 },
  textWrap: { paddingHorizontal: 40, marginTop: 40, alignItems: 'center' },
  title: {
    fontSize: 42, fontFamily: Font.black, color: Colors.textPrimary,
    textAlign: 'center', lineHeight: 50, marginBottom: 18,
  },
  subtitle: {
    fontSize: 16, fontFamily: Font.regular, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 26,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 1 — Discover
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
  cardVenue: { fontSize: 14, fontFamily: Font.medium, color: 'rgba(255,255,255,0.5)', marginBottom: 22 },
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
// SLIDE 2 — Tavoli
// ─────────────────────────────────────────────────────────────────────────────
function SlideTavoli() {
  const cardY = useRef(new Animated.Value(0)).current;
  const confirmPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(cardY, { toValue: -9, duration: 3000, useNativeDriver: true }),
      Animated.timing(cardY, { toValue: 0, duration: 3000, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(confirmPulse, { toValue: 1.06, duration: 1000, useNativeDriver: true }),
      Animated.timing(confirmPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
    ])).start();
  }, []);

  return (
    <View style={stv.container}>
      <Text style={stv.eyebrow}>TAVOLI</Text>
      <Text style={stv.title}>Prenota il tavolo.{'\n'}Nessun intermediario.</Text>

      <Animated.View style={[stv.cardWrap, { transform: [{ translateY: cardY }] }]}>
        <LinearGradient
          colors={['rgba(100,30,180,0.7)', 'rgba(18,6,38,0.98)']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={stv.card}
        >
          {/* Icon + title row */}
          <View style={stv.cardTop}>
            <View style={stv.bottleIcon}>
              <Text style={stv.bottleEmoji}>🍾</Text>
            </View>
            <View style={stv.cardTopText}>
              <Text style={stv.tableName}>Tavolo VIP · 6 persone</Text>
              <Text style={stv.tableEvent}>SATURNO · Discoteca Anima</Text>
            </View>
          </View>

          <View style={stv.cardDivider} />

          {/* Deposit */}
          <View style={stv.depositRow}>
            <View>
              <Text style={stv.depositLabel}>CAPARRA VERSATA</Text>
              <Text style={stv.depositAmount}>50€</Text>
              <Text style={stv.depositNote}>Resto saldato in loco</Text>
            </View>
            <Animated.View style={[stv.confirmedBadge, { transform: [{ scale: confirmPulse }] }]}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <Text style={stv.confirmedText}>Confermato</Text>
            </Animated.View>
          </View>

          {/* Date bar */}
          <View style={stv.dateLine}>
            <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.4)" />
            <Text style={stv.dateText}>Sabato 26 Aprile · Ingresso ore 23:00</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      <View style={stv.benefitRow}>
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
  container: { width, flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 28, paddingBottom: 170 },
  eyebrow: { fontSize: 11, fontFamily: Font.bold, color: Colors.accent, letterSpacing: 3, marginBottom: 12 },
  title: {
    fontSize: 34, fontFamily: Font.black, color: Colors.textPrimary,
    textAlign: 'center', lineHeight: 41, marginBottom: 28,
  },
  cardWrap: {
    width: width - 48, borderRadius: 24,
    shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6, shadowRadius: 32, elevation: 18,
    marginBottom: 28,
  },
  card: { padding: 24, borderRadius: 24, gap: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bottleIcon: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(168,85,247,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  bottleEmoji: { fontSize: 22 },
  cardTopText: { flex: 1 },
  tableName: { fontSize: 16, fontFamily: Font.bold, color: Colors.white },
  tableEvent: { fontSize: 12, fontFamily: Font.medium, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  cardDivider: { height: 1, backgroundColor: 'rgba(168,85,247,0.2)' },
  depositRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  depositLabel: {
    fontSize: 9, fontFamily: Font.bold, color: 'rgba(255,255,255,0.35)',
    letterSpacing: 2, marginBottom: 4,
  },
  depositAmount: { fontSize: 32, fontFamily: Font.black, color: Colors.white },
  depositNote: { fontSize: 11, fontFamily: Font.medium, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  confirmedBadge: {
    alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  confirmedText: { fontSize: 10, fontFamily: Font.bold, color: Colors.success, letterSpacing: 0.5 },
  dateLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 11, fontFamily: Font.medium, color: 'rgba(255,255,255,0.35)' },
  benefitRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', justifyContent: 'center' },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  benefitText: { fontSize: 12, fontFamily: Font.medium, color: Colors.textMuted },
});

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 3 — Ticket
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
              colors={['rgba(168,85,247,0.28)', 'rgba(100,30,180,0.18)']}
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
              <Text style={st.scanLabel}>Scansiona per entrare</Text>
              <View style={st.drinkBadge}>
                <Text style={st.drinkEmoji}>🥂</Text>
                <Text style={st.drinkText}>Free drink incluso</Text>
                <View style={st.drinkDot} />
              </View>
            </View>
          </View>
        </Animated.View>
      </View>

      <View style={st.features}>
        {([
          { icon: 'flash-outline', label: 'Acquisto istantaneo' },
          { icon: 'phone-portrait-outline', label: 'Funziona offline' },
          { icon: 'shield-checkmark-outline', label: 'QR unico e sicuro' },
        ] as { icon: 'flash-outline' | 'phone-portrait-outline' | 'shield-checkmark-outline'; label: string }[]).map(({ icon, label }) => (
          <View key={label} style={st.feature}>
            <Ionicons name={icon} size={15} color={Colors.accent} />
            <Text style={st.featureText}>{label}</Text>
          </View>
        ))}
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
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.28)',
    backgroundColor: 'rgba(12,8,22,0.98)',
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
  ticketBody: { padding: 18, alignItems: 'center', gap: 10 },
  qrBox: {
    backgroundColor: Colors.white, borderRadius: 8,
    padding: 7, gap: 2,
  },
  qrRow: { flexDirection: 'row', gap: 2 },
  qrCell: { width: 6.5, height: 6.5, borderRadius: 1 },
  scanLabel: { fontSize: 11, fontFamily: Font.medium, color: Colors.textMuted },
  drinkBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(34,197,94,0.09)',
    borderRadius: 50, borderWidth: 1, borderColor: 'rgba(34,197,94,0.25)',
    paddingHorizontal: 14, paddingVertical: 6,
  },
  drinkEmoji: { fontSize: 13 },
  drinkText: { fontSize: 12, fontFamily: Font.semiBold, color: Colors.success },
  drinkDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: Colors.success },
  features: { flexDirection: 'row', gap: 20, flexWrap: 'wrap', justifyContent: 'center' },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featureText: { fontSize: 12, fontFamily: Font.medium, color: Colors.textMuted },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding, setMusicGenres, user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  const isGenreStep = currentIndex === TOTAL_SLIDES;

  function toggleGenre(genre: Genre) {
    Haptics.selectionAsync();
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
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

  function handleStart() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (selectedGenres.length > 0) setMusicGenres(selectedGenres);
    completeOnboarding();
    router.replace(user ? '/(tabs)' : '/login');
  }

  function handleScroll(e: { nativeEvent: { contentOffset: { x: number } } }) {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    if (index < TOTAL_SLIDES) setCurrentIndex(index);
  }

  const SLIDE_COMPONENTS = [
    <SlideWelcome key="welcome" />,
    <SlideDiscover key="discover" />,
    <SlideTavoli key="tavoli" />,
    <SlideTicket key="ticket" />,
  ];

  const SLIDE_GRADIENTS: [string, string, string][] = [
    ['rgba(168,85,247,0.22)', 'rgba(168,85,247,0.05)', 'transparent'],
    ['rgba(148,65,237,0.18)', 'rgba(59,130,246,0.04)', 'transparent'],
    ['rgba(100,30,180,0.20)', 'rgba(168,85,247,0.06)', 'transparent'],
    ['rgba(34,197,94,0.06)', 'rgba(168,85,247,0.12)', 'transparent'],
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
      <LinearGradient
        colors={SLIDE_GRADIENTS[gradientIndex]}
        style={styles.bgGradient}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.logoBar}>
        <Image
          source={require('../assets/logo-cropped.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
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
          scrollEnabled={false}
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

  logoBar: { alignItems: 'center', paddingTop: 16 },
  logoImage: { width: 190, height: 54 },

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

  footer: { paddingHorizontal: 24, paddingBottom: 8, gap: 8 },
  ctaButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.accent, borderRadius: 18, paddingVertical: 18,
  },
  ctaText: { fontSize: 17, fontFamily: Font.extraBold, color: Colors.white },
  skipButton: { alignItems: 'center', paddingVertical: 10 },
  skipText: { fontSize: 14, fontFamily: Font.medium, color: Colors.textMuted },
});
