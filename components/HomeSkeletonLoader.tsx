import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { Colors } from '../constants/colors';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.78;

function usePulse() {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return anim;
}

function Bone({ w, h, radius = 8, style }: { w: number | string; h: number; radius?: number; style?: object }) {
  const opacity = usePulse();
  return (
    <Animated.View
      style={[
        { width: w as number, height: h, borderRadius: radius, backgroundColor: '#1e1e2e', opacity },
        style,
      ]}
    />
  );
}

function CardSkeleton() {
  return (
    <View style={styles.card}>
      <Bone w={CARD_WIDTH} h={300} radius={20} />
    </View>
  );
}

function ListItemSkeleton() {
  return (
    <View style={styles.listItem}>
      <Bone w={56} h={56} radius={12} />
      <View style={styles.listItemInfo}>
        <Bone w="70%" h={14} radius={6} />
        <Bone w="45%" h={11} radius={6} style={{ marginTop: 8 }} />
        <Bone w="55%" h={10} radius={6} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

export default function HomeSkeletonLoader() {
  return (
    <View style={styles.container}>
      {/* Sezione titolo "In evidenza" */}
      <Bone w={120} h={16} radius={6} style={styles.sectionTitle} />

      {/* Carousel skeletons */}
      <View style={styles.carousel}>
        <CardSkeleton />
        <CardSkeleton />
      </View>

      {/* Sezione titolo "Questa settimana" */}
      <Bone w={150} h={16} radius={6} style={styles.sectionTitle} />

      {/* Separatore giorno */}
      <View style={styles.dayRow}>
        <Bone w={80} h={11} radius={4} />
        <View style={styles.dayLine} />
      </View>

      {/* List items */}
      <ListItemSkeleton />
      <ListItemSkeleton />
      <ListItemSkeleton />

      {/* Secondo giorno */}
      <View style={[styles.dayRow, { marginTop: 16 }]}>
        <Bone w={80} h={11} radius={4} />
        <View style={styles.dayLine} />
      </View>

      <ListItemSkeleton />
      <ListItemSkeleton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 100,
  },
  sectionTitle: {
    marginHorizontal: 20,
    marginBottom: 14,
    marginTop: 4,
  },
  carousel: {
    flexDirection: 'row',
    paddingLeft: 20,
    gap: 14,
    marginBottom: 32,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  listItemInfo: {
    flex: 1,
    gap: 0,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 14,
  },
  dayLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
});
