// === Données globales ===
let lignes = [
  "Râpé", "T2", "RT", "OMORI T1", "Sticks",
  "Emballage", "Dés", "Filets", "Prédécoupés"
];

let donnees = JSON.parse(localStorage.getItem("donnees")) || {};
let arrets = JSON.parse(localStorage.getItem("arrets")) || [];
let consignes = JSON.parse(localStorage.getItem("consignes")) || [];
let personnel = JSON.parse(localStorage.getItem("personnel")) || [];

let globalChart;

// === Navigation entre pages ===
function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
  if (pageId === "atelier") majAtelier();
  if (pageId === "arrets") majHistoriqueArrets();
  if (pageId === "organisation") majConsignes();
  if (pageId === "personnel") majPersonnel();
}

// === Initialisation ===
window.onload = () => {
  genererLignesProduction();
  majAtelier();
  majHistoriqueArrets();
  majConsignes();
  majPersonnel();
};

// === Génération des lignes de production ===
function genererLignesProduction() {
  const container = document.getElementById("productionLines");
  container.innerHTML = "";

  lignes.forEach(ligne => {
    if (!donnees[ligne]) donnees[ligne] = [];

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${ligne}</h3>
      <label>Heure début :</label>
      <input type="time" id="${ligne}-debut">
      <label>Heure fin :</label>
      <input type="time" id="${ligne}-fin">
      <label>Quantité produite :</label>
      <input type="number" id="${ligne}-quantite" placeholder="Quantité...">
      <label>Quantité restante :</label>
      <input type="number" id="${ligne}-restante" placeholder="Restant...">
      <label>Cadence manuelle (colis/h) :</label>
      <input type="number" id="${ligne}-cadence" placeholder="Saisir cadence...">
      <p>⏱️ Cadence moyenne : <span id="${ligne}-cadenceAff">0</span> colis/h</p>
      <p>🕓 Fin estimée : <span id="${ligne}-finEstimee">-</span></p>
      <button onclick="enregistrerLigne('${ligne}')">Enregistrer</button>
    `;
    container.appendChild(card);

    // écoute instantanée
    document.getElementById(`${ligne}-restante`).addEventListener("input", () => {
      majFinEstimee(ligne);
    });
  });

  localStorage.setItem("donnees", JSON.stringify(donnees));
}

// === Calcul cadence + fin estimée ===
function enregistrerLigne(ligne) {
  const debut = document.getElementById(`${ligne}-debut`).value;
  const fin = document.getElementById(`${ligne}-fin`).value;
  const quantite = parseFloat(document.getElementById(`${ligne}-quantite`).value);
  const restante = parseFloat(document.getElementById(`${ligne}-restante`).value);
  const cadenceManuelle = parseFloat(document.getElementById(`${ligne}-cadence`).value);

  if (!quantite || !debut || !fin) {
    alert("Merci de remplir au minimum les heures et la quantité.");
    return;
  }

  const diffHeures = (new Date(`1970-01-01T${fin}:00`) - new Date(`1970-01-01T${debut}:00`)) / 3600000;
  const cadence = cadenceManuelle || (quantite / diffHeures).toFixed(2);
  const finEstimee = majFinEstimee(ligne, restante, cadence);

  donnees[ligne].push({
    date: new Date().toLocaleString(),
    debut,
    fin,
    quantite,
    restante: restante || 0,
    cadence,
    finEstimee
  });

  localStorage.setItem("donnees", JSON.stringify(donnees));
  alert(`✅ Données enregistrées pour ${ligne}`);
  majAtelier();
}

function majFinEstimee(ligne, restante, cadence) {
  const reste = restante ?? parseFloat(document.getElementById(`${ligne}-restante`).value);
  const cad = cadence ?? parseFloat(document.getElementById(`${ligne}-cadence`).value);
  if (!reste || !cad) return;

  const heuresRestantes = reste / cad;
  const finEstimee = new Date(Date.now() + heuresRestantes * 3600000);
  document.getElementById(`${ligne}-finEstimee`).textContent =
    finEstimee.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return finEstimee.toLocaleTimeString("fr-FR");
}

// === Historique arrêts ===
function saveArret(e) {
  e.preventDefault();
  const ligne = document.getElementById("arretLigne").value;
  const type = document.getElementById("arretType").value;
  const duree = document.getElementById("arretDuree").value;
  const commentaire = document.getElementById("arretCommentaire").value;

  arrets.push({ date: new Date().toLocaleString(), ligne, type, duree, commentaire });
  localStorage.setItem("arrets", JSON.stringify(arrets));
  e.target.reset();
  majHistoriqueArrets();
}

function majHistoriqueArrets() {
  const div = document.getElementById("arretHistorique");
  div.innerHTML = arrets
    .map(a => `<p>📍 ${a.ligne} | ${a.type} | ${a.duree} min | ${a.commentaire} (${a.date})</p>`)
    .join("");
}

// === Consignes ===
function saveConsigne(e) {
  e.preventDefault();
  const texte = document.getElementById("consigneText").value;
  consignes.push({ texte, valide: false, date: new Date().toLocaleString() });
  localStorage.setItem("consignes", JSON.stringify(consignes));
  e.target.reset();
  majConsignes();
}

function majConsignes() {
  const div = document.getElementById("consignesListe");
  div.innerHTML = consignes.map((c, i) => `
    <div class="consigne ${c.valide ? 'valide' : ''}">
      <p>${c.texte}</p>
      <small>${c.date}</small>
      <button onclick="toggleValidation(${i})">${c.valide ? '✅ Validé' : 'Valider'}</button>
    </div>`).join("");
}

function toggleValidation(i) {
  consignes[i].valide = !consignes[i].valide;
  localStorage.setItem("consignes", JSON.stringify(consignes));
  majConsignes();
}

// === Personnel ===
function savePersonnel(e) {
  e.preventDefault();
  const nom = document.getElementById("personnelNom").value;
  const motif = document.getElementById("personnelMotif").value;
  const commentaire = document.getElementById("personnelCommentaire").value;

  personnel.push({ nom, motif, commentaire, date: new Date().toLocaleString() });
  localStorage.setItem("personnel", JSON.stringify(personnel));
  e.target.reset();
  majPersonnel();
}

function majPersonnel() {
  const div = document.getElementById("personnelHistorique");
  div.innerHTML = personnel.map(p =>
    `<p>👤 ${p.nom} - ${p.motif} (${p.commentaire}) - ${p.date}</p>`).join("");
}

// === Page Atelier ===
function majAtelier() {
  const table = document.getElementById("atelierTable");
  table.innerHTML = "";

  lignes.forEach(ligne => {
    const data = donnees[ligne] || [];
    if (data.length === 0) return;
    const total = data.reduce((acc, v) => acc + (v.quantite || 0), 0);
    const moy = (data.reduce((acc, v) => acc + (parseFloat(v.cadence) || 0), 0) / data.length).toFixed(1);
    const lastFin = data[data.length - 1].finEstimee || "-";
    table.innerHTML += `<tr><td>${ligne}</td><td>${total}</td><td>${moy}</td><td>${lastFin}</td></tr>`;
  });

  genererGlobalChart();
}

function genererGlobalChart() {
  const ctx = document.getElementById("globalChart").getContext("2d");
  if (globalChart) globalChart.destroy();

  const datasets = lignes.map((ligne, i) => {
    const data = donnees[ligne] || [];
    return {
      label: ligne,
      data: data.map(d => d.cadence || 0),
      borderColor: `hsl(${i * 35}, 80%, 50%)`,
      fill: false
    };
  });

  globalChart = new Chart(ctx, {
    type: "line",
    data: { labels: Array.from({ length: 10 }, (_, i) => i + 1), datasets },
    options: {
      plugins: { legend: { position: "bottom" } },
      scales: { y: { beginAtZero: true, title: { display: true, text: "Cadence (colis/h)" } } }
    }
  });
}

// === Export Excel ===
function exportGlobalExcel() {
  let csv = "Catégorie;Nom;Valeurs;Date\n";
  lignes.forEach(ligne => {
    (donnees[ligne] || []).forEach(d => {
      csv += `Production;${ligne};${d.quantite} colis à ${d.cadence} colis/h;${d.date}\n`;
    });
  });
  arrets.forEach(a => csv += `Arrêt;${a.ligne};${a.type} ${a.duree} min;${a.date}\n`);
  consignes.forEach(c => csv += `Consigne;;${c.texte} (${c.valide ? "Validée" : "Non validée"});${c.date}\n`);
  personnel.forEach(p => csv += `Personnel;${p.nom};${p.motif} ${p.commentaire};${p.date}\n`);

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Atelier_PPNC_${new Date().toLocaleDateString("fr-FR")}.csv`;
  link.click();
  alert("✅ Exportation réussie !");
}

// === Calculatrice ===
let calcVisible = false;
function toggleCalculator() {
  calcVisible = !calcVisible;
  document.getElementById("calculator").style.display = calcVisible ? "block" : "none";
}
function calcInput(v) {
  document.getElementById("calcDisplay").value += v;
}
function calcCalculate() {
  try {
    document.getElementById("calcDisplay").value = eval(document.getElementById("calcDisplay").value);
  } catch {
    document.getElementById("calcDisplay").value = "Erreur";
  }
               }
