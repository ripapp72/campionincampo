// ── CONFIGURAZIONE SUPABASE ──
const SUPABASE_URL = 'https://zrperxwrghnnoudmspxb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_SCj1MYr7KG2Cj_UhIFAT2g_irZMuc3O';

// Inizializza Supabase
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── AUTENTICAZIONE ──

// Registrazione nuovo utente
async function registraUtente(email, password, nome, tipo, regione, club) {
  const { data, error } = await db.auth.signUp({
    email: email,
    password: password,
  });

  if (error) {
    alert('Errore registrazione: ' + error.message);
    return null;
  }

  // Salva i dati aggiuntivi nella tabella utenti
  if (data.user) {
    await db.from('utenti').insert({
      id: data.user.id,
      nome: nome,
      tipo: tipo,
      regione: regione,
      club: club || null
    });
  }

  return data;
}

// Login utente
async function loginUtente(email, password) {
  const { data, error } = await db.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    alert('Email o password errati!');
    return null;
  }

  return data;
}

// Logout
async function logoutUtente() {
  await db.auth.signOut();
  location.href = 'index.html';
}

// Controlla se l'utente è loggato
async function getUtenteCorrente() {
  const { data } = await db.auth.getSession();
  return data.session?.user || null;
}

// ── CONTENUTI ──

// Carica tutti i contenuti per il feed
async function caricaFeed() {
  const { data, error } = await db
    .from('contenuti')
    .select('*, utenti(nome, tipo), giocatori(nome, categoria, regione, club)')
    .eq('visibilita', 'pubblico')
    .order('creato_il', { ascending: false });

  if (error) console.error('Errore feed:', error);
  return data || [];
}

// Pubblica nuovo contenuto
// Pubblica nuovo contenuto
async function pubblicaContenutoDB(titolo, descrizione, tipo, visibilita, giocatoreId, urlFile) {
  const utente = await getUtenteCorrente();
  console.log('Utente corrente:', utente);
  
  if (!utente) { 
    alert('Devi essere loggato! Vai alla pagina login e riaccedi.');
    location.href = 'login.html';
    return null; 
  }

  const { data, error } = await db.from('contenuti').insert({
    utente_id: utente.id,
    giocatore_id: giocatoreId || null,
    tipo: tipo,
    titolo: titolo,
    descrizione: descrizione,
    visibilita: visibilita,
    url_file: urlFile || null
  }).select();

  if (error) { 
    alert('Errore pubblicazione: ' + error.message); 
    console.log('Errore:', error);
    return null; 
  }
  return data;
}

// ── GIOCATORI ──

// Crea un nuovo giocatore, oppure riusa quello già esistente con lo stesso nome per questo utente
async function creaOTrovaGiocatore(nome, eta, categoria, ruolo, club, regione) {
  const utente = await getUtenteCorrente();
  if (!utente) return null;

  // Controlla se esiste già un giocatore con questo nome creato da questo utente
  const { data: esistente } = await db
    .from('giocatori')
    .select('id')
    .eq('utente_id', utente.id)
    .eq('nome', nome)
    .maybeSingle();

  if (esistente) return esistente.id;

  // Altrimenti crea un nuovo profilo giocatore
  const { data, error } = await db.from('giocatori').insert({
    utente_id: utente.id,
    nome: nome,
    eta: eta ? parseInt(eta, 10) : null,
    categoria: categoria || null,
    ruolo: ruolo || null,
    club: club || null,
    regione: regione || null
  }).select().single();

  if (error) {
    console.error('Errore creazione giocatore:', error);
    return null;
  }

  return data.id;
}

// Carica un singolo giocatore tramite id (usato in profilo.html)
async function caricaGiocatore(id) {
  const { data, error } = await db
    .from('giocatori')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Errore caricamento giocatore:', error);
    return null;
  }
  return data;
}

// Carica tutti i giocatori per la sezione scout
async function caricaGiocatori(filtri = {}) {
  let query = db.from('giocatori').select('*');

  if (filtri.regione) query = query.eq('regione', filtri.regione);
  if (filtri.categoria) query = query.eq('categoria', filtri.categoria);
  if (filtri.ruolo) query = query.eq('ruolo', filtri.ruolo);

  const { data, error } = await query.order('creato_il', { ascending: false });
  if (error) console.error('Errore giocatori:', error);
  return data || [];
}
// ── UPLOAD FILE ──
async function uploadFile(file, tipo) {
  const utente = await getUtenteCorrente();
  if (!utente) {
    alert('Devi essere loggato per caricare file!');
    return null;
  }

  const estensione = file.name.split('.').pop();
  const nomeFile = `${utente.id}/${tipo}_${Date.now()}.${estensione}`;

  const { data, error } = await db.storage
    .from('media')
    .upload(nomeFile, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    alert('Errore caricamento: ' + error.message);
    return null;
  }

  const { data: urlData } = db.storage
    .from('media')
    .getPublicUrl(nomeFile);

  return urlData.publicUrl;
}

// ── EVENTI ──

// Carica tutti gli eventi, dal più vicino nel tempo
async function caricaEventi() {
  const { data, error } = await db
    .from('eventi')
    .select('*')
    .order('data_evento', { ascending: true });

  if (error) console.error('Errore eventi:', error);
  return data || [];
}

// Crea un nuovo evento
async function pubblicaEvento(titolo, descrizione, dataEvento, luogo, regione, categoria) {
  const utente = await getUtenteCorrente();
  if (!utente) {
    alert('Devi essere loggato per creare un evento!');
    location.href = 'login.html';
    return null;
  }

  const { data, error } = await db.from('eventi').insert({
    utente_id: utente.id,
    titolo: titolo,
    descrizione: descrizione,
    data_evento: dataEvento,
    luogo: luogo,
    regione: regione || null,
    categoria: categoria || null
  }).select();

  if (error) {
    alert('Errore creazione evento: ' + error.message);
    console.log('Errore:', error);
    return null;
  }
  return data;
}