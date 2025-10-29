// === INITIALISATION ===
document.addEventListener("DOMContentLoaded", () => {
  const pages = document.querySelectorAll(".page");
  const buttons = document.querySelectorAll("nav.menu button");

  // Navigation entre pages
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      pages.forEach(p => p.classList.remove("active"));
      document.getElementById(target).classList.add("active");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  // Horloge, date, semaine
  const datetime = document.getElementById("datetime");
  setInterval(() => {
    const now = new Date();
    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    const week = getWeekNumber(now);
    const team = getTeam(now);
    datetime.textContent = `${now.toLocaleDateString("fr-FR", options)} — S${week} — ${team} — ${now.toLocaleTimeString("fr-FR")}`;
  }, 1000);

  function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  function getTeam(now) {
    const h = now.getHours();
    if (h >= 5 && h < 13) return "Équipe M";
    if (h >= 13 && h < 21) return "Équipe AM";
    return "Équipe N";
  }

  // === GESTION DES FORMULAIRES DE LIGNES ===
  const lignes = document.querySelectorAll(".ligne-form");
  lignes.forEach(form => {
    const section = form.closest("section");
    const quantite = form.querySelector(".quantite");
    const reste = form.querySelector(".reste");
    const start = form.querySelector(".start-time");
    const end = form.querySelector(".end-time");
    const btnSave = form.querySelector(".enregistrer");
    const histoDiv = section.querySelector(".historique");
    const cadenceTxt = section.querySelector(".cadence");
    const finTxt = section.querySelector(".fin");
    const chartCanvas = section.querySelector(".ligneChart");

    let historique = JSON.parse(localStorage.getItem(section.id + "_data")) || [];

    function updateHistorique() {
      histoDiv.innerHTML = "";
      historique.forEach(entry => {
        const div = document.createElement("div");
        div.textContent = `Début: ${entry.debut} | Fin: ${entry.fin} | Qté: ${entry.qte} | Cadence: ${entry.cadence} | Fin estimée: ${entry.finEst}`;
        histoDiv.appendChild(div);
      });
      localStorage.setItem(section.id + "_data", JSON.stringify(historique));
    }

    function calculerCadenceEtFin() {
      const startTime = start.value;
      const endTime = end.value;
      const qte = parseFloat(quantite.value) || 0;
      const resteQte = parseFloat(reste.value) || 0;
      if (!startTime || !endTime || qte === 0) return;

      const debut = new Date(`1970-01-01T${startTime}:00`);
      const fin = new Date(`1970-01-01T${endTime}:00`);
      let diffH = (fin - debut) / 3600000;
      if (diffH <= 0) diffH += 24;
      const cadence = (qte / diffH).toFixed(1);
      cadenceTxt.textContent = cadence;

      // Fin estimée
      if (resteQte > 0) {
        const heuresRestantes = (resteQte / cadence).toFixed(2);
        const dateFin = new Date();
        dateFin.setHours(dateFin.getHours() + parseFloat(heuresRestantes));
        const finEstimee = dateFin.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        finTxt.textContent = finEstimee;
      }
      return cadence;
    }

    reste.addEventListener("input", calculerCadenceEtFin);

    btnSave.addEventListener("click", () => {
      const cadence = calculerCadenceEtFin();
      const data = {
        debut: start.value,
        fin: end.value,
        qte: quantite.value,
        reste: reste.value,
        cadence: cadence,
        finEst: finTxt.textContent,
        date: new Date().toLocaleString("fr-FR")
      };
      historique.push(data);
      updateHistorique();
      quantite.value = "";
      reste.value = "";
      start.value = "";
      end.value = "";
      cadenceTxt.textContent = "0";
      finTxt.textContent = "--:--";
      drawChart();
    });

    updateHistorique();

    // === GRAPHIQUE DE LIGNE ===
    function drawChart() {
      if (!chartCanvas) return;
      const labels = historique.map(e => e.date);
      const data = historique.map(e => parseFloat(e.cadence) || 0);
      new Chart(chartCanvas, {
        type: "line",
        data: {
          labels,
          datasets: [{
            label: "Cadence",
            data,
            borderColor: "#007bff",
            fill: false,
            tension: 0.3
          }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
      });
    }

    drawChart();
  });

  // === CONSIGNES ===
  const listeConsignes = document.getElementById("listeConsignes");
  const ajouterConsigne = document.getElementById("ajouterConsigne");
  const consigneTexte = document.getElementById("consigneTexte");

  let consignes = JSON.parse(localStorage.getItem("consignes")) || [];
  function renderConsignes() {
    listeConsignes.innerHTML = "";
    consignes.forEach((c, i) => {
      const li = document.createElement("li");
      li.textContent = c.text;
      const btn = document.createElement("button");
      btn.textContent = "✔";
      btn.onclick = () => {
        consignes[i].done = !consignes[i].done;
        li.classList.toggle("done", consignes[i].done);
        localStorage.setItem("consignes", JSON.stringify(consignes));
      };
      li.classList.toggle("done", c.done);
      li.appendChild(btn);
      listeConsignes.appendChild(li);
    });
  }
  ajouterConsigne.addEventListener("click", () => {
    if (consigneTexte.value.trim() !== "") {
      consignes.push({ text: consigneTexte.value, done: false });
      localStorage.setItem("consignes", JSON.stringify(consignes));
      consigneTexte.value = "";
      renderConsignes();
    }
  });
  renderConsignes();

  // === PERSONNEL ===
  const personnelForm = document.getElementById("personnelForm");
  const historiquePersonnel = document.getElementById("historiquePersonnel");
  let personnelData = JSON.parse(localStorage.getItem("personnel")) || [];

  personnelForm.addEventListener("submit", e => e.preventDefault());
  document.getElementById("ajouterPersonnel").addEventListener("click", () => {
    const nom = document.getElementById("nomPersonnel").value;
    const motif = document.getElementById("motifPersonnel").value;
    const com = document.getElementById("commentairePersonnel").value;
    if (!nom) return;
    const entry = { nom, motif, com, date: new Date().toLocaleString("fr-FR") };
    personnelData.push(entry);
    localStorage.setItem("personnel", JSON.stringify(personnelData));
    renderPersonnel();
    personnelForm.reset();
  });

  function renderPersonnel() {
    historiquePersonnel.innerHTML = "";
    personnelData.forEach(e => {
      const div = document.createElement("div");
      div.textContent = `${e.date} - ${e.nom} (${e.motif}) : ${e.com}`;
      historiquePersonnel.appendChild(div);
    });
  }
  renderPersonnel();

  // === ARRÊTS ===
  const arretsForm = document.getElementById("arretsForm");
  const historiqueArrets = document.getElementById("historiqueArrets");
  let arretsData = JSON.parse(localStorage.getItem("arrets")) || [];

  document.getElementById("ajouterArret").addEventListener("click", () => {
    const ligne = document.getElementById("ligneArret").value;
    const type = document.getElementById("typeArret").value;
    const duree = document.getElementById("tempsArret").value;
    const com = document.getElementById("commentaireArret").value;
    if (!ligne || !duree) return;
    const entry = { ligne, type, duree, com, date: new Date().toLocaleString("fr-FR") };
    arretsData.push(entry);
    localStorage.setItem("arrets", JSON.stringify(arretsData));
    renderArrets();
    arretsForm.reset();
  });

  function renderArrets() {
    historiqueArrets.innerHTML = "";
    arretsData.forEach(a => {
      const div = document.createElement("div");
      div.textContent = `${a.date} - ${a.ligne} (${a.type}) : ${a.duree} min - ${a.com}`;
      historiqueArrets.appendChild(div);
    });
  }
  renderArrets();

  // === PAGE ATELIER ===
  const atelierChart = document.getElementById("atelierChart");
  if (atelierChart) {
    const ctx = atelierChart.getContext("2d");
    const lignes = ["Râpé", "T2"];
    const datasets = lignes.map(nom => {
      const data = JSON.parse(localStorage.getItem(nom + "_data")) || [];
      return {
        label: nom,
        data: data.map(e => parseFloat(e.cadence) || 0),
        borderWidth: 2,
        fill: false,
        tension: 0.3
      };
    });
    new Chart(ctx, {
      type: "line",
      data: {
        labels: JSON.parse(localStorage.getItem("Râpé_data"))?.map(e => e.date) || [],
        datasets
      },
      options: { responsive: true, plugins: { legend: { position: "bottom" } } }
    });
  }
});
