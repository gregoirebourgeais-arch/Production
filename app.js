// === INITIALISATION ===
document.addEventListener("DOMContentLoaded", () => {
  initDateTime();
  showPage("atelier");
  renderChart();
  loadAllData();
});

// === PAGE MANAGEMENT ===
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// === AFFICHAGE DATE + HEURE + ÉQUIPE ===
function initDateTime() {
  const display = document.getElementById("dateTimeDisplay");
  const update = () => {
    const now = new Date();
    const semaine = getWeekNumber(now);
    const quantieme = getDayOfYear(now);
    const heure = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const date = now.toLocaleDateString("fr-FR");
    const equipe = getEquipe(now);
    display.textContent = `${date} (${quantieme}) — S${semaine} — ${heure} — Équipe ${equipe}`;
  };
  update();
  setInterval(update, 60000);
}

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function getDayOfYear(d) {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d - start + (start.getTimezoneOffset() - d.getTimezoneOffset()) * 60000;
  return Math.floor(diff / 86400000);
}

function getEquipe(date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 13) return "M";
  if (hour >= 13 && hour < 21) return "A-N";
  return "N";
}

// === PRODUCTION PAR LIGNE ===
function openLigne(nom) {
  const container = document.getElementById("ligneContainer");
  container.innerHTML = `
    <h3>Ligne ${nom}</h3>
    <label>Quantité produite :</label>
    <input type="number" id="qteProd" placeholder="Ex: 1250">

    <label>Quantité restante :</label>
    <input type="number" id="qteRest" placeholder="Ex: 300">

    <label>Cadence manuelle (colis/h) :</label>
    <input type="number" id="cadenceManuelle" placeholder="Optionnel">

    <label>Heure de début :</label>
    <input type="time" id="heureDebut">

    <label>Heure de fin :</label>
    <input type="time" id="heureFin">

    <button onclick="calculerCadence('${nom}')">⚙️ Calculer</button>
    <div id="resultatCadence"></div>

    <button onclick="enregistrerLigne('${nom}')">💾 Enregistrer</button>
  `;
}

function calculerCadence(ligne) {
  const qteProd = parseFloat(document.getElementById("qteProd").value) || 0;
  const qteRest = parseFloat(document.getElementById("qteRest").value) || 0;
  const cadenceManuelle = parseFloat(document.getElementById("cadenceManuelle").value);
  const debut = document.getElementById("heureDebut").value;
  const fin = document.getElementById("heureFin").value;
  const res = document.getElementById("resultatCadence");

  let cadence = 0;
  if (cadenceManuelle) cadence = cadenceManuelle;
  else if (debut && fin) {
    const [h1, m1] = debut.split(":").map(Number);
    const [h2, m2] = fin.split(":").map(Number);
    const t = (h2 * 60 + m2 - (h1 * 60 + m1)) / 60;
    if (t > 0) cadence = qteProd / t;
  }

  const tempsRestant = cadence > 0 ? (qteRest / cadence).toFixed(2) : 0;
  res.innerHTML = `
    <p>Cadence moyenne : <b>${cadence.toFixed(1)} colis/h</b></p>
    <p>Temps restant estimé : <b>${tempsRestant} h</b></p>
  `;
}

// === ENREGISTREMENT PRODUCTION ===
function enregistrerLigne(ligne) {
  const qteProd = document.getElementById("qteProd").value;
  const qteRest = document.getElementById("qteRest").value;
  const cadence = document.getElementById("cadenceManuelle").value;
  const debut = document.getElementById("heureDebut").value;
  const fin = document.getElementById("heureFin").value;

  const record = {
    ligne,
    qteProd,
    qteRest,
    cadence,
    debut,
    fin,
    date: new Date().toLocaleString("fr-FR")
  };

  let data = JSON.parse(localStorage.getItem("production")) || [];
  data.push(record);
  localStorage.setItem("production", JSON.stringify(data));

  alert(`✅ Données enregistrées pour la ligne ${ligne}`);
  document.getElementById("ligneContainer").innerHTML = "";
  updateHistoriqueAtelier();
}

// === ARRETS ===
function enregistrerArret() {
  const ligne = document.getElementById("ligneArret").value;
  const type = document.getElementById("typeArret").value;
  const duree = document.getElementById("tempsArret").value;
  const com = document.getElementById("commentaireArret").value;
  const equipe = getEquipe(new Date());

  const data = JSON.parse(localStorage.getItem("arrets")) || [];
  data.push({ ligne, type, duree, com, equipe, date: new Date().toLocaleString("fr-FR") });
  localStorage.setItem("arrets", JSON.stringify(data));

  alert("Arrêt enregistré !");
  updateHistoriqueArrets();
  document.getElementById("formArret").reset();
}

// === CONSIGNES ===
function ajouterConsigne() {
  const txt = document.getElementById("consigneTexte").value.trim();
  if (!txt) return alert("Consigne vide !");
  const data = JSON.parse(localStorage.getItem("consignes")) || [];
  data.push({ texte: txt, valide: false, date: new Date().toLocaleString("fr-FR") });
  localStorage.setItem("consignes", JSON.stringify(data));
  updateHistoriqueConsignes();
  document.getElementById("consigneTexte").value = "";
}

function validerConsigne(i) {
  let data = JSON.parse(localStorage.getItem("consignes")) || [];
  data[i].valide = true;
  localStorage.setItem("consignes", JSON.stringify(data));
  updateHistoriqueConsignes();
}

// === PERSONNEL ===
function ajouterPersonnel() {
  const nom = document.getElementById("nomPersonnel").value;
  const motif = document.getElementById("motifPersonnel").value;
  const com = document.getElementById("commentairePersonnel").value;
  const equipe = getEquipe(new Date());
  const data = JSON.parse(localStorage.getItem("personnel")) || [];
  data.push({ nom, motif, com, equipe, date: new Date().toLocaleString("fr-FR") });
  localStorage.setItem("personnel", JSON.stringify(data));
  updateHistoriquePersonnel();
  document.getElementById("formPersonnel").reset();
}

// === HISTORIQUES ===
function loadAllData() {
  updateHistoriqueAtelier();
  updateHistoriqueArrets();
  updateHistoriqueConsignes();
  updateHistoriquePersonnel();
}

function updateHistoriqueAtelier() {
  const hist = document.getElementById("historiqueAtelier");
  const data = JSON.parse(localStorage.getItem("production")) || [];
  hist.innerHTML = data.map(d => `<p>${d.date} — ${d.ligne} : ${d.qteProd} colis (${d.cadence} c/h)</p>`).join("");
  renderChart();
}

function updateHistoriqueArrets() {
  const hist = document.getElementById("historiqueArrets");
  const data = JSON.parse(localStorage.getItem("arrets")) || [];
  hist.innerHTML = data.map(d => `<p>${d.date} — ${d.ligne} (${d.type}) : ${d.duree} min — ${d.com}</p>`).join("");
}

function updateHistoriqueConsignes() {
  const hist = document.getElementById("historiqueConsignes");
  const data = JSON.parse(localStorage.getItem("consignes")) || [];
  hist.innerHTML = data
    .map((d, i) => `<p>${d.date} — ${d.texte} ${d.valide ? "✅" : `<button onclick='validerConsigne(${i})'>Valider</button>`}</p>`)
    .join("");
}

function updateHistoriquePersonnel() {
  const hist = document.getElementById("historiquePersonnel");
  const data = JSON.parse(localStorage.getItem("personnel")) || [];
  hist.innerHTML = data.map(d => `<p>${d.date} — ${d.nom} (${d.motif}) : ${d.com}</p>`).join("");
}

// === CHART ===
function renderChart() {
  const ctx = document.getElementById("atelierChart").getContext("2d");
  const data = JSON.parse(localStorage.getItem("production")) || [];
  const lignes = [...new Set(data.map(d => d.ligne))];
  const datasets = lignes.map(ligne => {
    const points = data.filter(d => d.ligne === ligne);
    return {
      label: ligne,
      data: points.map(d => parseFloat(d.cadence) || 0),
      borderColor: randomColor(),
      fill: false,
      tension: 0.2
    };
  });

  if (window.atelierChart) window.atelierChart.destroy();
  window.atelierChart = new Chart(ctx, {
    type: "line",
    data: { labels: data.map(d => d.date.split(",")[0]), datasets },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } }
  });
}

function randomColor() {
  return `hsl(${Math.floor(Math.random() * 360)},70%,55%)`;
}

// === EXPORT EXCEL ===
function exportAllData() {
  const wb = XLSX.utils.book_new();
  const sections = ["production", "arrets", "consignes", "personnel"];
  sections.forEach(s => {
    const data = JSON.parse(localStorage.getItem(s)) || [];
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, s);
  });
  const now = new Date().toLocaleTimeString("fr-FR").replace(/:/g, "-");
  XLSX.writeFile(wb, `AtelierPPNC_${now}.xlsx`);
}

// === CALCULATRICE ===
let calcVisible = false;
function toggleCalculator() {
  const calc = document.getElementById("calculator");
  calcVisible = !calcVisible;
  calc.classList.toggle("hidden", !calcVisible);
}
function pressCalc(val) {
  document.getElementById("calcDisplay").value += val;
}
function clearCalc() {
  document.getElementById("calcDisplay").value = "";
}
function calcResult() {
  const disp = document.getElementById("calcDisplay");
  try {
    disp.value = eval(disp.value);
  } catch {
    disp.value = "Erreur";
  }
}
