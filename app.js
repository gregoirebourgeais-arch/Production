// === INITIALISATION ===
document.addEventListener("DOMContentLoaded", () => {
  showPage("atelier");
  setInterval(updateDateTime, 1000);
  updateDateTime();
  initCharts();
  loadAllData();
});

// === MISE À JOUR DATE / HEURE ===
function updateDateTime() {
  const now = new Date();
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  document.getElementById("dateHeure").textContent = now.toLocaleString("fr-FR", options);
}

// === NAVIGATION ENTRE PAGES ===
function showPage(pageId) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
  if (pageId === "atelier") refreshAtelierChart();
}

// === DONNÉES GLOBALES ===
let productionData = JSON.parse(localStorage.getItem("productionData")) || {};
let arretsData = JSON.parse(localStorage.getItem("arretsData")) || [];
let consignesData = JSON.parse(localStorage.getItem("consignesData")) || [];
let personnelData = JSON.parse(localStorage.getItem("personnelData")) || {};
let lineChart = null;
let atelierChart = null;
let currentLigne = null;

// === SÉLECTION DE LIGNE ===
function selectLigne(ligne) {
  currentLigne = ligne;
  document.getElementById("titreLigne").textContent = `Ligne : ${ligne}`;

  const form = `
    <label>Heure début :</label>
    <input type="time" id="startTime" />
    <label>Heure fin :</label>
    <input type="time" id="endTime" />
    <label>Quantité produite :</label>
    <input type="number" id="quantite" placeholder="Quantité..." />
    <label>Quantité restante (optionnelle) :</label>
    <input type="number" id="restant" placeholder="Restant..." />
    <label>Cadence manuelle (colis/h) :</label>
    <input type="number" id="cadence" placeholder="Saisir cadence..." />
    <div class="card" id="calculsInstantanes">
      <p>Cadence moyenne : <span id="cadMoy">0</span> colis/h</p>
      <p>Temps restant estimé : <span id="finEst">-</span></p>
    </div>
    <button onclick="saveProduction('${ligne}')">💾 Enregistrer</button>
  `;
  document.getElementById("formLigne").innerHTML = form;
  document.getElementById("historiqueLigne").innerHTML = showHistorique(ligne);

  ["quantite", "restant", "startTime", "endTime"].forEach((id) =>
    document.getElementById(id).addEventListener("input", updateEstimation)
  );
}

function updateEstimation() {
  const qte = parseFloat(document.getElementById("quantite").value) || 0;
  const rest = parseFloat(document.getElementById("restant").value) || 0;
  const start = document.getElementById("startTime").value;
  const end = document.getElementById("endTime").value;

  if (!start || !end) return;

  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let duree = (eh * 60 + em) - (sh * 60 + sm);
  if (duree <= 0) duree += 24 * 60;

  const cadence = qte / (duree / 60);
  document.getElementById("cadMoy").textContent = cadence ? cadence.toFixed(1) : 0;

  let estText = "-";
  if (rest > 0 && cadence > 0) {
    const tempsRestantMin = rest / cadence * 60;
    const heures = Math.floor(tempsRestantMin / 60);
    const minutes = Math.round(tempsRestantMin % 60);
    estText = `${heures}h${minutes.toString().padStart(2, "0")}`;
  }

  document.getElementById("finEst").textContent = estText;
}

// === SAUVEGARDE PRODUCTION ===
function saveProduction(ligne) {
  const start = document.getElementById("startTime").value;
  const end = document.getElementById("endTime").value;
  const qte = parseFloat(document.getElementById("quantite").value) || 0;
  const rest = parseFloat(document.getElementById("restant").value) || 0;
  const cad = parseFloat(document.getElementById("cadence").value) || 0;
  const cadMoy = parseFloat(document.getElementById("cadMoy").textContent) || 0;
  const finEst = document.getElementById("finEst").textContent;

  if (!start || !end || qte <= 0) {
    alert("Veuillez renseigner les heures et la quantité produite.");
    return;
  }

  if (!productionData[ligne]) productionData[ligne] = [];
  productionData[ligne].push({
    date: new Date().toLocaleString(),
    start,
    end,
    qte,
    rest,
    cad,
    cadMoy,
    finEst,
  });

  localStorage.setItem("productionData", JSON.stringify(productionData));
  document.getElementById("formLigne").reset;
  selectLigne(ligne);
  refreshAtelierChart();
}

// === HISTORIQUE LIGNE ===
function showHistorique(ligne) {
  const data = productionData[ligne] || [];
  if (!data.length) return "<p>Aucune donnée enregistrée.</p>";

  return data
    .map(
      (d) =>
        `<div class='card small'>
          <p>${d.date} — ${d.start} ➜ ${d.end}</p>
          <p>Q=${d.qte} | Rest=${d.rest} | Cad=${d.cadMoy} | Fin=${d.finEst}</p>
        </div>`
    )
    .join("");
}

// === ARRÊTS ===
function ajouterArret() {
  const ligne = document.getElementById("arretLigne").value;
  const zone = document.getElementById("arretZone").value;
  const duree = parseInt(document.getElementById("arretDuree").value);

  if (!ligne || !duree) return alert("Renseignez la ligne et la durée.");

  arretsData.push({
    date: new Date().toLocaleString(),
    ligne,
    zone,
    duree,
  });
  localStorage.setItem("arretsData", JSON.stringify(arretsData));
  document.getElementById("arretDuree").value = "";
  afficherArrets();
}

function afficherArrets() {
  const bloc = document.getElementById("historiqueArrets");
  if (!bloc) return;
  if (!arretsData.length) {
    bloc.innerHTML = "<p>Aucun arrêt enregistré.</p>";
    return;
  }
  bloc.innerHTML = arretsData
    .map(
      (a) =>
        `<div class="card small">
          <p>${a.date} — ${a.ligne} (${a.zone}) : ${a.duree} min</p>
        </div>`
    )
    .join("");
}

// === CONSIGNES ===
function ajouterConsigne() {
  const texte = document.getElementById("consigneTexte").value.trim();
  const validee = document.getElementById("consigneValidee").checked;
  if (!texte) return alert("Renseignez une consigne.");
  consignesData.push({
    date: new Date().toLocaleString(),
    texte,
    validee,
  });
  localStorage.setItem("consignesData", JSON.stringify(consignesData));
  document.getElementById("consigneTexte").value = "";
  document.getElementById("consigneValidee").checked = false;
  afficherConsignes();
}

function afficherConsignes() {
  const bloc = document.getElementById("historiqueConsignes");
  if (!bloc) return;
  if (!consignesData.length) {
    bloc.innerHTML = "<p>Aucune consigne.</p>";
    return;
  }
  bloc.innerHTML = consignesData
    .map(
      (c) =>
        `<div class="card small">
          <p>${c.date} — ${c.texte} ${
          c.validee ? "✅" : "⏳"
        }</p></div>`
    )
    .join("");
}

// === PERSONNEL ===
function ajouterPersonnel() {
  const nom = document.getElementById("nomPersonnel").value.trim();
  const motif = document.getElementById("motifPersonnel").value.trim();
  const com = document.getElementById("commentairePersonnel").value.trim();
  if (!nom || !motif) return alert("Renseignez nom et motif.");
  if (!personnelData.liste) personnelData.liste = [];
  personnelData.liste.push({
    date: new Date().toLocaleString(),
    nom,
    motif,
    com,
  });
  localStorage.setItem("personnelData", JSON.stringify(personnelData));
  document.getElementById("nomPersonnel").value = "";
  document.getElementById("motifPersonnel").value = "";
  document.getElementById("commentairePersonnel").value = "";
  afficherPersonnel();
}

function afficherPersonnel() {
  const bloc = document.getElementById("historiquePersonnel");
  if (!bloc) return;
  const liste = personnelData.liste || [];
  if (!liste.length) {
    bloc.innerHTML = "<p>Aucun enregistrement.</p>";
    return;
  }
  bloc.innerHTML = liste
    .map(
      (p) =>
        `<div class="card small">
          <p>${p.date} — ${p.nom} : ${p.motif}</p>
          <p><em>${p.com}</em></p>
        </div>`
    )
    .join("");
}

// === GRAPHIQUES ===
function initCharts() {
  const ctxAtelier = document.getElementById("atelierChart");
  atelierChart = new Chart(ctxAtelier, {
    type: "line",
    data: {
      labels: ["Râpé", "T2", "RT", "OMORI", "T1", "Sticks", "Emballage", "Dés", "Filets", "Prédécoupés"],
      datasets: [
        {
          label: "Quantité (colis)",
          data: Array(10).fill(0),
          borderColor: "#007bff",
          backgroundColor: "rgba(0,123,255,0.3)",
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: { responsive: true },
  });
}

function refreshAtelierChart() {
  if (!atelierChart) return;
  const lignes = atelierChart.data.labels;
  const data = lignes.map(
    (l) => (productionData[l] ? productionData[l].reduce((s, e) => s + e.qte, 0) : 0)
  );
  atelierChart.data.datasets[0].data = data;
  atelierChart.update();

  const classement = [...arretsData].sort((a, b) => b.duree - a.duree);
  const bloc = document.getElementById("listeClassementArrets");
  bloc.innerHTML = classement.length
    ? classement
        .map((a) => `<p>${a.ligne} — ${a.duree} min (${a.zone})</p>`)
        .join("")
    : "Aucun arrêt";
}

// === EXPORT EXCEL GLOBAL ===
function exportExcelGlobal() {
  let csv = "Type;Date;Ligne;Heure Début;Heure Fin;Quantité;Restant;Cadence Moy;Fin Estimée\n";

  Object.entries(productionData).forEach(([ligne, entries]) => {
    entries.forEach((e) => {
      csv += `Production;${e.date};${ligne};${e.start};${e.end};${e.qte};${e.rest};${e.cadMoy};${e.finEst}\n`;
    });
  });

  arretsData.forEach((a) => {
    csv += `Arrêt;${a.date};${a.ligne};-;-;-;-;-;${a.duree} min (${a.zone})\n`;
  });

  consignesData.forEach((c) => {
    csv += `Consigne;${c.date};-;-;-;-;-;-;${c.texte} (${c.validee ? "✅" : "⏳"})\n`;
  });

  (personnelData.liste || []).forEach((p) => {
    csv += `Personnel;${p.date};-;-;-;-;-;-;${p.nom}: ${p.motif} (${p.com})\n`;
  });

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Synthese_Atelier_PPNC.csv";
  a.click();
}

// === CHARGEMENT INITIAL ===
function loadAllData() {
  afficherArrets();
  afficherConsignes();
  afficherPersonnel();
  refreshAtelierChart();
             }
