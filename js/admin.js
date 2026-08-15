import { supabase, uploadMedia } from "./supabase.js";

const $ = (s) => document.querySelector(s);
const setNote = (el, msg, ok = true) => { el.textContent = msg; el.className = (el.classList.contains("form-note") ? "form-note " : "save-note ") + (ok ? "ok" : "err"); };
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const editIcon = '<svg viewBox="0 0 24 24" class="ico ico-sm"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
const delIcon = '<svg viewBox="0 0 24 24" class="ico ico-sm"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>';

/* ===================== AUTH ===================== */
const loginWrap = $("#loginWrap");
const adminShell = $("#adminShell");

async function refreshAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    loginWrap.hidden = true;
    adminShell.hidden = false;
    $("#adminUser").textContent = session.user.email;
    loadAll();
  } else {
    loginWrap.hidden = false;
    adminShell.hidden = true;
  }
}

$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#loginBtn");
  btn.disabled = true; btn.textContent = "Signing in…";
  const { error } = await supabase.auth.signInWithPassword({ email: $("#email").value.trim(), password: $("#password").value });
  btn.disabled = false; btn.textContent = "Sign In";
  if (error) { setNote($("#loginNote"), error.message, false); return; }
  setNote($("#loginNote"), "", true);
  refreshAuth();
});

$("#signOutBtn").addEventListener("click", async () => { await supabase.auth.signOut(); refreshAuth(); });

/* ===================== TABS ===================== */
document.querySelectorAll(".admin-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".admin-tab").forEach((t) => t.classList.toggle("is-active", t === tab));
    document.querySelectorAll(".admin-panel").forEach((p) => p.classList.toggle("is-active", p.id === "panel-" + tab.dataset.tab));
  });
});

function loadAll() { loadProfile(); loadProjects(); loadResearch(); loadAchievements(); loadPosts(); }

/* ===================== PROFILE ===================== */
let avatarUrl = "";
$("#avatarFile").addEventListener("change", async (e) => {
  const file = e.target.files[0]; if (!file) return;
  setNote($("#profileNote"), "Uploading photo…");
  try { avatarUrl = await uploadMedia(file, "avatar"); $("#avatarPreview").src = avatarUrl; setNote($("#profileNote"), "Photo uploaded — remember to Save."); }
  catch (err) { setNote($("#profileNote"), "Upload failed: " + err.message, false); }
});

async function loadProfile() {
  const { data, error } = await supabase.from("profile").select("*").eq("id", 1).single();
  if (error || !data) return;
  avatarUrl = data.avatar_url || "";
  $("#avatarPreview").src = avatarUrl || "assets/avatar.svg";
  $("#p_name").value = data.name || "";
  $("#p_title").value = data.title || "";
  $("#p_tagline").value = data.tagline || "";
  $("#p_about").value = data.about || "";
  $("#p_location").value = data.location || "";
  $("#p_focus").value = data.focus || "";
  $("#p_education").value = data.education || "";
  $("#p_gpa").value = data.gpa || "";
  $("#p_email").value = data.email || "";
  $("#p_linkedin").value = data.linkedin || "";
  $("#p_github").value = data.github || "";
  $("#p_leetcode").value = data.leetcode || "";
  $("#p_available").checked = !!data.available;
}

$("#profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#profileSave"); btn.disabled = true; btn.textContent = "Saving…";
  const payload = {
    name: $("#p_name").value.trim(), title: $("#p_title").value.trim(), tagline: $("#p_tagline").value.trim(),
    about: $("#p_about").value.trim(), location: $("#p_location").value.trim(), focus: $("#p_focus").value.trim(),
    education: $("#p_education").value.trim(), gpa: $("#p_gpa").value.trim(), email: $("#p_email").value.trim(),
    linkedin: $("#p_linkedin").value.trim(), github: $("#p_github").value.trim(), leetcode: $("#p_leetcode").value.trim(),
    available: $("#p_available").checked, avatar_url: avatarUrl,
  };
  const { error } = await supabase.from("profile").update(payload).eq("id", 1);
  btn.disabled = false; btn.textContent = "Save profile";
  setNote($("#profileNote"), error ? "Error: " + error.message : "Saved ✓ Your site will reflect it on next load.", !error);
});

/* ===================== PROJECTS ===================== */
let projImgUrl = "";
$("#projImgFile").addEventListener("change", async (e) => {
  const file = e.target.files[0]; if (!file) return;
  setNote($("#projNote"), "Uploading…");
  try { projImgUrl = await uploadMedia(file, "projects"); $("#projImgPreview").src = projImgUrl; setNote($("#projNote"), "Image uploaded."); }
  catch (err) { setNote($("#projNote"), "Upload failed: " + err.message, false); }
});

function resetProjectForm() {
  $("#projectForm").reset(); $("#proj_id").value = ""; projImgUrl = "";
  $("#projImgPreview").src = ""; $("#projSave").textContent = "Add project"; $("#projReset").hidden = true; setNote($("#projNote"), "");
}
$("#projReset").addEventListener("click", resetProjectForm);

async function loadProjects() {
  const { data } = await supabase.from("projects").select("*").order("sort", { ascending: true }).order("created_at", { ascending: false });
  const list = $("#projectList");
  if (!data || !data.length) { list.innerHTML = '<div class="empty-note">No projects yet. Add your first one above.</div>'; return; }
  list.innerHTML = data.map((p) => {
    const img = p.image_url || (p.repo ? `https://opengraph.githubassets.com/1/${esc(p.repo)}` : "assets/og-preview.svg");
    return `<div class="list-item">
      <img src="${esc(img)}" alt="" />
      <div class="list-item__body"><strong>${esc(p.title)}</strong><span>${esc((p.tags || []).join(", "))}</span></div>
      <div class="list-actions">
        <button class="icon-btn sm" data-edit="${p.id}" aria-label="Edit">${editIcon}</button>
        <button class="icon-btn sm danger" data-del="${p.id}" aria-label="Delete">${delIcon}</button>
      </div>
    </div>`;
  }).join("");
  list.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => editProject(data.find((x) => x.id === b.dataset.edit))));
  list.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => deleteProject(b.dataset.del)));
}

function editProject(p) {
  $("#proj_id").value = p.id; $("#proj_title").value = p.title || ""; $("#proj_repo").value = p.repo || "";
  $("#proj_description").value = p.description || ""; $("#proj_tags").value = (p.tags || []).join(", ");
  $("#proj_demo").value = p.demo || ""; $("#proj_sort").value = p.sort ?? 0;
  projImgUrl = p.image_url || ""; $("#projImgPreview").src = projImgUrl || "";
  $("#projSave").textContent = "Update project"; $("#projReset").hidden = false;
  document.querySelector('.admin-tab[data-tab="projects"]').click();
  $("#projectForm").scrollIntoView({ behavior: "smooth" });
}

async function deleteProject(id) {
  if (!confirm("Delete this project?")) return;
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) alert(error.message); else loadProjects();
}

$("#projectForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#projSave"); btn.disabled = true; btn.textContent = "Saving…";
  const payload = {
    title: $("#proj_title").value.trim(), repo: $("#proj_repo").value.trim().replace(/^https?:\/\/github\.com\//, ""),
    description: $("#proj_description").value.trim(), demo: $("#proj_demo").value.trim(),
    tags: $("#proj_tags").value.split(",").map((t) => t.trim()).filter(Boolean),
    sort: parseInt($("#proj_sort").value, 10) || 0, image_url: projImgUrl || null,
  };
  const id = $("#proj_id").value;
  const { error } = id ? await supabase.from("projects").update(payload).eq("id", id) : await supabase.from("projects").insert([payload]);
  btn.disabled = false; btn.textContent = id ? "Update project" : "Add project";
  if (error) { setNote($("#projNote"), error.message, false); return; }
  setNote($("#projNote"), "Saved ✓"); resetProjectForm(); loadProjects();
});

/* ===================== RESEARCH ===================== */
function resetResearchForm() {
  $("#researchForm").reset(); $("#res_id").value = "";
  $("#resSave").textContent = "Add research"; $("#resReset").hidden = true; setNote($("#resNote"), "");
}
$("#resReset").addEventListener("click", resetResearchForm);

async function loadResearch() {
  const { data } = await supabase.from("research").select("*").order("sort", { ascending: true }).order("created_at", { ascending: false });
  const list = $("#researchAdminList");
  if (!data || !data.length) { list.innerHTML = '<div class="empty-note">No research entries yet. Your site shows the built-in study until you add one.</div>'; return; }
  list.innerHTML = data.map((r) => `
    <div class="list-item">
      <div class="list-item__body"><strong>${esc(r.title)} ${r.status ? `<span class="badge-draft">${esc(r.status)}</span>` : ""}</strong><span>${esc(r.field || (r.tags || []).join(", "))}</span></div>
      <div class="list-actions">
        <button class="icon-btn sm" data-edit="${r.id}" aria-label="Edit">${editIcon}</button>
        <button class="icon-btn sm danger" data-del="${r.id}" aria-label="Delete">${delIcon}</button>
      </div>
    </div>`).join("");
  list.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => editResearch(data.find((x) => x.id === b.dataset.edit))));
  list.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => deleteResearch(b.dataset.del)));
}

function editResearch(r) {
  $("#res_id").value = r.id; $("#res_title").value = r.title || ""; $("#res_status").value = r.status || "";
  $("#res_field").value = r.field || ""; $("#res_link").value = r.link || "";
  $("#res_abstract").value = r.abstract || ""; $("#res_tags").value = (r.tags || []).join(", ");
  $("#res_sort").value = r.sort ?? 0;
  $("#resSave").textContent = "Update research"; $("#resReset").hidden = false;
  document.querySelector('.admin-tab[data-tab="research"]').click();
  $("#researchForm").scrollIntoView({ behavior: "smooth" });
}

async function deleteResearch(id) {
  if (!confirm("Delete this research entry?")) return;
  const { error } = await supabase.from("research").delete().eq("id", id);
  if (error) alert(error.message); else loadResearch();
}

$("#researchForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#resSave"); btn.disabled = true; btn.textContent = "Saving…";
  const payload = {
    title: $("#res_title").value.trim(), status: $("#res_status").value.trim(),
    field: $("#res_field").value.trim(), link: $("#res_link").value.trim(),
    abstract: $("#res_abstract").value.trim(),
    tags: $("#res_tags").value.split(",").map((t) => t.trim()).filter(Boolean),
    sort: parseInt($("#res_sort").value, 10) || 0,
  };
  const id = $("#res_id").value;
  const { error } = id ? await supabase.from("research").update(payload).eq("id", id) : await supabase.from("research").insert([payload]);
  btn.disabled = false; btn.textContent = id ? "Update research" : "Add research";
  if (error) { setNote($("#resNote"), error.message, false); return; }
  setNote($("#resNote"), "Saved ✓"); resetResearchForm(); loadResearch();
});

/* ===================== ACHIEVEMENTS ===================== */
function resetAchForm() {
  $("#achForm").reset(); $("#ach_id").value = "";
  $("#achSave").textContent = "Add achievement"; $("#achReset").hidden = true; setNote($("#achNote"), "");
}
$("#achReset").addEventListener("click", resetAchForm);

async function loadAchievements() {
  const { data } = await supabase.from("achievements").select("*").order("sort", { ascending: true }).order("created_at", { ascending: false });
  const list = $("#achAdminList");
  if (!data || !data.length) { list.innerHTML = '<div class="empty-note">No achievements yet. Your site shows the built-in milestones until you add one.</div>'; return; }
  list.innerHTML = data.map((a) => `
    <div class="list-item">
      <div class="list-item__body"><strong>${esc(a.title)} ${a.kind ? `<span class="badge-draft">${esc(a.kind)}</span>` : ""}</strong><span>${esc([a.issuer, a.date].filter(Boolean).join(" · "))}</span></div>
      <div class="list-actions">
        <button class="icon-btn sm" data-edit="${a.id}" aria-label="Edit">${editIcon}</button>
        <button class="icon-btn sm danger" data-del="${a.id}" aria-label="Delete">${delIcon}</button>
      </div>
    </div>`).join("");
  list.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => editAchievement(data.find((x) => x.id === b.dataset.edit))));
  list.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => deleteAchievement(b.dataset.del)));
}

function editAchievement(a) {
  $("#ach_id").value = a.id; $("#ach_title").value = a.title || ""; $("#ach_kind").value = a.kind || "Certification";
  $("#ach_detail").value = a.detail || ""; $("#ach_issuer").value = a.issuer || "";
  $("#ach_date").value = a.date || ""; $("#ach_link").value = a.link || ""; $("#ach_sort").value = a.sort ?? 0;
  $("#achSave").textContent = "Update achievement"; $("#achReset").hidden = false;
  document.querySelector('.admin-tab[data-tab="achievements"]').click();
  $("#achForm").scrollIntoView({ behavior: "smooth" });
}

async function deleteAchievement(id) {
  if (!confirm("Delete this achievement?")) return;
  const { error } = await supabase.from("achievements").delete().eq("id", id);
  if (error) alert(error.message); else loadAchievements();
}

$("#achForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#achSave"); btn.disabled = true; btn.textContent = "Saving…";
  const payload = {
    title: $("#ach_title").value.trim(), kind: $("#ach_kind").value,
    detail: $("#ach_detail").value.trim(), issuer: $("#ach_issuer").value.trim(),
    date: $("#ach_date").value.trim(), link: $("#ach_link").value.trim(),
    sort: parseInt($("#ach_sort").value, 10) || 0,
  };
  const id = $("#ach_id").value;
  const { error } = id ? await supabase.from("achievements").update(payload).eq("id", id) : await supabase.from("achievements").insert([payload]);
  btn.disabled = false; btn.textContent = id ? "Update achievement" : "Add achievement";
  if (error) { setNote($("#achNote"), error.message, false); return; }
  setNote($("#achNote"), "Saved ✓"); resetAchForm(); loadAchievements();
});

/* ===================== BLOG ===================== */
let postImgUrl = "";
$("#postImgFile").addEventListener("change", async (e) => {
  const file = e.target.files[0]; if (!file) return;
  setNote($("#postNote"), "Uploading…");
  try { postImgUrl = await uploadMedia(file, "posts"); $("#postImgPreview").src = postImgUrl; setNote($("#postNote"), "Cover uploaded."); }
  catch (err) { setNote($("#postNote"), "Upload failed: " + err.message, false); }
});

function resetPostForm() {
  $("#postForm").reset(); $("#post_id").value = ""; postImgUrl = "";
  $("#postImgPreview").src = ""; $("#postSave").textContent = "Add post"; $("#postReset").hidden = true; setNote($("#postNote"), "");
}
$("#postReset").addEventListener("click", resetPostForm);

async function loadPosts() {
  const { data } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
  const list = $("#postList");
  if (!data || !data.length) { list.innerHTML = '<div class="empty-note">No posts yet. Write your first one above.</div>'; return; }
  list.innerHTML = data.map((p) => `
    <div class="list-item">
      <img src="${esc(p.cover_url || "assets/og-preview.svg")}" alt="" />
      <div class="list-item__body"><strong>${esc(p.title)} ${p.published ? '<span class="badge-live">Live</span>' : '<span class="badge-draft">Draft</span>'}</strong><span>${esc(p.tag || "")}</span></div>
      <div class="list-actions">
        <button class="icon-btn sm" data-edit="${p.id}" aria-label="Edit">${editIcon}</button>
        <button class="icon-btn sm danger" data-del="${p.id}" aria-label="Delete">${delIcon}</button>
      </div>
    </div>`).join("");
  list.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => editPost(data.find((x) => x.id === b.dataset.edit))));
  list.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => deletePost(b.dataset.del)));
}

function editPost(p) {
  $("#post_id").value = p.id; $("#post_title").value = p.title || ""; $("#post_tag").value = p.tag || "";
  $("#post_excerpt").value = p.excerpt || ""; $("#post_content").value = p.content || "";
  $("#post_published").checked = !!p.published; postImgUrl = p.cover_url || ""; $("#postImgPreview").src = postImgUrl || "";
  $("#postSave").textContent = "Update post"; $("#postReset").hidden = false;
  $("#postForm").scrollIntoView({ behavior: "smooth" });
}

async function deletePost(id) {
  if (!confirm("Delete this post?")) return;
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) alert(error.message); else loadPosts();
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

$("#postForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#postSave"); btn.disabled = true; btn.textContent = "Saving…";
  const title = $("#post_title").value.trim();
  const payload = {
    title, slug: slugify(title), tag: $("#post_tag").value.trim(),
    excerpt: $("#post_excerpt").value.trim(), content: $("#post_content").value,
    cover_url: postImgUrl || null, published: $("#post_published").checked,
  };
  const id = $("#post_id").value;
  const { error } = id ? await supabase.from("posts").update(payload).eq("id", id) : await supabase.from("posts").insert([payload]);
  btn.disabled = false; btn.textContent = id ? "Update post" : "Add post";
  if (error) { setNote($("#postNote"), error.message, false); return; }
  setNote($("#postNote"), "Saved ✓"); resetPostForm(); loadPosts();
});

/* ===================== INIT ===================== */
refreshAuth();
