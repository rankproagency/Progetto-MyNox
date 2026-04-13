import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';
import { useAuth } from '../contexts/AuthContext';
import { ALL_GENRES } from '../lib/mockData';
import { Genre } from '../types';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: 'musical-notes' as const,
    title: 'Scopri la nightlife',
    subtitle: 'Tutti gli eventi nella tua città, in un unico posto. Niente più ricerche infinite.',
    accent: 'rgba(168,85,247,0.15)',
  },
  {
    icon: 'ticket' as const,
    title: 'Biglietti in 3 tap',
    subtitle: 'Scegli l\'evento, seleziona il tipo di biglietto, paga. Free drink incluso.',
    accent: 'rgba(168,85,247,0.12)',
  },
  {
    icon: 'qr-code' as const,
    title: 'Entra con un tap',
    subtitle: 'Il tuo QR biglietto sempre con te. Niente code, niente carta, niente PR.',
    accent: 'rgba(168,85,247,0.10)',
  },
];

const TOTAL_STEPS = SLIDES.length + 1; // +1 for genre selection step

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding, setMusicGenres } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  const isGenreStep = currentIndex === SLIDES.length;

  function toggleGenre(genre: Genre) {
    Haptics.selectionAsync();
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  }

  function goNext() {
    Haptics.selectionAsync();
    if (currentIndex < SLIDES.length - 1) {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
    } else if (currentIndex === SLIDES.length - 1) {
      setCurrentIndex(SLIDES.length);
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
    if (index < SLIDES.length) setCurrentIndex(index);
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(168,85,247,0.18)', 'transparent']}
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

      {/* Slides */}
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
          {SLIDES.map((slide, i) => (
            <View key={i} style={styles.slide}>
              <View style={[styles.iconContainer, { backgroundColor: slide.accent }]}>
                <Ionicons name={slide.icon} size={64} color={Colors.accent} />
              </View>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.subtitle}>{slide.subtitle}</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.genreStep}>
          <Text style={styles.genreTitle}>Che musica ti piace?</Text>
          <Text style={styles.genreSubtitle}>
            Seleziona i generi che ami — ti mostriamo gli eventi giusti.
          </Text>
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
            <Text style={styles.genreCount}>{selectedGenres.length} selezionati</Text>
          )}
        </View>
      )}

      {/* Dots */}
      <View style={styles.dots}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
        ))}
      </View>

      {/* Buttons */}
      <SafeAreaView style={styles.footer}>
        <TouchableOpacity style={styles.ctaButton} onPress={goNext} activeOpacity={0.85}>
          <Text style={styles.ctaText}>
            {isGenreStep ? 'Inizia' : 'Avanti'}
          </Text>
          <Ionicons
            name={isGenreStep ? 'checkmark' : 'arrow-forward'}
            size={18}
            color={Colors.white}
          />
        </TouchableOpacity>

        {!isGenreStep && (
          <TouchableOpacity style={styles.skipButton} onPress={handleStart} activeOpacity={0.7}>
            <Text style={styles.skipText}>Salta</Text>
          </TouchableOpacity>
        )}
        {isGenreStep && selectedGenres.length === 0 && (
          <TouchableOpacity style={styles.skipButton} onPress={handleStart} activeOpacity={0.7}>
            <Text style={styles.skipText}>Salta per ora</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  bgGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 400 },

  logoBar: { alignItems: 'center', paddingTop: 28 },
  logoImage: {
    width: 220,
    height: 62,
  },

  slider: { flex: 1 },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 24,
  },
  iconContainer: {
    width: 140, height: 140, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 32, fontFamily: Font.black, color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16, fontFamily: Font.regular, color: Colors.textSecondary, textAlign: 'center',
    lineHeight: 26,
  },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingBottom: 16 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  dotActive: { width: 20, backgroundColor: Colors.accent },

  // Genre step
  genreStep: {
    flex: 1, paddingHorizontal: 28, paddingTop: 24,
  },
  genreTitle: {
    fontSize: 30, fontFamily: Font.black, color: Colors.textPrimary,
    textAlign: 'center', marginBottom: 10,
  },
  genreSubtitle: {
    fontSize: 15, fontFamily: Font.regular, color: Colors.textSecondary, textAlign: 'center',
    lineHeight: 24, marginBottom: 32,
  },
  genreGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center',
  },
  genreChip: {
    paddingHorizontal: 18, paddingVertical: 11,
    borderRadius: 50, borderWidth: 1.5,
    borderColor: 'rgba(168,85,247,0.35)',
    backgroundColor: 'rgba(168,85,247,0.07)',
  },
  genreChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  genreChipText: { fontSize: 14, fontFamily: Font.bold, color: Colors.accent },
  genreChipTextActive: { color: Colors.white },
  genreCount: {
    textAlign: 'center', marginTop: 20,
    fontSize: 13, color: Colors.accent, fontWeight: '600',
  },

  footer: { paddingHorizontal: 24, paddingBottom: 8, gap: 8 },
  ctaButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 18, paddingVertical: 18,
  },
  ctaText: { fontSize: 17, fontFamily: Font.extraBold, color: Colors.white },
  skipButton: { alignItems: 'center', paddingVertical: 12 },
  skipText: { fontSize: 14, fontFamily: Font.medium, color: Colors.textMuted },
});
