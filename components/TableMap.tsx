import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image as RNImage,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState, useEffect, useMemo } from 'react';
import { Table } from '../types';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';
import { useTranslation } from 'react-i18next';

const SCREEN_WIDTH = Dimensions.get('window').width;
const MAP_WIDTH = SCREEN_WIDTH - 40;
const DEFAULT_MAP_HEIGHT = MAP_WIDTH * 1.18;
const TABLE_SIZE = 48;

interface Props {
  tables: Table[];
  selected: Table | null;
  onSelect: (table: Table | null) => void;
  floorPlanUrl?: string;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function useZones(tables: Table[]) {
  return useMemo(() => {
    const seen = new Map<string, string>();
    tables.forEach((t) => {
      if (t.zone_label && t.zone_color && !seen.has(t.zone_label)) {
        seen.set(t.zone_label, t.zone_color);
      }
    });
    return Array.from(seen.entries()).map(([label, color]) => ({ label, color }));
  }, [tables]);
}

export default function TableMap({ tables, selected, onSelect, floorPlanUrl }: Props) {
  const { t } = useTranslation();
  const [mapHeight, setMapHeight] = useState(DEFAULT_MAP_HEIGHT);
  const zones = useZones(tables);

  useEffect(() => {
    if (floorPlanUrl) {
      RNImage.getSize(
        floorPlanUrl,
        (w, h) => setMapHeight(MAP_WIDTH * (h / w)),
        () => setMapHeight(DEFAULT_MAP_HEIGHT),
      );
    } else {
      setMapHeight(DEFAULT_MAP_HEIGHT);
    }
  }, [floorPlanUrl]);

  const mappedTables = tables.filter((tbl) => tbl.posX != null && tbl.posY != null);

  if (mappedTables.length === 0) {
    return <TableCards tables={tables} selected={selected} onSelect={onSelect} zones={zones} />;
  }

  const handlePress = (table: Table) => {
    if (!table.available) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(selected?.id === table.id ? null : table);
  };

  return (
    <View>
      {/* Mappa interattiva */}
      <View style={[styles.room, { width: MAP_WIDTH, height: mapHeight }]}>
        {floorPlanUrl ? (
          <Image
            source={{ uri: floorPlanUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <>
            <View style={styles.djBooth}>
              <Ionicons name="musical-notes" size={12} color="rgba(168,85,247,0.9)" />
              <Text style={styles.djBoothLabel}>DJ BOOTH</Text>
            </View>
            <View style={styles.danceFloor}>
              <Text style={styles.danceFloorLabel}>DANCE FLOOR</Text>
            </View>
            <View style={styles.bar}>
              <Ionicons name="wine" size={11} color="rgba(168,85,247,0.7)" />
              <Text style={styles.barLabel}>BAR</Text>
            </View>
            <View style={styles.entrance}>
              <Ionicons name="exit-outline" size={11} color={Colors.textMuted} />
              <Text style={styles.entranceLabel}>USCITA</Text>
            </View>
          </>
        )}

        {mappedTables.map((table) => {
          const isSelected = selected?.id === table.id;
          const isOccupied = !table.available;
          const left = table.posX! * MAP_WIDTH - TABLE_SIZE / 2;
          const top = table.posY! * mapHeight - TABLE_SIZE / 2;
          const zoneColor = table.zone_color ?? Colors.accent;

          const btnBg = isOccupied
            ? 'rgba(239,68,68,0.08)'
            : isSelected
            ? Colors.accent
            : 'rgba(34,197,94,0.10)';
          const btnBorder = isOccupied
            ? 'rgba(239,68,68,0.45)'
            : isSelected
            ? Colors.accent
            : 'rgba(34,197,94,0.55)';

          return (
            <TouchableOpacity
              key={table.id}
              style={[
                styles.tableBtn,
                { left, top, backgroundColor: btnBg, borderColor: btnBorder, borderWidth: isSelected ? 2 : 1.5 },
                isOccupied && styles.tableBtnOccupied,
              ]}
              onPress={() => handlePress(table)}
              activeOpacity={isOccupied ? 1 : 0.75}
            >
              {table.zone_label && !isOccupied && (
                <Text style={[styles.tableZoneBadge, { color: zoneColor, backgroundColor: Colors.background }]} numberOfLines={1}>
                  {table.zone_label.length > 3 ? table.zone_label.slice(0, 3) : table.zone_label}
                </Text>
              )}
              <Ionicons
                name="people"
                size={13}
                color={isOccupied ? 'rgba(239,68,68,0.6)' : isSelected ? Colors.white : 'rgba(34,197,94,0.7)'}
              />
              {table.capacity != null && (
                <Text style={[styles.tableCapacity, {
                  color: isOccupied ? 'rgba(239,68,68,0.7)' : isSelected ? Colors.white : 'rgba(34,197,94,0.9)',
                }]}>
                  {table.capacity}
                </Text>
              )}
              <Text
                style={[styles.tableLabel, {
                  color: isOccupied ? 'rgba(239,68,68,0.5)' : isSelected ? 'rgba(255,255,255,0.8)' : 'rgba(34,197,94,0.6)',
                }]}
                numberOfLines={1}
              >
                {table.label}
              </Text>
              {isOccupied && <View style={styles.tableXOverlay}><Text style={styles.tableXText}>✕</Text></View>}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legenda */}
      <View style={styles.legend}>
        <LegendDot color="rgba(34,197,94,0.12)" borderColor="rgba(34,197,94,0.55)" label={t('table_map.available')} />
        <LegendDot color={Colors.accent} borderColor={Colors.accent} label={t('table_map.selected')} />
        <LegendDot color="rgba(239,68,68,0.08)" borderColor="rgba(239,68,68,0.45)" label={t('table_map.occupied')} />
      </View>

      {/* Card tavolo selezionato */}
      {selected && (
        <View style={styles.selectedCard}>
          <View style={styles.selectedLeft}>
            <View style={[styles.selectedIconBox, selected.zone_color
              ? { backgroundColor: hexToRgba(selected.zone_color, 0.15) }
              : undefined,
            ]}>
              <Ionicons name="people" size={18} color={selected.zone_color ?? Colors.accent} />
            </View>
            <View>
              <Text style={styles.selectedLabel}>{selected.label}</Text>
              <Text style={styles.selectedSub}>
                {[
                  selected.zone_label ?? selected.section,
                  selected.capacity != null ? `${selected.capacity} ${t('table_map.seats')}` : null,
                  selected.minimum_spend != null ? `min. €${selected.minimum_spend}` : null,
                ].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </View>
          <View style={styles.selectedRight}>
            <Text style={styles.selectedPrice}>€{selected.deposit}</Text>
            <Text style={styles.selectedPriceSub}>{t('table_map.deposit')}</Text>
          </View>
        </View>
      )}

      {/* Lista completa tavoli */}
      <View style={styles.tableListSection}>
        <Text style={styles.tableListTitle}>{t('table_map.select_a_table')}</Text>
        <TableCards tables={tables} selected={selected} onSelect={onSelect} zones={zones} />
      </View>
    </View>
  );
}

// ─── Table Cards ──────────────────────────────────────────────────────────────

function TableCards({
  tables,
  selected,
  onSelect,
  zones,
}: Props & { zones: { label: string; color: string }[] }) {
  const { t } = useTranslation();
  return (
    <View style={styles.cardsContainer}>
      {tables.map((table) => {
        const isSelected = selected?.id === table.id;
        const isOccupied = !table.available;
        const zoneColor = table.zone_color ?? Colors.accent;

        return (
          <TouchableOpacity
            key={table.id}
            style={[
              styles.tableCard,
              isSelected && styles.tableCardSelected,
              isOccupied && styles.tableCardOccupied,
            ]}
            onPress={() => {
              if (isOccupied) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(isSelected ? null : table);
            }}
            activeOpacity={isOccupied ? 1 : 0.8}
          >
            {/* Barra colorata sinistra */}
            <View style={[styles.cardAccentBar, { backgroundColor: isOccupied ? 'rgba(239,68,68,0.35)' : zoneColor }]} />

            {/* Contenuto centrale */}
            <View style={styles.cardBody}>
              <View style={styles.cardTopRow}>
                {table.zone_label && (
                  <View style={[styles.zoneBadge, {
                    backgroundColor: hexToRgba(zoneColor, 0.14),
                    borderColor: hexToRgba(zoneColor, 0.3),
                  }]}>
                    <Text style={[styles.zoneBadgeText, { color: zoneColor }]}>{table.zone_label}</Text>
                  </View>
                )}
                <Text style={[styles.cardLabel, isOccupied && styles.cardLabelMuted]} numberOfLines={1}>
                  {table.label}
                </Text>
                {isOccupied && (
                  <View style={styles.soldOutBadge}>
                    <Text style={styles.soldOutText}>{t('common.sold_out')}</Text>
                  </View>
                )}
              </View>

              {(table.capacity != null || table.minimum_spend != null) && (
                <View style={styles.cardInfoRow}>
                  {table.capacity != null && (
                    <View style={styles.cardInfoItem}>
                      <Ionicons name="people-outline" size={11} color={Colors.textMuted} />
                      <Text style={styles.cardInfoText}>max {table.capacity} {t('table_map.seats')}</Text>
                    </View>
                  )}
                  {table.minimum_spend != null && (
                    <View style={styles.cardInfoItem}>
                      <Ionicons name="card-outline" size={11} color={Colors.textMuted} />
                      <Text style={styles.cardInfoText}>min. €{table.minimum_spend}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Destra: caparra + radio */}
            <View style={styles.cardRight}>
              <Text style={[styles.cardDeposit, isOccupied && styles.cardLabelMuted]}>€{table.deposit}</Text>
              <Text style={styles.cardDepositLabel}>{t('table_map.deposit')}</Text>
              {!isOccupied && (
                <View style={[styles.radioBtn, isSelected && styles.radioBtnActive]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Legend Dot ───────────────────────────────────────────────────────────────

function LegendDot({ color, borderColor, label }: { color: string; borderColor: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color, borderColor }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Map
  room: {
    backgroundColor: '#0d0e1a',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.border,
    overflow: 'hidden',
    position: 'relative',
  },

  // Room elements
  djBooth: {
    position: 'absolute', top: 14, left: '20%', right: '20%', height: 44,
    backgroundColor: Colors.accentBg, borderRadius: 10, borderWidth: 1, borderColor: Colors.accentBorder,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  djBoothLabel: { fontSize: 11, fontFamily: Font.bold, color: 'rgba(168,85,247,0.9)', letterSpacing: 1.5 },
  danceFloor: {
    position: 'absolute', top: '20%', left: '15%', right: '15%', height: '38%',
    backgroundColor: Colors.accentBg, borderRadius: 12, borderWidth: 1,
    borderColor: Colors.accentBg, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center',
  },
  danceFloorLabel: { fontSize: 10, fontFamily: Font.bold, color: Colors.accentBorder, letterSpacing: 2 },
  bar: {
    position: 'absolute', bottom: 58, right: 14, width: 72, height: 30,
    backgroundColor: Colors.accentBg, borderRadius: 8, borderWidth: 1, borderColor: Colors.accentBorder,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  barLabel: { fontSize: 9, fontFamily: Font.bold, color: 'rgba(168,85,247,0.6)', letterSpacing: 1.5 },
  entrance: {
    position: 'absolute', bottom: 10, left: '35%', right: '35%', height: 28,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  entranceLabel: { fontSize: 9, fontFamily: Font.bold, color: Colors.textMuted, letterSpacing: 1.5 },

  // Table buttons on map
  tableBtn: {
    position: 'absolute',
    width: TABLE_SIZE, height: TABLE_SIZE, borderRadius: TABLE_SIZE / 2,
    justifyContent: 'center', alignItems: 'center', gap: 1,
  },
  tableBtnOccupied: { opacity: 0.7 },
  tableZoneBadge: {
    position: 'absolute', top: -8,
    fontSize: 7, fontFamily: Font.bold,
    paddingHorizontal: 3, borderRadius: 3, letterSpacing: 0.3,
  },
  tableCapacity: { fontSize: 15, fontFamily: Font.extraBold, lineHeight: 17 },
  tableLabel: {
    fontSize: 7, fontFamily: Font.bold, lineHeight: 9,
    maxWidth: TABLE_SIZE - 8, textAlign: 'center',
  },
  tableXOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: TABLE_SIZE / 2, justifyContent: 'center', alignItems: 'center',
  },
  tableXText: { fontSize: 18, color: 'rgba(239,68,68,0.8)', fontFamily: Font.bold },

  // Legend
  legend: { flexDirection: 'row', gap: 14, marginTop: 12, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5 },
  legendLabel: { fontSize: 11, color: Colors.textMuted, fontFamily: Font.regular },

  // Selected card
  selectedCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 12, backgroundColor: Colors.accentBg,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.accentBorder, padding: 14,
  },
  selectedLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  selectedIconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.accentBg, justifyContent: 'center', alignItems: 'center',
  },
  selectedLabel: { fontSize: 14, fontFamily: Font.semiBold, color: Colors.textPrimary },
  selectedSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  selectedRight: { alignItems: 'flex-end' },
  selectedPrice: { fontSize: 20, fontFamily: Font.extraBold, color: Colors.accent },
  selectedPriceSub: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },

  // Table list section
  tableListSection: { marginTop: 16 },
  tableListTitle: { fontSize: 12, fontFamily: Font.semiBold, color: Colors.textMuted, marginBottom: 8, letterSpacing: 0.5 },

  // Table cards
  cardsContainer: { gap: 8 },
  tableCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  tableCardSelected: { borderColor: Colors.accent, backgroundColor: Colors.surfaceElevated },
  tableCardOccupied: { opacity: 0.45 },

  cardAccentBar: { width: 4 },
  cardBody: { flex: 1, paddingVertical: 12, paddingLeft: 12, paddingRight: 4 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' },

  zoneBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  zoneBadgeText: { fontSize: 10, fontFamily: Font.bold, letterSpacing: 0.3 },

  cardLabel: { fontSize: 14, fontFamily: Font.semiBold, color: Colors.textPrimary, flex: 1 },
  cardLabelMuted: { color: Colors.textMuted },

  soldOutBadge: { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  soldOutText: { fontSize: 9, fontFamily: Font.bold, color: 'rgba(239,68,68,0.8)' },

  cardInfoRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  cardInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardInfoText: { fontSize: 11, color: Colors.textMuted, fontFamily: Font.regular },

  cardRight: { alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 12, gap: 2 },
  cardDeposit: { fontSize: 16, fontFamily: Font.bold, color: Colors.accent },
  cardDepositLabel: { fontSize: 10, color: Colors.textMuted },

  radioBtn: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1.5, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center', marginTop: 4,
  },
  radioBtnActive: { borderColor: Colors.accent },
  radioDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: Colors.accent },
});
