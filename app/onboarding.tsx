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
const TOTAL_SLIDES = 5;
const TOTAL_STEPS = TOTAL_SLIDES + 1; // +1 for genre step

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 0 — Welcome: pulsing rings + floating stars
// ─────────────────────────────────────────────────────────────────────────────
function SlideWelcome() {
  const ring1 = useRef(new Animated.Value(1)).current;
  const ring2 = useRef(new Animated.Value(0.6)).current;
  const ring3 = useRef(new Animated.Value(0.3)).current;
  const star1Y = useRef(new Animated.Value(0)).current;
  const star2Y = useRef(new Animated.Value(0)).current;
  const star3Y = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = (val: Animated.Value, delay: number, dur: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 0.2, duration: dur, useNativeDriver: true }),
          Animated.timing(val, { toValue: 1, duration: dur, useNativeDriver: true }),
        ])
      );
    const float = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: -10, duration: 2000, useNativeDriver: true }),
          Animated.timing(val, { toValue: 4, duration: 2000, useNativeDriver: true }),
        ])
      );
    const scaleGlow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowScale, { toValue: 1.15, duration: 1600, useNativeDriver: true }),
        Animated.timing(glowScale, { toValue: 1, duration: 1600, useNativeDriver: true }),
      ])
    );

    const a1 = pulse(ring1, 0, 2200);
    const a2 = pulse(ring2, 700, 2200);
    const a3 = pulse(ring3, 1400, 2200);
    const f1 = float(star1Y, 0);
    const f2 = float(star2Y, 500);
    const f3 = float(star3Y, 1000);

    a1.start(); a2.start(); a3.start();
    f1.start(); f2.start(); f3.start();
    scaleGlow.start();

    return () => {
      a1.stop(); a2.stop(); a3.stop();
      f1.stop(); f2.stop(); f3.stop();
      scaleGlow.stop();
    };
  }, []);

  return (
    <View style={sv.container}>
      {/* Floating stars */}
      <Animated.View style={[sv.star, { top: 40, left: width * 0.12, transform: [{ translateY: star1Y }] }]}>
        <Text style={sv.starText}>✦</Text>
      </Animated.View>
      <Animated.View style={[sv.star, { top: 90, right: width * 0.1, transform: [{ translateY: star2Y }] }]}>
        <Text style={[sv.starText, { fontSize: 10, opacity: 0.5 }]}>✦</Text>
      </Animated.View>
      <Animated.View style={[sv.star, { top: 30, right: width * 0.32, transform: [{ translateY: star3Y }] }]}>
        <Text style={[sv.starText, { fontSize: 8, opacity: 0.4 }]}>★</Text>
      </Animated.View>

      {/* Rings */}
      <View style={sv.ringArea}>
        <Animated.View style={[sv.ring, sv.ring3, { opacity: ring3 }]} />
        <Animated.View style={[sv.ring, sv.ring2, { opacity: ring2 }]} />
        <Animated.View style={[sv.ring, sv.ring1, { opacity: ring1 }]} />
        <Animated.View style={sv.centerCircle}>
          <Animated.View style={{ transform: [{ scale: glowScale }] }}>
            <Text style={sv.centerEmoji}>🌙</Text>
          </Animated.View>
        </Animated.View>
      </View>

      {/* Tags */}
      <View style={sv.tags}>
        {['🎵 Musica', '🥂 Free drink', '📲 QR ingresso'].map((t) => (
          <View key={t} style={sv.tag}>
            <Text style={sv.tagText}>{t}</Text>
          </View>
        ))}
      </View>

      <View style={sv.textWrap}>
        <Text style={sv.eyebrow}>BENVENUTO NEL FUTURO</Text>
        <Text style={sv.title}>La nightlife{'\n'}che merita.</Text>
        <Text style={sv.subtitle}>
          Biglietti, free drink e QR ingresso — tutto in un tap. Niente PR, niente code, niente sorprese.
        </Text>
      </View>
    </View>
  );
}

const sv = StyleSheet.create({
  container: { width, flex: 1, alignItems: 'center' },
  ringArea: { marginTop: 48, width: 240, height: 240, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  ring1: { width: 140, height: 140 },
  ring2: { width: 190, height: 190 },
  ring3: { width: 240, height: 240 },
  centerCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(168,85,247,0.18)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(168,85,247,0.4)',
  },
  centerEmoji: { fontSize: 44 },
  star: { position: 'absolute' },
  starText: { fontSize: 14, color: Colors.accent, opacity: 0.6 },
  tags: { flexDirection: 'row', gap: 8, marginTop: 28, flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 20 },
  tag: {
    backgroundColor: 'rgba(168,85,247,0.12)',
    borderRadius: 50, borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)',
    paddingHorizontal: 14, paddingVertical: 6,
  },
  tagText: { fontSize: 12, fontFamily: Font.semiBold, color: Colors.accent },
  textWrap: { paddingHorizontal: 36, marginTop: 32, alignItems: 'center' },
  eyebrow: { fontSize: 11, fontFamily: Font.bold, color: Colors.accent, letterSpacing: 3, marginBottom: 10 },
  title: { fontSize: 34, fontFamily: Font.black, color: Colors.textPrimary, textAlign: 'center', lineHeight: 40, marginBottom: 14 },
  subtitle: { fontSize: 15, fontFamily: Font.regular, color: Colors.textSecondary, textAlign: 'center', lineHeight: 26 },
});

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 1 — No PR: comparison table
// ─────────────────────────────────────────────────────────────────────────────
const OLD_ITEMS = ['Prezzi gonfiati e opachi', 'Devi "conoscere qualcuno"', 'Posti non garantiti', 'Zero trasparenza'];
const NEW_ITEMS = ['Prezzi fissi e visibili', 'Apri l\'app, compra, entri', 'Posto confermato subito', 'Ricevuta digitale'];

function SlideNoPR() {
  const slideLeft = useRef(new Animated.Value(-30)).current;
  const slideRight = useRef(new Animated.Value(30)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideLeft, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(slideRight, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={np.container}>
      <Animated.View style={{ opacity: fadeIn }}>
        <Text style={np.eyebrow}>IL CAMBIAMENTO</Text>
        <Text style={np.title}>Addio PR.{'\n'}Per sempre.</Text>
      </Animated.View>

      <View style={np.columns}>
        {/* Old way */}
        <Animated.View style={[np.col, np.colOld, { transform: [{ translateX: slideLeft }], opacity: fadeIn }]}>
          <View style={np.colHeader}>
            <Text style={np.colHeaderEmoji}>😤</Text>
            <Text style={np.colHeaderTextOld}>Prima</Text>
          </View>
          {OLD_ITEMS.map((item) => (
            <View key={item} style={np.row}>
              <Text style={np.iconOld}>✗</Text>
              <Text style={np.rowTextOld}>{item}</Text>
            </View>
          ))}
        </Animated.View>

        {/* MyNox */}
        <Animated.View style={[np.col, np.colNew, { transform: [{ translateX: slideRight }], opacity: fadeIn }]}>
          <View style={np.colHeader}>
            <Text style={np.colHeaderEmoji}>🚀</Text>
            <Text style={np.colHeaderTextNew}>MyNox</Text>
          </View>
          {NEW_ITEMS.map((item) => (
            <View key={item} style={np.row}>
              <Text style={np.iconNew}>✓</Text>
              <Text style={np.rowTextNew}>{item}</Text>
            </View>
          ))}
        </Animated.View>
      </View>

      <Animated.View style={[np.badge, { opacity: fadeIn }]}>
        <Text style={np.badgeText}>🎯 Nessun intermediario tra te e la serata</Text>
      </Animated.View>
    </View>
  );
}

const np = StyleSheet.create({
  container: { width, flex: 1, paddingHorizontal: 24, paddingTop: 36, alignItems: 'center' },
  eyebrow: { fontSize: 11, fontFamily: Font.bold, color: Colors.accent, letterSpacing: 3, marginBottom: 10, textAlign: 'center' },
  title: { fontSize: 32, fontFamily: Font.black, color: Colors.textPrimary, textAlign: 'center', lineHeight: 38, marginBottom: 24 },
  columns: { flexDirection: 'row', gap: 12, width: '100%' },
  col: { flex: 1, borderRadius: 16, padding: 14, gap: 10 },
  colOld: { backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)' },
  colNew: { backgroundColor: 'rgba(168,85,247,0.1)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.35)' },
  colHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  colHeaderEmoji: { fontSize: 18 },
  colHeaderTextOld: { fontSize: 14, fontFamily: Font.bold, color: '#ef4444' },
  colHeaderTextNew: { fontSize: 14, fontFamily: Font.bold, color: Colors.accent },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  iconOld: { fontSize: 12, color: '#ef4444', marginTop: 2 },
  iconNew: { fontSize: 12, color: '#22c55e', marginTop: 2 },
  rowTextOld: { fontSize: 12, fontFamily: Font.medium, color: 'rgba(239,68,68,0.8)', flex: 1, lineHeight: 18 },
  rowTextNew: { fontSize: 12, fontFamily: Font.medium, color: Colors.textSecondary, flex: 1, lineHeight: 18 },
  badge: {
    marginTop: 20, backgroundColor: 'rgba(168,85,247,0.1)', borderRadius: 50,
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)',
    paddingHorizontal: 18, paddingVertical: 10,
  },
  badgeText: { fontSize: 13, fontFamily: Font.semiBold, color: Colors.accent, textAlign: 'center' },
});

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 2 — Discover: mock event cards
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_EVENTS = [
  { name: 'SATURNO', venue: 'Discoteca Anima', date: 'Sab 26 Apr', price: '12€', genre: 'Techno' },
  { name: 'ROSE GOLD', venue: 'Club 31', date: 'Ven 25 Apr', price: '10€', genre: 'Hip-Hop' },
];

function SlideDiscover() {
  const card1Y = useRef(new Animated.Value(0)).current;
  const card2Y = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(card1Y, { toValue: -6, duration: 2400, useNativeDriver: true }),
        Animated.timing(card1Y, { toValue: 0, duration: 2400, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(card2Y, { toValue: -8, duration: 2200, useNativeDriver: true }),
        Animated.timing(card2Y, { toValue: 2, duration: 2200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={sd.container}>
      <Animated.View style={{ opacity: fadeIn, alignItems: 'center' }}>
        <Text style={sd.eyebrow}>SCOPERTA</Text>
        <Text style={sd.title}>Tutto a Padova,{'\n'}in un posto solo.</Text>
      </Animated.View>

      {/* Mock cards */}
      <View style={sd.cardsArea}>
        <Animated.View style={[sd.card, sd.cardBack, { transform: [{ translateY: card2Y }, { rotate: '3deg' }] }]}>
          <View style={sd.cardGradient}>
            <View style={sd.cardContent}>
              <Text style={sd.cardGenre}>{MOCK_EVENTS[1].genre}</Text>
              <Text style={sd.cardName}>{MOCK_EVENTS[1].name}</Text>
              <Text style={sd.cardVenue}>{MOCK_EVENTS[1].venue}</Text>
              <View style={sd.cardFooter}>
                <Text style={sd.cardDate}>{MOCK_EVENTS[1].date}</Text>
                <View style={sd.cardPrice}><Text style={sd.cardPriceText}>da {MOCK_EVENTS[1].price}</Text></View>
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={[sd.card, { transform: [{ translateY: card1Y }, { rotate: '-2deg' }] }]}>
          <LinearGradient
            colors={['rgba(168,85,247,0.6)', 'rgba(100,50,180,0.85)', '#07080f']}
            style={sd.cardGradient}
          >
            <View style={sd.cardContent}>
              <Text style={sd.cardGenre}>{MOCK_EVENTS[0].genre}</Text>
              <Text style={sd.cardName}>{MOCK_EVENTS[0].name}</Text>
              <Text style={sd.cardVenue}>{MOCK_EVENTS[0].venue}</Text>
              <View style={sd.cardFooter}>
                <Text style={sd.cardDate}>{MOCK_EVENTS[0].date}</Text>
                <View style={sd.cardPriceAccent}><Text style={sd.cardPriceText}>da {MOCK_EVENTS[0].price}</Text></View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>

      {/* Stats */}
      <Animated.View style={[sd.stats, { opacity: fadeIn }]}>
        {[['50+', 'eventi/mese'], ['3', 'city presto'], ['<30s', 'per comprare']].map(([val, label]) => (
          <View key={label} style={sd.stat}>
            <Text style={sd.statVal}>{val}</Text>
            <Text style={sd.statLabel}>{label}</Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const sd = StyleSheet.create({
  container: { width, flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 32 },
  eyebrow: { fontSize: 11, fontFamily: Font.bold, color: Colors.accent, letterSpacing: 3, marginBottom: 10 },
  title: { fontSize: 30, fontFamily: Font.black, color: Colors.textPrimary, textAlign: 'center', lineHeight: 36, marginBottom: 20 },
  cardsArea: { width: '100%', height: 180, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  card: {
    position: 'absolute',
    width: width * 0.72,
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  cardBack: { backgroundColor: 'rgba(40,20,70,0.9)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)' },
  cardGradient: { flex: 1 },
  cardContent: { flex: 1, padding: 18, justifyContent: 'space-between' },
  cardGenre: { fontSize: 11, fontFamily: Font.bold, color: 'rgba(255,255,255,0.6)', letterSpacing: 2 },
  cardName: { fontSize: 24, fontFamily: Font.black, color: Colors.white },
  cardVenue: { fontSize: 13, fontFamily: Font.medium, color: 'rgba(255,255,255,0.7)' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardDate: { fontSize: 13, fontFamily: Font.semiBold, color: 'rgba(255,255,255,0.6)' },
  cardPrice: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 4 },
  cardPriceAccent: { backgroundColor: Colors.accent, borderRadius: 50, paddingHorizontal: 12, paddingVertical: 4 },
  cardPriceText: { fontSize: 12, fontFamily: Font.bold, color: Colors.white },
  stats: { flexDirection: 'row', gap: 0, width: '100%', marginTop: 8 },
  stat: {
    flex: 1, alignItems: 'center', paddingVertical: 16,
    borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.07)',
  },
  statVal: { fontSize: 22, fontFamily: Font.black, color: Colors.accent },
  statLabel: { fontSize: 11, fontFamily: Font.medium, color: Colors.textMuted, marginTop: 2 },
});

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 3 — 3-tap flow: animated steps
// ─────────────────────────────────────────────────────────────────────────────
const STEPS = [
  { emoji: '🔍', label: 'Scegli\nl\'evento', color: Colors.accent },
  { emoji: '🎟️', label: 'Seleziona\nil biglietto', color: '#818cf8' },
  { emoji: '💳', label: 'Paga con\nApple Pay', color: '#22c55e' },
  { emoji: '✅', label: 'QR pronto\nall\'istante', color: '#f59e0b' },
];

function SlideFast() {
  const s0o = useRef(new Animated.Value(0)).current;
  const s1o = useRef(new Animated.Value(0)).current;
  const s2o = useRef(new Animated.Value(0)).current;
  const s3o = useRef(new Animated.Value(0)).current;
  const s0s = useRef(new Animated.Value(0.7)).current;
  const s1s = useRef(new Animated.Value(0.7)).current;
  const s2s = useRef(new Animated.Value(0.7)).current;
  const s3s = useRef(new Animated.Value(0.7)).current;
  const a0o = useRef(new Animated.Value(0)).current;
  const a1o = useRef(new Animated.Value(0)).current;
  const a2o = useRef(new Animated.Value(0)).current;
  const timerOpacity = useRef(new Animated.Value(0)).current;

  const stepOpacities = [s0o, s1o, s2o, s3o];
  const stepScales = [s0s, s1s, s2s, s3s];
  const arrowOpacities = [a0o, a1o, a2o];

  useEffect(() => {
    const sequence: Animated.CompositeAnimation[] = [];

    STEPS.forEach((_, i) => {
      sequence.push(
        Animated.parallel([
          Animated.timing(stepOpacities[i], { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(stepScales[i], { toValue: 1, duration: 350, useNativeDriver: true }),
        ])
      );
      if (i < 3) {
        sequence.push(
          Animated.timing(arrowOpacities[i], { toValue: 1, duration: 250, useNativeDriver: true })
        );
      }
    });

    sequence.push(
      Animated.timing(timerOpacity, { toValue: 1, duration: 400, useNativeDriver: true })
    );

    const loop = Animated.loop(
      Animated.sequence([
        Animated.sequence(sequence),
        Animated.delay(2000),
        Animated.parallel([
          ...stepOpacities.map((v) => Animated.timing(v, { toValue: 0, duration: 300, useNativeDriver: true })),
          ...stepScales.map((v) => Animated.timing(v, { toValue: 0.7, duration: 300, useNativeDriver: true })),
          ...arrowOpacities.map((v) => Animated.timing(v, { toValue: 0, duration: 300, useNativeDriver: true })),
          Animated.timing(timerOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
        Animated.delay(400),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={sf.container}>
      <Text style={sf.eyebrow}>VELOCITÀ</Text>
      <Text style={sf.title}>Compra in 3 tap.{'\n'}Sul serio.</Text>

      {/* Steps */}
      <View style={sf.stepsRow}>
        {STEPS.map((step, i) => (
          <React.Fragment key={i}>
            <Animated.View
              style={[
                sf.step,
                { opacity: stepOpacities[i], transform: [{ scale: stepScales[i] }] },
              ]}
            >
              <View style={[sf.stepCircle, { borderColor: step.color, shadowColor: step.color }]}>
                <Text style={sf.stepEmoji}>{step.emoji}</Text>
              </View>
              <Text style={[sf.stepLabel, { color: step.color }]}>{step.label}</Text>
            </Animated.View>
            {i < 3 && (
              <Animated.View style={[sf.arrow, { opacity: arrowOpacities[i] }]}>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
              </Animated.View>
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Timer badge */}
      <Animated.View style={[sf.timer, { opacity: timerOpacity }]}>
        <Text style={sf.timerEmoji}>⚡</Text>
        <Text style={sf.timerText}>Meno di 30 secondi</Text>
      </Animated.View>

      {/* Benefits */}
      <View style={sf.benefits}>
        {[
          '🍎 Apple Pay & Google Pay',
          '📶 Funziona anche offline',
          '📲 QR salvato automaticamente',
        ].map((b) => (
          <View key={b} style={sf.benefit}>
            <Text style={sf.benefitText}>{b}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const sf = StyleSheet.create({
  container: { width, flex: 1, alignItems: 'center', paddingHorizontal: 28, paddingTop: 32 },
  eyebrow: { fontSize: 11, fontFamily: Font.bold, color: Colors.accent, letterSpacing: 3, marginBottom: 10 },
  title: { fontSize: 30, fontFamily: Font.black, color: Colors.textPrimary, textAlign: 'center', lineHeight: 36, marginBottom: 32 },
  stepsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 28 },
  step: { alignItems: 'center', gap: 8, flex: 1 },
  stepCircle: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: 'rgba(168,85,247,0.1)',
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 12, elevation: 6,
  },
  stepEmoji: { fontSize: 24 },
  stepLabel: { fontSize: 10, fontFamily: Font.bold, textAlign: 'center', lineHeight: 14 },
  arrow: { alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  timer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 50, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
    paddingHorizontal: 18, paddingVertical: 10, marginBottom: 24,
  },
  timerEmoji: { fontSize: 16 },
  timerText: { fontSize: 14, fontFamily: Font.bold, color: '#f59e0b' },
  benefits: { gap: 10, width: '100%' },
  benefit: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  benefitText: { fontSize: 14, fontFamily: Font.medium, color: Colors.textSecondary },
});

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 4 — QR Experience: your ticket, always with you
// ─────────────────────────────────────────────────────────────────────────────
function SlideQR() {
  const glow = useRef(new Animated.Value(0.6)).current;
  const drinkPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.5, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(drinkPulse, { toValue: 1.1, duration: 800, useNativeDriver: true }),
        Animated.timing(drinkPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={sq.container}>
      <Text style={sq.eyebrow}>INGRESSO</Text>
      <Text style={sq.title}>Il tuo biglietto.{'\n'}Sempre con te.</Text>

      {/* Mock phone ticket */}
      <View style={sq.phone}>
        <View style={sq.ticket}>
          <LinearGradient
            colors={['rgba(168,85,247,0.3)', 'rgba(100,30,180,0.2)']}
            style={sq.ticketHeader}
          >
            <Text style={sq.ticketEvent}>SATURNO</Text>
            <Text style={sq.ticketVenue}>Discoteca Anima · Sab 26 Apr</Text>
          </LinearGradient>

          <View style={sq.ticketBody}>
            {/* Mock QR */}
            <Animated.View style={[sq.qrWrap, { opacity: glow }]}>
              <View style={sq.qrMock}>
                {Array.from({ length: 5 }).map((_, row) => (
                  <View key={row} style={sq.qrRow}>
                    {Array.from({ length: 5 }).map((_, col) => (
                      <View
                        key={col}
                        style={[
                          sq.qrCell,
                          {
                            backgroundColor:
                              (row + col) % 3 === 0 || (row * col) % 4 === 0
                                ? Colors.textPrimary
                                : 'transparent',
                          },
                        ]}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </Animated.View>

            <Text style={sq.qrLabel}>Scansiona per entrare</Text>

            {/* Drink badge */}
            <Animated.View style={[sq.drinkBadge, { transform: [{ scale: drinkPulse }] }]}>
              <Text style={sq.drinkEmoji}>🥂</Text>
              <Text style={sq.drinkText}>Free drink incluso</Text>
              <View style={sq.drinkDot} />
            </Animated.View>
          </View>
        </View>
      </View>

      {/* Perks */}
      <View style={sq.perks}>
        {[
          { icon: '📵', text: 'Funziona senza internet' },
          { icon: '🔒', text: 'QR unico e sicuro' },
          { icon: '⚡', text: 'Ingresso immediato' },
        ].map(({ icon, text }) => (
          <View key={text} style={sq.perk}>
            <Text style={sq.perkIcon}>{icon}</Text>
            <Text style={sq.perkText}>{text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const sq = StyleSheet.create({
  container: { width, flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 28 },
  eyebrow: { fontSize: 11, fontFamily: Font.bold, color: Colors.accent, letterSpacing: 3, marginBottom: 10 },
  title: { fontSize: 30, fontFamily: Font.black, color: Colors.textPrimary, textAlign: 'center', lineHeight: 36, marginBottom: 20 },
  phone: { width: width * 0.65, marginBottom: 20 },
  ticket: {
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)',
    backgroundColor: 'rgba(18,14,30,0.9)',
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 24, elevation: 12,
  },
  ticketHeader: { padding: 16 },
  ticketEvent: { fontSize: 18, fontFamily: Font.black, color: Colors.white },
  ticketVenue: { fontSize: 12, fontFamily: Font.medium, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  ticketBody: { padding: 16, alignItems: 'center', gap: 10 },
  qrWrap: {
    width: 100, height: 100, borderRadius: 12,
    backgroundColor: Colors.white, padding: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  qrMock: { gap: 4 },
  qrRow: { flexDirection: 'row', gap: 4 },
  qrCell: { width: 12, height: 12, borderRadius: 2 },
  qrLabel: { fontSize: 11, fontFamily: Font.medium, color: Colors.textMuted },
  drinkBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderRadius: 50, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
    paddingHorizontal: 14, paddingVertical: 6,
  },
  drinkEmoji: { fontSize: 14 },
  drinkText: { fontSize: 12, fontFamily: Font.semiBold, color: '#22c55e' },
  drinkDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  perks: { flexDirection: 'row', gap: 8, width: '100%' },
  perk: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    padding: 12, alignItems: 'center', gap: 6,
  },
  perkIcon: { fontSize: 22 },
  perkText: { fontSize: 11, fontFamily: Font.semiBold, color: Colors.textSecondary, textAlign: 'center', lineHeight: 16 },
});

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 5 — Commission: justify the 8%
// ─────────────────────────────────────────────────────────────────────────────
const WHAT_YOU_GET = [
  { emoji: '🎟️', text: 'Biglietto garantito' },
  { emoji: '🥂', text: 'Free drink incluso' },
  { emoji: '📲', text: 'QR digitale sicuro' },
  { emoji: '💬', text: 'Supporto immediato' },
  { emoji: '🚫', text: 'Zero PR, zero markup' },
];

function SlideCommission() {
  const barWidth = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const countVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.timing(barWidth, { toValue: 1, duration: 1200, useNativeDriver: false }).start();
  }, []);

  const barInterpolate = barWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '8%'],
  });

  return (
    <View style={sc.container}>
      <Animated.View style={{ opacity: fadeIn, alignItems: 'center' }}>
        <Text style={sc.eyebrow}>TRASPARENZA</Text>
        <Text style={sc.title}>L'8% che{'\n'}vale tutto.</Text>
      </Animated.View>

      {/* Price breakdown */}
      <Animated.View style={[sc.breakdown, { opacity: fadeIn }]}>
        <View style={sc.priceRow}>
          <Text style={sc.priceLabel}>Biglietto esempio</Text>
          <Text style={sc.priceValue}>15,00 €</Text>
        </View>
        <View style={sc.divider} />
        <View style={sc.priceRow}>
          <View>
            <Text style={sc.commLabel}>Commissione MyNox</Text>
            <Text style={sc.commSub}>8% fisso e trasparente</Text>
          </View>
          <Text style={sc.commValue}>1,20 €</Text>
        </View>

        {/* Bar */}
        <View style={sc.barTrack}>
          <Animated.View style={[sc.barFill, { width: barInterpolate }]} />
          <View style={sc.barRest} />
        </View>
        <View style={sc.barLabels}>
          <Text style={sc.barLabelAccent}>8% MyNox</Text>
          <Text style={sc.barLabelGray}>92% va all'evento</Text>
        </View>

        <View style={sc.vsRow}>
          <View style={sc.vsBadge}>
            <Text style={sc.vsBadgeText}>🚫 PR: 20-30% nascosto</Text>
          </View>
          <Text style={sc.vsArrow}>→</Text>
          <View style={sc.vsOurBadge}>
            <Text style={sc.vsOurText}>✓ Noi: 8% fisso</Text>
          </View>
        </View>
      </Animated.View>

      {/* What you get */}
      <Animated.View style={[sc.getWrap, { opacity: fadeIn }]}>
        <Text style={sc.getTitle}>Con quell'8% ottieni:</Text>
        <View style={sc.getGrid}>
          {WHAT_YOU_GET.map(({ emoji, text }) => (
            <View key={text} style={sc.getItem}>
              <Text style={sc.getEmoji}>{emoji}</Text>
              <Text style={sc.getText}>{text}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <Animated.View style={[sc.final, { opacity: fadeIn }]}>
        <Text style={sc.finalText}>☕ Meno di un caffè. Serata garantita.</Text>
      </Animated.View>
    </View>
  );
}

const sc = StyleSheet.create({
  container: { width, flex: 1, paddingHorizontal: 24, paddingTop: 28, alignItems: 'center' },
  eyebrow: { fontSize: 11, fontFamily: Font.bold, color: Colors.accent, letterSpacing: 3, marginBottom: 10 },
  title: { fontSize: 30, fontFamily: Font.black, color: Colors.textPrimary, textAlign: 'center', lineHeight: 36, marginBottom: 16 },
  breakdown: {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    padding: 18, marginBottom: 14,
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  priceLabel: { fontSize: 14, fontFamily: Font.medium, color: Colors.textSecondary },
  priceValue: { fontSize: 18, fontFamily: Font.black, color: Colors.textPrimary },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 12 },
  commLabel: { fontSize: 14, fontFamily: Font.semiBold, color: Colors.accent },
  commSub: { fontSize: 11, fontFamily: Font.regular, color: Colors.textMuted, marginTop: 2 },
  commValue: { fontSize: 18, fontFamily: Font.black, color: Colors.accent },
  barTrack: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 12, backgroundColor: 'rgba(255,255,255,0.08)' },
  barFill: { height: 8, backgroundColor: Colors.accent, borderRadius: 4 },
  barRest: { flex: 1, height: 8 },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  barLabelAccent: { fontSize: 11, fontFamily: Font.bold, color: Colors.accent },
  barLabelGray: { fontSize: 11, fontFamily: Font.medium, color: Colors.textMuted },
  vsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 },
  vsBadge: { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 50, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', paddingHorizontal: 10, paddingVertical: 5 },
  vsBadgeText: { fontSize: 11, fontFamily: Font.semiBold, color: '#ef4444' },
  vsArrow: { fontSize: 12, color: Colors.textMuted },
  vsOurBadge: { backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 50, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', paddingHorizontal: 10, paddingVertical: 5 },
  vsOurText: { fontSize: 11, fontFamily: Font.semiBold, color: '#22c55e' },
  getWrap: { width: '100%' },
  getTitle: { fontSize: 13, fontFamily: Font.bold, color: Colors.textSecondary, marginBottom: 10 },
  getGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  getItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(168,85,247,0.08)',
    borderRadius: 50, borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)',
    paddingHorizontal: 10, paddingVertical: 5,
  },
  getEmoji: { fontSize: 12 },
  getText: { fontSize: 11, fontFamily: Font.semiBold, color: Colors.textSecondary },
  final: {
    marginTop: 14, backgroundColor: 'rgba(168,85,247,0.1)',
    borderRadius: 50, borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)',
    paddingHorizontal: 18, paddingVertical: 10,
  },
  finalText: { fontSize: 13, fontFamily: Font.semiBold, color: Colors.accent },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding, setMusicGenres } = useAuth();
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
    router.replace('/login');
  }

  function handleScroll(e: { nativeEvent: { contentOffset: { x: number } } }) {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    if (index < TOTAL_SLIDES) setCurrentIndex(index);
  }

  const SLIDE_COMPONENTS = [
    <SlideWelcome key="welcome" />,
    <SlideNoPR key="nopr" />,
    <SlideDiscover key="discover" />,
    <SlideFast key="fast" />,
    <SlideQR key="qr" />,
  ];

  const SLIDE_GRADIENTS: [string, string, string][] = [
    ['rgba(168,85,247,0.22)', 'rgba(168,85,247,0.05)', 'transparent'],
    ['rgba(239,68,68,0.12)', 'rgba(168,85,247,0.08)', 'transparent'],
    ['rgba(168,85,247,0.18)', 'rgba(59,130,246,0.06)', 'transparent'],
    ['rgba(168,85,247,0.15)', 'rgba(99,102,241,0.08)', 'transparent'],
    ['rgba(34,197,94,0.1)', 'rgba(168,85,247,0.1)', 'transparent'],
    ['rgba(168,85,247,0.14)', 'rgba(168,85,247,0.04)', 'transparent'],
  ];

  const gradientIndex = Math.min(currentIndex, SLIDE_GRADIENTS.length - 1);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={SLIDE_GRADIENTS[gradientIndex]}
        style={styles.bgGradient}
        pointerEvents="none"
      />

      {/* Logo */}
      <SafeAreaView style={styles.logoBar}>
        <Image
          source={require('../assets/logo-cropped.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </SafeAreaView>

      {/* Slides scrollview */}
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
        /* Genre step */
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

      {/* Progress dots */}
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

      {/* Footer buttons */}
      <SafeAreaView style={styles.footer} edges={['bottom']}>
        <TouchableOpacity style={styles.ctaButton} onPress={goNext} activeOpacity={0.85}>
          <Text style={styles.ctaText}>
            {isGenreStep ? 'Inizia ora' : currentIndex === TOTAL_SLIDES - 1 ? 'Personalizza' : 'Avanti'}
          </Text>
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
  bgGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 500 },

  logoBar: { alignItems: 'center', paddingTop: 20 },
  logoImage: { width: 200, height: 56 },

  slider: { flex: 1 },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  dotActive: { width: 22, backgroundColor: Colors.accent },
  dotDone: { backgroundColor: 'rgba(168,85,247,0.45)' },

  // Genre step
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

  // Footer
  footer: { paddingHorizontal: 24, paddingBottom: 8, gap: 8 },
  ctaButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.accent, borderRadius: 18, paddingVertical: 18,
  },
  ctaText: { fontSize: 17, fontFamily: Font.extraBold, color: Colors.white },
  skipButton: { alignItems: 'center', paddingVertical: 10 },
  skipText: { fontSize: 14, fontFamily: Font.medium, color: Colors.textMuted },
});
