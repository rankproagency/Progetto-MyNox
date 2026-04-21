import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

const SECTIONS = [
  {
    title: 'Dati raccolti',
    body: 'MyNox raccoglie nome, email, data di nascita e storico acquisti per offrirti il servizio. Non vendiamo mai i tuoi dati a terzi.',
  },
  {
    title: 'Pagamenti',
    body: 'Le transazioni vengono elaborate da Stripe. MyNox non conserva mai i dati della tua carta di credito.',
  },
  {
    title: 'QR Code e biglietti',
    body: 'I codici QR generati per l\'ingresso e il free drink sono unici e non riutilizzabili. Vengono invalidati immediatamente dopo l\'uso.',
  },
  {
    title: 'Notifiche push',
    body: 'Le notifiche vengono inviate solo per eventi che ti interessano. Puoi disattivarle in qualsiasi momento dalle impostazioni del dispositivo.',
  },
  {
    title: 'Cancellazione account',
    body: 'Puoi richiedere la cancellazione del tuo account e di tutti i dati associati scrivendo a mynoxsupport@gmail.com.',
  },
];

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy e sicurezza</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          La tua privacy è importante per noi. Ecco come gestiamo i tuoi dati all'interno di MyNox.
        </Text>

        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.card}>
            <Text style={styles.cardTitle}>{s.title}</Text>
            <Text style={styles.cardBody}>{s.body}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Ionicons name="mail-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.footerText}>Per domande: mynoxsupport@gmail.com</Text>
        </View>
      </ScrollView>
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
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  backButton: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  scroll: { padding: 20, paddingBottom: 40 },
  intro: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22, marginBottom: 20 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    padding: 16, marginBottom: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  cardBody: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 8, justifyContent: 'center',
  },
  footerText: { fontSize: 12, color: Colors.textMuted },
});
