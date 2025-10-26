// ======== INITIALISATION ========
document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initHeaderTime();
  restoreAllData();
  renderAtelierChart();
});

// ======== NAVIGATION ========
function initNavigation() {
  document.querySelectorAll(".menu button").forEach(btn => {
    btn.addEventListener("click", e => {
      document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
      const target = e.target.getAttribute("onclick").match(/'(.*?)'/)[1];
      document.getElementById(target).classList.add("active");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

// ======== HORLOGE + SEMAINE ========
function initHeaderTime() {
  const header = document.getElementById("headerTime");
  const updateTime = () => {
    const now = new Date();
    const weekNumber = getWeekNumber(now);
    const dateStr = now.toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    header.innerHTML = `<b>${dateStr}</b><br>🕒 ${timeStr} - 📆 Semaine ${weekNumber}`;
  };
  updateTime();
  setInterval(updateTime, 1000);
}
function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return weekNo;
}

// ======== BASE DE DONNÉES LOCALE ========
let data = {
  arrets: JSON.parse(localStorage.getItem("arrets") || "[]"),
  consignes: JSON.parse(localStorage.getItem("consignes") || "[]"),
  personnel: JSON.parse(localStorage.getItem("personnel") || "[]"),
  lignes: JSON.parse(localStorage.getItem("lignes") || "{}")
};

function saveAllData() {
  localStorage.setItem("arrets", JSON.stringify(data.arrets));
  localStorage.setItem("consignes", JSON.stringify(data.consignes));
  localStorage.setItem("personnel", JSON.stringify(data.personnel));
  localStorage.setItem("lignes", JSON.stringify(data.lignes));
}

// ======== RESTAURATION ========
function restoreAllData() {
  renderHistorique("arretHistorique", data.arrets);
  renderHistorique("consigneHistorique", data.consignes);
  renderHistorique("personnelHistorique", data.personnel);
}

// ======== PRODUCTION (LIGNES) ========
function openLine(ligne) {
  const container = document.getElementById("lineFormContainer");
  container.innerHTML = `
    <h3>${ligne}</h3>
    <form onsubmit="event.preventDefault(); saveLine('${ligne}');">
      <label>Heure début :</label>
      <input type="time" id="debut_${ligne}" required>
      <label>Heure fin :</label>
      <input type="time" id="fin_${ligne}">
      <label>Quantité produite :</label>
      <input type="number" id="quantite_${ligne}" required>
      <label>Quantité restante :</label>
      <input type="number" id="restante_${ligne}" oninput="updateEstimation('${ligne}')">
      <label>Cadence (colis/heure) :</label>
      <input type="number" id="cadence_${ligne}" readonly>
      <label>Fin estimée :</label>
      <input type="text" id="finEstimee_${ligne}" readonly>
      <button type="submit">💾 Enregistrer</button>
      <button type="button" onclick="resetLine('${ligne}')">🔄 Réinitialiser</button>
    </form>
    <div id="historique_${ligne}"></div>
    <canvas id="chart_${ligne}" height="80"></canvas>
  `;
  renderLineHistory(ligne);
  renderLineChart(ligne);
}

// === Sauvegarde d’une ligne ===
function saveLine(ligne) {
  const debut = document.getElementById(`debut_${ligne}`).value;
  const fin = document.getElementById(`fin_${ligne}`).value;
  const quantite = parseFloat(document.getElementById(`quantite_${ligne}`).value);
  const restante = parseFloat(document.getElementById(`restante_${ligne}`).value);

  if (!debut || isNaN(quantite)) return alert("Merci de renseigner les champs obligatoires.");

  const cadence = calcCadence(debut, fin || new Date().toLocaleTimeString("fr-FR", { hour12: false }), quantite);
  const estimation = restante ? calcEstimation(restante, cadence) : "";

  if (!data.lignes[ligne]) data.lignes[ligne] = [];
  data.lignes[ligne].push({
    date: new Date().toLocaleString(),
    debut,
    fin,
    quantite,
    restante,
    cadence,
    estimation
  });

  saveAllData();
  renderLineHistory(ligne);
  renderLineChart(ligne);
  resetInputs(ligne);
}

// === Réinitialisation des champs ===
function resetInputs(ligne) {
  document.querySelectorAll(`#lineFormContainer input`).forEach(el => {
    if (el.type !== "time" && el.type !== "readonly") el.value = "";
  });
}

// === Réinitialiser la ligne ===
function resetLine(ligne) {
  if (confirm("Voulez-vous vraiment remettre à zéro les données de cette ligne ?")) {
    data.lignes[ligne] = [];
    saveAllData();
    renderLineHistory(ligne);
    renderLineChart(ligne);
  }
}

// === Calcul de cadence ===
function calcCadence(debut, fin, quantite) {
  const [hd, md] = debut.split(":").map(Number);
  const [hf, mf] = fin.split(":").map(Number);
  let duree = (hf + mf / 60) - (hd + md / 60);
  if (duree <= 0) duree += 24;
  return (quantite / duree).toFixed(2);
}

// === Calcul d’estimation automatique ===
function updateEstimation(ligne) {
  const restante = parseFloat(document.getElementById(`restante_${ligne}`).value);
  const cadence = parseFloat(document.getElementById(`cadence_${ligne}`).value);
  const finEstimee = document.getElementById(`finEstimee_${ligne}`);
  if (!restante || !cadence || cadence === 0) {
    finEstimee.value = "";
    return;
  }
  const tempsRestant = restante / cadence;
  const heures = Math.floor(tempsRestant);
  const minutes = Math.round((tempsRestant - heures) * 60);
  finEstimee.value = `${heures}h ${minutes}min restantes`;
}

// === Historique d’une ligne ===
function renderLineHistory(ligne) {
  const hist = data.lignes[ligne] || [];
  const container = document.getElementById(`historique_${ligne}`);
  if (!hist.length) {
    container.innerHTML = "<em>Aucun enregistrement</em>";
    return;
  }
  let html = "<table><tr><th>Date</th><th>Début</th><th>Fin</th><th>Qté</th><th>Restante</th><th>Cadence</th><th>Fin estimée</th></tr>";
  hist.forEach(h => {
    html += `<tr><td>${h.date}</td><td>${h.debut}</td><td>${h.fin}</td><td>${h.quantite}</td><td>${h.restante}</td><td>${h.cadence}</td><td>${h.estimation}</td></tr>`;
  });
  html += "</table>";
  container.innerHTML = html;
}

// === Graphique d’une ligne ===
function renderLineChart(ligne) {
  const ctx = document.getElementById(`chart_${ligne}`);
  if (!ctx) return;
  const hist = data.lignes[ligne] || [];
  if (!hist.length) return (ctx.style.display = "none");

  ctx.style.display = "block";
  new Chart(ctx, {
    type: "line",
    data: {
      labels: hist.map(h => h.date.split(" ")[1]),
      datasets: [{
        label: "Cadence (colis/heure)",
        data: hist.map(h => h.cadence),
        borderColor: "#007bff",
        fill: false,
        tension: 0.3
      }]
    },
    options: { scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
  });
}

// ======== ARRÊTS / CONSIGNES / PERSONNEL ========
function saveArret() {
  const ligne = document.getElementById("arretLine").value;
  const zone = document.getElementById("arretZone").value;
  const duree = document.getElementById("arretDuree").value;
  const comment = document.getElementById("arretComment").value;
  if (!ligne || !duree) return alert("Merci de remplir les champs obligatoires.");

  data.arrets.push({ date: new Date().toLocaleString(), ligne, zone, duree, comment });
  saveAllData();
  renderHistorique("arretHistorique", data.arrets);
  document.getElementById("arretForm").reset();
}

function saveConsigne() {
  const texte = document.getElementById("consigneTexte").value.trim();
  if (!texte) return;
  data.consignes.push({ date: new Date().toLocaleString(), texte, valide: false });
  saveAllData();
  renderHistorique("consigneHistorique", data.consignes);
  document.getElementById("consigneForm").reset();
}

function toggleConsigne(i) {
  data.consignes[i].valide = !data.consignes[i].valide;
  saveAllData();
  renderHistorique("consigneHistorique", data.consignes);
}

function savePersonnel() {
  const nom = document.getElementById("persNom").value;
  const motif = document.getElementById("persMotif").value;
  const comment = document.getElementById("persComment").value;
  if (!nom || !motif) return;
  data.personnel.push({ date: new Date().toLocaleString(), nom, motif, comment });
  saveAllData();
  renderHistorique("personnelHistorique", data.personnel);
  document.getElementById("personnelForm").reset();
}

// ======== HISTORIQUES GÉNÉRIQUES ========
function renderHistorique(id, list) {
  const container = document.getElementById(id);
  if (!container) return;
  if (!list.length) {
    container.innerHTML = "<em>Aucun enregistrement</em>";
    return;
  }

  let html = "<table><tr>";
  Object.keys(list[0]).forEach(k => html += `<th>${k}</th>`);
  html += "</tr>";
  list.forEach((item, i) => {
    html += "<tr>";
    Object.values(item).forEach(v => html += `<td>${v}</td>`);
    if (id === "consigneHistorique")
      html += `<td><button onclick="toggleConsigne(${i})">${item.valide ? "✅" : "☑️"}</button></td>`;
    html += "</tr>";
  });
  html += "</table>";
  container.innerHTML = html;
}

// ======== EXPORT EXCEL ========
function exportAll() {
  const rows = [["Section", "Date", "Ligne/Nom", "Zone/Motif", "Durée/Commentaire"]];
  data.arrets.forEach(a => rows.push(["Arrêt", a.date, a.ligne, a.zone, a.duree + " min", a.comment]));
  data.consignes.forEach(c => rows.push(["Consigne", c.date, "-", "-", c.texte + (c.valide ? " (Validée)" : "")]));
  data.personnel.forEach(p => rows.push(["Personnel", p.date, p.nom, p.motif, p.comment]));

  const csv = rows.map(r => r.map(v => `"${v}"`).join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Atelier_PPNC_${new Date().toLocaleDateString("fr-FR").replace(/\//g, "-")}.csv`;
  a.click();
}

// ======== GRAPHIQUE GLOBAL ========
function renderAtelierChart() {
  const ctx = document.getElementById("atelierChart");
  if (!ctx) return;

  const lignes = ["Râpé", "T2", "RT", "T1", "OMORI", "Sticks", "Emballage", "Dés", "Filets", "Prédécoupés"];
  const valeurs = lignes.map(l => {
    const total = (data.lignes[l] || []).reduce((sum, e) => sum + (parseFloat(e.quantite) || 0), 0);
    return total;
  });

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: lignes,
      datasets: [{
        label: "Production totale (colis)",
        data: valeurs,
        backgroundColor: "rgba(0,123,255,0.7)"
      }]
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true } },
      plugins: { legend: { display: false } }
    }
  });
}
