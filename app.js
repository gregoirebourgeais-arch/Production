// === Initialisation ===
document.addEventListener("DOMContentLoaded", () => {
  updateDateDisplay();
  setInterval(updateDateDisplay, 1000);
  loadData();
});

// === Date, semaine, équipe ===
function updateDateDisplay() {
  const date = new Date();
  const jourAnnee = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
  const semaine = Math.ceil(jourAnnee / 7);
  const heures = date.getHours();

  let equipe = "";
  if (heures >= 5 && heures < 13) equipe = "M (5h–13h)";
  else if (heures >= 13 && heures < 21) equipe = "AM (13h–21h)";
  else equipe = "N (21h–5h)";

  const dateStr = date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const heureStr = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  document.getElementById("dateDisplay").textContent = `${heureStr} – ${dateStr} (S${semaine}) | Jour ${jourAnnee} – Équipe : ${equipe}`;
}

// === Navigation ===
function openPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
  if (pageId === "atelier") updateAtelierChart();
  saveData();
}

// === Sélection ligne ===
let ligneCourante = "Râpé";
function selectLigne(ligne) {
  ligneCourante = ligne;
  document.getElementById("ligneTitle").textContent = `Ligne : ${ligne}`;
}

// === Données globales ===
let donnees = {
  production: [],
  arrets: [],
  organisation: [],
  personnel: []
};

// === Sauvegarde / Chargement ===
function saveData() {
  localStorage.setItem("atelierData", JSON.stringify(donnees));
}

function loadData() {
  const saved = localStorage.getItem("atelierData");
  if (saved) donnees = JSON.parse(saved);
  updateAtelierChart();
  updateHistoriques();
}

// === Enregistrement Production ===
function enregistrerProduction() {
  const heureDebut = document.getElementById("heureDebut").value;
  const heureFin = document.getElementById("heureFin").value;
  const quantiteProduite = document.getElementById("quantiteProduite").value;
  const quantiteRestante = document.getElementById("quantiteRestante").value;
  const cadenceManuelle = document.getElementById("cadenceManuelle").value;
  const finEstimee = document.getElementById("finEstimee").textContent;
  const equipe = getEquipeActuelle();

  if (!quantiteProduite) return alert("Veuillez saisir une quantité produite");

  donnees.production.push({
    ligne: ligneCourante,
    heureDebut,
    heureFin,
    quantiteProduite,
    quantiteRestante,
    cadenceManuelle,
    finEstimee,
    equipe,
    date: new Date().toLocaleString("fr-FR")
  });

  saveData();
  updateHistoriques();
  updateAtelierChart();
  resetForm();
}

// === Calcul fin estimée ===
function updateFinEstimee() {
  const qRestante = parseFloat(document.getElementById("quantiteRestante").value) || 0;
  const cadenceManuelle = parseFloat(document.getElementById("cadenceManuelle").value) || 0;

  if (qRestante > 0 && cadenceManuelle > 0) {
    const tempsH = qRestante / cadenceManuelle;
    const minutes = Math.round(tempsH * 60);
    const fin = new Date();
    fin.setMinutes(fin.getMinutes() + minutes);
    const heureStr = fin.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    document.getElementById("finEstimee").textContent = `Fin estimée : ${heureStr} (${minutes} min restantes)`;
  } else {
    document.getElementById("finEstimee").textContent = "Fin estimée : --";
  }
}

// === Enregistrement Arrêt ===
function enregistrerArret() {
  const ligne = document.getElementById("ligneArret").value;
  const type = document.getElementById("typeArret").value;
  const commentaire = document.getElementById("commentaireArret").value;
  const equipe = getEquipeActuelle();

  donnees.arrets.push({
    ligne, type, commentaire, equipe,
    date: new Date().toLocaleString("fr-FR")
  });

  saveData();
  updateHistoriques();
  document.getElementById("commentaireArret").value = "";
}

// === Enregistrement Organisation ===
function enregistrerConsigne() {
  const texte = document.getElementById("consigne").value;
  if (!texte) return alert("Veuillez saisir une consigne");
  const equipe = getEquipeActuelle();

  donnees.organisation.push({
    texte, equipe,
    date: new Date().toLocaleString("fr-FR")
  });

  saveData();
  updateHistoriques();
  document.getElementById("consigne").value = "";
}

// === Enregistrement Personnel ===
function enregistrerPersonnel() {
  const note = document.getElementById("personnelNote").value;
  if (!note) return alert("Veuillez saisir une observation");
  const equipe = getEquipeActuelle();

  donnees.personnel.push({
    note, equipe,
    date: new Date().toLocaleString("fr-FR")
  });

  saveData();
  updateHistoriques();
  document.getElementById("personnelNote").value = "";
}

// === Historique ===
function updateHistoriques() {
  const sections = {
    production: "historiqueProduction",
    arrets: "historiqueArrets",
    organisation: "historiqueOrganisation",
    personnel: "historiquePersonnel"
  };
  for (const [key, id] of Object.entries(sections)) {
    const ul = document.getElementById(id);
    if (!ul) continue;
    ul.innerHTML = donnees[key]
      .map(d => `<li><strong>${d.ligne || d.equipe}</strong> - ${d.date}<br>${d.quantiteProduite || d.texte || d.commentaire || d.note || ""}</li>`)
      .join("");
  }
}

// === Graphique ===
let chart;
function updateAtelierChart() {
  const ctx = document.getElementById("atelierChart");
  if (!ctx) return;
  const lignes = [...new Set(donnees.production.map(p => p.ligne))];
  const dataMap = {};

  lignes.forEach(l => {
    dataMap[l] = donnees.production
      .filter(p => p.ligne === l)
      .map(p => parseFloat(p.quantiteProduite) || 0);
  });

  const datasets = lignes.map(l => ({
    label: l,
    data: dataMap[l],
    borderWidth: 2,
    borderColor: randomColor(),
    fill: false,
    tension: 0.3
  }));

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "line",
    data: { labels: lignes, datasets },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } }
  });
}

function randomColor() {
  return `hsl(${Math.random() * 360}, 70%, 55%)`;
}

// === Export Excel ===
function exportAllData() {
  const wb = XLSX.utils.book_new();

  for (const [key, data] of Object.entries(donnees)) {
    if (data.length === 0) continue;
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, key.charAt(0).toUpperCase() + key.slice(1));
  }

  XLSX.writeFile(wb, "Synthese_Atelier.xlsx");
}

// === Calculatrice ===
const calc = document.getElementById("calculator");
let dragging = false, offsetX, offsetY;

function toggleCalculator() {
  calc.classList.toggle("hidden");
  if (!calc.classList.contains("hidden")) {
    calc.innerHTML = `<iframe src="https://www.online-calculator.com/simple-calculator/" width="300" height="380" frameborder="0"></iframe>`;
  }
}

document.getElementById("calcToggle").addEventListener("touchstart", e => {
  dragging = true;
  offsetX = e.touches[0].clientX - e.target.offsetLeft;
  offsetY = e.touches[0].clientY - e.target.offsetTop;
});

document.addEventListener("touchmove", e => {
  if (!dragging) return;
  const btn = document.getElementById("calcToggle");
  btn.style.left = e.touches[0].clientX - offsetX + "px";
  btn.style.top = e.touches[0].clientY - offsetY + "px";
});

document.addEventListener("touchend", () => dragging = false);

// === Outils ===
function getEquipeActuelle() {
  const h = new Date().getHours();
  if (h >= 5 && h < 13) return "M";
  if (h >= 13 && h < 21) return "AM";
  return "N";
}

function resetForm() {
  document.querySelectorAll("#production input").forEach(i => i.value = "");
  document.getElementById("finEstimee").textContent = "Fin estimée : --";
  }
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('service-worker.js')
    .then(() => console.log("✅ Service Worker enregistré"))
    .catch(err => console.error("❌ SW erreur:", err));
}
