// === NAVIGATION ===
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  if (id === "atelier") updateAtelierChart();
}

// === DATE ET HEURE ===
function updateDateHeure() {
  const now = new Date();
  const options = { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" };
  document.getElementById("dateHeure").textContent = now.toLocaleString("fr-FR", options);
}
setInterval(updateDateHeure, 60000);
updateDateHeure();

// === LIGNES DE PRODUCTION ===
const lignes = ["Râpé", "T2", "RT", "OMORI", "T1", "Sticks", "Emballage", "Dés", "Filets", "Prédécoupés"];
const ligneButtons = document.getElementById("ligneButtons");
const ligneContent = document.getElementById("ligneContent");
let prodData = JSON.parse(localStorage.getItem("prodData") || "{}");
let currentLigne = null;

lignes.forEach(ligne => {
  const btn = document.createElement("button");
  btn.textContent = ligne;
  btn.onclick = () => showLigne(ligne);
  ligneButtons.appendChild(btn);
});

function showLigne(nom) {
  currentLigne = nom;
  const saved = JSON.parse(localStorage.getItem(`temp_${nom}`) || "{}");
  ligneContent.innerHTML = `
    <h3>${nom}</h3>
    <label>Heure début :</label><input type="time" id="debut_${nom}" value="${saved.debut || ""}">
    <label>Heure fin :</label><input type="time" id="fin_${nom}" value="${saved.fin || ""}">
    <label>Quantité produite :</label><input type="number" id="qte_${nom}" value="${saved.qte || ""}">
    <label>Quantité restante :</label><input type="number" id="rest_${nom}" value="${saved.rest || ""}">
    <div class="estimation" id="estim_${nom}">⏳ Temps restant : ${saved.estim || "-"}</div>
    <button onclick="saveProd('${nom}')">💾 Enregistrer</button>
    <canvas id="chart_${nom}" height="120"></canvas>
  `;

  // Mise à jour instantanée de l'estimation
  document.getElementById(`rest_${nom}`).addEventListener("input", () => estimateTime(nom));

  updateLigneChart(nom);
}

function estimateTime(ligne) {
  const q = +document.getElementById(`qte_${ligne}`).value || 0;
  const r = +document.getElementById(`rest_${ligne}`).value || 0;
  const hDeb = document.getElementById(`debut_${ligne}`).value;
  const hFin = document.getElementById(`fin_${ligne}`).value;

  let cad = 0;
  if (hDeb && hFin) {
    const [hd, md] = hDeb.split(":").map(Number);
    const [hf, mf] = hFin.split(":").map(Number);
    let durée = (hf * 60 + mf) - (hd * 60 + md);
    if (durée <= 0) durée += 24 * 60;
    cad = (q / durée) * 60;
  }

  let estim = "-";
  if (cad > 0 && r > 0) {
    const minutesRest = r / cad * 60;
    const heures = Math.floor(minutesRest / 60);
    const minutes = Math.floor(minutesRest % 60);
    estim = `${heures}h ${minutes}min restantes`;
  }

  document.getElementById(`estim_${ligne}`).textContent = "⏳ " + estim;

  localStorage.setItem(`temp_${ligne}`, JSON.stringify({
    debut: hDeb, fin: hFin, qte: q, rest: r, estim
  }));
}

function saveProd(ligne) {
  const q = +document.getElementById(`qte_${ligne}`).value || 0;
  const r = +document.getElementById(`rest_${ligne}`).value || 0;
  const hDeb = document.getElementById(`debut_${ligne}`).value;
  const hFin = document.getElementById(`fin_${ligne}`).value;
  const est = document.getElementById(`estim_${ligne}`).textContent;

  if (!prodData[ligne]) prodData[ligne] = [];

  let cad = 0;
  if (hDeb && hFin) {
    const [hd, md] = hDeb.split(":").map(Number);
    const [hf, mf] = hFin.split(":").map(Number);
    let durée = (hf * 60 + mf) - (hd * 60 + md);
    if (durée <= 0) durée += 24 * 60;
    cad = (q / durée) * 60;
  }

  prodData[ligne].push({
    date: new Date().toLocaleString(),
    q, r, hDeb, hFin, cad, est
  });
  localStorage.setItem("prodData", JSON.stringify(prodData));
  localStorage.removeItem(`temp_${ligne}`);

  document.getElementById(`qte_${ligne}`).value = "";
  document.getElementById(`rest_${ligne}`).value = "";
  document.getElementById(`estim_${ligne}`).textContent = "⏳ Temps restant : -";
  updateLigneChart(ligne);
}

function updateLigneChart(ligne) {
  const ctx = document.getElementById(`chart_${ligne}`);
  if (!ctx) return;
  const data = prodData[ligne] || [];
  new Chart(ctx, {
    type: "line",
    data: {
      labels: data.map(d => d.date),
      datasets: [{
        label: "Cadence (colis/h)",
        data: data.map(d => d.cad),
        borderColor: "#007acc",
        fill: false,
        tension: 0.25
      }]
    },
    options: {responsive: true, scales: {y: {beginAtZero: true}}}
  });
}

function updateAtelierChart() {
  const ctx = document.getElementById("atelierChart");
  const datasets = lignes.map(ligne => ({
    label: ligne,
    data: (prodData[ligne] || []).map(d => d.cad),
    borderColor: `hsl(${Math.random() * 360},70%,55%)`,
    fill: false,
    tension: 0.25
  }));
  new Chart(ctx, {
    type: "line",
    data: {labels: Array.from({length: 10}, (_, i) => i + 1), datasets},
    options: {responsive: true, scales: {y: {beginAtZero: true}}}
  });
}

// === ARRÊTS ===
function saveArret() {
  const ligne = document.getElementById("arretLigne").value;
  const zone = document.getElementById("arretZone").value;
  const duree = document.getElementById("arretDuree").value;
  const comm = document.getElementById("arretCommentaire").value;
  const table = document.querySelector("#arretsTable tbody");
  const tr = document.createElement("tr");
  tr.innerHTML = `<td>${ligne}</td><td>${zone}</td><td>${duree}</td><td>${comm}</td>`;
  table.appendChild(tr);
  document.getElementById("arretForm").reset();
}

// === CONSIGNES ===
function saveConsigne() {
  const text = document.getElementById("newConsigne").value;
  const etat = document.getElementById("consigneRealisee").checked;
  const date = new Date().toLocaleString();
  const table = document.querySelector("#consignesTable tbody");
  const tr = document.createElement("tr");
  tr.innerHTML = `<td>${date}</td><td>${text}</td><td>${etat ? "✅" : "🕓"}</td>`;
  table.appendChild(tr);
  document.getElementById("consigneForm").reset();
}

// === PERSONNEL ===
function savePersonnel() {
  const nom = document.getElementById("persoNom").value;
  const motif = document.getElementById("persoMotif").value;
  const comm = document.getElementById("persoCommentaire").value;
  const date = new Date().toLocaleString();
  const tr = document.createElement("tr");
  tr.innerHTML = `<td>${date}</td><td>${nom}</td><td>${motif}</td><td>${comm}</td>`;
  document.querySelector("#persoTable tbody").appendChild(tr);
  document.getElementById("persoForm").reset();
}

// === EXPORT EXCEL ===
function exportExcel() {
  const wb = XLSX.utils.book_new();

  const allData = [];
  lignes.forEach(l => (prodData[l] || []).forEach(e => {
    allData.push({Ligne: l, Date: e.date, "Quantité": e.q, "Reste": e.r, "Cadence": e.cad.toFixed(1)});
  }));

  const ws = XLSX.utils.json_to_sheet(allData);
  XLSX.utils.book_append_sheet(wb, ws, "Production");

  const arrets = Array.from(document.querySelectorAll("#arretsTable tbody tr")).map(r => ({
    Ligne: r.children[0].innerText, Zone: r.children[1].innerText,
    Durée: r.children[2].innerText, Commentaire: r.children[3].innerText
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(arrets), "Arrêts");

  const consignes = Array.from(document.querySelectorAll("#consignesTable tbody tr")).map(r => ({
    Date: r.children[0].innerText, Consigne: r.children[1].innerText, Etat: r.children[2].innerText
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(consignes), "Consignes");

  const perso = Array.from(document.querySelectorAll("#persoTable tbody tr")).map(r => ({
    Date: r.children[0].innerText, Nom: r.children[1].innerText, Motif: r.children[2].innerText, Commentaire: r.children[3].innerText
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(perso), "Personnel");

  XLSX.writeFile(wb, `Atelier_PPNC_${new Date().toLocaleDateString("fr-FR").replace(/\//g, "-")}.xlsx`);
}

// === CALCULATRICE ===
const calc = document.getElementById("calculator");
const calcBtn = document.getElementById("floatCalcBtn");
calcBtn.addEventListener("click", toggleCalc);
function toggleCalc() { calc.classList.toggle("hidden"); }

const buttons = ["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+"];
const container = document.getElementById("calcButtons");
const display = document.getElementById("calcDisplay");
buttons.forEach(b => {
  const btn = document.createElement("button");
  btn.textContent = b;
  btn.onclick = () => {
    if (b === "=") display.value = eval(display.value || "0");
    else display.value += b;
  };
  container.appendChild(btn);
});

// === Déplacement calculatrice ===
let isDragging = false, offsetX, offsetY;
calcBtn.addEventListener("touchstart", e => {
  isDragging = true;
  const touch = e.touches[0];
  offsetX = touch.clientX - calcBtn.getBoundingClientRect().left;
  offsetY = touch.clientY - calcBtn.getBoundingClientRect().top;
});
document.addEventListener("touchmove", e => {
  if (!isDragging) return;
  const touch = e.touches[0];
  calcBtn.style.left = `${touch.clientX - offsetX}px`;
  calcBtn.style.top = `${touch.clientY - offsetY}px`;
});
document.addEventListener("touchend", () => isDragging = false);
