// ==================== VARIABLES GLOBALES ====================
const lignes = ["Râpé","T2","RT","Omori","T1","Sticks","Emballage","Dés","Filets","Prédécoupés"];
let dataProduction = JSON.parse(localStorage.getItem("dataProduction")) || {};
let dataArrets = JSON.parse(localStorage.getItem("dataArrets")) || [];
let dataConsignes = JSON.parse(localStorage.getItem("dataConsignes")) || [];
let dataPersonnel = JSON.parse(localStorage.getItem("dataPersonnel")) || [];

// ==================== INITIALISATION ====================
window.onload = () => {
  creerPagesLignes();
  remplirSelectLignes();
  chargerHistorique();
  chargerHistoriqueArrets();
  chargerHistoriqueConsignes();
  chargerHistoriquePersonnel();
  majGraphGlobal();
  ouvrirPage("atelier");
  planifierSauvegardeEquipe();
};

// ==================== CREATION DES PAGES LIGNES ====================
function creerPagesLignes() {
  const container = document.getElementById("lignes");
  container.innerHTML = "";
  lignes.forEach(nom => {
    const id = nom.toLowerCase().replace(/é/g,'e');
    container.innerHTML += `
      <section id="page-${id}" class="page">
        <h3>${nom}</h3>
        <label>Heure début :</label>
        <input id="debut-${id}" type="time">
        <label>Heure fin :</label>
        <input id="fin-${id}" type="time">
        <label>Quantité produite :</label>
        <input id="quantite-${id}" type="number" placeholder="Quantité">
        <label>Quantité restante :</label>
        <input id="restante-${id}" type="number" placeholder="Quantité restante" oninput="calculerEstimation('${id}')">
        <label>Cadence manuelle :</label>
        <input id="cadence-${id}" type="number" placeholder="Saisir cadence (colis/h)">
        <p id="affichageCadence-${id}">Cadence : 0 colis/h</p>
        <p id="finEstimee-${id}">Fin estimée : --:--</p>
        <button onclick="enregistrerProduction('${id}')">Enregistrer</button>
        <button onclick="annulerDernier('${id}')">Annuler dernier</button>
        <button onclick="exporterHistorique('${id}')">Exporter Excel</button>
        <canvas id="graph-${id}"></canvas>
        <table id="historique-${id}"><tr><th>Début</th><th>Fin</th><th>Qté</th><th>Cadence</th><th>Fin estimée</th></tr></table>
      </section>`;
  });
}

// ==================== NAVIGATION ====================
function ouvrirPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(`page-${page}`).classList.add("active");
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== ENREGISTREMENT PRODUCTION ====================
function enregistrerProduction(id) {
  const debut = document.getElementById(`debut-${id}`).value;
  const fin = document.getElementById(`fin-${id}`).value;
  const qte = parseFloat(document.getElementById(`quantite-${id}`).value) || 0;
  const qteRest = parseFloat(document.getElementById(`restante-${id}`).value) || 0;
  const cadenceManuelle = parseFloat(document.getElementById(`cadence-${id}`).value);

  let cadence = 0;
  if (cadenceManuelle > 0) cadence = cadenceManuelle;
  else if (debut && fin && qte > 0) {
    const diff = (new Date(`1970-01-01T${fin}:00`) - new Date(`1970-01-01T${debut}:00`)) / 3600000;
    cadence = diff > 0 ? (qte / diff).toFixed(1) : 0;
  }

  const finEstimee = estimerFin(qteRest, cadence);
  const ligneData = dataProduction[id] || [];
  ligneData.push({ debut, fin, qte, cadence, finEstimee, date: new Date().toLocaleString() });
  dataProduction[id] = ligneData;
  localStorage.setItem("dataProduction", JSON.stringify(dataProduction));
  chargerHistorique();
  majGraphGlobal();
  viderChamps(id);
}

// ==================== CALCUL INSTANTANÉ ESTIMATION ====================
function calculerEstimation(id) {
  const qteRest = parseFloat(document.getElementById(`restante-${id}`).value) || 0;
  const cadence = parseFloat(document.getElementById(`cadence-${id}`).value) || 0;
  const estimation = estimerFin(qteRest, cadence);
  document.getElementById(`finEstimee-${id}`).innerText = `Fin estimée : ${estimation}`;
}

function estimerFin(qteRest, cadence) {
  if (!cadence || cadence <= 0 || !qteRest) return "--:--";
  const minutes = (qteRest / cadence) * 60;
  const fin = new Date(Date.now() + minutes * 60000);
  return fin.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ==================== VIDER CHAMPS ====================
function viderChamps(id) {
  document.getElementById(`quantite-${id}`).value = "";
  document.getElementById(`restante-${id}`).value = "";
  document.getElementById(`cadence-${id}`).value = "";
}

// ==================== HISTORIQUES ====================
function chargerHistorique() {
  lignes.forEach(nom => {
    const id = nom.toLowerCase().replace(/é/g,'e');
    const hist = document.getElementById(`historique-${id}`);
    if (!hist) return;
    hist.innerHTML = "<tr><th>Début</th><th>Fin</th><th>Qté</th><th>Cadence</th><th>Fin estimée</th></tr>";
    const data = dataProduction[id] || [];
    data.forEach(d => {
      hist.innerHTML += `<tr><td>${d.debut}</td><td>${d.fin}</td><td>${d.qte}</td><td>${d.cadence}</td><td>${d.finEstimee}</td></tr>`;
    });
    majGraphique(id, data);
  });
}

// ==================== GRAPHIQUES ====================
function majGraphique(id, data) {
  const ctx = document.getElementById(`graph-${id}`);
  if (!ctx) return;
  if (ctx.chart) ctx.chart.destroy();
  ctx.chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.fin || ""),
      datasets: [{
        label: "Cadence (colis/h)",
        data: data.map(d => d.cadence),
        backgroundColor: "#1a73e8"
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

function majGraphGlobal() {
  const ctx = document.getElementById("graphGlobal");
  if (!ctx) return;
  if (ctx.chart) ctx.chart.destroy();

  const moyennes = lignes.map(nom => {
    const id = nom.toLowerCase().replace(/é/g,'e');
    const data = dataProduction[id] || [];
    const moy = data.length ? data.reduce((a,b) => a + parseFloat(b.cadence||0),0) / data.length : 0;
    return moy.toFixed(1);
  });

  ctx.chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: lignes,
      datasets: [{
        label: "Cadence moyenne (colis/h)",
        data: moyennes,
        backgroundColor: "#1a73e8"
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

// ==================== ANNULER DERNIER ====================
function annulerDernier(id) {
  if (!dataProduction[id] || !dataProduction[id].length) return;
  dataProduction[id].pop();
  localStorage.setItem("dataProduction", JSON.stringify(dataProduction));
  chargerHistorique();
  majGraphGlobal();
}

// ==================== EXPORT EXCEL ====================
function exporterHistorique(id) {
  const data = dataProduction[id] || [];
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, id);
  XLSX.writeFile(wb, `Historique_${id}_${new Date().toLocaleDateString()}.xlsx`);
}

function exporterGlobal() {
  let allData = [];
  lignes.forEach(nom => {
    const id = nom.toLowerCase().replace(/é/g,'e');
    const data = dataProduction[id] || [];
    data.forEach(d => allData.push({ Ligne: nom, ...d }));
  });
  allData.push(...dataArrets.map(a => ({ Ligne: a.ligne, Type: "Arrêt", Durée: a.temps, Cause: a.cause, Date: a.date })));
  allData.push(...dataPersonnel.map(p => ({ Ligne: "Personnel", Nom: p.nom, Motif: p.motif, Commentaire: p.commentaire, Date: p.date })));
  allData.push(...dataConsignes.map(c => ({ Ligne: "Organisation", Consigne: c.texte, Date: c.date })));

  const ws = XLSX.utils.json_to_sheet(allData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Synthèse Atelier");
  XLSX.writeFile(wb, `Synthese_Atelier_${new Date().toLocaleDateString()}_${new Date().toLocaleTimeString().replace(/:/g,"-")}.xlsx`);
}

// ==================== ARRÊTS ====================
function remplirSelectLignes() {
  const select = document.getElementById("ligneArret");
  lignes.forEach(nom => {
    const opt = document.createElement("option");
    opt.value = nom;
    opt.textContent = nom;
    select.appendChild(opt);
  });
}

function enregistrerArret() {
  const ligne = document.getElementById("ligneArret").value;
  const temps = document.getElementById("tempsArret").value;
  const cause = document.getElementById("causeArret").value;
  if (!ligne || !temps || !cause) return alert("Complétez tous les champs !");
  dataArrets.push({ ligne, temps, cause, date: new Date().toLocaleString() });
  localStorage.setItem("dataArrets", JSON.stringify(dataArrets));
  chargerHistoriqueArrets();
  chargerHistoriqueArretsAtelier();
}

function chargerHistoriqueArrets() {
  const table = document.getElementById("historiqueArrets");
  if (!table) return;
  table.innerHTML = "<tr><th>Ligne</th><th>Durée</th><th>Cause</th><th>Date</th></tr>";
  dataArrets.forEach(a => {
    table.innerHTML += `<tr><td>${a.ligne}</td><td>${a.temps}</td><td>${a.cause}</td><td>${a.date}</td></tr>`;
  });
}

function chargerHistoriqueArretsAtelier() {
  const table = document.getElementById("historiqueArretsAtelier");
  if (!table) return;
  table.innerHTML = "<tr><th>Ligne</th><th>Durée (min)</th><th>Cause</th><th>Date</th></tr>";
  dataArrets.forEach(a => {
    table.innerHTML += `<tr><td>${a.ligne}</td><td>${a.temps}</td><td>${a.cause}</td><td>${a.date}</td></tr>`;
  });
}

// ==================== ORGANISATION ====================
function enregistrerConsigne() {
  const texte = document.getElementById("consigne").value;
  if (!texte) return;
  dataConsignes.push({ texte, date: new Date().toLocaleString() });
  localStorage.setItem("dataConsignes", JSON.stringify(dataConsignes));
  document.getElementById("consigne").value = "";
  chargerHistoriqueConsignes();
}

function chargerHistoriqueConsignes() {
  const div = document.getElementById("historiqueConsignes");
  if (!div) return;
  div.innerHTML = dataConsignes.map(c => `<p>📅 ${c.date} — ${c.texte}</p>`).join("");
}

// ==================== PERSONNEL ====================
function enregistrerPersonnel() {
  const nom = document.getElementById("nomPersonnel").value;
  const motif = document.getElementById("motifPersonnel").value;
  const commentaire = document.getElementById("commentairePersonnel").value;
  if (!nom || !motif) return alert("Complétez tous les champs !");
  dataPersonnel.push({ nom, motif, commentaire, date: new Date().toLocaleString() });
  localStorage.setItem("dataPersonnel", JSON.stringify(dataPersonnel));
  document.getElementById("nomPersonnel").value = "";
  document.getElementById("motifPersonnel").value = "";
  document.getElementById("commentairePersonnel").value = "";
  chargerHistoriquePersonnel();
}

function chargerHistoriquePersonnel() {
  const div = document.getElementById("historiquePersonnel");
  if (!div) return;
  div.innerHTML = dataPersonnel.map(p => `<p>👤 ${p.nom} — ${p.motif} — ${p.commentaire} (${p.date})</p>`).join("");
}

// ==================== CALCULATRICE ====================
let calcAffichage = "";
function toggleCalculatrice() {
  document.getElementById("calculatrice").classList.toggle("active");
}
function ajouterCalc(val) {
  calcAffichage += val;
  document.getElementById("calc-affichage").value = calcAffichage;
}
function calculerCalc() {
  try {
    calcAffichage = eval(calcAffichage).toString();
    document.getElementById("calc-affichage").value = calcAffichage;
  } catch { calcAffichage = ""; }
}
function effacerCalc() {
  calcAffichage = "";
  document.getElementById("calc-affichage").value = "";
}

// ==================== SAUVEGARDE AUTOMATIQUE D'EQUIPE ====================
function planifierSauvegardeEquipe() {
  const maintenant = new Date();
  const heuresCibles = [5, 13, 21];
  const prochaine = heuresCibles.map(h => {
    let t = new Date(maintenant);
    t.setHours(h,0,0,0);
    if (t < maintenant) t.setDate(t.getDate() + 1);
    return t;
  }).sort((a,b) => a-b)[0];

  const delai = prochaine - maintenant;
  setTimeout(() => {
    if (confirm("Fin d'équipe détectée.\nVoulez-vous enregistrer le rapport Excel ?")) exporterGlobal();
    planifierSauvegardeEquipe();
  }, delai);
}

// ==================== REMISE A ZERO D'EQUIPE ====================
function remiseEquipe() {
  if (!confirm("Confirmer la remise à zéro des données de l'équipe ?")) return;
  dataProduction = {};
  localStorage.removeItem("dataProduction");
  chargerHistorique();
  majGraphGlobal();
  alert("Remise à zéro effectuée !");
        }
// ==================== VARIABLES GLOBALES ====================
const lignes = ["Râpé","T2","RT","Omori","T1","Sticks","Emballage","Dés","Filets","Prédécoupés"];
let dataProduction = JSON.parse(localStorage.getItem("dataProduction")) || {};
let dataArrets = JSON.parse(localStorage.getItem("dataArrets")) || [];
let dataConsignes = JSON.parse(localStorage.getItem("dataConsignes")) || [];
let dataPersonnel = JSON.parse(localStorage.getItem("dataPersonnel")) || [];

// ==================== INITIALISATION ====================
window.onload = () => {
  creerPagesLignes();
  remplirSelectLignes();
  chargerHistorique();
  chargerHistoriqueArrets();
  chargerHistoriqueConsignes();
  chargerHistoriquePersonnel();
  majGraphGlobal();
  ouvrirPage("atelier");
  planifierSauvegardeEquipe();
};

// ==================== CREATION DES PAGES LIGNES ====================
function creerPagesLignes() {
  const container = document.getElementById("lignes");
  container.innerHTML = "";
  lignes.forEach(nom => {
    const id = nom.toLowerCase().replace(/é/g,'e');
    container.innerHTML += `
      <section id="page-${id}" class="page">
        <h3>${nom}</h3>
        <label>Heure début :</label>
        <input id="debut-${id}" type="time">
        <label>Heure fin :</label>
        <input id="fin-${id}" type="time">
        <label>Quantité produite :</label>
        <input id="quantite-${id}" type="number" placeholder="Quantité">
        <label>Quantité restante :</label>
        <input id="restante-${id}" type="number" placeholder="Quantité restante" oninput="calculerEstimation('${id}')">
        <label>Cadence manuelle :</label>
        <input id="cadence-${id}" type="number" placeholder="Saisir cadence (colis/h)">
        <p id="affichageCadence-${id}">Cadence : 0 colis/h</p>
        <p id="finEstimee-${id}">Fin estimée : --:--</p>
        <button onclick="enregistrerProduction('${id}')">Enregistrer</button>
        <button onclick="annulerDernier('${id}')">Annuler dernier</button>
        <button onclick="exporterHistorique('${id}')">Exporter Excel</button>
        <canvas id="graph-${id}"></canvas>
        <table id="historique-${id}"><tr><th>Début</th><th>Fin</th><th>Qté</th><th>Cadence</th><th>Fin estimée</th></tr></table>
      </section>`;
  });
}

// ==================== NAVIGATION ====================
function ouvrirPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(`page-${page}`).classList.add("active");
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== ENREGISTREMENT PRODUCTION ====================
function enregistrerProduction(id) {
  const debut = document.getElementById(`debut-${id}`).value;
  const fin = document.getElementById(`fin-${id}`).value;
  const qte = parseFloat(document.getElementById(`quantite-${id}`).value) || 0;
  const qteRest = parseFloat(document.getElementById(`restante-${id}`).value) || 0;
  const cadenceManuelle = parseFloat(document.getElementById(`cadence-${id}`).value);

  let cadence = 0;
  if (cadenceManuelle > 0) cadence = cadenceManuelle;
  else if (debut && fin && qte > 0) {
    const diff = (new Date(`1970-01-01T${fin}:00`) - new Date(`1970-01-01T${debut}:00`)) / 3600000;
    cadence = diff > 0 ? (qte / diff).toFixed(1) : 0;
  }

  const finEstimee = estimerFin(qteRest, cadence);
  const ligneData = dataProduction[id] || [];
  ligneData.push({ debut, fin, qte, cadence, finEstimee, date: new Date().toLocaleString() });
  dataProduction[id] = ligneData;
  localStorage.setItem("dataProduction", JSON.stringify(dataProduction));
  chargerHistorique();
  majGraphGlobal();
  viderChamps(id);
}

// ==================== CALCUL INSTANTANÉ ESTIMATION ====================
function calculerEstimation(id) {
  const qteRest = parseFloat(document.getElementById(`restante-${id}`).value) || 0;
  const cadence = parseFloat(document.getElementById(`cadence-${id}`).value) || 0;
  const estimation = estimerFin(qteRest, cadence);
  document.getElementById(`finEstimee-${id}`).innerText = `Fin estimée : ${estimation}`;
}

function estimerFin(qteRest, cadence) {
  if (!cadence || cadence <= 0 || !qteRest) return "--:--";
  const minutes = (qteRest / cadence) * 60;
  const fin = new Date(Date.now() + minutes * 60000);
  return fin.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ==================== VIDER CHAMPS ====================
function viderChamps(id) {
  document.getElementById(`quantite-${id}`).value = "";
  document.getElementById(`restante-${id}`).value = "";
  document.getElementById(`cadence-${id}`).value = "";
}

// ==================== HISTORIQUES ====================
function chargerHistorique() {
  lignes.forEach(nom => {
    const id = nom.toLowerCase().replace(/é/g,'e');
    const hist = document.getElementById(`historique-${id}`);
    if (!hist) return;
    hist.innerHTML = "<tr><th>Début</th><th>Fin</th><th>Qté</th><th>Cadence</th><th>Fin estimée</th></tr>";
    const data = dataProduction[id] || [];
    data.forEach(d => {
      hist.innerHTML += `<tr><td>${d.debut}</td><td>${d.fin}</td><td>${d.qte}</td><td>${d.cadence}</td><td>${d.finEstimee}</td></tr>`;
    });
    majGraphique(id, data);
  });
}

// ==================== GRAPHIQUES ====================
function majGraphique(id, data) {
  const ctx = document.getElementById(`graph-${id}`);
  if (!ctx) return;
  if (ctx.chart) ctx.chart.destroy();
  ctx.chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.fin || ""),
      datasets: [{
        label: "Cadence (colis/h)",
        data: data.map(d => d.cadence),
        backgroundColor: "#1a73e8"
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

function majGraphGlobal() {
  const ctx = document.getElementById("graphGlobal");
  if (!ctx) return;
  if (ctx.chart) ctx.chart.destroy();

  const moyennes = lignes.map(nom => {
    const id = nom.toLowerCase().replace(/é/g,'e');
    const data = dataProduction[id] || [];
    const moy = data.length ? data.reduce((a,b) => a + parseFloat(b.cadence||0),0) / data.length : 0;
    return moy.toFixed(1);
  });

  ctx.chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: lignes,
      datasets: [{
        label: "Cadence moyenne (colis/h)",
        data: moyennes,
        backgroundColor: "#1a73e8"
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

// ==================== ANNULER DERNIER ====================
function annulerDernier(id) {
  if (!dataProduction[id] || !dataProduction[id].length) return;
  dataProduction[id].pop();
  localStorage.setItem("dataProduction", JSON.stringify(dataProduction));
  chargerHistorique();
  majGraphGlobal();
}

// ==================== EXPORT EXCEL ====================
function exporterHistorique(id) {
  const data = dataProduction[id] || [];
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, id);
  XLSX.writeFile(wb, `Historique_${id}_${new Date().toLocaleDateString()}.xlsx`);
}

function exporterGlobal() {
  let allData = [];
  lignes.forEach(nom => {
    const id = nom.toLowerCase().replace(/é/g,'e');
    const data = dataProduction[id] || [];
    data.forEach(d => allData.push({ Ligne: nom, ...d }));
  });
  allData.push(...dataArrets.map(a => ({ Ligne: a.ligne, Type: "Arrêt", Durée: a.temps, Cause: a.cause, Date: a.date })));
  allData.push(...dataPersonnel.map(p => ({ Ligne: "Personnel", Nom: p.nom, Motif: p.motif, Commentaire: p.commentaire, Date: p.date })));
  allData.push(...dataConsignes.map(c => ({ Ligne: "Organisation", Consigne: c.texte, Date: c.date })));

  const ws = XLSX.utils.json_to_sheet(allData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Synthèse Atelier");
  XLSX.writeFile(wb, `Synthese_Atelier_${new Date().toLocaleDateString()}_${new Date().toLocaleTimeString().replace(/:/g,"-")}.xlsx`);
}

// ==================== ARRÊTS ====================
function remplirSelectLignes() {
  const select = document.getElementById("ligneArret");
  lignes.forEach(nom => {
    const opt = document.createElement("option");
    opt.value = nom;
    opt.textContent = nom;
    select.appendChild(opt);
  });
}

function enregistrerArret() {
  const ligne = document.getElementById("ligneArret").value;
  const temps = document.getElementById("tempsArret").value;
  const cause = document.getElementById("causeArret").value;
  if (!ligne || !temps || !cause) return alert("Complétez tous les champs !");
  dataArrets.push({ ligne, temps, cause, date: new Date().toLocaleString() });
  localStorage.setItem("dataArrets", JSON.stringify(dataArrets));
  chargerHistoriqueArrets();
  chargerHistoriqueArretsAtelier();
}

function chargerHistoriqueArrets() {
  const table = document.getElementById("historiqueArrets");
  if (!table) return;
  table.innerHTML = "<tr><th>Ligne</th><th>Durée</th><th>Cause</th><th>Date</th></tr>";
  dataArrets.forEach(a => {
    table.innerHTML += `<tr><td>${a.ligne}</td><td>${a.temps}</td><td>${a.cause}</td><td>${a.date}</td></tr>`;
  });
}

function chargerHistoriqueArretsAtelier() {
  const table = document.getElementById("historiqueArretsAtelier");
  if (!table) return;
  table.innerHTML = "<tr><th>Ligne</th><th>Durée (min)</th><th>Cause</th><th>Date</th></tr>";
  dataArrets.forEach(a => {
    table.innerHTML += `<tr><td>${a.ligne}</td><td>${a.temps}</td><td>${a.cause}</td><td>${a.date}</td></tr>`;
  });
}

// ==================== ORGANISATION ====================
function enregistrerConsigne() {
  const texte = document.getElementById("consigne").value;
  if (!texte) return;
  dataConsignes.push({ texte, date: new Date().toLocaleString() });
  localStorage.setItem("dataConsignes", JSON.stringify(dataConsignes));
  document.getElementById("consigne").value = "";
  chargerHistoriqueConsignes();
}

function chargerHistoriqueConsignes() {
  const div = document.getElementById("historiqueConsignes");
  if (!div) return;
  div.innerHTML = dataConsignes.map(c => `<p>📅 ${c.date} — ${c.texte}</p>`).join("");
}

// ==================== PERSONNEL ====================
function enregistrerPersonnel() {
  const nom = document.getElementById("nomPersonnel").value;
  const motif = document.getElementById("motifPersonnel").value;
  const commentaire = document.getElementById("commentairePersonnel").value;
  if (!nom || !motif) return alert("Complétez tous les champs !");
  dataPersonnel.push({ nom, motif, commentaire, date: new Date().toLocaleString() });
  localStorage.setItem("dataPersonnel", JSON.stringify(dataPersonnel));
  document.getElementById("nomPersonnel").value = "";
  document.getElementById("motifPersonnel").value = "";
  document.getElementById("commentairePersonnel").value = "";
  chargerHistoriquePersonnel();
}

function chargerHistoriquePersonnel() {
  const div = document.getElementById("historiquePersonnel");
  if (!div) return;
  div.innerHTML = dataPersonnel.map(p => `<p>👤 ${p.nom} — ${p.motif} — ${p.commentaire} (${p.date})</p>`).join("");
}

// ==================== CALCULATRICE ====================
let calcAffichage = "";
function toggleCalculatrice() {
  document.getElementById("calculatrice").classList.toggle("active");
}
function ajouterCalc(val) {
  calcAffichage += val;
  document.getElementById("calc-affichage").value = calcAffichage;
}
function calculerCalc() {
  try {
    calcAffichage = eval(calcAffichage).toString();
    document.getElementById("calc-affichage").value = calcAffichage;
  } catch { calcAffichage = ""; }
}
function effacerCalc() {
  calcAffichage = "";
  document.getElementById("calc-affichage").value = "";
}

// ==================== SAUVEGARDE AUTOMATIQUE D'EQUIPE ====================
function planifierSauvegardeEquipe() {
  const maintenant = new Date();
  const heuresCibles = [5, 13, 21];
  const prochaine = heuresCibles.map(h => {
    let t = new Date(maintenant);
    t.setHours(h,0,0,0);
    if (t < maintenant) t.setDate(t.getDate() + 1);
    return t;
  }).sort((a,b) => a-b)[0];

  const delai = prochaine - maintenant;
  setTimeout(() => {
    if (confirm("Fin d'équipe détectée.\nVoulez-vous enregistrer le rapport Excel ?")) exporterGlobal();
    planifierSauvegardeEquipe();
  }, delai);
}

// ==================== REMISE A ZERO D'EQUIPE ====================
function remiseEquipe() {
  if (!confirm("Confirmer la remise à zéro des données de l'équipe ?")) return;
  dataProduction = {};
  localStorage.removeItem("dataProduction");
  chargerHistorique();
  majGraphGlobal();
  alert("Remise à zéro effectuée !");
          }
