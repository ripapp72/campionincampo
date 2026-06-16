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
  } else if (tipo === 'club') {
    badge.textContent = '⚽';
    sottotitolo.textContent = 'Registrati come Club / Associazione';
    gruppoClub.style.display = 'block';
  } else if (tipo === 'scout') {
    badge.textContent = '🔍';
    sottotitolo.textContent = 'Registrati come Scout / Osservatore';
    gruppoClub.style.display = 'none';
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

function registrati() {
  const nome = document.getElementById('input-nome').value;
  const email = document.getElementById('input-email').value;
  const password = document.getElementById('input-password').value;
  const regione = document.getElementById('input-regione').value;
  const privacy = document.getElementById('privacy').checked;

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

  document.getElementById('step-form').style.display = 'none';
  document.getElementById('step-successo').style.display = 'block';
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

function accedi() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    alert('Per favore inserisci email e password!');
    return;
  }

  // Per ora reindirizza alla homepage
  // Quando aggiungeremo il database controllerà le credenziali vere
  location.href = 'index.html';
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

function pubblicaContenuto() {
  const titolo = document.getElementById('upload-titolo').value;
  const giocatore = document.getElementById('upload-giocatore').value;
  const categoria = document.getElementById('upload-categoria').value;

  if (!titolo || !giocatore || !categoria) {
    alert('Compila almeno titolo, nome giocatore e categoria!');
    return;
  }

  document.querySelector('.upload-container > *:not(#upload-successo)') ;
  document.querySelectorAll('.upload-card, .upload-bottoni, .upload-header').forEach(el => el.style.display = 'none');
  document.getElementById('upload-successo').style.display = 'block';
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