// --- VARIABLES GLOBALES --- //
let donnees = JSON.parse(localStorage.getItem("donnees")) || {};
let chartInstances = {};
let currentPage = "atelier";

// --- NAVIGATION ENTRE PAGES --- //
function openPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
  currentPage = pageId;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// --- DATE / HEURE / ÉQUIPE --- //
function majDateHeure() {
  const now = new Date();
  const jour = now.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
  const heure = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const semaine = Math.ceil(((now - new Date(now.getFullYear(), 0, 1)) / 86400000 + new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7);

  // Détermination équipe automatique
  const h = now.getHours();
  let equipe = "";
  if (h >= 5 && h < 13) equipe = "M";
  else if (h >= 13 && h < 21) equipe = "AM";
  else equipe = "N";

  document.getElementById("dateTimeDisplay").innerText = `${jour} ${heure}`;
  document.getElementById("equipeDisplay").innerText = `Semaine ${semaine} | Équipe ${equipe}`;
  localStorage.setItem("equipe", equipe);
}
setInterval(majDateHeure, 1000);
majDateHeure();

// --- CALCUL DE FIN ESTIMÉE AUTOMATIQUE --- //
function updateFinEstimee(ligne) {
  const restant = parseFloat(document.getElementById(`restant${ligne}`).value) || 0;
  const cadenceManuelle = parseFloat(document.getElementById(`cadenceManuelle${ligne}`).value) || 0;

  let cadence = cadenceManuelle;
  if (!cadence) {
    const hist = donnees[ligne]?.historique || [];
    if (hist.length >= 2) {
      const last = hist[hist.length - 1];
      const prev = hist[hist.length - 2];
      const deltaQ = last.quantite - prev.quantite;
      const deltaT = (new Date(last.heure) - new Date(prev.heure)) / 3600000;
      cadence = deltaT > 0 ? deltaQ / deltaT : 0;
    }
  }

  const tempsRestant = cadence > 0 ? restant / cadence : 0;
  const fin = new Date(Date.now() + tempsRestant * 3600000);

  document.getElementById(`finEstimee${ligne}`).innerText =
    cadence > 0
      ? `Fin estimée : ${fin.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} (≈ ${tempsRestant.toFixed(1)} h)`
      : "Fin estimée : --";
}

// --- ENREGISTRER UNE SAISIE --- //
function enregistrerLigne(ligne) {
  const quantite = parseFloat(document.getElementById(`quantite${ligne}`).value) || 0;
  const restant = parseFloat(document.getElementById(`restant${ligne}`).value) || 0;
  const cadenceManuelle = parseFloat(document.getElementById(`cadenceManuelle${ligne}`).value) || 0;
  const equipe = localStorage.getItem("equipe") || "N/A";

  if (!donnees[ligne]) donnees[ligne] = { historique: [] };
  const now = new Date().toISOString();
  donnees[ligne].historique.push({
    heure: now,
    quantite,
    restant,
    cadenceManuelle,
    equipe
  });

  localStorage.setItem("donnees", JSON.stringify(donnees));

  // Réinitialiser les champs après enregistrement
  document.getElementById(`quantite${ligne}`).value = "";
  document.getElementById(`restant${ligne}`).value = "";
  document.getElementById(`cadenceManuelle${ligne}`).value = "";

  afficherHistorique(ligne);
  majGraphique(ligne);
}

// --- ANNULER DERNIER ENREGISTREMENT --- //
function annulerDernier(ligne) {
  if (!donnees[ligne] || donnees[ligne].historique.length === 0) return;
  donnees[ligne].historique.pop();
  localStorage.setItem("donnees", JSON.stringify(donnees));
  afficherHistorique(ligne);
  majGraphique(ligne);
}

// --- REMISE À ZÉRO (ligne) --- //
function resetLigne(ligne) {
  if (!confirm(`Remettre à zéro les données de la ligne ${ligne} ?`)) return;
  if (!donnees[ligne]) return;
  donnees[ligne].historique = [];
  localStorage.setItem("donnees", JSON.stringify(donnees));
  afficherHistorique(ligne);
  majGraphique(ligne);
}

// --- AFFICHAGE HISTORIQUE LIGNE --- //
function afficherHistorique(ligne) {
  const hist = donnees[ligne]?.historique || [];
  const cont = document.getElementById(`historique${ligne}`);
  if (!cont) return;
  cont.innerHTML = hist.length
    ? hist
        .map(
          (r, i) =>
            `<div><b>${new Date(r.heure).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</b> — Q=${r.quantite} | R=${r.restant} | Cad=${r.cadenceManuelle || "Auto"} | Équipe ${r.equipe}
            <button onclick="supprimerLigneHistorique('${ligne}', ${i})" style="float:right;">❌</button></div>`
        )
        .join("")
    : "<div>Aucun enregistrement.</div>";
}

// --- SUPPRIMER UNE LIGNE DE L’HISTORIQUE --- //
function supprimerLigneHistorique(ligne, index) {
  if (!confirm("Supprimer cet enregistrement ?")) return;
  donnees[ligne].historique.splice(index, 1);
  localStorage.setItem("donnees", JSON.stringify(donnees));
  afficherHistorique(ligne);
  majGraphique(ligne);
}

// --- GRAPHIQUES DES LIGNES --- //
function majGraphique(ligne) {
  const ctx = document.getElementById(`chart${ligne}`);
  if (!ctx) return;

  const hist = donnees[ligne]?.historique || [];
  const labels = hist.map(r =>
    new Date(r.heure).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  );
  const valeurs = hist.map(r => r.quantite);

  if (chartInstances[ligne]) chartInstances[ligne].destroy();

  chartInstances[ligne] = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: `Quantité ${ligne}`,
          data: valeurs,
          borderColor: "#007bff",
          backgroundColor: "rgba(0, 123, 255, 0.2)",
          tension: 0.3,
          fill: true
        }
      ]
    },
    options: {
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}
// --- DONNÉES AUTRES SECTIONS --- //
let arrets = JSON.parse(localStorage.getItem("arrets")) || [];
let consignes = JSON.parse(localStorage.getItem("consignes")) || [];
let personnel = JSON.parse(localStorage.getItem("personnel")) || [];

// --- ARRETS --- //
function enregistrerArret() {
  const ligne = document.getElementById("ligneArret").value;
  const type = document.getElementById("typeArret").value;
  const duree = parseFloat(document.getElementById("dureeArret").value) || 0;
  const commentaire = document.getElementById("commentArret").value;
  const equipe = localStorage.getItem("equipe");
  const now = new Date().toISOString();

  arrets.push({ ligne, type, duree, commentaire, equipe, heure: now });
  localStorage.setItem("arrets", JSON.stringify(arrets));
  afficherArrets();
  document.getElementById("dureeArret").value = "";
  document.getElementById("commentArret").value = "";
}

function afficherArrets() {
  const hist = document.getElementById("historiqueArrets");
  hist.innerHTML = arrets.length
    ? arrets
        .map(
          (a, i) =>
            `<div>${new Date(a.heure).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} | ${a.ligne} - ${a.type} - ${a.duree} min - ${a.commentaire || ""} | Équipe ${a.equipe}
            <button onclick="supprimerArret(${i})" style="float:right;">❌</button></div>`
        )
        .join("")
    : "<div>Aucun arrêt enregistré.</div>";
}

function supprimerArret(i) {
  if (!confirm("Supprimer cet arrêt ?")) return;
  arrets.splice(i, 1);
  localStorage.setItem("arrets", JSON.stringify(arrets));
  afficherArrets();
}

// --- ORGANISATION / CONSIGNES --- //
function ajouterConsigne() {
  const texte = document.getElementById("consigneTexte").value;
  if (!texte.trim()) return;
  const now = new Date().toISOString();
  consignes.push({ texte, date: now, valide: false });
  localStorage.setItem("consignes", JSON.stringify(consignes));
  document.getElementById("consigneTexte").value = "";
  afficherConsignes();
}

function afficherConsignes() {
  const list = document.getElementById("listeConsignes");
  list.innerHTML = consignes.length
    ? consignes
        .map(
          (c, i) =>
            `<div><input type="checkbox" onchange="toggleConsigne(${i})" ${c.valide ? "checked" : ""}/> ${c.texte} (${new Date(c.date).toLocaleDateString("fr-FR")})
            <button onclick="supprimerConsigne(${i})" style="float:right;">❌</button></div>`
        )
        .join("")
    : "<div>Aucune consigne enregistrée.</div>";
}

function toggleConsigne(i) {
  consignes[i].valide = !consignes[i].valide;
  localStorage.setItem("consignes", JSON.stringify(consignes));
}

function supprimerConsigne(i) {
  if (!confirm("Supprimer cette consigne ?")) return;
  consignes.splice(i, 1);
  localStorage.setItem("consignes", JSON.stringify(consignes));
  afficherConsignes();
}

// --- PERSONNEL --- //
function enregistrerPersonnel() {
  const nom = document.getElementById("nomPersonnel").value;
  const motif = document.getElementById("motifPersonnel").value;
  const commentaire = document.getElementById("commentPersonnel").value;
  const equipe = localStorage.getItem("equipe");
  const now = new Date().toISOString();

  if (!nom.trim()) return alert("Veuillez entrer un nom.");

  personnel.push({ nom, motif, commentaire, equipe, heure: now });
  localStorage.setItem("personnel", JSON.stringify(personnel));
  afficherPersonnel();

  document.getElementById("nomPersonnel").value = "";
  document.getElementById("commentPersonnel").value = "";
}

function afficherPersonnel() {
  const hist = document.getElementById("historiquePersonnel");
  hist.innerHTML = personnel.length
    ? personnel
        .map(
          (p, i) =>
            `<div>${new Date(p.heure).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} | ${p.nom} - ${p.motif} - ${p.commentaire || ""} | Équipe ${p.equipe}
            <button onclick="supprimerPersonnel(${i})" style="float:right;">❌</button></div>`
        )
        .join("")
    : "<div>Aucune donnée.</div>";
}

function supprimerPersonnel(i) {
  if (!confirm("Supprimer cette entrée ?")) return;
  personnel.splice(i, 1);
  localStorage.setItem("personnel", JSON.stringify(personnel));
  afficherPersonnel();
}

// --- GRAPHIQUE ATELIER (comparatif multi-lignes) --- //
function majGraphiqueAtelier() {
  const ctx = document.getElementById("atelierChart");
  if (!ctx) return;

  const datasets = Object.keys(donnees).map(ligne => {
    const hist = donnees[ligne].historique;
    return {
      label: ligne,
      data: hist.map(h => h.quantite),
      borderWidth: 2,
      borderColor: `hsl(${Math.random() * 360},70%,50%)`,
      tension: 0.3,
      fill: false
    };
  });

  new Chart(ctx, {
    type: "line",
    data: {
      labels: Array.from({ length: Math.max(...Object.values(donnees).map(d => d.historique.length)) }, (_, i) => i + 1),
      datasets
    },
    options: {
      plugins: { legend: { position: "bottom" } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

// --- EXPORT EXCEL (multi-onglets) --- //
function exportExcel() {
  const wb = XLSX.utils.book_new();

  // Atelier (quantités)
  Object.keys(donnees).forEach(ligne => {
    const data = donnees[ligne].historique.map(r => ({
      Heure: new Date(r.heure).toLocaleString("fr-FR"),
      Quantité: r.quantite,
      "Quantité Restante": r.restant,
      "Cadence Manuelle": r.cadenceManuelle || "",
      Équipe: r.equipe
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, ligne);
  });

  // Autres onglets
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(arrets), "Arrêts");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(consignes), "Consignes");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(personnel), "Personnel");

  const equipe = localStorage.getItem("equipe") || "NA";
  const date = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  XLSX.writeFile(wb, `Atelier_PPNC_${equipe}_${date}.xlsx`);
}

// --- EXPORT AUTOMATIQUE AU CHANGEMENT D’EQUIPE --- //
function verifierChangementEquipe() {
  const currentEquipe = localStorage.getItem("equipe");
  majDateHeure();
  const newEquipe = localStorage.getItem("equipe");
  if (currentEquipe && newEquipe !== currentEquipe) {
    if (confirm(`Changement d'équipe détecté (${currentEquipe} → ${newEquipe}). Exporter les données ?`)) {
      exportExcel();
    }
  }
}
setInterval(verifierChangementEquipe, 60000);

// --- CALCULATRICE FLOTTANTE --- //
let calcExpression = "";
function toggleCalculator() {
  const calc = document.getElementById("calculator");
  calc.classList.toggle("active");
}
function press(v) {
  calcExpression += v;
  document.getElementById("calcScreen").value = calcExpression;
}
function calculate() {
  try {
    calcExpression = eval(calcExpression).toString();
    document.getElementById("calcScreen").value = calcExpression;
  } catch {
    document.getElementById("calcScreen").value = "Erreur";
    calcExpression = "";
  }
}
function clearCalc() {
  calcExpression = "";
  document.getElementById("calcScreen").value = "";
}

// --- INITIALISATION GLOBALE --- //
window.onload = function() {
  Object.keys(donnees).forEach(ligne => {
    afficherHistorique(ligne);
    majGraphique(ligne);
  });
  afficherArrets();
  afficherConsignes();
  afficherPersonnel();
  majGraphiqueAtelier();
};
