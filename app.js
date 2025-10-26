// === INITIALISATION ===
document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initHeaderTime();
  renderAtelierChart();
  restoreAllData();
});

// === NAVIGATION ENTRE LES PAGES ===
function navigateTo(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// === HORLOGE + DATE + SEMAINE ===
function initHeaderTime() {
  const header = document.createElement("div");
  header.id = "headerTime";
  document.body.appendChild(header);

  const updateTime = () => {
    const now = new Date();
    const weekNumber = getWeekNumber(now);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('fr-FR', options);
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
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

// === DONNÉES ===
let data = {
  arrets: JSON.parse(localStorage.getItem("arrets") || "[]"),
  consignes: JSON.parse(localStorage.getItem("consignes") || "[]"),
  personnel: JSON.parse(localStorage.getItem("personnel") || "[]"),
  lignes: JSON.parse(localStorage.getItem("lignes") || "{}")
};

// === SAUVEGARDE GÉNÉRALE ===
function saveAllData() {
  localStorage.setItem("arrets", JSON.stringify(data.arrets));
  localStorage.setItem("consignes", JSON.stringify(data.consignes));
  localStorage.setItem("personnel", JSON.stringify(data.personnel));
  localStorage.setItem("lignes", JSON.stringify(data.lignes));
}

// === RESTAURATION AU CHARGEMENT ===
function restoreAllData() {
  renderHistorique("arretHistorique", data.arrets);
  renderHistorique("consigneHistorique", data.consignes);
  renderHistorique("personnelHistorique", data.personnel);
}

// === GESTION DES ARRÊTS ===
function saveArret() {
  const ligne = document.getElementById("arretLine").value;
  const zone = document.getElementById("arretZone").value;
  const duree = document.getElementById("arretDuree").value;
  const comment = document.getElementById("arretComment").value;

  if (!ligne || !zone || !duree) {
    alert("Merci de remplir tous les champs obligatoires.");
    return;
  }

  data.arrets.push({
    date: new Date().toLocaleString(),
    ligne,
    zone,
    duree: parseInt(duree),
    comment
  });

  saveAllData();
  renderHistorique("arretHistorique", data.arrets);
  document.getElementById("arretForm").reset();
}

// === GESTION DES CONSIGNES ===
function saveConsigne() {
  const texte = document.getElementById("consigneTexte").value;
  if (!texte.trim()) return;

  data.consignes.push({
    date: new Date().toLocaleString(),
    texte,
    valide: false
  });

  saveAllData();
  renderHistorique("consigneHistorique", data.consignes);
  document.getElementById("consigneForm").reset();
}

// === VALIDER UNE CONSIGNE ===
function toggleConsigne(index) {
  data.consignes[index].valide = !data.consignes[index].valide;
  saveAllData();
  renderHistorique("consigneHistorique", data.consignes);
}

// === GESTION DU PERSONNEL ===
function savePersonnel() {
  const nom = document.getElementById("persNom").value;
  const motif = document.getElementById("persMotif").value;
  const comment = document.getElementById("persComment").value;
  if (!nom || !motif) return;

  data.personnel.push({
    date: new Date().toLocaleString(),
    nom,
    motif,
    comment
  });

  saveAllData();
  renderHistorique("personnelHistorique", data.personnel);
  document.getElementById("personnelForm").reset();
}

// === HISTORIQUES GÉNÉRIQUES ===
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

// === EXPORT GLOBAL EXCEL ===
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

// === GRAPHIQUE GLOBAL ATELIER ===
function renderAtelierChart() {
  const ctx = document.getElementById("atelierChart");
  if (!ctx) return;

  const lignes = ["Râpé", "T2", "RT", "T1", "OMORI", "Sticks", "Emballage", "Dés", "Filets", "Prédécoupés"];
  const valeurs = lignes.map(l => {
    const total = (data.arrets || []).filter(a => a.ligne === l)
      .reduce((sum, a) => sum + a.duree, 0);
    return total;
  });

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: lignes,
      datasets: [{
        label: "Durée totale des arrêts (min)",
        data: valeurs,
        backgroundColor: "rgba(0,123,255,0.7)"
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}
