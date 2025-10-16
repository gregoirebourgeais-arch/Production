// === GESTION DES PAGES ===
function ouvrirPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${id}`).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// === CALCULATRICE ===
let calcExpression = "";
function toggleCalculatrice() {
  document.getElementById("calculatrice").classList.toggle("active");
}
function ajouterCalc(val) {
  calcExpression += val;
  document.getElementById("calc-affichage").value = calcExpression;
}
function calculerCalc() {
  try {
    calcExpression = eval(calcExpression).toString();
    document.getElementById("calc-affichage").value = calcExpression;
  } catch {
    document.getElementById("calc-affichage").value = "Erreur";
  }
}
function effacerCalc() {
  calcExpression = "";
  document.getElementById("calc-affichage").value = "";
}

// === CALCUL CADENCE + FIN ESTIMEE ===
function calculerEstimation(ligne) {
  const quantite = parseFloat(document.getElementById(`quantite-${ligne}`).value) || 0;
  const restante = parseFloat(document.getElementById(`restante-${ligne}`).value) || 0;
  const debut = document.getElementById(`debut-${ligne}`).value;
  const fin = document.getElementById(`fin-${ligne}`).value;

  if (!debut || !fin || quantite <= 0) return;

  const d1 = new Date(`1970-01-01T${debut}:00`);
  const d2 = new Date(`1970-01-01T${fin}:00`);
  let diffH = (d2 - d1) / 3600000;
  if (diffH <= 0) diffH += 24; // cas passage minuit

  const cadence = (quantite / diffH).toFixed(2);
  const estFin = (restante / cadence).toFixed(2);
  const heureFin = new Date(Date.now() + estFin * 3600000);
  const heureStr = heureFin.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  document.getElementById(`resultat-${ligne}`).innerText = `Cadence : ${cadence} colis/h • Fin estimée : ${heureStr}`;
  return { cadence, heureStr };
}

// === ENREGISTREMENT LIGNE ===
function enregistrerLigne(ligne) {
  const debut = document.getElementById(`debut-${ligne}`).value;
  const fin = document.getElementById(`fin-${ligne}`).value;
  const quantite = document.getElementById(`quantite-${ligne}`).value;
  const restante = document.getElementById(`restante-${ligne}`).value;
  const res = calculerEstimation(ligne);

  if (!debut || !fin || !quantite) return alert("Complète les champs avant d’enregistrer.");

  const historique = JSON.parse(localStorage.getItem(`historique-${ligne}`) || "[]");
  historique.push({
    debut, fin, quantite, cadence: res.cadence, estFin: res.heureStr, date: new Date().toLocaleString()
  });
  localStorage.setItem(`historique-${ligne}`, JSON.stringify(historique));
  majHistorique(ligne);

  document.getElementById(`quantite-${ligne}`).value = "";
  document.getElementById(`restante-${ligne}`).value = "";
}

// === MAJ HISTORIQUE LIGNE ===
function majHistorique(ligne) {
  const histo = JSON.parse(localStorage.getItem(`historique-${ligne}`) || "[]");
  const table = document.getElementById(`historique-${ligne}`);
  table.innerHTML = "<tr><th>Début</th><th>Fin</th><th>Quantité</th><th>Cadence</th><th>Est. Fin</th><th>Suppr</th></tr>";
  histo.forEach((h, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${h.debut}</td><td>${h.fin}</td><td>${h.quantite}</td>
      <td>${h.cadence}</td><td>${h.estFin}</td>
      <td><button onclick="supprimerLigne('${ligne}', ${i})">❌</button></td>`;
    table.appendChild(tr);
  });
}

// === SUPPRESSION D'UNE LIGNE DE L'HISTORIQUE ===
function supprimerLigne(ligne, index) {
  const histo = JSON.parse(localStorage.getItem(`historique-${ligne}`) || "[]");
  histo.splice(index, 1);
  localStorage.setItem(`historique-${ligne}`, JSON.stringify(histo));
  majHistorique(ligne);
}

// === ARRÊTS ===
function enregistrerArret() {
  const ligne = document.getElementById("ligneArret").value;
  const temps = document.getElementById("tempsArret").value;
  const cause = document.getElementById("causeArret").value;
  if (!ligne || !temps || !cause) return alert("Remplis tous les champs !");
  const historique = JSON.parse(localStorage.getItem("arrets") || "[]");
  historique.push({ ligne, temps, cause, date: new Date().toLocaleString() });
  localStorage.setItem("arrets", JSON.stringify(historique));
  majArrets();
  document.getElementById("tempsArret").value = "";
  document.getElementById("causeArret").value = "";
}

function majArrets() {
  const histo = JSON.parse(localStorage.getItem("arrets") || "[]");
  const table = document.getElementById("historiqueArrets");
  table.innerHTML = "<tr><th>Ligne</th><th>Durée (min)</th><th>Cause</th><th>Date</th></tr>";
  histo.forEach(a => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${a.ligne}</td><td>${a.temps}</td><td>${a.cause}</td><td>${a.date}</td>`;
    table.appendChild(tr);
  });
}

// === ORGANISATION ===
function enregistrerConsigne() {
  const texte = document.getElementById("consigne").value;
  if (!texte) return;
  const histo = JSON.parse(localStorage.getItem("consignes") || "[]");
  histo.push({ texte, date: new Date().toLocaleString() });
  localStorage.setItem("consignes", JSON.stringify(histo));
  majConsignes();
  document.getElementById("consigne").value = "";
}

function majConsignes() {
  const histo = JSON.parse(localStorage.getItem("consignes") || "[]");
  const div = document.getElementById("historiqueConsignes");
  div.innerHTML = histo.map(h => `<p>🕓 ${h.date} - ${h.texte}</p>`).join("");
}

// === PERSONNEL ===
function enregistrerPersonnel() {
  const nom = document.getElementById("nomPersonnel").value;
  const motif = document.getElementById("motifPersonnel").value;
  const com = document.getElementById("commentairePersonnel").value;
  if (!nom || !motif) return alert("Remplis le nom et le motif.");
  const histo = JSON.parse(localStorage.getItem("personnel") || "[]");
  histo.push({ nom, motif, com, date: new Date().toLocaleString() });
  localStorage.setItem("personnel", JSON.stringify(histo));
  majPersonnel();
  document.getElementById("nomPersonnel").value = "";
  document.getElementById("motifPersonnel").value = "";
  document.getElementById("commentairePersonnel").value = "";
}

function majPersonnel() {
  const histo = JSON.parse(localStorage.getItem("personnel") || "[]");
  const div = document.getElementById("historiquePersonnel");
  div.innerHTML = histo.map(h => `<p>👤 ${h.nom} - ${h.motif} - ${h.com} (${h.date})</p>`).join("");
}

// === EXPORT EXCEL GLOBAL ===
function exporterGlobal() {
  const wb = XLSX.utils.book_new();
  const lignes = ["rapé","t2","rt","omori","t1","sticks","emballage","des","filets","predecoupes"];
  lignes.forEach(ligne => {
    const histo = JSON.parse(localStorage.getItem(`historique-${ligne}`) || "[]");
    if (histo.length > 0) {
      const ws = XLSX.utils.json_to_sheet(histo);
      XLSX.utils.book_append_sheet(wb, ws, ligne);
    }
  });
  const arrets = JSON.parse(localStorage.getItem("arrets") || "[]");
  const org = JSON.parse(localStorage.getItem("consignes") || "[]");
  const pers = JSON.parse(localStorage.getItem("personnel") || "[]");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(arrets), "Arrêts");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(org), "Organisation");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pers), "Personnel");

  XLSX.writeFile(wb, `Synthese_Atelier_${new Date().toLocaleDateString()}.xlsx`);
}

// === INITIALISATION ===
window.onload = () => {
  ["rapé","t2","rt","omori","t1","sticks","emballage","des","filets","predecoupes"].forEach(majHistorique);
  majArrets();
  majConsignes();
  majPersonnel();
  ouvrirPage('atelier');
};
