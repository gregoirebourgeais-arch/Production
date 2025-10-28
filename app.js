// === Navigation ===
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'atelier') updateAtelierChart();
}

// === Lignes ===
const lignes = ["Râpé", "T2", "RT", "OMORI", "T1", "Sticks", "Emballage", "Dés", "Filets", "Prédécoupés"];
const ligneButtons = document.getElementById("ligneButtons");
const ligneContent = document.getElementById("ligneContent");

lignes.forEach(ligne => {
  const btn = document.createElement("button");
  btn.textContent = ligne;
  btn.onclick = () => showLigne(ligne);
  ligneButtons.appendChild(btn);
});

function showLigne(nom) {
  ligneContent.innerHTML = `
    <h3>${nom}</h3>
    <label>Heure début :</label><input type="time" id="debut_${nom}">
    <label>Heure fin :</label><input type="time" id="fin_${nom}">
    <label>Quantité produite :</label><input type="number" id="qte_${nom}">
    <label>Quantité restante :</label><input type="number" id="rest_${nom}">
    <div class="estimation" id="estim_${nom}">⏳ Temps restant : -</div>
    <button onclick="saveProd('${nom}')">💾 Enregistrer</button>
    <canvas id="chart_${nom}" height="120"></canvas>
  `;
}

let prodData = JSON.parse(localStorage.getItem("prodData") || "{}");

function saveProd(ligne) {
  const q = +document.getElementById(`qte_${ligne}`).value || 0;
  const r = +document.getElementById(`rest_${ligne}`).value || 0;
  const hDeb = document.getElementById(`debut_${ligne}`).value;
  const hFin = document.getElementById(`fin_${ligne}`).value;

  if (!prodData[ligne]) prodData[ligne] = [];
  const now = new Date().toLocaleTimeString();

  // cadence simple : (Q / durée)
  let cad = 0;
  if (hDeb && hFin) {
    const [hd, md] = hDeb.split(":").map(Number);
    const [hf, mf] = hFin.split(":").map(Number);
    const durée = (hf * 60 + mf) - (hd * 60 + md);
    if (durée > 0) cad = (q / durée) * 60;
  }

  // Estimation du temps restant
  let estim = "-";
  if (cad > 0 && r > 0) {
    const minutesRest = r / cad * 60;
    estim = `${Math.floor(minutesRest)} min restantes`;
  }

  prodData[ligne].push({time: now, q, cad});
  localStorage.setItem("prodData", JSON.stringify(prodData));

  document.getElementById(`estim_${ligne}`).textContent = "⏳ " + estim;
  updateLigneChart(ligne);
}

function updateLigneChart(ligne) {
  const ctx = document.getElementById(`chart_${ligne}`);
  if (!ctx) return;
  const data = prodData[ligne] || [];
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.time),
      datasets: [{
        label: 'Cadence (colis/h)',
        data: data.map(d => d.cad),
        borderColor: '#007acc',
        fill: false,
        tension: 0.2
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
    borderColor: `hsl(${Math.random()*360},70%,55%)`,
    fill: false,
    tension: 0.2
  }));
  new Chart(ctx, {
    type: 'line',
    data: {labels: Array.from({length: 10}, (_, i) => i+1), datasets},
    options: {responsive: true, scales: {y: {beginAtZero: true}}}
  });
}

// === Arrêts ===
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

// === Consignes ===
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

// === Calculatrice ===
const calc = document.getElementById("calculator");
const calcBtn = document.getElementById("floatCalcBtn");
calcBtn.addEventListener("click", toggleCalc);

function toggleCalc() {
  calc.classList.toggle("hidden");
}

// génération des boutons
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
