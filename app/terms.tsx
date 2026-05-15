import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';

const SECTIONS = [
  {
    title: '1. Oggetto e accettazione',
    body: `I presenti Termini e Condizioni ("Termini") disciplinano l'accesso e l'utilizzo dell'applicazione mobile MyNox ("App") e dei servizi correlati forniti da MyNox S.r.l. ("MyNox", "noi").\n\nUtilizzando l'App o creando un account, dichiari di aver letto, compreso e accettato integralmente i presenti Termini. Se non accetti i Termini, non puoi utilizzare i nostri servizi.\n\nI presenti Termini costituiscono un contratto vincolante tra te e MyNox.`,
  },
  {
    title: '2. Descrizione del servizio',
    body: `MyNox è una piattaforma digitale che consente agli utenti di:\n\n• Scoprire eventi presso locali notturni e discoteche partner;\n• Acquistare biglietti d'ingresso in formato digitale (QR code);\n• Prenotare tavoli e versare la relativa caparra;\n• Riscattare consumazioni incluse nel biglietto tramite QR code dedicato;\n• Accedere all'evento presentando il proprio QR code all'ingresso.\n\nMyNox agisce come intermediario tecnologico tra l'utente e i locali partner. La responsabilità dell'evento (organizzazione, sicurezza, qualità del servizio) è esclusivamente in capo al locale.`,
  },
  {
    title: '3. Registrazione e requisiti',
    body: `Per utilizzare i servizi di MyNox è necessario:\n\n• Avere almeno 14 anni di età (art. 2-quinquies D.Lgs. 196/2003);\n• Avere almeno 18 anni per acquistare biglietti per eventi;\n• Fornire informazioni accurate e aggiornate in fase di registrazione;\n• Mantenere riservate le credenziali di accesso al proprio account;\n• Disporre di un indirizzo email valido.\n\nSei responsabile di tutte le attività svolte tramite il tuo account. In caso di accesso non autorizzato, contatta immediatamente mynoxsupport@gmail.com.\n\nMyNox si riserva il diritto di sospendere o cancellare account che forniscano informazioni false o che violino i presenti Termini.`,
  },
  {
    title: '4. Acquisto di biglietti',
    body: `I biglietti acquistati tramite MyNox sono personali e intrasferibili, salvo ove diversamente indicato.\n\nI pagamenti sono elaborati in modo sicuro tramite Stripe Inc. MyNox non conserva mai i dati della carta di credito o di debito dell'utente.\n\nAl completamento del pagamento, il biglietto viene generato in formato QR code e reso disponibile nell'App alla sezione "I miei biglietti". Il QR è valido per un singolo utilizzo.\n\nÈ responsabilità dell'utente assicurarsi che il dispositivo sia carico e connesso (o che il QR sia stato salvato offline) prima di recarsi all'evento.`,
  },
  {
    title: '5. Prenotazione tavoli e caparre',
    body: `Tramite MyNox è possibile prenotare tavoli presso i locali partner versando una caparra anticipata.\n\nLa caparra:\n\n• Rappresenta una quota di acconto sul consumo minimo concordato con il locale;\n• Viene versata esclusivamente tramite App al momento della prenotazione;\n• Il saldo restante viene corrisposto direttamente al locale nella serata dell'evento;\n• Non è rimborsabile, salvo cancellazione dell'evento da parte del locale (vedi art. 6).\n\nLa disponibilità dei tavoli e le condizioni specifiche (consumo minimo, numero di posti) sono stabilite da ciascun locale partner.`,
  },
  {
    title: '6. Policy di rimborso e cancellazioni',
    body: `Ai sensi dell'art. 59, lett. n) del D.Lgs. 206/2005 (Codice del Consumo), il diritto di recesso non si applica ai contratti di servizi relativi ad attività del tempo libero qualora il contratto preveda una data o un periodo di esecuzione specifici. Pertanto:\n\n• I biglietti acquistati non sono rimborsabili;\n• Le caparre versate per la prenotazione tavoli non sono rimborsabili;\n• Non sono previsti cambi data o trasferimento del biglietto ad altri utenti.\n\nFanno eccezione:\n\n• Cancellazione dell'evento da parte del locale: in tal caso MyNox provvederà al rimborso integrale dell'importo versato entro 14 giorni lavorativi;\n• Errore tecnico documentato imputabile a MyNox: rimborso valutato caso per caso dal supporto.\n\nPer qualsiasi richiesta scrivi a mynoxsupport@gmail.com entro 48 ore dall'evento.`,
  },
  {
    title: '7. Accesso all\'evento e sicurezza',
    body: `L'ingresso all'evento è soggetto alla verifica del QR code da parte del personale del locale.\n\nIl personale di sicurezza (buttafuori) ha il diritto insindacabile di negare l'accesso per motivi legati a:\n\n• Mancato rispetto del dress code del locale;\n• Stato alterato dell'utente (alcol, sostanze);\n• Comportamento inappropriato;\n• Raggiungimento della capienza massima del locale;\n• Qualsiasi altra motivazione ritenuta valida dal personale di sicurezza.\n\nIn caso di diniego dell'accesso da parte del personale di sicurezza, non è previsto alcun rimborso del biglietto o della caparra. Acquistando un biglietto tramite MyNox, l'utente accetta espressamente tale condizione.\n\nMyNox non è responsabile delle decisioni prese dal personale di sicurezza dei locali partner.`,
  },
  {
    title: '8. Consumazioni incluse (Free Drink)',
    body: `Alcuni biglietti includono una o più consumazioni gratuite da riscattare presso il bar del locale.\n\nLe consumazioni:\n\n• Sono associate a un QR code separato visibile nell'App;\n• Possono essere riscattate una sola volta: una volta utilizzate, il QR risulta "Usato" e non può essere riutilizzato;\n• Sono valide esclusivamente nella serata e nel locale indicati sul biglietto;\n• Non sono convertibili in denaro;\n• La scelta della consumazione (tipologia di drink) è a discrezione del locale.\n\nMyNox non è responsabile della qualità o disponibilità delle consumazioni offerte dal locale.`,
  },
  {
    title: '9. Commissione di servizio',
    body: `MyNox applica una commissione di servizio su ogni transazione completata tramite l'App (acquisto biglietti e caparre tavoli).\n\nL'importo della commissione è indicato chiaramente nel riepilogo dell'ordine prima della conferma del pagamento.\n\nLa commissione è non rimborsabile salvo nei casi di cancellazione dell'evento da parte del locale.`,
  },
  {
    title: '10. Obblighi e divieti dell\'utente',
    body: `L'utente si impegna a:\n\n• Fornire informazioni veritiere in fase di registrazione e acquisto;\n• Non cedere il proprio account o le proprie credenziali a terzi;\n• Non tentare di aggirare i sistemi di validazione dei QR code;\n• Non utilizzare l'App per scopi illegali o fraudolenti;\n• Non pubblicare contenuti offensivi, illegali o inappropriati.\n\nÈ espressamente vietato:\n\n• Duplicare, modificare o falsificare i QR code dei biglietti;\n• Creare account multipli per eludere sospensioni;\n• Utilizzare sistemi automatizzati (bot, scraper) per accedere ai servizi;\n• Rivendere biglietti a prezzi superiori al valore facciale (bagarinaggio).\n\nLa violazione di questi obblighi comporta la sospensione immediata dell'account e, ove applicabile, la segnalazione alle autorità competenti.`,
  },
  {
    title: '11. Responsabilità di MyNox',
    body: `MyNox si impegna a garantire il corretto funzionamento della piattaforma tecnologica. Tuttavia, MyNox non è responsabile per:\n\n• La qualità, la sicurezza o la realizzazione dell'evento da parte del locale;\n• Il diniego di accesso da parte del personale di sicurezza;\n• Danni derivanti da malfunzionamenti temporanei dell'App o di servizi terzi (Stripe, Supabase);\n• Perdita o furto del dispositivo contenente i biglietti digitali.\n\nLa responsabilità massima di MyNox nei confronti dell'utente, in relazione a qualsiasi singola transazione, è limitata all'importo effettivamente pagato dall'utente per quella transazione.`,
  },
  {
    title: '12. Proprietà intellettuale',
    body: `Tutti i contenuti presenti nell'App (logo, testi, grafiche, codice software, design) sono di proprietà esclusiva di MyNox S.r.l. e sono protetti dalle leggi vigenti in materia di proprietà intellettuale.\n\nÈ vietata qualsiasi riproduzione, distribuzione o utilizzo commerciale dei contenuti senza previa autorizzazione scritta di MyNox.`,
  },
  {
    title: '13. Sospensione e chiusura account',
    body: `MyNox si riserva il diritto di sospendere o cancellare l'account di un utente in qualsiasi momento, senza preavviso, in caso di:\n\n• Violazione dei presenti Termini;\n• Attività fraudolenta o illegale;\n• Fornitura di informazioni false;\n• Richiesta dell'utente stesso.\n\nIn caso di cancellazione dell'account, i dati vengono trattati secondo quanto previsto dalla Privacy Policy. I biglietti già acquistati e validi rimangono accessibili per il tempo necessario all'utilizzo.`,
  },
  {
    title: '14. Legge applicabile e foro competente',
    body: `I presenti Termini sono disciplinati dalla legge italiana.\n\nPer qualsiasi controversia relativa all'interpretazione o all'esecuzione dei presenti Termini, le parti concordano di tentare una risoluzione amichevole contattando mynoxsupport@gmail.com.\n\nIn mancanza di accordo, il foro competente è quello del luogo di residenza o domicilio del consumatore, in conformità con l'art. 66-bis del D.Lgs. 206/2005.`,
  },
  {
    title: '15. Modifiche ai termini',
    body: `MyNox si riserva il diritto di modificare i presenti Termini in qualsiasi momento. Le modifiche saranno comunicate tramite notifica in-app o via email con almeno 15 giorni di preavviso.\n\nL'uso continuato dell'App dopo la notifica delle modifiche costituisce accettazione dei nuovi Termini.\n\nUltima modifica: maggio 2026 — Versione 1.0`,
  },
];

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Termini e Condizioni</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.meta}>Termini e Condizioni d'uso dell'applicazione MyNox</Text>
        <Text style={styles.meta}>MyNox S.r.l. — Italia</Text>
        <Text style={[styles.meta, { marginBottom: 20 }]}>Ultimo aggiornamento: maggio 2026</Text>

        <Text style={styles.intro}>
          Leggere attentamente i presenti Termini prima di utilizzare l'App. L'utilizzo dei servizi MyNox implica l'accettazione integrale di quanto riportato di seguito.
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
            Per qualsiasi domanda relativa ai presenti Termini:{'\n'}
            <Text style={styles.contactEmail}>mynoxsupport@gmail.com</Text>
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 MyNox S.r.l. — Tutti i diritti riservati</Text>
          <Text style={styles.footerText}>Versione termini: 1.0</Text>
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
