// ── CONTROLLO STATO LOGIN (aggiorna il pulsante nella navbar) ──
async function aggiornaStatoLogin() {
  const btn = document.getElementById('nav-auth-btn');
  if (!btn) return;

  const profilo = await caricaProfiloUtente();
  if (!profilo) return; // non loggato, mostra "Accedi"

  // Costruisce il contenuto del pulsante: avatar + nome
  const iniziali = creaIniziali(profilo.nome || 'U');
  const avatarHTML = profilo.logo_url
    ? `<img src="${profilo.logo_url}" style="width:28px; height:28px; border-radius:50%; object-fit:cover; margin-right:6px; vertical-align:middle;">`
    : `<span style="display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:50%; background:rgba(255,255,255,0.3); font-size:12px; font-weight:bold; margin-right:6px; vertical-align:middle;">${iniziali}</span>`;

  btn.innerHTML = avatarHTML + (profilo.nome || 'Profilo');
  btn.onclick = () => location.href = 'impostazioni.html';
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

let datiFeedHome = [];

async function caricaEMostraFeed() {
  const container = document.getElementById('feed-list');
  if (!container) return; // siamo su una pagina senza feed, non fare nulla

  datiFeedHome = await caricaFeed();
  filtraFeed();
}

function creaCardContenuto(c) {
  const nomeAutore = c.utenti?.nome || 'Utente';
  const iniziali = creaIniziali(nomeAutore);
  const tempo = formattaTempoRelativo(c.creato_il);
  const tipoLabel = c.tipo ? c.tipo.charAt(0).toUpperCase() + c.tipo.slice(1) : 'Notizia';

  // Anteprima video o foto, se presente
  const haProfilo = !!c.giocatore_id;
  let mediaHTML = '';
  if (c.url_file && c.tipo === 'video') {
    // Controlla se sono più video (JSON array) o uno solo
    let videoUrls = [];
    try {
      const parsed = JSON.parse(c.url_file);
      if (Array.isArray(parsed)) videoUrls = parsed;
      else videoUrls = [c.url_file];
    } catch (e) {
      videoUrls = [c.url_file];
    }

    if (videoUrls.length === 1) {
      mediaHTML = `
        <div class="video-thumb">
          <video controls preload="metadata">
            <source src="${videoUrls[0]}" type="video/mp4">
          </video>
        </div>`;
    } else {
      const videoHTML = videoUrls.map((url, i) => `
        <div class="video-thumb" style="margin-bottom:8px;">
          <div style="font-size:12px; color:#6b7280; margin-bottom:4px; padding:0 4px;">Video ${i+1}</div>
          <video controls preload="metadata" style="width:100%; border-radius:8px;">
            <source src="${url}" type="video/mp4">
          </video>
        </div>`).join('');
      mediaHTML = `<div style="margin-bottom:10px;">${videoHTML}</div>`;
    }
  } else if (c.url_file && c.tipo === 'foto') {
    // Controlla se sono più foto (JSON array) o una sola
    let urls = [];
    try {
      const parsed = JSON.parse(c.url_file);
      if (Array.isArray(parsed)) urls = parsed;
      else urls = [c.url_file];
    } catch (e) {
      urls = [c.url_file];
    }

    if (urls.length === 1) {
      mediaHTML = `
        <div class="photo-grid">
          <img src="${urls[0]}" alt="${escapeHTML(c.titolo)}" onclick="apriImmagine('${urls[0]}')" style="width:100%; border-radius:10px; object-fit:cover; cursor:zoom-in;">
        </div>`;
    } else {
      const colonne = urls.length === 2 ? '1fr 1fr' : '1fr 1fr 1fr';
      const fotoHTML = urls.map(url =>
        `<img src="${url}" onclick="apriImmagine('${url}')" style="width:100%; height:160px; object-fit:cover; border-radius:8px; cursor:zoom-in;">`
      ).join('');
      mediaHTML = `
        <div style="display:grid; grid-template-columns:${colonne}; gap:6px; margin-bottom:10px;">
          ${fotoHTML}
        </div>`;
    }
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
}

// Filtra il feed in base a: pillola attiva (tipo o categoria), regione, ricerca testo
function filtraFeed() {
  const container = document.getElementById('feed-list');
  if (!container) return;

  const pillAttiva = document.querySelector('.pill.active')?.textContent.trim() || 'Tutti';
  const regione = document.getElementById('home-regione')?.value || '';
  const testoCerca = (document.getElementById('home-cerca')?.value || '').toLowerCase().trim();

  const mappaTipo = { 'Video': 'video', 'Foto': 'foto', 'Notizie': 'notizia' };
  const categorieValide = ['Pulcini', 'Esordienti', 'Giovanissimi', 'Allievi'];

  const risultati = datiFeedHome.filter(c => {
    // Filtro pillola: o per tipo di contenuto, o per categoria del giocatore collegato
    if (pillAttiva !== 'Tutti') {
      if (mappaTipo[pillAttiva]) {
        if (c.tipo !== mappaTipo[pillAttiva]) return false;
      } else if (categorieValide.includes(pillAttiva)) {
        const categoriaGiocatore = c.giocatori?.categoria || '';
        if (!categoriaGiocatore.toLowerCase().includes(pillAttiva.toLowerCase())) return false;
      }
    }

    // Filtro regione (del giocatore collegato)
    if (regione) {
      const regioneGiocatore = c.giocatori?.regione || '';
      if (regioneGiocatore !== regione) return false;
    }

    // Filtro ricerca testo: titolo, nome giocatore, club, categoria
    if (testoCerca) {
      const inTitolo = (c.titolo || '').toLowerCase().includes(testoCerca);
      const inGiocatore = (c.giocatori?.nome || '').toLowerCase().includes(testoCerca);
      const inClub = (c.giocatori?.club || '').toLowerCase().includes(testoCerca);
      const inCategoria = (c.giocatori?.categoria || '').toLowerCase().includes(testoCerca);
      if (!inTitolo && !inGiocatore && !inClub && !inCategoria) return false;
    }

    return true;
  });

  if (risultati.length === 0) {
    container.innerHTML = '<p style="color:#9ca3af; padding:20px 0;">Nessun contenuto trovato con questi filtri.</p>';
    return;
  }

  container.innerHTML = risultati.map(creaCardContenuto).join('');
}

document.addEventListener('DOMContentLoaded', caricaEMostraFeed);

// ── IMPOSTAZIONI ACCOUNT ──
async function caricaImpostazioni() {
  const container = document.getElementById('impostazioni-container');
  if (!container) return;

  const profilo = await caricaProfiloUtente();
  if (!profilo) {
    location.href = 'login.html';
    return;
  }

  document.getElementById('imp-nome').value = profilo.nome || '';
  document.getElementById('imp-email').value = profilo.email || '';
  document.getElementById('imp-regione').value = profilo.regione || '';
  document.getElementById('imp-club').value = profilo.club || '';

  // Dati privati
  if (document.getElementById('imp-data-nascita')) {
    document.getElementById('imp-data-nascita').value = profilo.data_nascita || '';
  }
  if (document.getElementById('imp-cf')) {
    document.getElementById('imp-cf').value = profilo.codice_fiscale || '';
  }

  // Avatar/logo
  const avatarEl = document.getElementById('imp-avatar');
  if (avatarEl) {
    if (profilo.logo_url) {
      avatarEl.innerHTML = `<img src="${profilo.logo_url}" style="width:80px; height:80px; border-radius:50%; object-fit:cover; border:3px solid #378ADD;">`;
    } else {
      const iniziali = creaIniziali(profilo.nome || 'U');
      avatarEl.innerHTML = `<div style="width:80px; height:80px; border-radius:50%; background:#378ADD; color:white; display:flex; align-items:center; justify-content:center; font-size:28px; font-weight:bold; border:3px solid #378ADD;">${iniziali}</div>`;
    }
  }

  const gruppoClub = document.getElementById('imp-gruppo-club');
  if (gruppoClub) gruppoClub.style.display = profilo.tipo === 'club' ? 'block' : 'none';
  const gruppoLogo = document.getElementById('imp-gruppo-logo');
  if (gruppoLogo) gruppoLogo.style.display = profilo.tipo === 'club' ? 'block' : 'none';
}

function toggleCF() {
  const input = document.getElementById('imp-cf');
  const icon = document.getElementById('cf-eye');
  if (!input) return;
  if (input.type === 'password') { input.type = 'text'; icon.className = 'ti ti-eye-off'; }
  else { input.type = 'password'; icon.className = 'ti ti-eye'; }
}

function togglePasswordImpostazioni() {
  const input = document.getElementById('imp-nuova-password');
  const icon = document.getElementById('pwd-eye');
  if (!input) return;
  if (input.type === 'password') { input.type = 'text'; icon.className = 'ti ti-eye-off'; }
  else { input.type = 'password'; icon.className = 'ti ti-eye'; }
}

async function aggiornaPassword() {
  const nuova = document.getElementById('imp-nuova-password').value;
  const conferma = document.getElementById('imp-conferma-password').value;

  if (!nuova || !conferma) { alert('Compila entrambi i campi password!'); return; }
  if (nuova.length < 8) { alert('La password deve essere di almeno 8 caratteri!'); return; }
  if (nuova !== conferma) { alert('Le due password non coincidono!'); return; }

  const ok = await cambiaPassword(nuova);
  if (ok) {
    alert('Password aggiornata con successo!');
    document.getElementById('imp-nuova-password').value = '';
    document.getElementById('imp-conferma-password').value = '';
  }
}

async function salvaImpostazioni() {
  const nome = document.getElementById('imp-nome').value;
  const regione = document.getElementById('imp-regione').value;
  const club = document.getElementById('imp-club')?.value || '';
  const logoFile = document.getElementById('imp-logo')?.files[0];

  if (!nome || !regione) {
    alert('Nome e regione sono obbligatori!');
    return;
  }

  const ok = await aggiornaProfilo(nome, regione, club);
  if (!ok) return;

  if (logoFile) {
    await aggiornaLogo(logoFile);
  }

  alert('Profilo aggiornato con successo!');
  location.reload();
}

document.addEventListener('DOMContentLoaded', caricaImpostazioni);

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

// ── STATISTICHE SCOUT ──
async function aggiornaStat(id, valore) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = valore >= 1000 ? (valore / 1000).toFixed(1) + 'k' : valore;
}

async function caricaStatisticheScoutUI() {
  if (!document.getElementById('stat-talenti')) return;
  const stats = await caricaStatisticheScout();
  aggiornaStat('stat-talenti', stats.talenti);
  aggiornaStat('stat-club', stats.club);
  document.getElementById('stat-regioni').textContent = stats.regioni;
}

document.addEventListener('DOMContentLoaded', caricaStatisticheScoutUI);

// ── PAGINA CLUB ──
async function caricaEMostraClub() {
  const container = document.getElementById('club-lista');
  if (!container) return;

  // Mostra pulsante gestisci profilo se loggato come club
  const profilo = await caricaProfiloUtente();
  const btnGestisci = document.getElementById('btn-gestisci-club');
  if (btnGestisci && profilo?.tipo === 'club') {
    btnGestisci.style.display = 'block';
  }

  const club = await caricaClub();

  if (club.length === 0) {
    container.innerHTML = '<p style="color:#9ca3af; padding:20px 0;">Nessun club iscritto ancora.</p>';
    return;
  }

  container.innerHTML = club.map(c => {
    const iniziali = creaIniziali(c.nome || 'CL');
    const avatar = c.logo_url
      ? `<img src="${c.logo_url}" style="width:56px; height:56px; border-radius:50%; object-fit:cover; border:2px solid #e5e7eb;">`
      : `<div style="width:56px; height:56px; border-radius:50%; background:#378ADD; color:white; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:bold;">${iniziali}</div>`;

    return `
      <div class="talento-card" style="cursor:default;">
        <div style="display:flex; align-items:center; gap:14px; margin-bottom:10px;">
          ${avatar}
          <div>
            <div class="talento-nome">${escapeHTML(c.nome || '')}</div>
            <div class="talento-info"><i class="ti ti-map-pin"></i> ${escapeHTML(c.regione || 'Italia')}</div>
          </div>
        </div>
        ${c.club ? `<div class="talento-info"><i class="ti ti-shirt"></i> ${escapeHTML(c.club)}</div>` : ''}
      </div>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', caricaEMostraClub);

// ── SIDEBAR TALENTI IN EVIDENZA (home) ──
const AVATAR_COLORS = ['av-blue', 'av-green', 'av-amber', 'av-teal', 'av-purple'];

async function caricaSidebarTalenti() {
  const container = document.getElementById('sidebar-talenti');
  if (!container) return;

  const giocatori = await caricaGiocatori();

  if (giocatori.length === 0) {
    container.innerHTML = '<p style="color:#9ca3af; font-size:13px; padding:8px 0;">Nessun talento ancora registrato.</p>';
    return;
  }

  // Prende i primi 3 più recenti
  const top3 = giocatori.slice(0, 3);

  container.innerHTML = top3.map((g, i) => {
    const iniziali = g.nome ? g.nome.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase() : '??';
    const colore = AVATAR_COLORS[i % AVATAR_COLORS.length];
    const dettaglio = [g.eta ? g.eta + ' anni' : null, g.ruolo || null, g.regione || null].filter(Boolean).join(' · ');
    return `
      <div class="talent-row" onclick="location.href='/profilo.html?id=${g.id}'" style="cursor:pointer;">
        <div class="avatar-sm ${colore}">${iniziali}</div>
        <div class="talent-info">
          <div class="talent-name">${escapeHTML(g.nome)}</div>
          <div class="talent-detail">${escapeHTML(dettaglio)}</div>
        </div>
        <div class="stars">★★★★★</div>
      </div>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', caricaSidebarTalenti);

// ── SIDEBAR EVENTI (home) ──
async function caricaSidebarEventi() {
  const container = document.getElementById('sidebar-eventi');
  if (!container) return;

  const eventi = await caricaEventi();
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);

  // Prende solo i prossimi (data >= oggi) e mostra max 3
  const prossimi = eventi
    .filter(e => new Date(e.data_evento + 'T00:00:00') >= oggi)
    .slice(0, 3);

  if (prossimi.length === 0) {
    container.innerHTML = '<p style="color:#9ca3af; font-size:13px; padding:8px 0;">Nessun evento in programma.</p>';
    return;
  }

  container.innerHTML = prossimi.map(e => {
    const { giorno, mese } = formattaDataEvento(e.data_evento);
    return `
      <div class="event-row" onclick="location.href='eventi.html'" style="cursor:pointer;">
        <div class="event-date">
          <span class="event-day">${giorno}</span>
          <span class="event-month">${mese}</span>
        </div>
        <div>
          <div class="event-info">${escapeHTML(e.titolo)}</div>
          <div class="event-sub">${escapeHTML(e.luogo || '')}${e.categoria ? ' · ' + escapeHTML(e.categoria) : ''}</div>
        </div>
      </div>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', caricaSidebarEventi);

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
    const locandina = e.immagine_url
      ? `<img src="${e.immagine_url}" onclick="apriImmagine('${e.immagine_url}')" style="width:100%; border-radius:8px; object-fit:cover; max-height:180px; cursor:zoom-in; margin-bottom:8px;">`
      : '';
    return `
      <div class="event-row" style="align-items:flex-start; flex-direction:column; gap:8px;">
        <div style="display:flex; gap:12px; width:100%;">
          <div class="event-date"><span class="event-day">${giorno}</span><span class="event-month">${mese}</span></div>
          <div>
            <div class="event-info">${escapeHTML(e.titolo)}</div>
            <div class="event-sub">${escapeHTML(e.luogo || '')}${e.categoria ? ' · ' + escapeHTML(e.categoria) : ''}</div>
            ${e.descrizione ? `<div class="event-sub" style="margin-top:4px;">${escapeHTML(e.descrizione)}</div>` : ''}
          </div>
        </div>
        ${locandina}
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
  const immagineInput = document.getElementById('evento-immagine');
  const immagineFile = immagineInput && immagineInput.files.length > 0 ? immagineInput.files[0] : null;

  if (!titolo || !dataEvento || !luogo) {
    alert('Compila almeno titolo, data e luogo!');
    return;
  }

  // Carica la locandina se presente
  let immagineUrl = null;
  if (immagineFile) {
    const utente = await getUtenteCorrente();
    if (utente) immagineUrl = await caricaImmagineEvento(immagineFile, utente.id);
  }

  const risultato = await pubblicaEvento(titolo, descrizione, dataEvento, luogo, regione, categoria, immagineUrl);
  if (risultato) {
    alert('Evento creato con successo!');
    document.getElementById('evento-titolo').value = '';
    document.getElementById('evento-descrizione').value = '';
    document.getElementById('evento-data').value = '';
    document.getElementById('evento-luogo').value = '';
    document.getElementById('evento-regione').value = '';
    document.getElementById('evento-categoria').value = '';
    if (immagineInput) immagineInput.value = '';
    nascondiFormEvento();
    caricaEMostraEventi();
  }
}

document.addEventListener('DOMContentLoaded', caricaEMostraEventi);

// ── FILTRI PILLOLE ──
function setActive(el) {
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  filtraFeed();
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
  const gruppoLogo = document.getElementById('gruppo-logo');

 if (tipo === 'genitore') {
    badge.textContent = '👨‍👩‍👦';
    sottotitolo.textContent = 'Registrati come Genitore / Famiglia';
    gruppoClub.style.display = 'none';
    if (gruppoLogo) gruppoLogo.style.display = 'none';
    document.getElementById('check-consenso').style.display = 'flex';
  } else if (tipo === 'club') {
    badge.textContent = '⚽';
    sottotitolo.textContent = 'Registrati come Club / Associazione';
    gruppoClub.style.display = 'block';
    if (gruppoLogo) gruppoLogo.style.display = 'block';
    document.getElementById('check-consenso').style.display = 'flex';
  } else if (tipo === 'scout') {
    badge.textContent = '🔍';
    sottotitolo.textContent = 'Registrati come Scout / Osservatore';
    gruppoClub.style.display = 'none';
    if (gruppoLogo) gruppoLogo.style.display = 'none';
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
  const dataNascita = document.getElementById('input-data-nascita').value;
  const cf = document.getElementById('input-cf').value.toUpperCase().trim();
  const clubEl = document.getElementById('input-club');
  const club = clubEl ? clubEl.value : '';
  const logoInput = document.getElementById('input-logo');
  const logoFile = logoInput && logoInput.files.length > 0 ? logoInput.files[0] : null;
  const privacy = document.getElementById('privacy').checked;
  const termini = document.getElementById('termini').checked;
  const consensoEl = document.getElementById('consenso');
  const consenso = consensoEl ? consensoEl.checked : true;

  if (!nome || !email || !password || !regione) {
    alert('Per favore compila tutti i campi obbligatori!');
    return;
  }
  if (tipoScelto === 'club' && !club) {
    alert('Inserisci il nome del club/associazione!');
    return;
  }
  if (password.length < 8) {
    alert('La password deve essere di almeno 8 caratteri!');
    return;
  }

  // Validazione data di nascita (maggiore età)
  if (!dataNascita) {
    alert('Inserisci la tua data di nascita!');
    return;
  }
  const oggi = new Date();
  const nascita = new Date(dataNascita);
  let eta = oggi.getFullYear() - nascita.getFullYear();
  const mese = oggi.getMonth() - nascita.getMonth();
  if (mese < 0 || (mese === 0 && oggi.getDate() < nascita.getDate())) eta--;
  if (eta < 18) {
    alert('Devi avere almeno 18 anni per registrarti su CampioninCampo.');
    return;
  }

  // Validazione codice fiscale (16 caratteri alfanumerici)
  if (!cf) {
    alert('Inserisci il tuo codice fiscale!');
    return;
  }
  if (!/^[A-Z0-9]{16}$/.test(cf)) {
    alert('Il codice fiscale deve essere di 16 caratteri (lettere e numeri).');
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

  const risultato = await registraUtente(email, password, nome, tipoScelto, regione, club, dataNascita, cf);

  if (risultato && risultato.user && tipoScelto === 'club' && logoFile) {
    await caricaLogoClub(logoFile, risultato.user.id);
  }

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
    location.href = 'home.html';
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
let fotoSelezionate = []; // array di File objects per le foto multiple
let videoSelezionati = []; // array di File objects per i video multipli

function aggiornaGrigliaVideo() {
  const lista = document.getElementById('video-preview-lista');
  const count = document.getElementById('video-count');
  if (!lista) return;

  lista.innerHTML = '';
  let totMB = 0;

  videoSelezionati.forEach((file, index) => {
    totMB += file.size / 1024 / 1024;
    const div = document.createElement('div');
    div.style.cssText = 'position:relative; border-radius:8px; overflow:hidden; background:#111; display:flex; align-items:center; justify-content:center; height:80px; border:1px solid #e5e7eb;';
    div.innerHTML = `
      <div style="text-align:center; color:white;">
        <div style="font-size:22px;">🎬</div>
        <div style="font-size:11px; margin-top:4px; padding:0 8px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; max-width:120px;">${file.name}</div>
      </div>
      <div onclick="rimuoviVideo(${index})" style="position:absolute; top:4px; right:4px; background:rgba(220,38,38,0.85); color:white; border-radius:50%; width:22px; height:22px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:12px;">✕</div>
    `;
    lista.appendChild(div);
  });

  const totale = totMB.toFixed(1);
  if (count) count.textContent = `${videoSelezionati.length} video selezionati · ${totale} MB totali`;
}

function rimuoviVideo(index) {
  videoSelezionati.splice(index, 1);
  if (videoSelezionati.length === 0) {
    rimuoviFile();
  } else {
    aggiornaGrigliaVideo();
  }
}

function aggiungiVideo(input) {
  const file = input.files[0];
  if (!file) return;
  videoSelezionati.push(file);
  input.value = '';
  aggiornaGrigliaVideo();
}

function aggiornaGrigliaFoto() {
  const lista = document.getElementById('foto-preview-lista');
  const count = document.getElementById('foto-count');
  if (!lista) return;

  lista.innerHTML = '';
  let totMB = 0;

  fotoSelezionate.forEach((file, index) => {
    totMB += file.size / 1024 / 1024;
    const reader = new FileReader();
    reader.onload = (e) => {
      const div = document.createElement('div');
      div.style.cssText = 'position:relative; border-radius:8px; overflow:hidden; height:90px;';
      div.innerHTML = `
        <img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover;">
        <div onclick="rimuoviFoto(${index})" style="position:absolute; top:4px; right:4px; background:rgba(0,0,0,0.6); color:white; border-radius:50%; width:22px; height:22px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:12px;">✕</div>
      `;
      lista.appendChild(div);
    };
    reader.readAsDataURL(file);
  });

  const totale = totMB.toFixed(1);
  if (count) count.textContent = `${fotoSelezionate.length} foto selezionate · ${totale} MB totali`;
}

function rimuoviFoto(index) {
  fotoSelezionate.splice(index, 1);
  if (fotoSelezionate.length === 0) {
    rimuoviFile();
  } else {
    aggiornaGrigliaFoto();
  }
}

function aggiungiFoto(input) {
  const file = input.files[0];
  if (!file) return;
  fotoSelezionate.push(file);
  input.value = ''; // reset così può aggiungere la stessa foto due volte se vuole
  aggiornaGrigliaFoto();
}

function setTipoContenuto(el, tipo) {
  document.querySelectorAll('.tipo-contenuto').forEach(t => t.classList.remove('active'));
  el.classList.add('active');

  const fileInput = document.getElementById('file-input');
  const formati = document.getElementById('drop-formati');
  const dropTitolo = document.getElementById('drop-titolo');
  const dropSottotitolo = document.getElementById('drop-sottotitolo');

  if (tipo === 'video') {
    formati.textContent = 'MP4, MOV, AVI fino a 500MB — puoi selezionarne più di uno!';
    if (dropTitolo) dropTitolo.textContent = 'Trascina qui i tuoi video';
    if (dropSottotitolo) dropSottotitolo.textContent = 'oppure clicca per selezionarli (anche più di uno)';
    if (fileInput) { fileInput.setAttribute('multiple', 'multiple'); fileInput.accept = 'video/*'; }
    document.getElementById('area-file').style.display = 'block';
  }
  if (tipo === 'foto') {
    formati.textContent = 'JPG, PNG, WEBP fino a 20MB — puoi selezionarne più di una!';
    if (dropTitolo) dropTitolo.textContent = 'Trascina qui le tue foto';
    if (dropSottotitolo) dropSottotitolo.textContent = 'oppure clicca per selezionarle (anche più di una)';
    if (fileInput) { fileInput.setAttribute('multiple', 'multiple'); fileInput.accept = 'image/*'; }
    document.getElementById('area-file').style.display = 'block';
  }
  if (tipo === 'notizia') document.getElementById('area-file').style.display = 'none';
  if (tipo === 'evento') document.getElementById('area-file').style.display = 'none';
}

function fileSelezionato(input) {
  const files = input.files;
  if (!files || files.length === 0) return;

  const tipoEl = document.querySelector('.tipo-contenuto.active span');
  const tipo = tipoEl ? tipoEl.textContent.toLowerCase() : 'video';

  if (tipo === 'foto') {
    // Aggiunge la foto all'array e mostra la griglia
    fotoSelezionate.push(files[0]);
    document.getElementById('drop-area').style.display = 'none';
    document.getElementById('file-preview').style.display = 'none';
    document.getElementById('foto-preview-griglia').style.display = 'block';
    aggiornaGrigliaFoto();
  } else if (tipo === 'video') {
    // Video multipli
    for (let i = 0; i < files.length; i++) videoSelezionati.push(files[i]);
    document.getElementById('drop-area').style.display = 'none';
    document.getElementById('file-preview').style.display = 'none';
    document.getElementById('foto-preview-griglia').style.display = 'none';
    const grigliaVideo = document.getElementById('video-preview-griglia');
    if (grigliaVideo) grigliaVideo.style.display = 'block';
    aggiornaGrigliaVideo();
  } else {
    // File singolo (video)
    const file = files[0];
    const mb = (file.size / 1024 / 1024).toFixed(1);
    document.getElementById('file-nome').textContent = file.name;
    document.getElementById('file-size').textContent = mb + ' MB';
    document.getElementById('drop-area').style.display = 'none';
    document.getElementById('file-preview').style.display = 'flex';
    document.getElementById('foto-preview-griglia').style.display = 'none';
  }
}

function rimuoviFile() {
  document.getElementById('file-input').value = '';
  document.getElementById('drop-area').style.display = 'block';
  document.getElementById('file-preview').style.display = 'none';
  document.getElementById('foto-preview-griglia').style.display = 'none';
  const grigliaVideo = document.getElementById('video-preview-griglia');
  if (grigliaVideo) grigliaVideo.style.display = 'none';
  const lista = document.getElementById('foto-preview-lista');
  if (lista) lista.innerHTML = '';
  const listaVideo = document.getElementById('video-preview-lista');
  if (listaVideo) listaVideo.innerHTML = '';
  fotoSelezionate = [];
  videoSelezionati = [];
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
  const files = fileInput.files;

  const tipoEl = document.querySelector('.tipo-contenuto.active span');
  const tipo = tipoEl ? tipoEl.textContent.toLowerCase() : 'notizia';

  const visibilitaEl = document.querySelector('.visibilita-opzione.active .vis-nome');
  const visibilita = visibilitaEl ? visibilitaEl.textContent.toLowerCase() : 'pubblico';

  if (!titolo || !giocatore || !categoria) {
    alert('Compila almeno titolo, nome giocatore e categoria!');
    return;
  }

  let urlFile = null;

  if (tipo === 'foto' && fotoSelezionate.length > 0) {
    if (fotoSelezionate.length === 1) {
      urlFile = await uploadFile(fotoSelezionate[0], tipo);
      if (!urlFile) return;
    } else {
      const urls = [];
      for (let i = 0; i < fotoSelezionate.length; i++) {
        const url = await uploadFile(fotoSelezionate[i], tipo);
        if (!url) return;
        urls.push(url);
      }
      urlFile = JSON.stringify(urls);
    }
  } else if (tipo === 'video' && videoSelezionati.length > 0) {
    if (videoSelezionati.length === 1) {
      urlFile = await uploadFile(videoSelezionati[0], tipo);
      if (!urlFile) return;
    } else {
      const urls = [];
      for (let i = 0; i < videoSelezionati.length; i++) {
        const url = await uploadFile(videoSelezionati[i], tipo);
        if (!url) return;
        urls.push(url);
      }
      urlFile = JSON.stringify(urls);
    }
  } else if (files && files.length > 0 && tipo !== 'foto' && tipo !== 'video') {
    urlFile = await uploadFile(files[0], tipo);
    if (!urlFile) return;
  }

  const giocatoreId = await creaOTrovaGiocatore(giocatore, eta, categoria, ruolo, club, regione);
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
  fotoSelezionate = [];
  rimuoviFile();
}
