import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';

const SECTIONS = [
  {
    title: '1. Titolare del trattamento',
    body: `Il Titolare del trattamento dei dati personali è MyNox S.r.l., con sede legale in Italia (di seguito "MyNox", "noi" o "il Titolare").\n\nPer qualsiasi richiesta relativa al trattamento dei tuoi dati personali puoi contattarci all'indirizzo: privacy@mynox.it`,
  },
  {
    title: '2. Dati personali raccolti',
    body: `MyNox raccoglie le seguenti categorie di dati personali:\n\n• Dati di registrazione: nome, indirizzo email, password (in forma cifrata), data di nascita.\n\n• Dati di acquisto: storico transazioni, tipologia biglietti acquistati, eventi frequentati.\n\n• Dati tecnici: indirizzo IP, tipo di dispositivo, sistema operativo, identificatori univoci del dispositivo, dati di navigazione all'interno dell'app.\n\n• Dati di localizzazione: solo se l'utente concede esplicitamente il permesso, per mostrare eventi nelle vicinanze.\n\n• Comunicazioni: messaggi inviati al supporto clienti.\n\nNon raccogliamo dati sensibili ai sensi dell'art. 9 GDPR (origine etnica, dati biometrici, dati sulla salute, ecc.).`,
  },
  {
    title: '3. Finalità e base giuridica del trattamento',
    body: `I tuoi dati vengono trattati per le seguenti finalità:\n\na) Esecuzione del contratto (art. 6(1)(b) GDPR): gestione dell'account, elaborazione degli acquisti, generazione e validazione dei biglietti QR, assistenza clienti.\n\nb) Adempimento di obblighi legali (art. 6(1)(c) GDPR): conservazione delle transazioni a fini fiscali e contabili, adempimenti normativi.\n\nc) Legittimo interesse (art. 6(1)(f) GDPR): prevenzione delle frodi, sicurezza della piattaforma, miglioramento del servizio tramite dati aggregati e anonimizzati.\n\nd) Consenso (art. 6(1)(a) GDPR): invio di comunicazioni promozionali e notifiche push relative a nuovi eventi o offerte. Il consenso è revocabile in qualsiasi momento.`,
  },
  {
    title: '4. Periodo di conservazione',
    body: `I dati vengono conservati per i seguenti periodi:\n\n• Dati dell'account: per tutta la durata del rapporto contrattuale e per 12 mesi successivi alla cancellazione dell'account, salvo obblighi di legge.\n\n• Dati di acquisto e transazioni: 10 anni dalla data della transazione, ai sensi della normativa fiscale italiana.\n\n• Dati tecnici e di navigazione: massimo 12 mesi.\n\n• Comunicazioni con il supporto: 24 mesi.\n\nAlla scadenza del periodo di conservazione, i dati vengono cancellati o anonimizzati in modo irreversibile.`,
  },
  {
    title: '5. Responsabili del trattamento',
    body: `MyNox si avvale di fornitori di servizi terzi che trattano i dati personali per nostro conto in qualità di Responsabili del Trattamento ai sensi dell'art. 28 GDPR:\n\n• Supabase Inc. (USA) — infrastruttura database e autenticazione. I dati sono ospitati su server in area UE (Francoforte). Trasferimento extra-UE regolato da Clausole Contrattuali Standard (SCC) approvate dalla Commissione Europea.\n\n• Stripe Inc. (USA) — elaborazione dei pagamenti. Stripe è certificato PCI-DSS Level 1. MyNox non conserva mai i dati della carta di credito. Trasferimento extra-UE regolato da SCC e dal framework EU-US Data Privacy Framework.\n\n• Expo / Meta Platforms — distribuzione dell'app e analytics di base.\n\nL'elenco aggiornato dei Responsabili del Trattamento è disponibile su richiesta all'indirizzo privacy@mynox.it.`,
  },
  {
    title: '6. Trasferimento dei dati extra-UE',
    body: `Alcuni dei nostri fornitori (Supabase, Stripe) hanno sede negli Stati Uniti. Il trasferimento dei tuoi dati verso tali paesi è garantito da adeguate salvaguardie ai sensi del GDPR, in particolare mediante l'adozione delle Clausole Contrattuali Standard (SCC) approvate dalla Commissione Europea con Decisione 2021/914/UE, e/o il ricorso al framework EU-US Data Privacy Framework, ove applicabile.`,
  },
  {
    title: '7. I tuoi diritti (artt. 15–22 GDPR)',
    body: `In qualità di interessato, hai i seguenti diritti:\n\n• Diritto di accesso (art. 15): ottenere conferma che siano in corso trattamenti di dati che ti riguardano e ricevere una copia degli stessi.\n\n• Diritto di rettifica (art. 16): correggere dati inesatti o incompleti.\n\n• Diritto alla cancellazione (art. 17): ottenere la cancellazione dei tuoi dati ("diritto all'oblio"), ove non sussistano obblighi di conservazione.\n\n• Diritto di limitazione (art. 18): limitare il trattamento dei tuoi dati in determinati casi.\n\n• Diritto alla portabilità (art. 20): ricevere i tuoi dati in formato strutturato e leggibile da dispositivo automatico.\n\n• Diritto di opposizione (art. 21): opporti al trattamento basato su legittimo interesse o per finalità di marketing diretto.\n\n• Diritto di non essere sottoposto a decisioni automatizzate (art. 22).\n\nPer esercitare i tuoi diritti, scrivi a privacy@mynox.it. Risponderemo entro 30 giorni. Hai inoltre il diritto di proporre reclamo all'Autorità Garante per la Protezione dei Dati Personali (www.garanteprivacy.it).`,
  },
  {
    title: '8. Sicurezza dei dati',
    body: `MyNox adotta misure tecniche e organizzative adeguate per proteggere i dati personali da accessi non autorizzati, perdita, distruzione o divulgazione accidentale, in conformità all'art. 32 GDPR. Tra queste: cifratura dei dati in transito (TLS), cifratura delle password, accesso ai dati limitato al personale autorizzato, monitoraggio continuo dell'infrastruttura.\n\nIn caso di violazione dei dati (data breach) che comporti un rischio per i diritti e le libertà degli interessati, provvederemo alla notifica all'Autorità Garante entro 72 ore e, ove necessario, ti informeremo direttamente.`,
  },
  {
    title: '9. Minori',
    body: `MyNox è un servizio destinato esclusivamente a persone maggiorenni (18 anni o più). Non raccogliamo consapevolmente dati personali di minori di 18 anni. Se veniamo a conoscenza di aver raccolto dati di un minore senza il consenso verificabile del titolare della responsabilità genitoriale, procederemo alla cancellazione immediata di tali dati. Se sei un genitore o tutore e ritieni che tuo figlio abbia fornito dati personali a MyNox, contattaci a privacy@mynox.it.`,
  },
  {
    title: '10. Modifiche alla presente informativa',
    body: `MyNox si riserva il diritto di modificare la presente informativa in qualsiasi momento. In caso di modifiche sostanziali, ti avviseremo tramite notifica in-app o via email con almeno 15 giorni di preavviso. L'uso continuato dell'app dopo tale termine costituisce accettazione delle modifiche.\n\nUltima modifica: maggio 2026 — Versione 1.0`,
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
        <Text style={styles.meta}>Informativa sul trattamento dei dati personali</Text>
        <Text style={styles.meta}>ai sensi degli artt. 13–14 del Regolamento UE 2016/679 (GDPR)</Text>
        <Text style={[styles.meta, { marginBottom: 20 }]}>Ultimo aggiornamento: maggio 2026</Text>

        <Text style={styles.intro}>
          La presente informativa descrive come MyNox raccoglie, utilizza e protegge i tuoi dati personali quando utilizzi l'applicazione mobile MyNox. Ti invitiamo a leggerla attentamente.
        </Text>

        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}

        <View style={styles.contact}>
          <Text style={styles.contactTitle}>Contatti</Text>
          <Text style={styles.contactBody}>
            Per qualsiasi domanda relativa a questa informativa o all'esercizio dei tuoi diritti:{'\n'}
            <Text style={styles.contactEmail}>privacy@mynox.it</Text>
          </Text>
          <Text style={[styles.contactBody, { marginTop: 8 }]}>
            Autorità Garante per la Protezione dei Dati Personali:{'\n'}
            <Text style={styles.contactEmail}>www.garanteprivacy.it</Text>
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 MyNox S.r.l. — Tutti i diritti riservati</Text>
          <Text style={styles.footerText}>Versione informativa: 1.0</Text>
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
  headerTitle: { fontSize: 16, fontFamily: Font.bold, color: Colors.textPrimary },
  backButton: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  scroll: { padding: 20, paddingBottom: 60 },
  meta: {
    fontSize: 10, color: Colors.textMuted, textAlign: 'center', lineHeight: 16,
  },
  intro: {
    fontSize: 12, color: Colors.textSecondary, lineHeight: 19,
    marginBottom: 24, paddingBottom: 20,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 12, fontFamily: Font.bold, color: Colors.textPrimary,
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3,
  },
  sectionBody: {
    fontSize: 12, color: Colors.textSecondary, lineHeight: 19,
  },
  contact: {
    marginTop: 8, padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    marginBottom: 24,
  },
  contactTitle: {
    fontSize: 12, fontFamily: Font.bold, color: Colors.textPrimary, marginBottom: 8,
  },
  contactBody: {
    fontSize: 12, color: Colors.textSecondary, lineHeight: 19,
  },
  contactEmail: {
    color: Colors.accent, fontFamily: Font.semiBold,
  },
  footer: {
    alignItems: 'center', gap: 4, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  footerText: {
    fontSize: 10, color: Colors.textMuted, textAlign: 'center',
  },
});
