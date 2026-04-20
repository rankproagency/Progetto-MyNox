import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState, useEffect } from 'react';
import { Table } from '../types';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';

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

export default function TableMap({ tables, selected, onSelect, floorPlanUrl }: Props) {
  const [mapHeight, setMapHeight] = useState(DEFAULT_MAP_HEIGHT);

  useEffect(() => {
    if (floorPlanUrl) {
      Image.getSize(
        floorPlanUrl,
        (w, h) => setMapHeight(MAP_WIDTH * (h / w)),
        () => setMapHeight(DEFAULT_MAP_HEIGHT),
      );
    } else {
      setMapHeight(DEFAULT_MAP_HEIGHT);
    }
  }, [floorPlanUrl]);

  // Tavoli con posizione esplicita → mostrati sulla mappa
  const mappedTables = tables.filter((t) => t.posX !== undefined);
  // Tavoli senza posizione → mostrati in lista sotto la mappa
  const unmappedTables = tables.filter((t) => t.posX === undefined);

  if (mappedTables.length === 0) {
    // Nessun tavolo posizionato: solo lista
    return <TableList tables={tables} selected={selected} onSelect={onSelect} />;
  }

  const handlePress = (table: Table) => {
    if (!table.available) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(selected?.id === table.id ? null : table);
  };

  return (
    <View>
      {/* Mappa interattiva — solo tavoli con posizione */}
      <View style={[styles.room, { width: MAP_WIDTH, height: mapHeight }]}>

        {/* Sfondo: piantina reale o stanza mock */}
        {floorPlanUrl ? (
          <Image
            source={{ uri: floorPlanUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <>
            {/* DJ BOOTH */}
            <View style={styles.djBooth}>
              <Ionicons name="musical-notes" size={12} color="rgba(168,85,247,0.9)" />
              <Text style={styles.djBoothLabel}>DJ BOOTH</Text>
            </View>
            {/* DANCE FLOOR */}
            <View style={styles.danceFloor}>
              <Text style={styles.danceFloorLabel}>DANCE FLOOR</Text>
            </View>
            {/* BAR */}
            <View style={styles.bar}>
              <Ionicons name="wine" size={11} color="rgba(168,85,247,0.7)" />
              <Text style={styles.barLabel}>BAR</Text>
            </View>
            {/* USCITA */}
            <View style={styles.entrance}>
              <Ionicons name="exit-outline" size={11} color={Colors.textMuted} />
              <Text style={styles.entranceLabel}>USCITA</Text>
            </View>
          </>
        )}

        {/* Solo i tavoli con posizione esplicita */}
        {mappedTables.map((table) => {
          const isSelected = selected?.id === table.id;
          const isOccupied = !table.available;
          const left = table.posX! * MAP_WIDTH - TABLE_SIZE / 2;
          const top = table.posY! * mapHeight - TABLE_SIZE / 2;
          const isVIP = table.section === 'VIP';

          return (
            <TouchableOpacity
              key={table.id}
              style={[
                styles.tableBtn,
                isVIP && styles.tableBtnVip,
                isSelected && styles.tableBtnSelected,
                isOccupied && styles.tableBtnOccupied,
                { left, top },
              ]}
              onPress={() => handlePress(table)}
              activeOpacity={isOccupied ? 1 : 0.75}
            >
              {isVIP && !isOccupied && !isSelected && (
                <Text style={styles.tableVipBadge}>VIP</Text>
              )}
              <Ionicons
                name="people"
                size={13}
                color={
                  isOccupied ? 'rgba(239,68,68,0.6)'
                  : isSelected ? Colors.white
                  : 'rgba(34,197,94,0.7)'
                }
              />
              <Text
                style={[
                  styles.tableCapacity,
                  isSelected && styles.tableCapacitySelected,
                  isOccupied && styles.tableCapacityOccupied,
                ]}
              >
                {table.capacity}
              </Text>
              <Text
                style={[
                  styles.tableLabel,
                  isSelected && styles.tableLabelSelected,
                  isOccupied && styles.tableLabelOccupied,
                ]}
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
        <LegendDot color="rgba(34,197,94,0.12)" borderColor="rgba(34,197,94,0.55)" label="Disponibile" />
        <LegendDot color={Colors.accent} borderColor={Colors.accent} label="Selezionato" />
        <LegendDot color="rgba(239,68,68,0.08)" borderColor="rgba(239,68,68,0.45)" label="Occupato" />
      </View>

      {/* Info tavolo selezionato */}
      {selected && (
        <View style={styles.selectedCard}>
          <View style={styles.selectedLeft}>
            <View style={styles.selectedIconBox}>
              <Ionicons name="people" size={18} color={Colors.accent} />
            </View>
            <View>
              <Text style={styles.selectedLabel}>{selected.label}</Text>
              <Text style={styles.selectedSub}>
                {selected.capacity} posti · {selected.section}
                {selected.section === 'VIP' ? ' ✦' : ''}
              </Text>
            </View>
          </View>
          <View style={styles.selectedRight}>
            <Text style={styles.selectedPrice}>€{selected.deposit}</Text>
            <Text style={styles.selectedPriceSub}>caparra</Text>
          </View>
        </View>
      )}

      {/* Lista completa di tutti i tavoli — sempre visibile */}
      <View style={styles.unmappedSection}>
        <Text style={styles.unmappedTitle}>Seleziona un tavolo</Text>
        <TableList tables={tables} selected={selected} onSelect={onSelect} />
      </View>
    </View>
  );
}

// ─── Fallback: lista quando non ci sono posizioni ─────────────────────────────

function TableList({ tables, selected, onSelect }: Props) {
  return (
    <View style={styles.listContainer}>
      <TouchableOpacity
        style={[styles.listRow, selected === null && styles.listRowSelected]}
        onPress={() => onSelect(null)}
        activeOpacity={0.8}
      >
        <View style={styles.listLeft}>
          <View style={[styles.radio, selected === null && styles.radioActive]}>
            {selected === null && <View style={styles.radioDot} />}
          </View>
          <Text style={styles.listLabel}>Nessun tavolo</Text>
        </View>
      </TouchableOpacity>
      {tables.map((table) => (
        <TouchableOpacity
          key={table.id}
          style={[
            styles.listRow,
            selected?.id === table.id && styles.listRowSelected,
            !table.available && styles.listRowDisabled,
          ]}
          onPress={() => table.available && onSelect(selected?.id === table.id ? null : table)}
          activeOpacity={table.available ? 0.8 : 1}
        >
          <View style={styles.listLeft}>
            <View style={[styles.radio, selected?.id === table.id && styles.radioActive]}>
              {selected?.id === table.id && <View style={styles.radioDot} />}
            </View>
            <View>
              <Text style={[styles.listLabel, !table.available && styles.listLabelMuted]}>
                {table.label}
              </Text>
              {!table.available && <Text style={styles.listSoldOut}>Esaurito</Text>}
            </View>
          </View>
          <View style={styles.listRight}>
            <Text style={[styles.listPrice, !table.available && styles.listLabelMuted]}>
              €{table.deposit}
            </Text>
            <Text style={styles.listPriceSub}>caparra</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function LegendDot({
  color,
  borderColor,
  label,
  opacity = 1,
}: {
  color: string;
  borderColor: string;
  label: string;
  opacity?: number;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color, borderColor, opacity }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // ─── Room ──────────────────────────────────────────────────────────────────
  room: {
    backgroundColor: '#0d0e1a',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.border,
    overflow: 'hidden',
    position: 'relative',
  },

  // ─── Room Elements ─────────────────────────────────────────────────────────
  djBooth: {
    position: 'absolute',
    top: 14,
    left: '20%',
    right: '20%',
    height: 44,
    backgroundColor: 'rgba(168,85,247,0.12)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  djBoothLabel: {
    fontSize: 11,
    fontFamily: Font.bold,
    color: 'rgba(168,85,247,0.9)',
    letterSpacing: 1.5,
  },

  danceFloor: {
    position: 'absolute',
    top: '20%',
    left: '15%',
    right: '15%',
    height: '38%',
    backgroundColor: 'rgba(168,85,247,0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.12)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  danceFloorLabel: {
    fontSize: 10,
    fontFamily: Font.bold,
    color: 'rgba(168,85,247,0.3)',
    letterSpacing: 2,
  },

  bar: {
    position: 'absolute',
    bottom: 58,
    right: 14,
    width: 72,
    height: 30,
    backgroundColor: 'rgba(168,85,247,0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  barLabel: {
    fontSize: 9,
    fontFamily: Font.bold,
    color: 'rgba(168,85,247,0.6)',
    letterSpacing: 1.5,
  },

  entrance: {
    position: 'absolute',
    bottom: 10,
    left: '35%',
    right: '35%',
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  entranceLabel: {
    fontSize: 9,
    fontFamily: Font.bold,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },

  // ─── Table buttons ─────────────────────────────────────────────────────────
  tableBtn: {
    position: 'absolute',
    width: TABLE_SIZE,
    height: TABLE_SIZE,
    borderRadius: TABLE_SIZE / 2,
    backgroundColor: 'rgba(34,197,94,0.10)',
    borderWidth: 1.5,
    borderColor: 'rgba(34,197,94,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 1,
  },
  tableBtnVip: {
    backgroundColor: 'rgba(34,197,94,0.14)',
    borderColor: '#22c55e',
    borderWidth: 2,
  },
  tableBtnSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  tableBtnOccupied: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderColor: 'rgba(239,68,68,0.45)',
    opacity: 0.7,
  },

  tableVipBadge: {
    position: 'absolute',
    top: -8,
    fontSize: 8,
    fontFamily: Font.bold,
    color: Colors.accent,
    backgroundColor: '#07080f',
    paddingHorizontal: 4,
    borderRadius: 4,
    letterSpacing: 0.5,
  },

  tableCapacity: {
    fontSize: 16,
    fontFamily: Font.extraBold,
    color: 'rgba(34,197,94,0.9)',
    lineHeight: 18,
  },
  tableCapacitySelected: { color: Colors.white },
  tableCapacityOccupied: { color: 'rgba(239,68,68,0.7)' },

  tableLabel: {
    fontSize: 8,
    fontFamily: Font.bold,
    color: 'rgba(34,197,94,0.6)',
    lineHeight: 10,
    maxWidth: TABLE_SIZE - 8,
    textAlign: 'center',
  },
  tableLabelSelected: { color: 'rgba(255,255,255,0.8)' },
  tableLabelOccupied: { color: 'rgba(239,68,68,0.5)' },

  tableXOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: TABLE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableXText: {
    fontSize: 18,
    color: 'rgba(239,68,68,0.8)',
    fontWeight: '700',
  },

  // ─── Legend ────────────────────────────────────────────────────────────────
  legend: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  legendLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: Font.regular,
  },

  // ─── Selected card ─────────────────────────────────────────────────────────
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    backgroundColor: 'rgba(168,85,247,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)',
    padding: 14,
  },
  selectedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(168,85,247,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedLabel: {
    fontSize: 14,
    fontFamily: Font.semiBold,
    color: Colors.textPrimary,
  },
  selectedSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  selectedRight: {
    alignItems: 'flex-end',
  },
  selectedPrice: {
    fontSize: 20,
    fontFamily: Font.extraBold,
    color: Colors.accent,
  },
  selectedPriceSub: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 1,
  },

  // ─── Unmapped section ──────────────────────────────────────────────────────
  unmappedSection: { marginTop: 16 },
  unmappedTitle: {
    fontSize: 12,
    fontFamily: Font.semiBold,
    color: Colors.textMuted,
    marginBottom: 8,
    letterSpacing: 0.5,
  },

  // ─── List fallback ─────────────────────────────────────────────────────────
  listContainer: { gap: 8 },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  listRowSelected: { borderColor: Colors.accent, backgroundColor: Colors.surfaceElevated },
  listRowDisabled: { opacity: 0.4 },
  listLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  listRight: { alignItems: 'flex-end' },
  listLabel: { fontSize: 14, fontFamily: Font.semiBold, color: Colors.textPrimary },
  listLabelMuted: { color: Colors.textMuted },
  listSoldOut: { fontSize: 11, color: Colors.error, marginTop: 2 },
  listPrice: { fontSize: 16, fontFamily: Font.bold, color: Colors.accent },
  listPriceSub: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: { borderColor: Colors.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.accent },
});
