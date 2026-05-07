import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';
import { useAuth } from '../contexts/AuthContext';
import { ALL_GENRES, GENRE_CONFIG } from '../constants/genres';
import { Genre } from '../types';

function formatDOB(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

const MIN_DOB = new Date();
MIN_DOB.setFullYear(MIN_DOB.getFullYear() - 14);

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser, updateDateOfBirth, deleteAccount, musicGenres, setMusicGenres } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(musicGenres);

  const initialDOB = user?.dateOfBirth ? new Date(user.dateOfBirth) : null;
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(initialDOB);
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(initialDOB ?? MIN_DOB);
  const [deletingAccount, setDeletingAccount] = useState(false);

  function toggleGenre(genre: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  }

  function handleSave() {
    if (!name.trim()) {
      Alert.alert('Errore', 'Il nome non può essere vuoto.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Errore', 'Inserisci un indirizzo email valido.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateUser({ name: name.trim(), email: email.trim() });
    if (dateOfBirth && dateOfBirth.toISOString().split('T')[0] !== user?.dateOfBirth) {
      updateDateOfBirth(dateOfBirth);
    }
    setMusicGenres(selectedGenres);
    router.back();
  }

  function handlePickerChange(_: any, selected?: Date) {
    if (selected) setTempDate(selected);
  }

  function confirmDate() {
    setDateOfBirth(tempDate);
    setShowPicker(false);
    Haptics.selectionAsync();
  }

  function handleDeleteAccount() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Elimina account',
      'Questa azione è irreversibile. Tutti i tuoi dati, biglietti e preferiti verranno eliminati definitivamente.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina definitivamente',
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true);
            try {
              await deleteAccount();
            } catch (e: any) {
              setDeletingAccount(false);
              Alert.alert('Errore', e.message ?? 'Impossibile eliminare l\'account. Riprova.');
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modifica profilo</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>{name.charAt(0) || '?'}</Text>
            </View>
          </View>

          {/* Campi */}
          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Nome completo</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Il tuo nome"
              placeholderTextColor={Colors.textMuted}
              autoCorrect={false}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="email@esempio.com"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Generi musicali</Text>
            <View style={styles.genresList}>
              {ALL_GENRES.map((genre) => {
                const active = selectedGenres.includes(genre);
                const cfg = GENRE_CONFIG[genre as Genre];
                return (
                  <TouchableOpacity
                    key={genre}
                    onPress={() => toggleGenre(genre)}
                    activeOpacity={0.75}
                  >
                    <View style={[
                      styles.genreTag,
                      active
                        ? { backgroundColor: cfg.color.replace(/[\d.]+\)$/, '0.15)'), borderColor: cfg.color.replace(/[\d.]+\)$/, '0.6)') }
                        : undefined,
                    ]}>
                      <Text style={[
                        styles.genreTagText,
                        active && { color: cfg.color.replace(/[\d.]+\)$/, '1)'), fontFamily: Font.bold },
                      ]}>{genre}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Data di nascita */}
          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Data di nascita</Text>
            <TouchableOpacity
              style={styles.changePasswordBtn}
              activeOpacity={0.8}
              onPress={() => { Haptics.selectionAsync(); setShowPicker(true); }}
            >
              <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
              <Text style={[styles.changePasswordText, !dateOfBirth && { color: Colors.textMuted }]}>
                {dateOfBirth ? formatDOB(dateOfBirth) : 'Non impostata'}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Password</Text>
            <TouchableOpacity
              style={styles.changePasswordBtn}
              activeOpacity={0.8}
              onPress={() => router.push('/change-password')}
            >
              <Ionicons name="lock-closed-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.changePasswordText}>Cambia password</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Elimina account */}
          <View style={[styles.section, styles.dangerZone]}>
            <Text style={styles.dangerLabel}>Zona pericolosa</Text>
            <TouchableOpacity
              style={styles.deleteBtn}
              activeOpacity={0.8}
              onPress={handleDeleteAccount}
              disabled={deletingAccount}
            >
              <Ionicons name="trash-outline" size={16} color={Colors.error} />
              <Text style={styles.deleteBtnText}>
                {deletingAccount ? 'Eliminazione in corso...' : 'Elimina account'}
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>

        {/* CTA */}
        <View style={styles.ctaContainer}>
          <TouchableOpacity style={styles.ctaButton} activeOpacity={0.85} onPress={handleSave}>
            <Text style={styles.ctaText}>Salva modifiche</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      {showPicker && (
        <Modal transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
          <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowPicker(false)} />
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={styles.pickerCancel}>Annulla</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>Data di nascita</Text>
              <TouchableOpacity onPress={confirmDate}>
                <Text style={styles.pickerConfirm}>Conferma</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="spinner"
              maximumDate={MIN_DOB}
              minimumDate={new Date(1920, 0, 1)}
              onChange={handlePickerChange}
              textColor={Colors.textPrimary}
              locale="it-IT"
              style={styles.picker}
            />
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 16, fontFamily: Font.bold, color: Colors.textPrimary },
  backButton: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  scroll: { padding: 20, paddingBottom: 120 },

  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { fontSize: 32, fontFamily: Font.extraBold, color: Colors.white },

  section: { marginBottom: 20 },
  fieldLabel: { fontSize: 12, fontFamily: Font.semiBold, color: Colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: Colors.textPrimary,
  },

  changePasswordBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  changePasswordText: { flex: 1, fontSize: 15, color: Colors.textSecondary },

  note: {
    flexDirection: 'row', gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    padding: 12, marginTop: 8,
  },
  noteText: { flex: 1, fontSize: 12, color: Colors.textMuted, lineHeight: 18 },

  ctaContainer: {
    paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  ctaButton: {
    backgroundColor: Colors.accent,
    borderRadius: 16, paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: { fontSize: 16, fontFamily: Font.extraBold, color: Colors.white },

  genresList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genreTag: {
    borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  genreTagText: { fontSize: 13, fontFamily: Font.semiBold, color: Colors.textMuted },
  genreTagTextActive: { fontSize: 13, fontFamily: Font.semiBold, color: '#ffffff' },

  dangerZone: { marginTop: 12, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 24 },
  dangerLabel: { fontSize: 12, fontFamily: Font.semiBold, color: Colors.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(239,68,68,0.06)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  deleteBtnText: { fontSize: 15, fontFamily: Font.medium, color: Colors.error },

  pickerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  pickerSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderBottomWidth: 0, borderColor: Colors.border,
    paddingBottom: 40,
  },
  pickerHandle: {
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
    width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border,
  },
  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  pickerTitle: { fontSize: 15, fontFamily: Font.bold, color: Colors.textPrimary },
  pickerCancel: { fontSize: 15, color: Colors.textMuted },
  pickerConfirm: { fontSize: 15, fontFamily: Font.bold, color: Colors.accent },
  picker: { width: '100%' },
});
