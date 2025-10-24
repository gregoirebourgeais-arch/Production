/* ===============================
   SYNTHÈSE ATELIER PPNC
   Version complète et stable
=============================== */

// ======= VARIABLES GLOBALES =======
const LIGNES = [
  "Râpé",
  "T2",
  "RT",
  "Omori",
  "T1",
  "Sticks",
  "Emballage",
  "Dés",
  "Filets",
  "Prédécoupés",
];
const STORAGE_KEY = "SynthesePPNC_Data";
let data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
LIGNES.forEach((l) => {
  if (!data[l]) data[l] = { production: [], arrets: [], consignes: [], personnel: [] };
});

// ============ OUTILS =============
const qs = (sel) => document.querySelector(sel);
const ce = (tag) => document.createElement(tag);
const saveData = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
const now = () => new Date().toLocaleString("fr-FR");

// ============ CALCUL ÉQUIPE =============
function computeTeamNow() {
  const h = new Date().getHours();
  let team = "M";
  if (h >= 13 && h < 21) team = "AM";
  else if (h >= 21 || h < 5) team = "N";
  qs("#team-label").textContent = `Équipe ${team}`;
}

// ============ CHANGEMENT DE PAGE ============
function showSection(id) {
  document.querySelectorAll(".section").forEach((s) => s.classList.add("hidden"));
  qs(`#section-${id}`).classList.remove("hidden");
}

// ============ INIT NAVIGATION ============
function initNav() {
  qs("#nav-atelier").onclick = () => showSection("atelier");
  qs("#nav-arrets").onclick = () => showSection("arrets");
  qs("#nav-organisation").onclick = () => showSection("organisation");
  qs("#nav-personnel").onclick = () => showSection("personnel");
}

// ============ PAGE PRODUCTION ============
function mountProdForm() {
  const startSel = qs("#prod-start");
  const endSel = qs("#prod-end");
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 5) {
      const opt1 = ce("option");
      const opt2 = ce("option");
      opt1.value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      opt2.value = opt1.value;
      opt1.textContent = opt2.textContent = opt1.value;
      startSel.append(opt1);
      endSel.append(opt2);
    }
  }

  qs("#prod-rest").addEventListener("input", updateEstimation);
  qs("#prod-manual").addEventListener("input", updateEstimation);
  qs("#prod-save").onclick = saveProd;
  qs("#prod-reset").onclick = resetProd;
}

function updateEstimation() {
  const reste = parseFloat(qs("#prod-rest").value || 0);
  let cadence = parseFloat(qs("#prod-manual").value || 0);
  if (!cadence) cadence = parseFloat(qs("#prod-cadence").value || 0);
  if (cadence > 0 && reste > 0) {
    const minutesRest = (reste / cadence) * 60;
    const finEstimee = new Date(Date.now() + minutesRest * 60000);
    qs("#prod-finish").value = finEstimee.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } else {
    qs("#prod-finish").value = "";
  }
}

function saveProd() {
  const ligne = qs("#current-line").textContent;
  const start = qs("#prod-start").value;
  const end = qs("#prod-end").value;
  const qty = parseFloat(qs("#prod-qty").value || 0);
  const reste = parseFloat(qs("#prod-rest").value || 0);
  const manuelle = parseFloat(qs("#prod-manual").value || 0);

  if (!start || !end || !qty) {
    alert("Merci de remplir au moins les heures et la quantité !");
    return;
  }

  const diffHeures =
    (new Date(`1970-01-01T${end}:00`) - new Date(`1970-01-01T${start}:00`)) / 3600000;
  const cadence = diffHeures > 0 ? qty / diffHeures : 0;
  qs("#prod-cadence").value = cadence.toFixed(2);
  updateEstimation();

  data[ligne].production.push({
    date: now(),
    start,
    end,
    qty,
    reste,
    cadence: manuelle || cadence,
  });
  saveData();
  renderProdHistory();
  clearProdFields();
}

function clearProdFields() {
  ["#prod-start", "#prod-end", "#prod-qty", "#prod-rest", "#prod-manual", "#prod-finish"].forEach(
    (sel) => (qs(sel).value = "")
  );
}

function resetProd() {
  const ligne = qs("#current-line").textContent;
  if (confirm(`Remettre à zéro la ligne ${ligne} ?`)) {
    data[ligne].production = [];
    saveData();
    renderProdHistory();
  }
}

function renderProdHistory() {
  const ligne = qs("#current-line").textContent;
  const container = qs("#prod-history");
  container.innerHTML = "";
  data[ligne].production.forEach((p, i) => {
    const div = ce("div");
    div.textContent = `${p.date} | ${p.start}-${p.end} | ${p.qty} colis | Cad: ${p.cadence.toFixed(
      1
    )}`;
    container.appendChild(div);
  });
  renderLineChart(ligne);
}

// ============ GRAPHIQUES ============
function renderLineChart(ligne) {
  const container = qs("#prod-history");
  const canvas = ce("canvas");
  canvas.id = `chart-${ligne}`;
  container.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const prod = data[ligne].production;
  if (!prod.length) return;

  const labels = prod.map((p) => p.date.split(" ")[1]);
  const valeurs = prod.map((p) => p.cadence);

  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: `Cadence ${ligne}`,
          data: valeurs,
          borderColor: "#007bff",
          fill: false,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
      },
    },
  });
}

// ============ ARRÊTS ============
qs("#arret-save").onclick = () => {
  const ligne = qs("#arret-ligne").value;
  const type = qs("#arret-type").value;
  const duree = parseFloat(qs("#arret-duree").value || 0);
  const comment = qs("#arret-comment").value;

  if (!ligne || !type || !duree) {
    alert("Merci de renseigner ligne, type et durée !");
    return;
  }

  data[ligne].arrets.push({ date: now(), type, duree, comment });
  saveData();
  renderArrets();
  ["#arret-type", "#arret-duree", "#arret-comment"].forEach((s) => (qs(s).value = ""));
};

function renderArrets() {
  const container = qs("#arret-list");
  container.innerHTML = "";
  LIGNES.forEach((l) => {
    const arr = data[l].arrets;
    if (!arr.length) return;
    const bloc = ce("div");
    bloc.innerHTML = `<strong>${l}</strong><br>${arr
      .map((a) => `${a.date} — ${a.type} (${a.duree} min) ${a.comment || ""}`)
      .join("<br>")}`;
    container.appendChild(bloc);
  });
}

// ============ ORGANISATION ============
qs("#org-save").onclick = () => {
  const ligne = qs("#org-ligne").value;
  const cons = qs("#org-consigne").value;
  const done = qs("#org-done").checked;
  if (!cons) return alert("Merci de remplir la consigne !");
  data[ligne].consignes.push({ date: now(), cons, done });
  saveData();
  renderOrg();
  qs("#org-consigne").value = "";
  qs("#org-done").checked = false;
};

function renderOrg() {
  const container = qs("#org-list");
  container.innerHTML = "";
  LIGNES.forEach((l) => {
    const cons = data[l].consignes;
    if (!cons.length) return;
    const bloc = ce("div");
    bloc.innerHTML = `<strong>${l}</strong><br>${cons
      .map((c) => `${c.date} — ${c.cons} ${c.done ? "✅" : "❌"}`)
      .join("<br>")}`;
    container.appendChild(bloc);
  });
}

// ============ PERSONNEL ============
qs("#perso-save").onclick = () => {
  const nom = qs("#perso-nom").value;
  const motif = qs("#perso-motif").value;
  const comment = qs("#perso-comment").value;
  if (!nom || !motif) return alert("Merci de remplir Nom et Motif !");
  data["Râpé"].personnel.push({ date: now(), nom, motif, comment });
  saveData();
  renderPerso();
  ["#perso-nom", "#perso-motif", "#perso-comment"].forEach((s) => (qs(s).value = ""));
};

function renderPerso() {
  const container = qs("#perso-list");
  container.innerHTML = data["Râpé"].personnel
    .map((p) => `${p.date} — ${p.nom} (${p.motif}) ${p.comment || ""}`)
    .join("<br>");
}

// ============ EXPORT EXCEL ============
qs("#prod-reset").insertAdjacentHTML(
  "afterend",
  '<button id="export-global" class="btn secondary">📊 Export Excel</button>'
);
document.body.addEventListener("click", (e) => {
  if (e.target.id === "export-global") exportExcel();
});

function exportExcel() {
  const wb = XLSX.utils.book_new();
  const all = [];
  LIGNES.forEach((l) => {
    data[l].production.forEach((p) =>
      all.push({ Ligne: l, Date: p.date, Quantité: p.qty, Cadence: p.cadence })
    );
  });
  const ws = XLSX.utils.json_to_sheet(all);
  XLSX.utils.book_append_sheet(wb, ws, "Production");
  XLSX.writeFile(wb, `Synthese_PPNC_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ============ CHARGEMENT / INITIALISATION ============
function initAll() {
  initNav();
  computeTeamNow();
  mountProdForm();
  renderProdHistory();
  renderArrets();
  renderOrg();
  renderPerso();
  setInterval(computeTeamNow, 60000);
}

document.addEventListener("DOMContentLoaded", initAll);
