/* =========================================================
   Engineering Dashboard · interactions
   ========================================================= */
import { supabase } from "./supabase.js";

(function () {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Year ---------- */
  $("#year").textContent = new Date().getFullYear();

  /* ---------- Theme ---------- */
  const root = document.documentElement;
  const saved = localStorage.getItem("ac-theme");
  if (saved) root.setAttribute("data-theme", saved);

  $("#themeToggle").addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    localStorage.setItem("ac-theme", next);
    refreshCharts(next);
  });

  /* ---------- Mobile sidebar ---------- */
  const sidebar = $("#sidebar");
  const openSidebar = () => sidebar.classList.add("open");
  const closeSidebar = () => sidebar.classList.remove("open");
  $("#menuBtn").addEventListener("click", openSidebar);
  $("#sidebarClose").addEventListener("click", closeSidebar);
  $$(".nav__item").forEach((a) => a.addEventListener("click", closeSidebar));

  /* ---------- Active nav + breadcrumb via IntersectionObserver ---------- */
  const navItems = $$(".nav__item");
  const crumb = $("#crumbCurrent");
  const sections = $$("main .section[id]");
  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const id = e.target.id;
          navItems.forEach((n) => n.classList.toggle("is-active", n.dataset.section === id));
          const active = navItems.find((n) => n.dataset.section === id);
          if (active) crumb.textContent = active.querySelector("span").textContent;
        }
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  sections.forEach((s) => navObserver.observe(s));

  /* ---------- Reveal on scroll ---------- */
  const revealObserver = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          obs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  $$(".reveal").forEach((el) => revealObserver.observe(el));

  /* ---------- Animated counters ---------- */
  const animateCount = (el) => {
    const target = +el.dataset.count;
    const dec = +(el.dataset.decimals || 0);
    const fmt = (n) => dec ? n.toFixed(dec) : Math.round(n).toLocaleString();
    if (reduceMotion) { el.textContent = fmt(target); return; }
    const dur = 1400;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * eased);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const countObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => { if (e.isIntersecting) { animateCount(e.target); obs.unobserve(e.target); } });
  }, { threshold: 0.6 });
  $$(".stat-num").forEach((el) => countObserver.observe(el));

  /* ---------- Skill bars (data-driven) ---------- */
  $$(".skill-bars").forEach((wrap) => {
    let data = [];
    try { data = JSON.parse(wrap.dataset.skills); } catch (e) {}
    wrap.innerHTML = data
      .map(
        (s) => `<div class="sb-row">
          <div class="sb-top"><span>${s.name}</span><span>${s.pct}%</span></div>
          <div class="track"><i data-w="${s.pct}"></i></div>
        </div>`
      )
      .join("");
  });
  const barObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.style.width = e.target.dataset.w + "%";
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  $$(".track > i[data-w]").forEach((b) => barObserver.observe(b));

  /* ---------- Progress rings ---------- */
  const ringObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        const ring = e.target;
        const fg = ring.querySelector(".prog-fg");
        const r = fg.r.baseVal.value;
        const circ = 2 * Math.PI * r;
        const pct = +ring.dataset.pct;
        fg.style.strokeDasharray = circ;
        fg.style.strokeDashoffset = reduceMotion ? circ - (pct / 100) * circ : circ;
        requestAnimationFrame(() => { fg.style.strokeDashoffset = circ - (pct / 100) * circ; });
        obs.unobserve(ring);
      }
    });
  }, { threshold: 0.5 });
  $$(".prog-ring").forEach((r) => ringObserver.observe(r));

  /* ---------- GitHub heatmap (renders sample data, replaced by live data) ---------- */
  function renderHeatmap(days) {
    const map = $("#heatmap");
    if (!map) return;
    map.innerHTML = "";
    const frag = document.createDocumentFragment();

    if (!days) {
      // sample fallback (used until / unless live data loads)
      days = [];
      for (let i = 0; i < 53 * 7; i++) {
        const s = Math.random();
        const lvl = s > 0.82 ? 4 : s > 0.66 ? 3 : s > 0.45 ? 2 : s > 0.22 ? 1 : 0;
        days.push({ count: lvl * 2, level: lvl, date: "" });
      }
    }
    days.forEach((d) => {
      const cell = document.createElement("i");
      cell.className = "hm-cell l" + (d.level ?? 0);
      cell.title = d.date ? `${d.count} contribution${d.count === 1 ? "" : "s"} on ${d.date}` : `${d.count} contributions`;
      frag.appendChild(cell);
    });
    map.appendChild(frag);
  }
  renderHeatmap();

  /* ===================== CHARTS ===================== */
  let charts = {};

  const palette = () => {
    const styles = getComputedStyle(root);
    const light = root.getAttribute("data-theme") === "light";
    return {
      accent: light ? "#A8632F" : "#C08457",
      accent2: "#D9A877",
      grid: light ? "rgba(58,44,30,0.12)" : "rgba(232,220,203,0.12)",
      text: light ? "#6B5C49" : "#A99B86",
      ring: light ? "#FBF6EE" : "#141210",
      // Editorial multi-color data palette
      multi: ["#C08457", "#4F9D77", "#A8454F", "#D6A23E", "#7C8794", "#8A6038"],
    };
  };

  function buildCharts() {
    if (typeof Chart === "undefined") return;
    const p = palette();
    Chart.defaults.font.family = "'DM Sans', system-ui, sans-serif";
    Chart.defaults.color = p.text;
    Chart.defaults.animation = reduceMotion ? false : { duration: 900, easing: "easeOutQuart" };

    // Radar · competencies
    const radar = $("#skillsRadar");
    if (radar) {
      charts.radar = new Chart(radar, {
        type: "radar",
        data: {
          labels: ["Software Eng.", "AI / ML", "Data Eng.", "Web Dev", "Databases", "Cybersecurity"],
          datasets: [{
            label: "Proficiency",
            data: [88, 85, 82, 84, 80, 70],
            fill: true,
            backgroundColor: "rgba(192,132,87,0.18)",
            borderColor: p.accent,
            borderWidth: 2,
            pointBackgroundColor: p.accent,
            pointRadius: 4,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            r: {
              suggestedMin: 0, suggestedMax: 100,
              grid: { color: p.grid }, angleLines: { color: p.grid },
              ticks: { display: false, stepSize: 25 },
              pointLabels: { color: p.text, font: { size: 12, weight: "600" } },
            },
          },
        },
      });
    }

    // Doughnut · languages
    const donut = $("#langDonut");
    if (donut) {
      charts.donut = new Chart(donut, {
        type: "doughnut",
        data: {
          labels: ["Python", "Java", "JavaScript", "C++", "SQL"],
          datasets: [{
            data: [34, 28, 18, 12, 8],
            backgroundColor: p.multi,
            borderColor: p.ring,
            borderWidth: 3,
            hoverOffset: 8,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          cutout: "62%",
          plugins: { legend: { position: "bottom", labels: { boxWidth: 10, padding: 14, font: { size: 11 } } } },
        },
      });
    }

    // Line · coding activity
    const line = $("#activityLine");
    if (line) {
      const labels = ["W1","W2","W3","W4","W5","W6","W7","W8","W9","W10","W11","W12"];
      const ctx = line.getContext("2d");
      const grad = ctx.createLinearGradient(0, 0, 0, 220);
      grad.addColorStop(0, "rgba(192,132,87,0.38)");
      grad.addColorStop(1, "rgba(192,132,87,0)");
      charts.line = new Chart(line, {
        type: "line",
        data: {
          labels,
          datasets: [{
            label: "Commits",
            data: [42, 55, 38, 61, 48, 72, 65, 80, 58, 90, 74, 88],
            borderColor: p.accent,
            backgroundColor: grad,
            fill: true,
            tension: 0.4,
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 5,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: p.text, font: { size: 10 } } },
            y: { grid: { color: p.grid }, ticks: { color: p.text, font: { size: 10 } }, beginAtZero: true },
          },
        },
      });
    }
  }

  function refreshCharts() {
    Object.values(charts).forEach((c) => c && c.destroy());
    charts = {};
    buildCharts();
  }
  function reloadOnThemeColors() { refreshCharts(); }
  window.refreshCharts = reloadOnThemeColors;

  buildCharts();

  /* ===================== LIVE GITHUB DATA ===================== */
  const GH_USER = "kshitiz235";

  // Editorial multi-color palette (bronze, emerald, burgundy, amber, slate, deep bronze)
  const palCycle = ["#C08457", "#4F9D77", "#A8454F", "#D6A23E", "#7C8794", "#8A6038"];

  const setText = (id, v) => { const el = $("#" + id); if (el) el.textContent = v; };
  const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  async function loadGitHub() {
    // 1) Profile + repos (official GitHub REST API, CORS-enabled, no auth)
    try {
      const [profile, repos] = await Promise.all([
        fetch(`https://api.github.com/users/${GH_USER}`).then((r) => r.ok ? r.json() : Promise.reject(r.status)),
        fetch(`https://api.github.com/users/${GH_USER}/repos?per_page=100&sort=pushed`).then((r) => r.ok ? r.json() : Promise.reject(r.status)),
      ]);

      // Hero stat: public repos (animate up)
      const reposEl = $("#statRepos");
      if (reposEl && typeof profile.public_repos === "number") {
        reposEl.dataset.count = profile.public_repos;
        animateCount(reposEl);
      }

      if (Array.isArray(repos)) {
        const stars = repos.reduce((a, r) => a + (r.stargazers_count || 0), 0);
        const langCount = {};
        repos.forEach((r) => { if (r.language) langCount[r.language] = (langCount[r.language] || 0) + 1; });
        const langs = Object.entries(langCount).sort((a, b) => b[1] - a[1]).slice(0, 6);

        // Repository Overview mini-stats
        setText("ghRepos", profile.public_repos ?? repos.length);
        setText("ghStars", stars);
        setText("ghFollowers", profile.followers ?? 0);
        setText("ghLangs", Object.keys(langCount).length);

        // Most Used Languages doughnut
        if (charts.donut && langs.length) {
          charts.donut.data.labels = langs.map((l) => l[0]);
          charts.donut.data.datasets[0].data = langs.map((l) => l[1]);
          charts.donut.data.datasets[0].backgroundColor = langs.map((l, i) => palCycle[i % palCycle.length]);
          charts.donut.update();
        }
      }
    } catch (e) {
      console.info("GitHub profile/repos unavailable (rate limit or offline) · using sample data.", e);
    }

    // 2) Contribution calendar (community API; provides real daily counts + levels)
    try {
      const data = await fetch(`https://github-contributions-api.jogruber.de/v4/${GH_USER}?y=last`).then((r) => r.ok ? r.json() : Promise.reject(r.status));
      const days = data.contributions || [];
      if (days.length) {
        renderHeatmap(days);
        const total = days.reduce((a, d) => a + (d.count || 0), 0);
        setText("ghTotal", `${total.toLocaleString()} contributions in the last year`);

        // Weekly aggregation -> commit activity line (last 16 weeks)
        const weeks = [];
        for (let i = 0; i < days.length; i += 7) {
          weeks.push(days.slice(i, i + 7).reduce((a, d) => a + (d.count || 0), 0));
        }
        const last = weeks.slice(-16);
        if (charts.line && last.length) {
          charts.line.data.labels = last.map((_, i) => "W" + (i + 1));
          charts.line.data.datasets[0].data = last;
          charts.line.update();
        }
      }
    } catch (e) {
      console.info("GitHub contribution calendar unavailable · using sample heatmap.", e);
    }
  }
  loadGitHub();

  /* ===================== FEATURED PROJECTS ===================== */
  const prettifyName = (s) => s.replace(/[-_.]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()).trim();

  function renderProjectCards(list) {
    const grid = $("#projGrid");
    if (!grid || !list.length) return;
    grid.innerHTML = list.slice(0, 6).map((p, i) => {
      const repo = (p.repo || "").replace(/^https?:\/\/github\.com\//, "");
      const title = p.title || (repo ? prettifyName(repo.split("/").pop()) : "Project");
      const link = p.link || (repo ? `https://github.com/${repo}` : "");
      const img = p.image || (repo ? `https://opengraph.githubassets.com/1/${repo}` : "");
      const shotStyle = img
        ? `background-image:url('${img}');background-size:cover;background-position:center`
        : "--shot:linear-gradient(135deg,#C08457,#8A4F23)";
      const tags = (p.tags || []).map((t) => `<span class="chip">${esc(t)}</span>`).join("");
      const demo = p.demo ? `<a class="btn btn-sm btn-primary" href="${esc(p.demo)}" target="_blank" rel="noopener">Live Demo</a>` : "";
      const code = link ? `<a class="btn btn-sm btn-ghost" href="${esc(link)}" target="_blank" rel="noopener">View Code ↗</a>` : "";
      return `<article class="proj-card glass">
        <div class="proj-shot" style="${shotStyle}">${i === 0 ? '<span class="proj-badge">Featured</span>' : ""}</div>
        <div class="proj-body">
          <h3>${esc(title)}</h3>
          ${p.description ? `<p>${esc(p.description)}</p>` : ""}
          ${tags ? `<div class="chip-cloud sm">${tags}</div>` : ""}
          <div class="proj-links">${demo}${code}</div>
        </div>
      </article>`;
    }).join("");
  }

  // Fallback: projects.json in this repo (used only if Supabase has no projects).
  async function loadProjectsJson() {
    try {
      const list = await fetch("projects.json", { cache: "no-cache" }).then((r) => r.ok ? r.json() : Promise.reject(r.status));
      if (Array.isArray(list) && list.length) renderProjectCards(list);
    } catch (e) { /* keep built-in cards */ }
  }

  /* ===================== SUPABASE CONTENT (profile · projects · blog) ===================== */
  const applyField = (field, value) => {
    if (value == null || value === "") return;
    document.querySelectorAll(`[data-field="${field}"]`).forEach((el) => { el.textContent = value; });
  };

  const fmtDate = (d) => { try { return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); } catch (e) { return ""; } };

  function renderPosts(posts) {
    const grid = $("#blogGrid");
    if (!grid) return;
    grid.innerHTML = posts.map((p, i) => `
      <article class="blog-card glass" data-post="${i}">
        ${p.cover_url ? `<img class="blog-card__cover" src="${esc(p.cover_url)}" alt="" />` : ""}
        <span class="blog-tag">${esc(p.tag || "Article")}</span>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.excerpt || "")}</p>
        <span class="blog-meta">${esc(fmtDate(p.created_at))}</span>
      </article>`).join("");
    grid.querySelectorAll("[data-post]").forEach((el) => el.addEventListener("click", () => openPost(posts[+el.dataset.post])));
  }

  let markedFn = null;
  const postModal = $("#postModal");
  async function openPost(p) {
    if (!markedFn) {
      try { markedFn = (await import("https://esm.sh/marked@12")).marked; }
      catch (e) { markedFn = (s) => "<p>" + esc(s).replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br>") + "</p>"; }
    }
    $("#postModalTitle").textContent = p.title;
    const cover = p.cover_url ? `<img class="post-modal__cover" src="${esc(p.cover_url)}" alt="" />` : "";
    const meta = `<div class="post-modal__meta">${esc(p.tag || "Article")} · ${esc(fmtDate(p.created_at))}</div>`;
    $("#postModalBody").innerHTML = cover + meta + markedFn(p.content || "");
    postModal.hidden = false; document.body.style.overflow = "hidden";
    $("#postModalBody").scrollTop = 0;
  }
  function closePost() { if (postModal) { postModal.hidden = true; document.body.style.overflow = ""; } }
  if (postModal) {
    $("#postModalClose").addEventListener("click", closePost);
    postModal.addEventListener("click", (e) => { if (e.target === postModal) closePost(); });
  }

  async function loadContent() {
    // Profile
    try {
      const { data } = await supabase.from("profile").select("*").eq("id", 1).single();
      if (data) {
        applyField("name", data.name); applyField("title", data.title); applyField("tagline", data.tagline);
        applyField("about", data.about); applyField("location", data.location); applyField("focus", data.focus);
        applyField("education", data.education);
        if (data.avatar_url) document.querySelectorAll(".avatar").forEach((img) => { img.src = data.avatar_url; });
        if (data.email) {
          document.querySelectorAll('a[href^="mailto:"]').forEach((a) => { a.href = "mailto:" + data.email; });
          document.querySelectorAll('[data-field="email"]').forEach((el) => { el.textContent = data.email; });
        }
        if (data.linkedin) document.querySelectorAll('a[href*="linkedin.com"]').forEach((a) => { a.href = data.linkedin; });
        if (data.leetcode) document.querySelectorAll('a[href*="leetcode.com"]').forEach((a) => { a.href = data.leetcode; });
      }
    } catch (e) { console.info("Profile from Supabase unavailable.", e); }

    // Projects: Supabase -> projects.json -> built-in cards
    try {
      const { data } = await supabase.from("projects").select("*").order("sort", { ascending: true }).order("created_at", { ascending: false });
      if (data && data.length) {
        renderProjectCards(data.map((p) => ({ title: p.title, repo: p.repo, description: p.description, demo: p.demo, image: p.image_url, tags: p.tags || [] })));
      } else { loadProjectsJson(); }
    } catch (e) { loadProjectsJson(); }

    // Blog: published posts
    try {
      const { data } = await supabase.from("posts").select("*").eq("published", true).order("created_at", { ascending: false });
      if (data && data.length) renderPosts(data);
    } catch (e) { console.info("Posts from Supabase unavailable.", e); }
  }
  loadContent();

  /* ===================== LIVE LEETCODE (DSA) ===================== */
  async function loadLeetCode() {
    const card = $("#leetcodeCard");
    if (!card) return;
    const bars = $("#lcBars");
    const totalEl = $("#lcTotal");
    try {
      const d = await fetch("https://alfa-leetcode-api.onrender.com/technicalwarriorscgp/solved")
        .then((r) => r.ok ? r.json() : Promise.reject(r.status));
      const total = d.solvedProblem ?? ((d.easySolved || 0) + (d.mediumSolved || 0) + (d.hardSolved || 0));
      totalEl.dataset.count = total;
      animateCount(totalEl);
      const rows = [["Easy", "easy", d.easySolved || 0], ["Medium", "medium", d.mediumSolved || 0], ["Hard", "hard", d.hardSolved || 0]];
      const max = Math.max(1, ...rows.map((r) => r[2]));
      bars.innerHTML = rows.map(([label, cls, n]) => `
        <div class="lc-row">
          <span class="lc-diff ${cls}">${label}</span>
          <div class="track"><i class="${cls}" data-w="${Math.round((n / max) * 100)}" style="width:0"></i></div>
          <span class="lc-cnt">${n}</span>
        </div>`).join("");
      requestAnimationFrame(() => { $$(".lc-row .track > i", bars).forEach((el) => { el.style.width = el.dataset.w + "%"; }); });
    } catch (e) {
      console.info("LeetCode stats unavailable (cold start or offline).", e);
      card.querySelector(".lc-body").innerHTML =
        '<a class="btn btn-sm btn-ghost" href="https://leetcode.com/u/technicalwarriorscgp/" target="_blank" rel="noopener">View LeetCode profile ↗</a>';
    }
  }
  loadLeetCode();

  /* ===================== MOTION (npm: motion) ===================== */
  // Real Motion library via its ESM bundle. Enhancements only · the site is
  // fully functional (CSS reveals) if this fails to load.
  if (!reduceMotion) {
    import("https://cdn.jsdelivr.net/npm/motion@11/+esm")
      .then(({ animate, scroll, stagger, inView }) => {
        // Top scroll-progress bar
        const bar = $("#scrollProgress");
        if (bar) scroll((p) => { bar.style.transform = `scaleX(${p})`; });

        // Hero entrance · staggered, spring-like
        const heroBits = $$(".hero__id > *, .hero__stats .stat-tile");
        if (heroBits.length) {
          animate(
            heroBits,
            { opacity: [0, 1], transform: ["translateY(18px)", "translateY(0)"] },
            { duration: 0.6, delay: stagger(0.06), easing: [0.22, 1, 0.36, 1] }
          );
        }

        // Section headers slide in as they enter the viewport (no .reveal conflict)
        $$(".section-head").forEach((el) => {
          inView(el, () => {
            animate(el, { opacity: [0, 1], transform: ["translateY(14px)", "translateY(0)"] }, { duration: 0.5, easing: [0.22, 1, 0.36, 1] });
          }, { amount: 0.4 });
        });

        // Gentle parallax on the aurora
        const aurora = $(".bg-aurora");
        if (aurora) scroll((p) => { aurora.style.transform = `translate3d(0, ${p * -40}px, 0)`; });
      })
      .catch(() => { /* CSS reveals already cover this */ });
  }

  /* ===================== AI ASSISTANT ===================== */
  const aiPanel = $("#aiPanel");
  const aiOverlay = $("#aiOverlay");
  const aiBody = $("#aiBody");

  const openAI = () => {
    aiOverlay.hidden = false;
    aiPanel.classList.add("open");
    aiPanel.setAttribute("aria-hidden", "false");
    $("#aiText").focus();
  };
  const closeAI = () => {
    aiPanel.classList.remove("open");
    aiPanel.setAttribute("aria-hidden", "true");
    setTimeout(() => (aiOverlay.hidden = true), 240);
  };
  $("#aiLaunch").addEventListener("click", openAI);
  $("#aiClose").addEventListener("click", closeAI);
  aiOverlay.addEventListener("click", closeAI);

  // Lightweight rule-based "career assistant"
  const KB = [
    { k: ["skill", "strong", "stack", "tech", "good at", "language"], a: "Kshitiz's strongest areas are <strong>software engineering, AI/ML, and data</strong>. Core languages: <strong>Python, Java, SQL, JavaScript, C++</strong>; web with <strong>React + Node.js</strong>; plus Git, Linux, Docker, and multimedia tech (GStreamer, Chromium, webOS)." },
    { k: ["backend", "fullstack", "full stack", "ai", "fit", "role", "hire", "engineer"], a: "Strong fit for <strong>software engineering, full-stack, and AI/data roles</strong>. He has an M.Tech & B.Tech in CSE (GPA 7.95/10), a 6-month LG Electronics internship in multimedia platform development, and hands-on ML/NLP/Android projects." },
    { k: ["frontend", "react", "web", "ui"], a: "Yes · Kshitiz works full-stack on the web: <strong>HTML, CSS, JavaScript, React, and Node.js</strong>, backed by MySQL/SQL databases." },
    { k: ["lg", "internship", "intern", "multimedia", "gstreamer", "webos", "chromium"], a: "At <strong>LG Electronics (6 months)</strong> Kshitiz worked on multimedia platform development: the <strong>GStreamer</strong> framework, <strong>Chromium</strong> integration, the <strong>UMedia Server</strong>, media pipelines, HAL integration, and <strong>webOS</strong> platform technologies." },
    { k: ["achievement", "award", "win", "proud", "biggest", "education", "degree", "gpa"], a: "Highlights: <strong>Master's in CSE</strong> (GPA 7.95/10), the LG Electronics internship, multiple ML/NLP/Android projects, research in health-bot systems, and active open-source contributions." },
    { k: ["experience", "background", "history", "journey"], a: "Academic path from B.Tech to a Master's in CSE, a 6-month LG Electronics internship in multimedia platforms, plus research and several independent projects." },
    { k: ["project", "build", "ship", "work", "deals", "health", "bot", "instagram", "reels"], a: "Featured projects: <strong>Deals Management System</strong> (ML + web scraping price comparison), <strong>Health Bot Chat System</strong> (NLP healthcare chatbot), and <strong>Instagram Reels Limiter</strong> (Android usage-control app). See the Projects section for details." },
    { k: ["learn", "study", "course", "cert", "dsa", "algorithm"], a: "Currently leveling up <strong>Advanced DSA, Dynamic Programming, AI, Cybersecurity, and Technical Analysis</strong>. Goals include publishing research and contributing to open source." },
    { k: ["research", "publication", "paper", "nlp"], a: "Research interests span <strong>AI, health technology, intelligent chat systems, data analytics, and HCI</strong> · including work on an NLP-driven healthcare chatbot, with plans to publish peer-reviewed papers." },
    { k: ["contact", "email", "reach", "talk", "linkedin", "github"], a: "Reach Kshitiz via email <strong>kshitizbudhahtoki@gmail.com</strong>, LinkedIn <strong>/in/kshitizbudhathoki</strong>, GitHub, or the contact form below. Currently <strong>available for hire</strong>." },
    { k: ["location", "where", "remote", "relocate", "nepal"], a: "Based in <strong>Nepal</strong> and open to relocation and remote roles." },
  ];
  const answer = (q) => {
    const t = q.toLowerCase();
    let best = null, score = 0;
    KB.forEach((item) => {
      const s = item.k.reduce((acc, kw) => acc + (t.includes(kw) ? 1 : 0), 0);
      if (s > score) { score = s; best = item; }
    });
    return best && score > 0
      ? best.a
      : "Great question! I can tell you about Alex's <strong>skills, experience, projects, achievements, learning, and how to get in touch</strong>. Try one of the suggestions above.";
  };

  const pushMsg = (html, who) => {
    const div = document.createElement("div");
    div.className = "ai-msg ai-msg--" + who;
    div.innerHTML = html;
    aiBody.appendChild(div);
    aiBody.scrollTop = aiBody.scrollHeight;
    return div;
  };

  const ask = (q) => {
    pushMsg(q.replace(/</g, "&lt;"), "user");
    const typing = pushMsg('<span class="ai-msg--typing"><i></i><i></i><i></i></span>', "bot");
    typing.classList.add("ai-msg--typing");
    setTimeout(() => {
      typing.remove();
      pushMsg(answer(q), "bot");
    }, reduceMotion ? 100 : 650);
  };

  $("#aiForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#aiText");
    const q = input.value.trim();
    if (!q) return;
    input.value = "";
    ask(q);
  });
  $$(".suggest-chip").forEach((chip) =>
    chip.addEventListener("click", () => ask(chip.textContent))
  );

  /* ===================== RESUME PREVIEW MODAL ===================== */
  const resumeModal = $("#resumeModal");
  const resumeFrame = $("#resumeFrame");
  const openResume = () => {
    if (!resumeFrame.src) resumeFrame.src = "assets/resume.pdf#view=FitH";
    resumeModal.hidden = false;
    document.body.style.overflow = "hidden";
  };
  const closeResume = () => { resumeModal.hidden = true; document.body.style.overflow = ""; };
  // Intercept the resume trigger buttons (not the in-modal download/open links)
  $$('a[href="assets/resume.pdf"][download]').forEach((a) => {
    if (a.closest("#resumeModal")) return;
    a.addEventListener("click", (e) => { e.preventDefault(); openResume(); });
  });
  $("#resumeClose").addEventListener("click", closeResume);
  resumeModal.addEventListener("click", (e) => { if (e.target === resumeModal) closeResume(); });

  /* ===================== COMMAND PALETTE (Ctrl/Cmd + K) ===================== */
  const cmdk = $("#cmdk");
  const cmdkInput = $("#cmdkInput");
  const cmdkList = $("#cmdkList");
  const arrowIcon = '<svg viewBox="0 0 24 24" class="ico"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const dotIcon = '<svg viewBox="0 0 24 24" class="ico"><path d="M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/></svg>';

  const sectionCmds = navItems.map((n) => ({
    label: n.querySelector("span").textContent, type: "Section", icon: arrowIcon,
    run: () => { closeCmdk(); document.getElementById(n.dataset.section).scrollIntoView({ behavior: "smooth" }); },
  }));
  const actionCmds = [
    { label: "Toggle dark / light mode", type: "Action", icon: dotIcon, run: () => $("#themeToggle").click() },
    { label: "Preview résumé", type: "Action", icon: dotIcon, run: () => { closeCmdk(); openResume(); } },
    { label: "Download résumé", type: "Action", icon: dotIcon, run: () => { closeCmdk(); const a = document.createElement("a"); a.href = "assets/resume.pdf"; a.download = "Kshitiz-Budhathoki-Resume.pdf"; a.click(); } },
    { label: "Ask the AI assistant", type: "Action", icon: dotIcon, run: () => { closeCmdk(); openAI(); } },
    { label: "Open GitHub", type: "Link", icon: dotIcon, run: () => window.open("https://github.com/kshitiz235", "_blank") },
    { label: "Open LinkedIn", type: "Link", icon: dotIcon, run: () => window.open("https://www.linkedin.com/in/kshitizbudhathoki/", "_blank") },
    { label: "Email Kshitiz", type: "Link", icon: dotIcon, run: () => { window.location.href = "mailto:kshitizbudhahtoki@gmail.com"; } },
  ];
  const allCmds = [...sectionCmds, ...actionCmds];
  let cmdkIndex = 0;
  let filtered = allCmds;

  function renderCmdk() {
    const q = cmdkInput.value.trim().toLowerCase();
    filtered = allCmds.filter((c) => c.label.toLowerCase().includes(q) || c.type.toLowerCase().includes(q));
    if (cmdkIndex >= filtered.length) cmdkIndex = 0;
    cmdkList.innerHTML = filtered.length
      ? filtered.map((c, i) => `<li class="cmdk__item ${i === cmdkIndex ? "active" : ""}" data-i="${i}" role="option">${c.icon}<span>${c.label}</span><span class="cmdk__hint">${c.type}</span></li>`).join("")
      : '<div class="cmdk__empty">No matches</div>';
  }
  function openCmdk() { cmdk.hidden = false; document.body.style.overflow = "hidden"; cmdkInput.value = ""; cmdkIndex = 0; renderCmdk(); setTimeout(() => cmdkInput.focus(), 20); }
  function closeCmdk() { cmdk.hidden = true; document.body.style.overflow = ""; }
  function scrollActive() { const el = cmdkList.querySelector(".cmdk__item.active"); if (el) el.scrollIntoView({ block: "nearest" }); }

  cmdkInput.addEventListener("input", () => { cmdkIndex = 0; renderCmdk(); });
  cmdkList.addEventListener("click", (e) => { const li = e.target.closest(".cmdk__item"); if (li) filtered[+li.dataset.i] && filtered[+li.dataset.i].run(); });
  cmdk.addEventListener("click", (e) => { if (e.target === cmdk) closeCmdk(); });
  cmdkInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); cmdkIndex = Math.min(cmdkIndex + 1, filtered.length - 1); renderCmdk(); scrollActive(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); cmdkIndex = Math.max(cmdkIndex - 1, 0); renderCmdk(); scrollActive(); }
    else if (e.key === "Enter") { e.preventDefault(); filtered[cmdkIndex] && filtered[cmdkIndex].run(); }
  });

  /* ---------- Magnetic buttons ---------- */
  if (!reduceMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    $$(".btn-primary, .ai-launch").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - (r.left + r.width / 2);
        const my = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${mx * 0.16}px, ${my * 0.26}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  /* ---------- Keyboard shortcuts ---------- */
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      cmdk.hidden ? openCmdk() : closeCmdk();
    }
    if (e.key === "Escape") { closeAI(); closeSidebar(); closeResume(); closeCmdk(); closePost(); }
  });

  /* ===================== CONTACT FORM ===================== */
  const form = $("#contactForm");
  const note = $("#formNote");
  const validators = {
    cName: (v) => (v.trim().length >= 2 ? "" : "Please enter your name."),
    cEmail: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "Enter a valid email address."),
    cMsg: (v) => (v.trim().length >= 10 ? "" : "Message should be at least 10 characters."),
  };
  const setError = (id, msg) => {
    const field = $("#" + id).closest(".field");
    field.classList.toggle("invalid", !!msg);
    $(`.err[data-for="${id}"]`).textContent = msg;
  };
  // validate on blur
  Object.keys(validators).forEach((id) =>
    $("#" + id).addEventListener("blur", (e) => setError(id, validators[id](e.target.value)))
  );

  // To receive messages straight to your inbox: create a free form at https://formspree.io
  // and paste its endpoint here (e.g. "https://formspree.io/f/xxxxxx"). Leave blank to use mailto.
  const CONTACT_ENDPOINT = "";
  const CONTACT_EMAIL = "kshitizbudhahtoki@gmail.com";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    let firstInvalid = null;
    Object.keys(validators).forEach((id) => {
      const msg = validators[id]($("#" + id).value);
      setError(id, msg);
      if (msg && !firstInvalid) firstInvalid = $("#" + id);
    });
    if (firstInvalid) { firstInvalid.focus(); note.textContent = ""; note.className = "form-note"; return; }

    const data = { name: $("#cName").value.trim(), email: $("#cEmail").value.trim(), message: $("#cMsg").value.trim() };
    const btn = $("#contactSubmit");
    btn.disabled = true; btn.textContent = "Sending…";

    if (CONTACT_ENDPOINT) {
      try {
        const r = await fetch(CONTACT_ENDPOINT, {
          method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(data),
        });
        if (!r.ok) throw new Error(r.status);
        form.reset();
        note.textContent = "Thanks! Your message has been sent. Kshitiz will reply within 24h.";
        note.className = "form-note ok";
      } catch (err) {
        note.textContent = `Couldn't send right now — please email ${CONTACT_EMAIL} directly.`;
        note.className = "form-note";
      } finally { btn.disabled = false; btn.textContent = "Send Message"; }
      return;
    }

    // No endpoint set: open the visitor's email app, pre-filled.
    const subject = encodeURIComponent(`Portfolio contact from ${data.name}`);
    const body = encodeURIComponent(`${data.message}\n\nFrom: ${data.name} (${data.email})`);
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    setTimeout(() => {
      btn.disabled = false; btn.textContent = "Send Message";
      note.textContent = `Opening your email app… if nothing happens, email ${CONTACT_EMAIL}.`;
      note.className = "form-note ok";
    }, 600);
  });
})();
