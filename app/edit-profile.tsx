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
  ActivityIndicator,
  Switch,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';
import { useAuth } from '../contexts/AuthContext';
import { ALL_GENRES, GENRE_CONFIG } from '../constants/genres';
import { Genre } from '../types';
import { useTranslation } from 'react-i18next';
import { getLocale } from '../lib/i18n';

function formatDOB(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}


const GENDER_OPTIONS = [
  { value: 'donna', label: 'Donna' },
  { value: 'uomo', label: 'Uomo' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'non-specificato', label: 'Preferisco non dirlo' },
];

export default function EditProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, updateUser, updateDateOfBirth, updateMarketingConsent, updateGender, deleteAccount, musicGenres, setMusicGenres } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(musicGenres);
  const [selectedGender, setSelectedGender] = useState(user?.gender ?? '');
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const MAX_DOB = new Date();
  MAX_DOB.setFullYear(MAX_DOB.getFullYear() - 14);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [dobTempDate, setDobTempDate] = useState<Date>(MAX_DOB);
  const [savingDob, setSavingDob] = useState(false);

  async function handleDobConfirm() {
    setSavingDob(true);
    try {
      await updateDateOfBirth(dobTempDate);
    } finally {
      setSavingDob(false);
      setShowDobPicker(false);
    }
  }

  function toggleGenre(genre: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  }

  function handleSave() {
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('edit_profile.error_name_empty'));
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateUser({ name: name.trim() });
    setMusicGenres(selectedGenres);
    if (selectedGender !== (user?.gender ?? '')) updateGender(selectedGender);
    router.back();
  }

  function handleDeleteAccount() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      t('edit_profile.delete_alert_title'),
      t('edit_profile.delete_alert_body'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('edit_profile.delete_confirm_btn'),
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true);
            try {
              await deleteAccount();
            } catch (e: any) {
              setDeletingAccount(false);
              Alert.alert(t('common.error'), e.message ?? t('edit_profile.error_delete_failed'));
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
        <Text style={styles.headerTitle}>{t('edit_profile.header_title')}</Text>
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
            <Text style={styles.fieldLabel}>{t('edit_profile.full_name_label')}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t('edit_profile.full_name_placeholder')}
              placeholderTextColor={Colors.textMuted}
              autoCorrect={false}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>{t('edit_profile.email_label')}</Text>
            <View style={styles.readonlyRow}>
              <Ionicons name="mail-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.readonlyText}>{user?.email ?? '—'}</Text>
              <Ionicons name="lock-closed" size={13} color={Colors.textMuted} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>{t('edit_profile.genres_label')}</Text>
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
            <Text style={styles.fieldLabel}>{t('edit_profile.dob_label')}</Text>
            {user?.dateOfBirth ? (
              <View style={styles.readonlyRow}>
                <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.readonlyText}>{formatDOB(new Date(user.dateOfBirth))}</Text>
                <Ionicons name="lock-closed" size={13} color={Colors.textMuted} />
              </View>
            ) : (
              <TouchableOpacity style={styles.dobEditRow} onPress={() => setShowDobPicker(true)} activeOpacity={0.8}>
                <Ionicons name="calendar-outline" size={16} color="#f59e0b" />
                <Text style={styles.dobEditText}>{t('edit_profile.dob_set_btn')}</Text>
                <Ionicons name="chevron-forward" size={14} color="#f59e0b" />
              </TouchableOpacity>
            )}
          </View>

          {/* Genere */}
          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Genere</Text>
            <TouchableOpacity
              style={styles.changePasswordBtn}
              activeOpacity={0.8}
              onPress={() => { Haptics.selectionAsync(); setShowGenderPicker(true); }}
            >
              <Ionicons name="person-outline" size={16} color={Colors.textSecondary} />
              <Text style={[styles.changePasswordText, !selectedGender && { color: Colors.textMuted }]}>
                {selectedGender ? GENDER_OPTIONS.find((o) => o.value === selectedGender)?.label ?? selectedGender : 'Seleziona genere'}
              </Text>
              <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Picker modal genere */}
          {showGenderPicker && (
            <Modal transparent animationType="slide" onRequestClose={() => setShowGenderPicker(false)}>
              <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowGenderPicker(false)} />
              <View style={styles.pickerSheet}>
                <View style={styles.pickerHandle} />
                <View style={styles.pickerHeader}>
                  <TouchableOpacity onPress={() => setShowGenderPicker(false)}>
                    <Text style={styles.pickerCancel}>{t('edit_profile.dob_modal_cancel')}</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerTitle}>Genere</Text>
                  <View style={{ width: 60 }} />
                </View>
                {GENDER_OPTIONS.map((opt) => {
                  const active = selectedGender === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={styles.genderSheetRow}
                      activeOpacity={0.7}
                      onPress={() => { Haptics.selectionAsync(); setSelectedGender(opt.value); setShowGenderPicker(false); }}
                    >
                      <Text style={[styles.genderSheetLabel, active && styles.genderSheetLabelActive]}>{opt.label}</Text>
                      {active && <Ionicons name="checkmark" size={16} color={Colors.accent} />}
                    </TouchableOpacity>
                  );
                })}
                <View style={{ height: 24 }} />
              </View>
            </Modal>
          )}

          {/* Picker modal DOB */}
          {showDobPicker && (
            <Modal transparent animationType="slide" onRequestClose={() => setShowDobPicker(false)}>
              <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowDobPicker(false)} />
              <View style={styles.pickerSheet}>
                <View style={styles.pickerHandle} />
                <View style={styles.pickerHeader}>
                  <TouchableOpacity onPress={() => setShowDobPicker(false)}>
                    <Text style={styles.pickerCancel}>{t('edit_profile.dob_modal_cancel')}</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerTitle}>{t('edit_profile.dob_modal_title')}</Text>
                  <TouchableOpacity onPress={handleDobConfirm} disabled={savingDob}>
                    {savingDob
                      ? <ActivityIndicator size="small" color={Colors.accent} />
                      : <Text style={styles.pickerConfirm}>{t('edit_profile.dob_modal_save')}</Text>
                    }
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={dobTempDate}
                  mode="date"
                  display="spinner"
                  maximumDate={MAX_DOB}
                  minimumDate={new Date(1920, 0, 1)}
                  onChange={(_, date) => { if (date) setDobTempDate(date); }}
                  textColor={Colors.textPrimary}
                  locale={getLocale()}
                  style={styles.picker}
                />
              </View>
            </Modal>
          )}

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Consenso marketing</Text>
            <View style={styles.marketingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.marketingLabel}>Comunicazioni promozionali</Text>
                <Text style={styles.marketingHint}>
                  Permetti alle discoteche e a MyNox di inviarti offerte ed eventi in base ai tuoi acquisti.
                </Text>
              </View>
              <Switch
                value={user?.marketingConsent ?? false}
                onValueChange={async (val) => {
                  try { await updateMarketingConsent(val); } catch (_) {}
                }}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(168,85,247,0.5)' }}
                thumbColor={user?.marketingConsent ? '#a855f7' : '#64748b'}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>{t('edit_profile.password_label')}</Text>
            <TouchableOpacity
              style={styles.changePasswordBtn}
              activeOpacity={0.8}
              onPress={() => router.push('/change-password')}
            >
              <Ionicons name="lock-closed-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.changePasswordText}>{t('edit_profile.change_password_btn')}</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Elimina account */}
          <View style={[styles.section, styles.dangerZone]}>
            <Text style={styles.dangerLabel}>{t('edit_profile.danger_zone_label')}</Text>
            <TouchableOpacity
              style={styles.deleteBtn}
              activeOpacity={0.8}
              onPress={handleDeleteAccount}
              disabled={deletingAccount}
            >
              <Ionicons name="trash-outline" size={16} color={Colors.error} />
              <Text style={styles.deleteBtnText}>
                {deletingAccount ? t('edit_profile.deleting_account') : t('edit_profile.delete_account_btn')}
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>

        {/* CTA */}
        <View style={styles.ctaContainer}>
          <TouchableOpacity style={styles.ctaButton} activeOpacity={0.85} onPress={handleSave}>
            <Text style={styles.ctaText}>{t('edit_profile.save_btn')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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

  readonlyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
    opacity: 0.6,
  },
  readonlyText: { flex: 1, fontSize: 15, color: Colors.textSecondary },

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

  dobEditRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(245,158,11,0.35)',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  dobEditText: { flex: 1, fontSize: 15, color: '#f59e0b', fontFamily: Font.medium },

  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  pickerSheet: {
    backgroundColor: '#111120',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  pickerHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  pickerCancel: { fontSize: 15, fontFamily: Font.medium, color: Colors.textMuted },
  pickerTitle: { fontSize: 15, fontFamily: Font.bold, color: Colors.textPrimary },
  pickerConfirm: { fontSize: 15, fontFamily: Font.bold, color: Colors.accent },
  picker: { width: '100%', height: 200 },

  marketingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  marketingLabel: { fontSize: 14, fontFamily: Font.medium, color: Colors.textPrimary, marginBottom: 3 },
  marketingHint: { fontSize: 12, color: Colors.textMuted, lineHeight: 17 },

  genderSheetRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  genderSheetLabel: { fontSize: 15, fontFamily: Font.medium, color: Colors.textSecondary },
  genderSheetLabelActive: { color: Colors.textPrimary, fontFamily: Font.semiBold },

  dangerZone: { marginTop: 12, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 24 },
  dangerLabel: { fontSize: 12, fontFamily: Font.semiBold, color: Colors.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(239,68,68,0.06)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  deleteBtnText: { fontSize: 15, fontFamily: Font.medium, color: Colors.error },

});
