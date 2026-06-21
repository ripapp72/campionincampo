// ── CONTROLLO STATO LOGIN (aggiorna il pulsante nella navbar) ──
async function aggiornaStatoLogin() {
  const utente = await getUtenteCorrente();
  const btn = document.getElementById('nav-auth-btn');
  if (!btn) return;

  if (utente) {
    btn.textContent = 'Il mio profilo';
    btn.onclick = () => location.href = 'profilo.html';
  }
}

document.addEventListener('DOMContentLoaded', aggiornaStatoLogin);

// ── VISUALIZZATORE FOTO (zoom a schermo intero) ──
function apriImmagine(url) {
  const overlay = document.createElement('div');
  overlay.id = 'lightbox-overlay';
  overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; z-index:9999; cursor:zoom-out;';
  overlay.onclick = chiudiImmagine;

  const img = document.createElement('img');
  img.src = url;
  img.style.cssText = 'max-width:90%; max-height:90%; border-radius:8px; box-shadow:0 4px 30px rgba(0,0,0,0.5);';
  img.onclick = (e) => e.stopPropagation();

  overlay.appendChild(img);
  document.body.appendChild(overlay);
}

function chiudiImmagine() {
  const overlay = document.getElementById('lightbox-overlay');
  if (overlay) overlay.remove();
}

// ── FEED HOME (contenuti reali dal database) ──

// Trasforma una data in "X minuti/ore/giorni fa"
function formattaTempoRelativo(dataIso) {
  const data = new Date(dataIso);
  const adesso = new Date();
  const diffMin = Math.floor((adesso - data) / 60000);
  const diffOre = Math.floor(diffMin / 60);
  const diffGiorni = Math.floor(diffOre / 24);

  if (diffMin < 1) return 'poco fa';
  if (diffMin < 60) return diffMin + ' min fa';
  if (diffOre < 24) return diffOre + (diffOre === 1 ? ' ora fa' : ' ore fa');
  if (diffGiorni === 1) return 'ieri';
  return diffGiorni + ' giorni fa';
}

// Ricava le iniziali da un nome (per l'avatar)
function creaIniziali(nome) {
  if (!nome) return '??';
  const parti = nome.trim().split(' ');
  if (parti.length === 1) return parti[0].substring(0, 2).toUpperCase();
  return (parti[0][0] + parti[parti.length - 1][0]).toUpperCase();
}

// Evita che testo scritto dagli utenti possa "rompere" la pagina
function escapeHTML(testo) {
  if (!testo) return '';
  const div = document.createElement('div');
  div.textContent = testo;
  return div.innerHTML;
}

async function caricaEMostraFeed() {
  const container = document.getElementById('feed-list');
  if (!container) return; // siamo su una pagina senza feed, non fare nulla

  const contenuti = await caricaFeed();

  if (contenuti.length === 0) {
    container.innerHTML = '<p style="color:#9ca3af; padding:20px 0;">Nessun contenuto pubblicato ancora. Sii il primo a caricarne uno!</p>';
    return;
  }

  container.innerHTML = contenuti.map(c => {
    const nomeAutore = c.utenti?.nome || 'Utente';
    const iniziali = creaIniziali(nomeAutore);
    const tempo = formattaTempoRelativo(c.creato_il);
    const tipoLabel = c.tipo ? c.tipo.charAt(0).toUpperCase() + c.tipo.slice(1) : 'Notizia';

    // Anteprima video o foto, se presente
    const haProfilo = !!c.giocatore_id;
    let mediaHTML = '';
    if (c.url_file && c.tipo === 'video') {
      mediaHTML = `
        <div class="video-thumb" style="height:280px; overflow:hidden; border-radius:10px;">
          <video controls style="width:100%; height:100%; object-fit:cover; display:block;">
            <source src="${c.url_file}">
          </video>
        </div>`;
    } else if (c.url_file && c.tipo === 'foto') {
      mediaHTML = `
        <div class="photo-grid" style="height:280px; overflow:hidden; border-radius:10px;">
          <img src="${c.url_file}" alt="${escapeHTML(c.titolo)}" onclick="apriImmagine('${c.url_file}')" style="width:100%; height:100%; object-fit:cover; cursor:zoom-in; display:block;">
        </div>`;
    }

    // Link al profilo del giocatore, se il contenuto è collegato a uno
    const linkProfiloHTML = haProfilo
      ? `<div class="action" style="cursor:pointer; color:#378ADD;" onclick="location.href='profilo.html?id=${c.giocatore_id}'"><i class="ti ti-user"></i> Vedi profilo giocatore</div>`
      : '';

    return `
      <div class="card">
        <div class="card-header">
          <div class="avatar av-blue">${iniziali}</div>
          <div>
            <div class="card-name">${escapeHTML(nomeAutore)}</div>
            <div class="card-meta"><i class="ti ti-clock"></i> ${tempo}</div>
          </div>
        </div>
        <div class="badges">
          <span class="badge badge-blue">${escapeHTML(tipoLabel)}</span>
        </div>
        ${mediaHTML}
        <div class="card-body">
          <strong>${escapeHTML(c.titolo)}</strong>
          ${c.descrizione ? '<br>' + escapeHTML(c.descrizione) : ''}
        </div>
        ${linkProfiloHTML}
      </div>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', caricaEMostraFeed);

// ── PROFILO GIOCATORE (carica i dati veri se c'è un id nell'URL) ──
async function caricaProfiloGiocatore() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) return; // nessun id: resta la pagina di esempio

  const giocatore = await caricaGiocatore(id);
  if (!giocatore) return;

  const set = (elId, valore) => {
    const el = document.getElementById(elId);
    if (el && valore !== null && valore !== undefined && valore !== '') el.textContent = valore;
  };

  set('profilo-nome', giocatore.nome);
  set('profilo-regione', giocatore.regione || 'Italia');
  set('profilo-eta', giocatore.eta ? giocatore.eta + ' anni' : '');
  set('profilo-ruolo', giocatore.ruolo);
  set('profilo-categoria', giocatore.categoria);
  set('profilo-club', giocatore.club || 'Nessun club');

  set('info-anno-nascita', giocatore.eta ? (new Date().getFullYear() - giocatore.eta) : '');
  set('info-piede', giocatore.piede || '—');
  set('info-altezza', giocatore.altezza ? giocatore.altezza + ' cm' : '—');
  set('info-categoria', giocatore.categoria || '—');
  set('info-club', giocatore.club || '—');
  set('info-ruolo', giocatore.ruolo || '—');
}

document.addEventListener('DOMContentLoaded', caricaProfiloGiocatore);

// ── SCOUT (lista talenti reale dal database) ──
let datiGiocatoriScout = [];

async function caricaEMostraScout() {
  const container = document.getElementById('talenti-griglia');
  if (!container) return; // non siamo nella pagina scout

  datiGiocatoriScout = await caricaGiocatori();
  filtraGiocatori();
}

function creaCardTalento(g) {
  const iniziali = creaIniziali(g.nome);
  const localita = g.regione || 'Italia';
  const etaTesto = g.eta ? g.eta + ' anni' : '';
  const categoriaTesto = g.categoria || '';
  const ruoloTesto = g.ruolo || '';
  const clubTesto = g.club || '';

  return `
    <div class="talento-card" onclick="location.href='profilo.html?id=${g.id}'">
      <div class="talento-card-top">
        <div class="talento-avatar av-blue">${iniziali}</div>
      </div>
      <div class="talento-nome">${escapeHTML(g.nome)}</div>
      <div class="talento-info"><i class="ti ti-map-pin"></i> ${escapeHTML(localita)}${etaTesto ? ' · ' + etaTesto : ''}</div>
      <div class="talento-badges">
        ${categoriaTesto ? `<span class="badge badge-blue">${escapeHTML(categoriaTesto)}</span>` : ''}
        ${ruoloTesto ? `<span class="badge badge-green">${escapeHTML(ruoloTesto)}</span>` : ''}
      </div>
      ${clubTesto ? `<div class="talento-info"><i class="ti ti-shirt"></i> ${escapeHTML(clubTesto)}</div>` : ''}
    </div>
  `;
}

function filtraGiocatori() {
  const container = document.getElementById('talenti-griglia');
  const nessunRisultato = document.getElementById('nessun-risultato');
  const conteggio = document.getElementById('risultati-count');
  if (!container) return;

  const testoCerca = (document.getElementById('scout-cerca')?.value || '').toLowerCase().trim();
  const regione = document.getElementById('f-regione')?.value || '';
  const categoria = document.getElementById('f-categoria')?.value || '';
  const ruolo = document.getElementById('f-ruolo')?.value || '';

  let risultati = datiGiocatoriScout.filter(g => {
    if (regione && g.regione !== regione) return false;
    if (categoria && !(g.categoria || '').toLowerCase().includes(categoria.toLowerCase())) return false;
    if (ruolo && !(g.ruolo || '').toLowerCase().includes(ruolo.toLowerCase())) return false;
    if (testoCerca) {
      const inNome = (g.nome || '').toLowerCase().includes(testoCerca);
      const inClub = (g.club || '').toLowerCase().includes(testoCerca);
      if (!inNome && !inClub) return false;
    }
    return true;
  });

  if (conteggio) {
    conteggio.textContent = risultati.length + (risultati.length === 1 ? ' talento trovato' : ' talenti trovati');
  }

  if (risultati.length === 0) {
    container.innerHTML = '';
    container.style.display = 'none';
    if (nessunRisultato) nessunRisultato.style.display = 'block';
    return;
  }

  container.style.display = '';
  if (nessunRisultato) nessunRisultato.style.display = 'none';
  container.innerHTML = risultati.map(creaCardTalento).join('');
}

function resetFiltri() {
  const cerca = document.getElementById('scout-cerca');
  const regione = document.getElementById('f-regione');
  const categoria = document.getElementById('f-categoria');
  const ruolo = document.getElementById('f-ruolo');
  if (cerca) cerca.value = '';
  if (regione) regione.value = '';
  if (categoria) categoria.value = '';
  if (ruolo) ruolo.value = '';
  filtraGiocatori();
}

function setVista(el, tipo) {
  document.querySelectorAll('.vista-btn').forEach(v => v.classList.remove('active'));
  el.classList.add('active');
  const container = document.getElementById('talenti-griglia');
  if (!container) return;
  if (tipo === 'lista') container.classList.add('vista-lista');
  else container.classList.remove('vista-lista');
}

document.addEventListener('DOMContentLoaded', caricaEMostraScout);

// ── EVENTI ──
const MESI_BREVI = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC'];

function formattaDataEvento(dataIso) {
  const d = new Date(dataIso + 'T00:00:00');
  return { giorno: String(d.getDate()).padStart(2, '0'), mese: MESI_BREVI[d.getMonth()] };
}

async function caricaEMostraEventi() {
  const container = document.getElementById('eventi-lista');
  if (!container) return; // non siamo nella pagina eventi

  const eventi = await caricaEventi();

  if (eventi.length === 0) {
    container.innerHTML = '<p style="color:#9ca3af; padding:20px 0;">Nessun evento in programma al momento. Sii il primo a crearne uno!</p>';
    return;
  }

  container.innerHTML = eventi.map(e => {
    const { giorno, mese } = formattaDataEvento(e.data_evento);
    return `
      <div class="event-row">
        <div class="event-date"><span class="event-day">${giorno}</span><span class="event-month">${mese}</span></div>
        <div>
          <div class="event-info">${escapeHTML(e.titolo)}</div>
          <div class="event-sub">${escapeHTML(e.luogo || '')}${e.categoria ? ' · ' + escapeHTML(e.categoria) : ''}</div>
          ${e.descrizione ? `<div class="event-sub" style="margin-top:4px;">${escapeHTML(e.descrizione)}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function mostraFormEvento() {
  document.getElementById('eventi-lista-blocco').style.display = 'none';
  document.getElementById('form-evento').style.display = 'block';
}

function nascondiFormEvento() {
  document.getElementById('form-evento').style.display = 'none';
  document.getElementById('eventi-lista-blocco').style.display = 'block';
}

async function creaEvento() {
  const titolo = document.getElementById('evento-titolo').value;
  const descrizione = document.getElementById('evento-descrizione').value;
  const dataEvento = document.getElementById('evento-data').value;
  const luogo = document.getElementById('evento-luogo').value;
  const regione = document.getElementById('evento-regione').value;
  const categoria = document.getElementById('evento-categoria').value;

  if (!titolo || !dataEvento || !luogo) {
    alert('Compila almeno titolo, data e luogo!');
    return;
  }

  const risultato = await pubblicaEvento(titolo, descrizione, dataEvento, luogo, regione, categoria);
  if (risultato) {
    alert('Evento creato con successo!');
    document.getElementById('evento-titolo').value = '';
    document.getElementById('evento-descrizione').value = '';
    document.getElementById('evento-data').value = '';
    document.getElementById('evento-luogo').value = '';
    document.getElementById('evento-regione').value = '';
    document.getElementById('evento-categoria').value = '';
    nascondiFormEvento();
    caricaEMostraEventi();
  }
}

document.addEventListener('DOMContentLoaded', caricaEMostraEventi);

// ── FILTRI PILLOLE ──
function setActive(el) {
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
}
// ── REGISTRAZIONE ──
let tipoScelto = '';

function scegliTipo(tipo) {
  tipoScelto = tipo;
  document.getElementById('step-tipo').style.display = 'none';
  document.getElementById('step-form').style.display = 'block';

  const badge = document.getElementById('tipo-badge');
  const sottotitolo = document.getElementById('form-sottotitolo');
  const gruppoClub = document.getElementById('gruppo-club');

 if (tipo === 'genitore') {
    badge.textContent = '👨‍👩‍👦';
    sottotitolo.textContent = 'Registrati come Genitore / Famiglia';
    gruppoClub.style.display = 'none';
    document.getElementById('check-consenso').style.display = 'flex';
  } else if (tipo === 'club') {
    badge.textContent = '⚽';
    sottotitolo.textContent = 'Registrati come Club / Associazione';
    gruppoClub.style.display = 'block';
    document.getElementById('check-consenso').style.display = 'flex';
  } else if (tipo === 'scout') {
    badge.textContent = '🔍';
    sottotitolo.textContent = 'Registrati come Scout / Osservatore';
    gruppoClub.style.display = 'none';
    document.getElementById('check-consenso').style.display = 'none';
  }
}

function tornaIndietro() {
  document.getElementById('step-form').style.display = 'none';
  document.getElementById('step-tipo').style.display = 'block';
}

function togglePassword() {
  const input = document.getElementById('input-password');
  const icon = document.getElementById('eye-icon');
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'ti ti-eye-off';
  } else {
    input.type = 'password';
    icon.className = 'ti ti-eye';
  }
}

async function registrati() {
  const nome = document.getElementById('input-nome').value;
  const email = document.getElementById('input-email').value;
  const password = document.getElementById('input-password').value;
  const regione = document.getElementById('input-regione').value;
  const privacy = document.getElementById('privacy').checked;
  const termini = document.getElementById('termini').checked;
  const consensoEl = document.getElementById('consenso');
  const consenso = consensoEl ? consensoEl.checked : true;

  if (!nome || !email || !password || !regione) {
    alert('Per favore compila tutti i campi!');
    return;
  }
  if (password.length < 8) {
    alert('La password deve essere di almeno 8 caratteri!');
    return;
  }
  if (!privacy) {
    alert('Devi accettare la Privacy Policy per continuare!');
    return;
  }
  if (!termini) {
    alert('Devi accettare i Termini di servizio per continuare!');
    return;
  }
  if (consensoEl && consensoEl.closest('.form-check').style.display !== 'none' && !consenso) {
    alert('Devi accettare l\'informativa sulla pubblicazione di immagini di minori!');
    return;
  }

  const risultato = await registraUtente(email, password, nome, tipoScelto, regione);
  if (risultato) {
    document.getElementById('step-form').style.display = 'none';
    document.getElementById('step-successo').style.display = 'block';
  }
}
// ── LOGIN ──
function toggleLoginPassword() {
  const input = document.getElementById('login-password');
  const icon = document.getElementById('login-eye');
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'ti ti-eye-off';
  } else {
    input.type = 'password';
    icon.className = 'ti ti-eye';
  }
}

async function accedi() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    alert('Per favore inserisci email e password!');
    return;
  }

  const risultato = await loginUtente(email, password);
  if (risultato) {
    location.href = 'index.html';
  }
}


function mostraReset() {
  document.getElementById('step-login').style.display = 'none';
  document.getElementById('step-reset').style.display = 'block';
}

function tornaLogin() {
  document.getElementById('step-reset').style.display = 'none';
  document.getElementById('step-reset-ok').style.display = 'none';
  document.getElementById('step-login').style.display = 'block';
}

function inviaReset() {
  const email = document.getElementById('reset-email').value;
  if (!email) {
    alert('Inserisci la tua email!');
    return;
  }
  document.getElementById('step-reset').style.display = 'none';
  document.getElementById('step-reset-ok').style.display = 'block';
}
// ── PROFILO ──
function toggleSegui(btn) {
  if (btn.classList.contains('seguito')) {
    btn.classList.remove('seguito');
    btn.innerHTML = '<i class="ti ti-star"></i> Segui';
  } else {
    btn.classList.add('seguito');
    btn.innerHTML = '<i class="ti ti-star-filled"></i> Seguito';
  }
}

function setMediaTab(el, tab) {
  document.querySelectorAll('.media-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');

  document.getElementById('tab-video').style.display = tab === 'video' ? 'block' : 'none';
  document.getElementById('tab-foto').style.display = tab === 'foto' ? 'block' : 'none';
}
// ── UPLOAD ──
let tags = [];

function setTipoContenuto(el, tipo) {
  document.querySelectorAll('.tipo-contenuto').forEach(t => t.classList.remove('active'));
  el.classList.add('active');

  const formati = document.getElementById('drop-formati');
  if (tipo === 'video') formati.textContent = 'MP4, MOV, AVI fino a 500MB';
  if (tipo === 'foto') formati.textContent = 'JPG, PNG, WEBP fino a 20MB';
  if (tipo === 'notizia') document.getElementById('area-file').style.display = 'none';
  if (tipo === 'evento') document.getElementById('area-file').style.display = 'none';
  if (tipo === 'video' || tipo === 'foto') document.getElementById('area-file').style.display = 'block';
}

function fileSelezionato(input) {
  const file = input.files[0];
  if (!file) return;

  const mb = (file.size / 1024 / 1024).toFixed(1);
  document.getElementById('file-nome').textContent = file.name;
  document.getElementById('file-size').textContent = mb + ' MB';
  document.getElementById('drop-area').style.display = 'none';
  document.getElementById('file-preview').style.display = 'flex';
}

function rimuoviFile() {
  document.getElementById('file-input').value = '';
  document.getElementById('drop-area').style.display = 'block';
  document.getElementById('file-preview').style.display = 'none';
}

function aggiungiTag(event) {
  if (event.key !== 'Enter') return;
  const input = document.getElementById('tag-input');
  const valore = input.value.trim();
  if (!valore || tags.includes(valore)) { input.value = ''; return; }

  tags.push(valore);
  const lista = document.getElementById('tag-lista');
  const tag = document.createElement('div');
  tag.className = 'tag';
  tag.innerHTML = valore + '<span class="tag-x" onclick="rimuoviTag(this, \'' + valore + '\')">×</span>';
  lista.appendChild(tag);
  input.value = '';
}

function rimuoviTag(el, valore) {
  tags = tags.filter(t => t !== valore);
  el.parentElement.remove();
}

function setVisibilita(el) {
  document.querySelectorAll('.visibilita-opzione').forEach(v => v.classList.remove('active'));
  el.classList.add('active');
}

async function pubblicaContenuto() {
  const titolo = document.getElementById('upload-titolo').value;
  const descrizione = document.getElementById('upload-descrizione').value;
  const giocatore = document.getElementById('upload-giocatore').value;
  const eta = document.getElementById('upload-eta').value;
  const categoria = document.getElementById('upload-categoria').value;
  const ruolo = document.getElementById('upload-ruolo').value;
  const club = document.getElementById('upload-club').value;
  const regione = document.getElementById('upload-regione').value;
  const fileInput = document.getElementById('file-input');
  const file = fileInput.files[0];

  // Controlla tipo contenuto selezionato
  const tipoEl = document.querySelector('.tipo-contenuto.active span');
  const tipo = tipoEl ? tipoEl.textContent.toLowerCase() : 'notizia';

  // Controlla visibilità selezionata
  const visibilitaEl = document.querySelector('.visibilita-opzione.active .vis-nome');
  const visibilita = visibilitaEl ? visibilitaEl.textContent.toLowerCase() : 'pubblico';

  if (!titolo || !giocatore || !categoria) {
    alert('Compila almeno titolo, nome giocatore e categoria!');
    return;
  }

  let urlFile = null;

  // Carica il file se presente
  if (file) {
    urlFile = await uploadFile(file, tipo);
    if (!urlFile) return;
  }

  // Crea (o riusa) il profilo del giocatore, poi collega il contenuto a lui
  const giocatoreId = await creaOTrovaGiocatore(giocatore, eta, categoria, ruolo, club, regione);

  // Salva nel database
  const risultato = await pubblicaContenutoDB(titolo, descrizione, tipo, visibilita, giocatoreId, urlFile);

  if (risultato !== null) {
    document.querySelectorAll('.upload-card, .upload-bottoni, .upload-header').forEach(el => el.style.display = 'none');
    document.getElementById('upload-successo').style.display = 'block';
  }
}

function nuovoUpload() {
  document.querySelectorAll('.upload-card, .upload-bottoni, .upload-header').forEach(el => el.style.display = '');
  document.getElementById('upload-successo').style.display = 'none';
  document.getElementById('upload-titolo').value = '';
  document.getElementById('upload-descrizione').value = '';
  document.getElementById('upload-giocatore').value = '';
  document.getElementById('upload-eta').value = '';
  rimuoviFile();
}
