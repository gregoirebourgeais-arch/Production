// ---------- VARIABLES GLOBALES ----------
let currentPage = 'atelier';
let currentLigne = '';
let historiques = {
  production: [],
  arrets: [],
  organisation: [],
  personnel: []
};
let atelierChart;

// ---------- INITIALISATION ----------
document.addEventListener('DOMContentLoaded', () => {
  afficherDate();
  chargerDonnees();
  updateHorloge();
  setInterval(updateHorloge, 1000);
  openPage('atelier');
});

// ---------- HORLOGE ET DATE ----------
function updateHorloge() {
  const now = new Date();
  const semaine = getWeekNumber(now);
  const equipe = getEquipe(now);
  document.getElementById('horloge').textContent =
    now.toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
    ` | Semaine ${semaine} | Équipe ${equipe}`;
}

function afficherDate() {
  const now = new Date();
  const quantieme = now.getDate();
  const mois = now.toLocaleString('fr-FR', { month: 'long' });
  const annee = now.getFullYear();
  const semaine = getWeekNumber(now);
  document.getElementById('dateDisplay').textContent =
    `${quantieme} ${mois} ${annee} — Semaine ${semaine}`;
}

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return weekNo;
}

function getEquipe(now) {
  const h = now.getHours();
  if (h >= 5 && h < 13) return 'M';
  if (h >= 13 && h < 21) return 'AM';
  return 'N';
}

// ---------- NAVIGATION ----------
function openPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(page).classList.add('active');
  currentPage = page;
  if (page === 'atelier') renderAtelierChart();
}

// ---------- PERSISTANCE ----------
function sauvegarderDonnees() {
  localStorage.setItem('historiques', JSON.stringify(historiques));
}

function chargerDonnees() {
  const data = localStorage.getItem('historiques');
  if (data) {
    historiques = JSON.parse(data);
    majHistoriques();
  }
}

// ---------- SELECTION DE LIGNE ----------
function selectLigne(ligne) {
  currentLigne = ligne;
  document.getElementById('ligneTitle').textContent = `Ligne : ${ligne}`;
  const section = document.querySelector('#production');
  section.scrollIntoView({ behavior: 'smooth' });
  afficherHistoriqueLigne(ligne);
}

// ---------- ENREGISTREMENT PRODUCTION ----------
function enregistrerProduction() {
  const debut = document.getElementById('heureDebut').value;
  const fin = document.getElementById('heureFin').value;
  const qteP = parseFloat(document.getElementById('quantiteProduite').value) || 0;
  const qteR = parseFloat(document.getElementById('quantiteRestante').value) || 0;
  const cadenceManuelle = parseFloat(document.getElementById('cadenceManuelle').value) || null;
  const equipe = getEquipe(new Date());

  const record = {
    ligne: currentLigne,
    debut,
    fin,
    quantiteProduite: qteP,
    quantiteRestante: qteR,
    cadence: cadenceManuelle || calculerCadence(qteP, debut, fin),
    equipe,
    date: new Date().toLocaleString()
  };

  historiques.production.push(record);
  sauvegarderDonnees();
  afficherHistoriqueLigne(currentLigne);
  majHistoriques();
  resetForm();
}

// ---------- CALCULS ----------
function calculerCadence(qte, debut, fin) {
  if (!debut || !fin) return 0;
  const d1 = new Date(`2025-01-01T${debut}`);
  const d2 = new Date(`2025-01-01T${fin}`);
  const diff = (d2 - d1) / 3600000;
  return diff > 0 ? (qte / diff).toFixed(2) : 0;
}

function updateFinEstimee() {
  const qteR = parseFloat(document.getElementById('quantiteRestante').value) || 0;
  const cadence = parseFloat(document.getElementById('cadenceManuelle').value) || 0;
  const temps = cadence > 0 ? qteR / cadence : 0;
  const heures = Math.floor(temps);
  const minutes = Math.round((temps - heures) * 60);
  document.getElementById('finEstimee').textContent =
    `⏱️ Temps restant : ${heures}h ${minutes}min`;
}

// ---------- HISTORIQUES ----------
function afficherHistoriqueLigne(ligne) {
  const hist = historiques.production.filter(r => r.ligne === ligne);
  const ul = document.getElementById('historiqueLigne');
  ul.innerHTML = '';
  hist.forEach((r, i) => {
    const li = document.createElement('li');
    li.textContent = `${r.date} — ${r.ligne} — ${r.quantiteProduite}u — ${r.cadence} col/h — ${r.equipe}`;
    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑️';
    delBtn.onclick = () => supprimerRecord('production', i);
    li.appendChild(delBtn);
    ul.appendChild(li);
  });
}

function majHistoriques() {
  const map = {
    historiqueArrets: historiques.arrets,
    historiqueOrganisation: historiques.organisation,
    historiquePersonnel: historiques.personnel,
    historiqueProduction: historiques.production
  };

  for (const [id, arr] of Object.entries(map)) {
    const ul = document.getElementById(id);
    if (!ul) continue;
    ul.innerHTML = '';
    arr.forEach(r => {
      const li = document.createElement('li');
      li.textContent = JSON.stringify(r, null, 2);
      ul.appendChild(li);
    });
  }
}

function supprimerRecord(type, index) {
  historiques[type].splice(index, 1);
  sauvegarderDonnees();
  majHistoriques();
}

// ---------- RESET FORM ----------
function resetForm() {
  document.querySelectorAll('#production input').forEach(i => i.value = '');
  document.getElementById('finEstimee').textContent = '⏱️ Temps restant : --';
}

// ---------- ARRÊTS ----------
function enregistrerArret() {
  const ligne = document.getElementById('ligneArret').value;
  const type = document.getElementById('typeArret').value;
  const duree = document.getElementById('dureeArret').value;
  const commentaire = document.getElementById('commentaireArret').value;
  const equipe = getEquipe(new Date());

  const record = {
    ligne,
    type,
    duree,
    commentaire,
    equipe,
    date: new Date().toLocaleString()
  };

  historiques.arrets.push(record);
  sauvegarderDonnees();
  majHistoriques();
  document.getElementById('dureeArret').value = '';
  document.getElementById('commentaireArret').value = '';
}

// ---------- ORGANISATION ----------
function enregistrerConsigne() {
  const texte = document.getElementById('consigne').value.trim();
  if (!texte) return;
  const equipe = getEquipe(new Date());
  const record = { texte, equipe, date: new Date().toLocaleString(), valide: false };
  historiques.organisation.push(record);
  sauvegarderDonnees();
  majHistoriques();
  document.getElementById('consigne').value = '';
}

// ---------- PERSONNEL ----------
function enregistrerPersonnel() {
  const nom = document.getElementById('nomPersonnel').value;
  const motif = document.getElementById('motifPersonnel').value;
  const commentaire = document.getElementById('commentairePersonnel').value;
  const equipe = getEquipe(new Date());
  const record = { nom, motif, commentaire, equipe, date: new Date().toLocaleString() };

  historiques.personnel.push(record);
  sauvegarderDonnees();
  majHistoriques();
  document.getElementById('nomPersonnel').value = '';
  document.getElementById('commentairePersonnel').value = '';
}

// ---------- CALCULATRICE ----------
function toggleCalculator() {
  const calc = document.getElementById('calculator');
  calc.classList.toggle('show');
  if (calc.classList.contains('show')) initCalculator();
}

function initCalculator() {
  const calc = document.getElementById('calculator');
  calc.innerHTML = '';
  const input = document.createElement('input');
  input.id = 'calcInput';
  input.type = 'text';
  input.readOnly = true;
  input.style.width = '100%';
  input.style.textAlign = 'right';
  calc.appendChild(input);

  const buttons = [
    '7','8','9','/','4','5','6','*',
    '1','2','3','-','0','.','=','+','C'
  ];
  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
  grid.style.gap = '5px';

  buttons.forEach(b => {
    const btn = document.createElement('button');
    btn.textContent = b;
    btn.onclick = () => {
      if (b === 'C') input.value = '';
      else if (b === '=') {
        try { input.value = eval(input.value); } catch { input.value = 'Erreur'; }
      } else input.value += b;
    };
    grid.appendChild(btn);
  });
  calc.appendChild(grid);
}

// ---------- EXPORT EXCEL ----------
function exportAllData() {
  const wb = XLSX.utils.book_new();

  const sheets = {
    Production: historiques.production,
    Arrets: historiques.arrets,
    Organisation: historiques.organisation,
    Personnel: historiques.personnel
  };

  for (const [name, data] of Object.entries(sheets)) {
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }

  XLSX.writeFile(wb, `Atelier_PPNC_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ---------- GRAPHIQUES ----------
function renderAtelierChart() {
  const ctx = document.getElementById('atelierChart');
  if (!ctx) return;
  const lignes = [...new Set(historiques.production.map(r => r.ligne))];
  const couleurs = ['#007bff','#00cc99','#ff9933','#cc3366','#9999ff','#33cccc','#ff6666','#66cc66','#ffcc00','#3366cc'];

  const datasets = lignes.map((ligne, i) => {
    const dataLigne = historiques.production.filter(r => r.ligne === ligne).map(r => r.cadence);
    return {
      label: ligne,
      data: dataLigne,
      borderColor: couleurs[i % couleurs.length],
      fill: false
    };
  });

  if (atelierChart) atelierChart.destroy();
  atelierChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: historiques.production.map(r => r.date),
      datasets
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' }
      },
      scales: {
        x: { title: { display: true, text: 'Date / Heure' } },
        y: { title: { display: true, text: 'Cadence (colis/h)' } }
      }
    }
  });
    }
