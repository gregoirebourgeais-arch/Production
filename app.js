// --- Initialisation globale ---
const lignes = ["rapé", "t2", "rt", "omori", "sticks", "emballage", "dés", "filets", "prédécoupés"];
let historique = JSON.parse(localStorage.getItem("historique")) || {};
let arrets = JSON.parse(localStorage.getItem("arrets")) || [];
let consignes = JSON.parse(localStorage.getItem("consignes")) || [];
let personnel = JSON.parse(localStorage.getItem("personnel")) || [];

// --- Gestion du menu ---
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (id === "atelier") majAtelier();
}

// --- Horloge en direct ---
setInterval(() => {
  const now = new Date();
  document.getElementById("dateTimeDisplay").textContent =
    now.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium" });
}, 1000);

// --- Création des formulaires de lignes ---
lignes.forEach(ligne => {
  const container = document.getElementById(`form-${ligne}`);
  if (!container) return;

  container.innerHTML = `
    <div class="form-container">
      <label>Heure de début :</label>
      <input type="time" id="debut-${ligne}" step="60">
      <label>Heure de fin :</label>
      <input type="time" id="fin-${ligne}" step="60">
      <label>Quantité produite :</label>
      <input type="number" id="qte-${ligne}" placeholder="Colis produits">
      <label>Quantité restante :</label>
      <input type="number" id="reste-${ligne}" placeholder="Colis restants">
      <label>Cadence manuelle :</label>
      <input type="number" id="cadenceManuelle-${ligne}" placeholder="Saisir cadence manuelle">
      <p id="estimation-${ligne}">⏳ Fin estimée : -</p>
      <button onclick="enregistrer('${ligne}')">💾 Enregistrer</button>
      <button onclick="remiseCadence('${ligne}')">🔄 Remise à zéro cadence</button>
    </div>
    <div id="historique-${ligne}"></div>
  `;

  // Persistance des champs
  ["debut", "fin", "qte", "reste", "cadenceManuelle"].forEach(champ => {
    const id = `${champ}-${ligne}`;
    document.getElementById(id).value = localStorage.getItem(id) || "";
    document.getElementById(id).addEventListener("input", e => {
      localStorage.setItem(id, e.target.value);
      if (champ === "reste") estimationFin(ligne);
    });
  });

  majHistorique(ligne);
});

// --- Enregistrement d'une ligne ---
function enregistrer(ligne) {
  const debut = document.getElementById(`debut-${ligne}`).value;
  const fin = document.getElementById(`fin-${ligne}`).value;
  const qte = parseFloat(document.getElementById(`qte-${ligne}`).value);
  const reste = parseFloat(document.getElementById(`reste-${ligne}`).value);
  const cadenceManuelle = parseFloat(document.getElementById(`cadenceManuelle-${ligne}`).value);

  if (!debut || !fin || isNaN(qte) || isNaN(reste)) {
    alert("⚠️ Merci de remplir tous les champs");
    return;
  }

  const diffHeure = (new Date(`1970-01-01T${fin}:00`) - new Date(`1970-01-01T${debut}:00`)) / 3600000;
  const cadence = cadenceManuelle || (diffHeure > 0 ? qte / diffHeure : 0);

  const enreg = { date: new Date().toLocaleString("fr-FR"), debut, fin, qte, reste, cadence };
  if (!historique[ligne]) historique[ligne] = [];
  historique[ligne].push(enreg);

  localStorage.setItem("historique", JSON.stringify(historique));
  estimationFin(ligne);
  majHistorique(ligne);
  alert("✅ Données enregistrées !");
}

// --- Estimation automatique de fin ---
function estimationFin(ligne) {
  const reste = parseFloat(document.getElementById(`reste-${ligne}`).value);
  const cadenceManuelle = parseFloat(document.getElementById(`cadenceManuelle-${ligne}`).value);
  const dernier = historique[ligne]?.[historique[ligne].length - 1];
  const cadence = cadenceManuelle || (dernier ? dernier.cadence : 0);
  const est = document.getElementById(`estimation-${ligne}`);

  if (cadence > 0 && reste > 0) {
    const tempsRestantHeures = reste / cadence;
    const finEstimee = new Date(Date.now() + tempsRestantHeures * 3600000);
    est.textContent = `⏳ Fin estimée : ${finEstimee.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  } else {
    est.textContent = "⏳ Fin estimée : -";
  }
}

// --- Historique par ligne ---
function majHistorique(ligne) {
  const div = document.getElementById(`historique-${ligne}`);
  div.innerHTML = "<h3>Historique</h3>";
  (historique[ligne] || []).forEach((h, i) => {
    div.innerHTML += `
      <div>
        ${h.date} — Début ${h.debut} / Fin ${h.fin} — Qte: ${h.qte} — Reste: ${h.reste} — Cadence: ${h.cadence.toFixed(2)} c/h
        <button onclick="supprHistorique('${ligne}', ${i})">🗑️</button>
      </div>`;
  });
}

// --- Suppression d’un enregistrement ---
function supprHistorique(ligne, i) {
  historique[ligne].splice(i, 1);
  localStorage.setItem("historique", JSON.stringify(historique));
  majHistorique(ligne);
}

// --- Remise à zéro cadence ---
function remiseCadence(ligne) {
  document.getElementById(`cadenceManuelle-${ligne}`).value = "";
  estimationFin(ligne);
}

// --- Gestion Arrêts ---
function saveArret() {
  const ligne = document.getElementById("ligneArretSelect").value;
  const type = document.getElementById("typeArret").value;
  const duree = document.getElementById("dureeArret").value;
  if (!duree) return alert("⏱️ Indique une durée !");
  arrets.push({ ligne, type, duree, date: new Date().toLocaleString("fr-FR") });
  localStorage.setItem("arrets", JSON.stringify(arrets));
  majArrets();
}

function majArrets() {
  const hist = document.getElementById("historiqueArrets");
  hist.innerHTML = "<h3>Historique des arrêts</h3>";
  arrets.forEach(a => {
    hist.innerHTML += `<div>${a.date} — ${a.ligne} — ${a.type} — ${a.duree} min</div>`;
  });
}
majArrets();

// --- Gestion Consignes ---
function saveConsigne() {
  const texte = document.getElementById("consigneTexte").value;
  const val = document.getElementById("consigneValidee").checked;
  if (!texte) return;
  consignes.push({ texte, val, date: new Date().toLocaleString("fr-FR") });
  localStorage.setItem("consignes", JSON.stringify(consignes));
  majConsignes();
  document.getElementById("consigneTexte").value = "";
  document.getElementById("consigneValidee").checked = false;
}

function majConsignes() {
  const hist = document.getElementById("historiqueConsignes");
  hist.innerHTML = "<h3>Historique Consignes</h3>";
  consignes.forEach(c => {
    hist.innerHTML += `<div>${c.date} — ${c.texte} ${c.val ? "✅" : "⏳"}</div>`;
  });
}
majConsignes();

// --- Gestion Personnel ---
function savePersonnel() {
  const nom = document.getElementById("nomPers").value;
  const motif = document.getElementById("motifPers").value;
  const com = document.getElementById("commentairePers").value;
  if (!nom) return;
  personnel.push({ nom, motif, com, date: new Date().toLocaleString("fr-FR") });
  localStorage.setItem("personnel", JSON.stringify(personnel));
  majPersonnel();
  document.getElementById("nomPers").value = "";
  document.getElementById("motifPers").value = "Absence";
  document.getElementById("commentairePers").value = "";
}

function majPersonnel() {
  const hist = document.getElementById("historiquePersonnel");
  hist.innerHTML = "<h3>Historique Personnel</h3>";
  personnel.forEach(p => {
    hist.innerHTML += `<div>${p.date} — ${p.nom} — ${p.motif} — ${p.com}</div>`;
  });
}
majPersonnel();

// --- Calculatrice ---
let calcOpen = false;
function toggleCalculator() {
  calcOpen = !calcOpen;
  document.getElementById("calculator").classList.toggle("hidden", !calcOpen);
}
function press(val) {
  document.getElementById("calcDisplay").value += val;
}
function calculate() {
  const display = document.getElementById("calcDisplay");
  try {
    display.value = eval(display.value.replace("÷", "/").replace("×", "*"));
  } catch {
    display.value = "Erreur";
  }
}

// --- Graphiques Atelier ---
function majAtelier() {
  const ctx = document.getElementById("atelierChart").getContext("2d");
  const data = lignes.map(l => historique[l]?.at(-1)?.qte || 0);
  const labels = lignes.map(l => l.toUpperCase());
  new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ label: "Quantité produite", data, backgroundColor: "#1a73e8" }] },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });

  const histDiv = document.getElementById("atelierHistorique");
  histDiv.innerHTML = "<h3>Derniers enregistrements</h3>";
  lignes.forEach(l => {
    const dernier = historique[l]?.at(-1);
    if (dernier) histDiv.innerHTML += `<div>${l.toUpperCase()} — ${dernier.qte} colis à ${dernier.cadence.toFixed(1)} c/h</div>`;
  });
}

// --- Export Excel global ---
function exportExcelGlobal() {
  const data = [];
  lignes.forEach(l => (historique[l] || []).forEach(h => data.push({ Ligne: l, ...h })));
  arrets.forEach(a => data.push({ Type: "Arrêt", ...a }));
  consignes.forEach(c => data.push({ Type: "Consigne", ...c }));
  personnel.forEach(p => data.push({ Type: "Personnel", ...p }));

  if (!data.length) return alert("Aucune donnée à exporter !");
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Synthèse Atelier");
  XLSX.writeFile(wb, "Synthese_Atelier_PPNC.xlsx");
}
