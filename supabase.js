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
    .select('*, utenti(nome, tipo)')
    .eq('visibilita', 'pubblico')
    .order('creato_il', { ascending: false });

  if (error) console.error('Errore feed:', error);
  return data || [];
}

// Pubblica nuovo contenuto
async function pubblicaContenutoDB(titolo, descrizione, tipo, visibilita, giocatoreId) {
  const utente = await getUtenteCorrente();
  if (!utente) { alert('Devi essere loggato!'); return null; }

  const { data, error } = await db.from('contenuti').insert({
    utente_id: utente.id,
    giocatore_id: giocatoreId || null,
    tipo: tipo,
    titolo: titolo,
    descrizione: descrizione,
    visibilita: visibilita
  });

  if (error) { alert('Errore pubblicazione: ' + error.message); return null; }
  return data;
}

// ── GIOCATORI ──

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