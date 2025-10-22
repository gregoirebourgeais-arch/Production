// === VARIABLES ===
const lignes = ["Râpé","T2","RT","OMORI","T1","Sticks","Emballage","Dés","Filets","Prédécoupé"];
let dataLignes = JSON.parse(localStorage.getItem("dataLignes")) || [];
let dataArrets = JSON.parse(localStorage.getItem("dataArrets")) || [];
let dataConsignes = JSON.parse(localStorage.getItem("dataConsignes")) || [];
let dataPersonnel = JSON.parse(localStorage.getItem("dataPersonnel")) || [];

// === NAVIGATION ===
function afficherPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(`page-${id}`).classList.add("active");
  if (id === "atelier") majAtelier();
  if (id === "lignes") afficherLignes();
  if (id === "organisation") afficherConsignes();
  if (id === "arrets") afficherArrets();
  if (id === "personnel") afficherPersonnel();
}

// === LIGNES ===
function afficherLignes() {
  const cont = document.getElementById("listeLignes");
  cont.innerHTML = "";
  lignes.forEach(l => {
    cont.innerHTML += `<button class="bouton-ligne" onclick="ouvrirLigne('${l}')">${l}</button>`;
  });
}

function ouvrirLigne(nom) {
  const zone = document.getElementById("zoneLigne");
  zone.innerHTML = `
    <h3>Ligne : ${nom}</h3>
    <label>Heure début :</label><input type="time" id="hDebut">
    <label>Heure fin :</label><input type="time" id="hFin">
    <label>Quantité réalisée :</label><input type="number" id="qRealisee">
    <label>Quantité restante :</label><input type="number" id="qRestante">
    <button onclick="enregistrerLigne('${nom}')">Enregistrer</button>
    <canvas id="graph_${nom}"></canvas>
  `;
}

function enregistrerLigne(nom) {
  const debut = document.getElementById("hDebut").value;
  const fin = document.getElementById("hFin").value;
  const q = parseFloat(document.getElementById("qRealisee").value);
  const rest = parseFloat(document.getElementById("qRestante").value);
  if (!debut || !fin || isNaN(q)) return alert("Champs incomplets !");
  const diff = ((new Date(`2025-10-15T${fin}`) - new Date(`2025-10-15T${debut}`)) / 3600000);
  const cadence = (q / diff).toFixed(2);
  const estimation = new Date(Date.now() + (rest / cadence) * 3600000).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  dataLignes.push({ nom, debut, fin, q, rest, cadence, estimation, date: new Date().toLocaleString() });
  localStorage.setItem("dataLignes", JSON.stringify(dataLignes));
  majAtelier();
  alert(`Enregistré ! Cadence: ${cadence}/h, fin estimée: ${estimation}`);
}

// === ATELIER ===
function majAtelier() {
  const resume = document.getElementById("resumeAtelier");
  resume.innerHTML = "<h3>Résumé des lignes</h3>";
  dataLignes.forEach(e => {
    resume.innerHTML += `<p>${e.nom}: ${e.q} colis (${e.cadence}/h, fin ~ ${e.estimation})</p>`;
  });
  majGraphAtelier();
  majArretsAtelier();
}

function majGraphAtelier() {
  const ctx = document.getElementById("graphAtelier");
  if (!ctx) return;
  const labels = lignes;
  const valeurs = lignes.map(l => {
    const entries = dataLignes.filter(x => x.nom === l);
    if (!entries.length) return 0;
    return entries[entries.length - 1].q;
  });
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: "Quantités réalisées",
        data: valeurs,
        backgroundColor: "#1a73e8"
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

function majArretsAtelier() {
  const div = document.getElementById("listeArretsAtelier");
  div.innerHTML = "<h3>Historique des arrêts</h3>";
  dataArrets.forEach(a => {
    div.innerHTML += `<p>${a.date} - ${a.motif}</p>`;
  });
}

// === ARRETS ===
function ajouterArret() {
  const motif = document.getElementById("motifArret").value;
  if (!motif) return;
  dataArrets.push({ motif, date: new Date().toLocaleString() });
  localStorage.setItem("dataArrets", JSON.stringify(dataArrets));
  document.getElementById("motifArret").value = "";
  afficherArrets();
}
function afficherArrets() {
  const div = document.getElementById("historiqueArrets");
  div.innerHTML = "";
  dataArrets.forEach(a => {
    div.innerHTML += `<p>${a.date} - ${a.motif}</p>`;
  });
}

// === CONSIGNES ===
function enregistrerConsigne() {
  const texte = document.getElementById("consigne").value.trim();
  if (!texte) return;
  dataConsignes.push({ texte, date: new Date().toLocaleString(), realisee: false });
  localStorage.setItem("dataConsignes", JSON.stringify(dataConsignes));
  document.getElementById("consigne").value = "";
  afficherConsignes();
}
function afficherConsignes() {
  const div = document.getElementById("historiqueConsignes");
  div.innerHTML = "";
  dataConsignes.forEach((c, i) => {
    div.innerHTML += `
      <div class="consigne-item ${c.realisee ? 'realisee' : ''}">
        <input type="checkbox" ${c.realisee ? 'checked' : ''} onchange="toggleConsigne(${i})">
        <label>${c.date} — ${c.texte}</label>
      </div>`;
  });
}
function toggleConsigne(i) {
  dataConsignes[i].realisee = !dataConsignes[i].realisee;
  localStorage.setItem("dataConsignes", JSON.stringify(dataConsignes));
  afficherConsignes();
}

// === PERSONNEL ===
function ajouterPersonnel() {
  const nom = document.getElementById("nomPersonnel").value;
  const motif = document.getElementById("motifPersonnel").value;
  const com = document.getElementById("commentairePersonnel").value;
  if (!nom || !motif) return;
  dataPersonnel.push({ nom, motif, com, date: new Date().toLocaleString() });
  localStorage.setItem("dataPersonnel", JSON.stringify(dataPersonnel));
  document.getElementById("nomPersonnel").value = "";
  document.getElementById("motifPersonnel").value = "";
  document.getElementById("commentairePersonnel").value = "";
  afficherPersonnel();
}
function afficherPersonnel() {
  const div = document.getElementById("historiquePersonnel");
  div.innerHTML = "";
  dataPersonnel.forEach(p => {
    div.innerHTML += `<p>${p.date} - ${p.nom}: ${p.motif} (${p.com})</p>`;
  });
}

// === EXPORT EXCEL ===
function exporterExcel() {
  const rows = [["Ligne","Date","Heure Début","Heure Fin","Quantité Réalisée","Quantité Restante","Cadence","Fin estimée"]];
  dataLignes.forEach(e => {
    rows.push([e.nom,e.date,e.debut,e.fin,e.q,e.rest,e.cadence,e.estimation]);
  });
  let csvContent = "data:text/csv;charset=utf-8," + rows.map(r => r.join(";")).join("\n");
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csvContent));
  link.setAttribute("download", "Synthese_Production_Lactalis.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// === INIT ===
window.onload = () => {
  afficherLignes();
  afficherConsignes();
  afficherArrets();
  afficherPersonnel();
  majAtelier();
};
