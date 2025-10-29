/* ===============================
   === Atelier PPNC - App.js ===
   =============================== */

// ---- INITIALISATION ----
let currentPage = 'atelier';
let currentLigne = '';
let data = JSON.parse(localStorage.getItem('atelierPPNC')) || {
  production: [],
  arrets: [],
  organisation: [],
  personnel: []
};

// ---- FONCTIONS DE BASE ----
function openPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  currentPage = pageId;
  updateChart();
}

function showLigne(ligne) {
  currentLigne = ligne;
  document.getElementById('titreLigne').innerText = ligne;
  document.getElementById('formLigne').scrollIntoView({ behavior: 'smooth' });
}

// ---- HEURE / DATE / ÉQUIPE ----
function updateDateHeure() {
  const now = new Date();
  const jourAnnee = Math.ceil((now - new Date(now.getFullYear(), 0, 1)) / 86400000);
  const semaine = Math.ceil(((now - new Date(now.getFullYear(), 0, 1)) / 86400000 + now.getDay() + 1) / 7);
  const equipe = now.getHours() >= 5 && now.getHours() < 13 ? 'AM (5h–13h)' :
                  now.getHours() >= 13 && now.getHours() < 21 ? 'PM (13h–21h)' :
                  'N (21h–5h)';

  document.getElementById('dateHeure').textContent = now.toLocaleString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  document.getElementById('infosComplementaires').textContent = `Jour ${jourAnnee} – Semaine ${semaine} – Équipe ${equipe}`;
}
setInterval(updateDateHeure, 1000);
updateDateHeure();

// ---- PRODUCTION ----
function enregistrerProduction() {
  const ligne = currentLigne || 'Inconnue';
  const debut = document.getElementById('heureDebut').value;
  const fin = document.getElementById('heureFin').value;
  const qteP = parseFloat(document.getElementById('quantiteProduite').value) || 0;
  const qteR = parseFloat(document.getElementById('quantiteRestante').value) || 0;
  const cadMan = parseFloat(document.getElementById('cadenceManuelle').value) || 0;
  const equipe = document.getElementById('infosComplementaires').textContent.split('Équipe ')[1] || '–';

  const date = new Date().toLocaleString('fr-FR');
  const finEstimee = calculerFinEstimee(qteR, cadMan);

  const entry = { ligne, debut, fin, qteP, qteR, cadMan, finEstimee, date, equipe };
  data.production.push(entry);
  localStorage.setItem('atelierPPNC', JSON.stringify(data));

  afficherHistorique();
  alert(`✅ Enregistrement effectué pour ${ligne}`);
  resetForm();
}

function calculerFinEstimee(restante, cadence) {
  if (!restante || !cadence) return "--";
  const heures = restante / cadence;
  const totalMinutes = heures * 60;
  const fin = new Date(Date.now() + totalMinutes * 60000);
  return fin.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function resetForm() {
  ['heureDebut', 'heureFin', 'quantiteProduite', 'quantiteRestante', 'cadenceManuelle'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('finEstimee').textContent = '⏱️ Fin estimée : --';
}

// ---- ARRÊTS ----
function enregistrerArret() {
  const ligne = document.getElementById('ligneArret').value;
  const type = document.getElementById('typeArret').value;
  const duree = parseFloat(document.getElementById('dureeArret').value) || 0;
  const commentaire = document.getElementById('commentaireArret').value;
  const date = new Date().toLocaleString('fr-FR');
  const equipe = document.getElementById('infosComplementaires').textContent.split('Équipe ')[1] || '–';

  data.arrets.push({ ligne, type, duree, commentaire, date, equipe });
  localStorage.setItem('atelierPPNC', JSON.stringify(data));

  afficherHistorique();
  alert(`⏸️ Arrêt enregistré sur ${ligne}`);
  ['dureeArret', 'commentaireArret'].forEach(id => document.getElementById(id).value = '');
}

// ---- ORGANISATION ----
function enregistrerConsigne() {
  const texte = document.getElementById('nouvelleConsigne').value;
  const valide = document.getElementById('consigneValidee').checked;
  const date = new Date().toLocaleString('fr-FR');
  const equipe = document.getElementById('infosComplementaires').textContent.split('Équipe ')[1] || '–';

  data.organisation.push({ texte, valide, date, equipe });
  localStorage.setItem('atelierPPNC', JSON.stringify(data));

  afficherHistorique();
  document.getElementById('nouvelleConsigne').value = '';
  document.getElementById('consigneValidee').checked = false;
}

// ---- PERSONNEL ----
function enregistrerPersonnel() {
  const texte = document.getElementById('observationPersonnel').value;
  const date = new Date().toLocaleString('fr-FR');
  const equipe = document.getElementById('infosComplementaires').textContent.split('Équipe ')[1] || '–';
  data.personnel.push({ texte, date, equipe });
  localStorage.setItem('atelierPPNC', JSON.stringify(data));

  afficherHistorique();
  document.getElementById('observationPersonnel').value = '';
}

// ---- HISTORIQUES ----
function afficherHistorique() {
  const histos = {
    production: document.getElementById('historiqueProduction'),
    arrets: document.getElementById('historiqueArrets'),
    organisation: document.getElementById('historiqueOrganisation'),
    personnel: document.getElementById('historiquePersonnel')
  };

  Object.entries(histos).forEach(([key, ul]) => {
    ul.innerHTML = data[key].slice(-5).map(item => {
      if (key === 'organisation') {
        return `<li>${item.date} — ${item.texte} ${item.valide ? '✅' : '⏳'} (${item.equipe})</li>`;
      }
      if (key === 'production') {
        return `<li>${item.date} — ${item.ligne} : ${item.qteP} produits, fin estimée ${item.finEstimee} (${item.equipe})</li>`;
      }
      if (key === 'arrets') {
        return `<li>${item.date} — ${item.ligne} (${item.type}) : ${item.duree} min (${item.equipe})</li>`;
      }
      if (key === 'personnel') {
        return `<li>${item.date} — ${item.texte} (${item.equipe})</li>`;
      }
      return '';
    }).join('');
  });

  updateChart();
}
afficherHistorique();

// ---- GRAPHIQUE ATELIER ----
let chart;
function updateChart() {
  const ctx = document.getElementById('atelierChart').getContext('2d');
  if (chart) chart.destroy();

  const lignes = [...new Set(data.production.map(p => p.ligne))];
  const datasets = lignes.map((ligne, i) => {
    const points = data.production
      .filter(p => p.ligne === ligne)
      .map((p, index) => ({ x: index, y: p.qteP || 0 }));
    const couleur = `hsl(${i * 40}, 70%, 50%)`;
    return {
      label: ligne,
      data: points,
      borderColor: couleur,
      backgroundColor: couleur + '40',
      tension: 0.3
    };
  });

  chart = new Chart(ctx, {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true,
      scales: {
        x: { title: { display: true, text: 'Enregistrements' } },
        y: { title: { display: true, text: 'Quantité produite' }, beginAtZero: true }
      },
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

// ---- EXPORT EXCEL ----
function exportExcel() {
  const wb = XLSX.utils.book_new();

  Object.keys(data).forEach(cat => {
    const ws = XLSX.utils.json_to_sheet(data[cat]);
    XLSX.utils.book_append_sheet(wb, ws, cat);
  });

  XLSX.writeFile(wb, "Atelier_PPNC.xlsx");
}

// ---- CALCULATRICE ----
function toggleCalculatrice() {
  const calc = document.getElementById('calculatrice');
  calc.style.display = (calc.style.display === 'block') ? 'none' : 'block';
}

function calcAdd(val) {
  const disp = document.getElementById('calcDisplay');
  disp.value += val;
}

function calcCompute() {
  const disp = document.getElementById('calcDisplay');
  try {
    disp.value = eval(disp.value);
  } catch {
    disp.value = "Erreur";
  }
}

function calcClear() {
  document.getElementById('calcDisplay').value = '';
}

// ---- Déplacement calculatrice ----
const calcBtn = document.getElementById('calcButton');
let offsetX, offsetY, isDragging = false;

calcBtn.addEventListener('mousedown', e => {
  isDragging = true;
  offsetX = e.clientX - calcBtn.getBoundingClientRect().left;
  offsetY = e.clientY - calcBtn.getBoundingClientRect().top;
});
document.addEventListener('mousemove', e => {
  if (isDragging) {
    calcBtn.style.left = `${e.clientX - offsetX}px`;
    calcBtn.style.top = `${e.clientY - offsetY}px`;
  }
});
document.addEventListener('mouseup', () => { isDragging = false; });
