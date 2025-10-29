// === Données globales ===
const lignes = ["Râpé", "T2", "RT", "OMORI", "T1", "Sticks", "Emballage", "Dés", "Filets", "Prédécoupés"];
let historique = JSON.parse(localStorage.getItem("historique")) || [];
let arrets = JSON.parse(localStorage.getItem("arrets")) || [];
let organisation = JSON.parse(localStorage.getItem("organisation")) || [];
let personnel = JSON.parse(localStorage.getItem("personnel")) || [];

// === Initialisation ===
window.onload = () => {
  majDate();
  majBoutonsLignes();
  afficherHistorique();
  setInterval(majDate, 1000);
};

// === Affichage de la date, heure, semaine et équipe ===
function majDate() {
  const now = new Date();
  const jours = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const semaine = getSemaine(now);
  const quantieme = now.getDate().toString().padStart(2, "0");
  const heure = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const equipe = getEquipe(now);

  document.getElementById("dateDisplay").innerHTML =
    `${jours[now.getDay()]} ${quantieme}/${now.getMonth()+1}/${now.getFullYear()} - ${heure} - S${semaine} - Équipe ${equipe}`;
}

function getSemaine(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}

function getEquipe(date) {
  const heure = date.getHours();
  if (heure >= 5 && heure < 13) return "M";
  if (heure >= 13 && heure < 21) return "AM";
  return "N";
}

// === Navigation ===
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
  document.getElementById(id).classList.add("active");
}

// === Génération des boutons lignes ===
function majBoutonsLignes() {
  const container = document.getElementById("ligneButtons");
  const selectArret = document.getElementById("ligneArret");
  container.innerHTML = "";
  selectArret.innerHTML = "<option value='' disabled selected>Choisir ligne</option>";

  lignes.forEach(ligne => {
    const btn = document.createElement("button");
    btn.textContent = ligne;
    btn.onclick = () => openLigne(ligne);
    container.appendChild(btn);

    const opt = document.createElement("option");
    opt.value = ligne;
    opt.textContent = ligne;
    selectArret.appendChild(opt);
  });
}

// === Ouverture d'une ligne ===
function openLigne(ligne) {
  const cont = document.getElementById("ligneContainer");
  cont.innerHTML = `
    <div class="bloc-ligne">
      <h3>${ligne}</h3>
      <label>Heure début:</label><input type="time" id="debut_${ligne}">
      <label>Heure fin:</label><input type="time" id="fin_${ligne}">
      <label>Quantité produite:</label><input type="number" id="qte_${ligne}" placeholder="Quantité produite">
      <label>Quantité restante:</label><input type="number" id="reste_${ligne}" placeholder="Quantité restante" oninput="majEstimation('${ligne}')">
      <label>Cadence manuelle:</label><input type="number" id="cadence_${ligne}" placeholder="Cadence (colis/h)">
      <p id="estimation_${ligne}" class="estimation"></p>
      <button onclick="enregistrer('${ligne}')">💾 Enregistrer</button>
      <div id="historique_${ligne}" class="historique-ligne"></div>
    </div>
  `;
  chargerHistoriqueLigne(ligne);
}

// === Calcul du temps estimé ===
function majEstimation(ligne) {
  const reste = parseFloat(document.getElementById(`reste_${ligne}`).value);
  const cadence = parseFloat(document.getElementById(`cadence_${ligne}`).value);
  if (reste > 0 && cadence > 0) {
    const tempsHeures = reste / cadence;
    const tempsMinutes = Math.round(tempsHeures * 60);
    document.getElementById(`estimation_${ligne}`).textContent = `⏱ Temps restant estimé : ${tempsMinutes} min`;
  } else {
    document.getElementById(`estimation_${ligne}`).textContent = "";
  }
}

// === Enregistrement production ===
function enregistrer(ligne) {
  const debut = document.getElementById(`debut_${ligne}`).value;
  const fin = document.getElementById(`fin_${ligne}`).value;
  const qte = document.getElementById(`qte_${ligne}`).value;
  const reste = document.getElementById(`reste_${ligne}`).value;
  const cadence = document.getElementById(`cadence_${ligne}`).value;
  const estimation = document.getElementById(`estimation_${ligne}`).textContent;
  const equipe = getEquipe(new Date());

  if (!qte && !reste) return alert("Veuillez saisir au moins une quantité.");

  historique.push({ ligne, debut, fin, qte, reste, cadence, estimation, equipe, date: new Date().toLocaleString() });
  localStorage.setItem("historique", JSON.stringify(historique));

  chargerHistoriqueLigne(ligne);
  afficherHistorique();
  resetLigne(ligne);
}

// === Effacement des champs après enregistrement ===
function resetLigne(ligne) {
  ["debut", "fin", "qte", "reste", "cadence"].forEach(id => {
    const el = document.getElementById(`${id}_${ligne}`);
    if (el) el.value = "";
  });
  document.getElementById(`estimation_${ligne}`).textContent = "";
}

// === Historique des lignes ===
function chargerHistoriqueLigne(ligne) {
  const cont = document.getElementById(`historique_${ligne}`);
  const items = historique.filter(h => h.ligne === ligne);
  cont.innerHTML = items.map(i => `
    <div class="histo-item">${i.date} | ${i.ligne} | Qté: ${i.qte || "-"} | Reste: ${i.reste || "-"} | ${i.estimation || ""} | Équipe ${i.equipe}</div>
  `).join("") || "<p>Aucun enregistrement</p>";
}

// === Formulaire Arrêts ===
document.getElementById("formArret").addEventListener("submit", e => {
  e.preventDefault();
  const ligne = document.getElementById("ligneArret").value;
  const type = document.getElementById("typeArret").value;
  const duree = document.getElementById("dureeArret").value;
  const comm = document.getElementById("commentaireArret").value;
  const equipe = getEquipe(new Date());
  arrets.push({ ligne, type, duree, comm, equipe, date: new Date().toLocaleString() });
  localStorage.setItem("arrets", JSON.stringify(arrets));
  afficherHistorique();
  e.target.reset();
});

// === Formulaire Organisation ===
document.getElementById("formOrganisation").addEventListener("submit", e => {
  e.preventDefault();
  const texte = document.getElementById("consigneTexte").value;
  organisation.push({ texte, valide: false, date: new Date().toLocaleString() });
  localStorage.setItem("organisation", JSON.stringify(organisation));
  afficherHistorique();
  e.target.reset();
});

// === Validation consigne ===
function validerConsigne(i) {
  organisation[i].valide = true;
  localStorage.setItem("organisation", JSON.stringify(organisation));
  afficherHistorique();
}

// === Formulaire Personnel ===
document.getElementById("formPersonnel").addEventListener("submit", e => {
  e.preventDefault();
  const nom = document.getElementById("nomPersonnel").value;
  const motif = document.getElementById("motifPersonnel").value;
  const comm = document.getElementById("commentairePersonnel").value;
  const equipe = getEquipe(new Date());
  personnel.push({ nom, motif, comm, equipe, date: new Date().toLocaleString() });
  localStorage.setItem("personnel", JSON.stringify(personnel));
  afficherHistorique();
  e.target.reset();
});

// === Affichage Historique global ===
function afficherHistorique() {
  // Arrêts
  document.getElementById("historiqueArrets").innerHTML =
    arrets.map(a => `<div class="histo-item">${a.date} | ${a.ligne} | ${a.type} - ${a.duree} min | ${a.comm}</div>`).join("") || "<p>Aucun arrêt</p>";

  // Organisation
  document.getElementById("historiqueOrganisation").innerHTML =
    organisation.map((o, i) => `
      <div class="histo-item">${o.date} | ${o.texte} ${o.valide ? "✅" : `<button onclick="validerConsigne(${i})">Valider</button>`}</div>
    `).join("") || "<p>Aucune consigne</p>";

  // Personnel
  document.getElementById("historiquePersonnel").innerHTML =
    personnel.map(p => `<div class="histo-item">${p.date} | ${p.nom} | ${p.motif} | ${p.comm} | Équipe ${p.equipe}</div>`).join("") || "<p>Aucun enregistrement</p>";

  // Atelier
  document.getElementById("historiqueAtelier").innerHTML =
    historique.slice(-10).map(h => `<div class="histo-item">${h.date} | ${h.ligne} | Qté: ${h.qte || "-"} | ${h.estimation}</div>`).join("") || "<p>Aucun enregistrement</p>";

  majGraphiques();
}

// === Graphiques Atelier ===
function majGraphiques() {
  const ctx = document.getElementById("atelierChart");
  if (!ctx) return;

  const labels = [...new Set(historique.map(h => h.date.split(",")[0]))];
  const datasets = lignes.map(ligne => {
    const data = labels.map(lbl => {
      const items = historique.filter(h => h.ligne === ligne && h.date.includes(lbl));
      if (items.length === 0) return null;
      const moy = items.reduce((acc, v) => acc + (parseFloat(v.cadence)||0), 0) / items.length;
      return Math.round(moy);
    });
    return {
      label: ligne,
      data: data,
      fill: false,
      borderColor: `hsl(${Math.random()*360},70%,50%)`,
      tension: 0.3
    };
  });

  new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } }
  });
}
