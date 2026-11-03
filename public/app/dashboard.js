// Shared dashboard for admins (/admin, Cloudflare Access) and caretakers (/portal, login link).
// The page's data-role decides which API it talks to; the server enforces what each role may see.
const ROLE = document.body.dataset.role === "caretaker" ? "caretaker" : "admin";
const IS_ADMIN = ROLE === "admin";
const API = IS_ADMIN ? "/api/admin" : "/api/my";
document.body.classList.add(`role-${ROLE}`);

const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const icon = (name) => `<svg class="i" aria-hidden="true"><use href="#i-${name}"/></svg>`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDate = (d) => (d ? `${+d.slice(8, 10)} ${MONTHS[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}` : "");
const fmtPhone = (p) => (!p ? "" : p.length === 12 && p.startsWith("91") ? `+91 ${p.slice(2, 7)} ${p.slice(7)}` : `+${p}`);
const localPhone = (p) => (p?.length === 12 && p.startsWith("91") ? p.slice(2) : p || "");
const parseTs = (ts) => new Date(ts.replace(" ", "T") + "Z");
const fmtTime = (ts) => parseTs(ts).toLocaleString([], { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
function ago(ts) {
  const s = (Date.now() - parseTs(ts)) / 1000;
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d`;
  return parseTs(ts).toLocaleDateString([], { day: "numeric", month: "short" });
}
// Only map links become clickable, so a finder can't slip a phishing link into the thread.
const linkify = (s) =>
  esc(s).replace(/https:\/\/maps\.google\.com\/\?q=-?[\d.]+,-?[\d.]+/g, (u) => `<a href="${u}" target="_blank" rel="noopener">View location on map</a>`);
const photoUrl = (d) => `/api/photo/${d.id}/${d.photo_key}`;
const profileUrl = (d) => `${location.origin}/d/${d.id}`;

// ---------- page skeleton ----------
document.getElementById("app").innerHTML = `
<svg style="display:none" xmlns="http://www.w3.org/2000/svg">
  <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
  <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></symbol>
  <symbol id="i-qr" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 20h1v1h-1zM14 20h1M20 14v1"/></symbol>
  <symbol id="i-edit" viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></symbol>
  <symbol id="i-x" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></symbol>
  <symbol id="i-copy" viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></symbol>
  <symbol id="i-external" viewBox="0 0 24 24"><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></symbol>
  <symbol id="i-download" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></symbol>
  <symbol id="i-share" viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></symbol>
  <symbol id="i-link" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></symbol>
  <symbol id="i-back" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></symbol>
</svg>

<header class="topbar">
  <div class="topbar-in">
    <a class="wordmark" href="#dogs"><span class="mark">D</span>Dog ID <span class="wordmark-sub">${IS_ADMIN ? "Admin" : "Caretaker"}</span></a>
    <div class="topbar-right"><span class="me" id="me"></span><button class="btn btn-sm" id="logout" type="button" hidden>Sign out</button></div>
  </div>
  <nav class="tabs"><div class="tabs-in">
    <a href="#dogs" data-tab="dogs">${IS_ADMIN ? "Dogs" : "My dogs"}</a>
    <a href="#messages" data-tab="messages">Messages <span class="badge" id="unread" hidden></span></a>
    ${IS_ADMIN ? `<a href="#caretakers" data-tab="caretakers">Caretakers</a>` : ""}
  </div></nav>
</header>

<main class="container" id="main">
  <section data-view="dogs">
    <div class="page-head">
      <div><h1>${IS_ADMIN ? "Dogs" : "My dogs"}</h1><p class="summary" id="summary">Loading…</p></div>
      <button class="btn btn-primary" id="addDog" type="button">${icon("plus")}<span class="btn-label">Add dog</span></button>
    </div>
    <div class="toolbar">
      <div class="input-icon">${icon("search")}<input id="q" type="search" placeholder="Search by name, area or ID" autocomplete="off"></div>
      <select id="filter" aria-label="Filter">
        <option value="all">All dogs</option>
        <option value="pet">Pet dogs</option>
        <option value="community">Community dogs</option>
        <option value="unvacc">Not vaccinated</option>
        <option value="unster">Not sterilized</option>
      </select>
    </div>
    <div class="panel dogs" id="dogPanel">
      <div class="grid-head" id="dogHead" hidden>
        <span>Dog</span><span>Type</span><span data-admin-only>Caretaker / contact</span><span>Area</span><span>Vaccinated</span><span>Sterilized</span><span></span>
      </div>
      <div id="dogRows"></div>
      <div class="state" id="dogState"><p>Loading…</p></div>
    </div>
  </section>

  <section data-view="messages" hidden>
    <div class="page-head">
      <div><h1>Messages</h1><p class="summary">Anonymous conversations with people who scanned a tag. Phone numbers stay hidden on both sides.</p></div>
    </div>
    <div class="panel inbox" id="inbox">
      <div class="conv-list" id="convList"><div class="state"><p>Loading…</p></div></div>
      <div class="thread" id="thread"><div class="thread-empty">Select a conversation to read it.</div></div>
    </div>
  </section>

  ${IS_ADMIN ? `
  <section data-view="caretakers" hidden>
    <div class="page-head">
      <div><h1>Caretakers</h1><p class="summary" id="ctSummary">Loading…</p></div>
      <button class="btn btn-primary" id="addCt" type="button">${icon("plus")}<span class="btn-label">Add caretaker</span></button>
    </div>
    <div class="panel cts">
      <div class="grid-head" id="ctHead" hidden><span>Name</span><span>Phone</span><span>Area</span><span>Dogs</span><span>Last signed in</span><span></span></div>
      <div id="ctRows"></div>
      <div class="state" id="ctState"><p>Loading…</p></div>
    </div>
  </section>` : ""}
</main>

<dialog id="dogDrawer" class="drawer">
  <form id="dogForm" novalidate>
    <header class="drawer-head">
      <div><h2 id="dogTitle">Add dog</h2><p id="dogSub" class="sub"></p></div>
      <button type="button" class="icon-btn" data-close aria-label="Close">${icon("x")}</button>
    </header>
    <div class="drawer-body">
      <section class="fsec">
        <h3>Dog details <small>Shown on the public page</small></h3>
        <div class="photo-row" id="photoField" hidden>
          <span class="avatar lg" id="pv"></span>
          <div><label class="btn btn-sm" for="photo">Upload photo</label><span class="hint">JPEG or PNG. Resized automatically.</span></div>
          <input type="file" id="photo" accept="image/*" class="sr-only">
        </div>
        <div class="grid2">
          <label class="field"><span>Name <b class="req">*</b></span><input name="name" maxlength="80" required autocomplete="off"></label>
          <label class="field"><span>Type</span><select name="dog_type"><option value="pet">Pet dog</option><option value="community">Community dog</option></select></label>
          <label class="field"><span>Breed / colour</span><input name="breed" maxlength="80" placeholder="e.g. Indie, brown" autocomplete="off"></label>
          <label class="field"><span>Gender</span><select name="gender"><option value="">Not specified</option><option value="male">Male</option><option value="female">Female</option></select></label>
        </div>
        <label class="field"><span>Area</span><input name="area" maxlength="120" placeholder="e.g. Alandi, Pune" autocomplete="off"></label>
        <label class="field"><span>Notes</span><textarea name="notes" rows="3" maxlength="1000" placeholder="Temperament, medical needs, where the dog is usually fed…"></textarea></label>
      </section>
      <section class="fsec">
        <h3>Health <small>Shown on the public page</small></h3>
        <div class="check-row"><label class="check"><input type="checkbox" name="vaccinated">Vaccinated (anti-rabies)</label><input type="date" name="vaccinated_date" aria-label="Vaccination date"></div>
        <div class="check-row"><label class="check"><input type="checkbox" name="sterilized">Sterilized</label><input type="date" name="sterilized_date" aria-label="Sterilization date"></div>
      </section>
      <section class="fsec" data-admin-only>
        <h3>Messages</h3>
        <label class="field"><span>Caretaker account</span><select name="caretaker_id" id="ctSelect"></select>
          <span class="hint">Messages from finders go to this caretaker. Admins can always read them too.</span></label>
      </section>
      <section class="fsec" data-admin-only>
        <h3>Private contact <small>Admins only</small></h3>
        <div class="grid2">
          <label class="field"><span>Owner / caretaker name</span><input name="owner_name" maxlength="80" autocomplete="off"></label>
          <label class="field"><span>Phone</span><input name="phone" inputmode="tel" placeholder="98765 43210" autocomplete="off"></label>
        </div>
        <span class="hint" style="margin:-4px 0 12px">Never shown publicly. For dogs with a caretaker account this follows their profile.</span>
      </section>
      <section class="fsec">
        <h3>Private</h3>
        <label class="field"><span>Full address</span><textarea name="address" rows="2" maxlength="400"></textarea><span class="hint">Never shown publicly.</span></label>
      </section>
      <p class="form-error" id="dogErr" role="alert"></p>
    </div>
    <footer class="drawer-foot">
      <button type="button" class="btn btn-ghost-danger" id="dogDel">Delete</button>
      <span class="spacer"></span>
      <button type="button" class="btn" data-close>Cancel</button>
      <button type="submit" class="btn btn-primary" id="dogSave">Save</button>
    </footer>
  </form>
</dialog>

${IS_ADMIN ? `
<dialog id="ctDrawer" class="drawer">
  <form id="ctForm" novalidate>
    <header class="drawer-head">
      <div><h2 id="ctTitle">Add caretaker</h2><p class="sub" id="ctSub">They get a personal login link to manage their dogs and read messages.</p></div>
      <button type="button" class="icon-btn" data-close aria-label="Close">${icon("x")}</button>
    </header>
    <div class="drawer-body">
      <section class="fsec">
        <label class="field"><span>Name <b class="req">*</b></span><input name="name" maxlength="80" required autocomplete="off"></label>
        <label class="field"><span>Phone</span><input name="phone" inputmode="tel" placeholder="98765 43210" autocomplete="off"><span class="hint">Admins only. Never shown to the public or to finders.</span></label>
        <label class="field"><span>Area</span><input name="area" maxlength="120" placeholder="e.g. Alandi" autocomplete="off"></label>
      </section>
      <p class="form-error" id="ctErr" role="alert"></p>
    </div>
    <footer class="drawer-foot">
      <button type="button" class="btn btn-ghost-danger" id="ctDel">Delete</button>
      <span class="spacer"></span>
      <button type="button" class="btn" data-close>Cancel</button>
      <button type="submit" class="btn btn-primary" id="ctSave">Save</button>
    </footer>
  </form>
</dialog>

<dialog id="linkModal" class="modal">
  <header class="modal-head"><h2 id="linkTitle">Login link</h2><button type="button" class="icon-btn" data-close aria-label="Close">${icon("x")}</button></header>
  <div class="modal-body">
    <p id="linkText"></p>
    <div class="copy-row"><input id="linkUrl" readonly aria-label="Login link"><button class="btn" id="linkCopy" type="button">${icon("copy")}Copy</button></div>
  </div>
  <footer class="modal-foot">
    <a class="btn" id="linkWa" target="_blank" rel="noopener">Send on WhatsApp</a>
    <button class="btn btn-primary" type="button" data-close>Done</button>
  </footer>
</dialog>` : ""}

<dialog id="qrModal" class="modal">
  <header class="modal-head"><h2 id="qrTitle">QR tag</h2><button type="button" class="icon-btn" data-close aria-label="Close">${icon("x")}</button></header>
  <div class="modal-body">
    <img id="qrImg" class="qr-img" alt="QR tag preview">
    <div class="copy-row"><input id="qrUrl" readonly aria-label="Profile link"><button class="btn" id="qrCopy" type="button">${icon("copy")}Copy</button></div>
  </div>
  <footer class="modal-foot">
    <a class="btn" id="qrOpen" target="_blank" rel="noopener">${icon("external")}Open page</a>
    <button class="btn" id="qrShare" type="button">${icon("share")}Share</button>
    <button class="btn btn-primary" id="qrDownload" type="button">${icon("download")}Download PNG</button>
  </footer>
</dialog>

<dialog id="confirm" class="modal">
  <form method="dialog">
    <div class="modal-body"><h2 id="confirmTitle" class="confirm-title"></h2><p id="confirmText" class="sub"></p></div>
    <footer class="modal-foot"><button class="btn" value="no">Cancel</button><button class="btn btn-danger" value="yes" id="confirmOk">Delete</button></footer>
  </form>
</dialog>

<div id="toast" class="toast" role="status"></div>`;

// ---------- shared helpers ----------
let signedOut = false;
const api = async (path, opts = {}) => {
  if (opts.body && typeof opts.body === "string") opts.headers = { "content-type": "application/json", ...opts.headers };
  const res = await fetch(API + path, opts);
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    showSignedOut();
    throw new Error("You're signed out.");
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
};

function showSignedOut() {
  if (signedOut) return;
  signedOut = true;
  document.querySelector(".tabs").hidden = true;
  if (!IS_ADMIN) {
    $("#main").innerHTML = `<div class="panel"><div class="state"><h3>You're signed out</h3><p>Open your personal login link again, or ask an admin to send you a new one.</p></div></div>`;
    return;
  }
  $("#main").innerHTML = `
    <form class="panel signin" id="signin" novalidate>
      <h1>Admin sign in</h1>
      <p class="sub">Enter the admin password to manage dogs, caretakers and messages.</p>
      <label class="field"><span>Password</span><input type="password" id="adminPassword" autocomplete="current-password" required></label>
      <p class="form-error" id="signinErr" role="alert"></p>
      <button class="btn btn-primary" type="submit" id="signinBtn">Sign in</button>
      <p class="sub signin-alt">Caretakers don't use this page. They sign in with the personal link an admin sends them.</p>
    </form>`;
  $("#adminPassword").focus();
  $("#signin").onsubmit = async (e) => {
    e.preventDefault();
    const btn = $("#signinBtn");
    btn.disabled = true;
    $("#signinErr").textContent = "";
    try {
      const res = await fetch("/api/auth/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: $("#adminPassword").value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't sign in.");
      location.reload();
    } catch (err) {
      $("#signinErr").textContent = err.message;
      btn.disabled = false;
    }
  };
}

let toastTimer;
function toast(text, bad = false) {
  const t = $("#toast");
  // Open dialogs sit in the top layer, so the toast must live inside one to be visible.
  (document.querySelector("dialog[open]") || document.body).appendChild(t);
  t.textContent = text;
  t.classList.toggle("bad", bad);
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

async function copyText(text, input) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied");
  } catch {
    input?.select();
    toast("Press Ctrl+C to copy", true);
  }
}

document.addEventListener("click", (e) => {
  const c = e.target.closest("[data-close]");
  if (c) c.closest("dialog").close();
});
// Clicking the backdrop closes small modals (not the forms, to avoid losing typed data).
for (const d of document.querySelectorAll(".modal")) {
  d.addEventListener("click", (e) => { if (e.target === d) d.close(); });
}

function confirmDialog(title, text, okLabel = "Delete") {
  const d = $("#confirm");
  $("#confirmTitle").textContent = title;
  $("#confirmText").textContent = text;
  $("#confirmOk").textContent = okLabel;
  d.returnValue = "";
  d.showModal();
  return new Promise((resolve) => d.addEventListener("close", () => resolve(d.returnValue === "yes"), { once: true }));
}

function markInvalid(form) {
  let first = null;
  for (const el of form.querySelectorAll("[required]")) {
    const bad = !el.value.trim();
    el.classList.toggle("invalid", bad);
    if (bad && !first) first = el;
  }
  first?.focus();
  return !!first;
}

function formValues(form) {
  const body = {};
  for (const el of form.elements) {
    if (!el.name || el.disabled) continue;
    body[el.name] = el.type === "checkbox" ? el.checked : el.value;
  }
  return body;
}

// ---------- tabs ----------
const VIEWS = IS_ADMIN ? ["dogs", "messages", "caretakers"] : ["dogs", "messages"];
let view = "dogs";

function route() {
  if (signedOut) return;
  view = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "dogs";
  for (const s of document.querySelectorAll("[data-view]")) s.hidden = s.dataset.view !== view;
  for (const a of document.querySelectorAll("[data-tab]")) {
    if (a.dataset.tab === view) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
  if (view === "messages") loadInbox();
  if (view === "caretakers") loadCaretakers();
}
window.addEventListener("hashchange", route);

// ---------- dogs ----------
let dogs = [];
let caretakers = [];
let photosEnabled = false;
let editingDog = null;
let pendingPhoto = null;

const FILTERS = {
  all: () => true,
  pet: (d) => d.dog_type !== "community",
  community: (d) => d.dog_type === "community",
  unvacc: (d) => !d.vaccinated,
  unster: (d) => !d.sterilized,
};

async function loadDogs() {
  try {
    dogs = await api("/dogs");
    renderDogs();
  } catch (e) {
    if (!signedOut) $("#dogState").innerHTML = `<h3>Couldn't load dogs</h3><p>${esc(e.message)}</p>`;
  }
}

const avatar = (d) =>
  `<span class="avatar">${esc(d.name[0]?.toUpperCase())}${d.photo_key && photosEnabled
    ? `<img src="${photoUrl(d)}" alt="" loading="lazy" onerror="this.remove()">` : ""}</span>`;

const status = (on, date) =>
  on ? `<span class="status yes">Yes</span>${date ? `<div class="sub">${fmtDate(date)}</div>` : ""}` : `<span class="status no">No</span>`;

function contactCell(d) {
  if (d.caretaker_name) return `<div class="ellipsis">${esc(d.caretaker_name)}</div><div class="sub">Caretaker account</div>`;
  if (d.owner_name || d.phone) return `<div class="ellipsis">${esc(d.owner_name || "—")}</div><div class="sub">${fmtPhone(d.phone) || "No account"}</div>`;
  return `<span class="sub">—</span>`;
}

const dogRow = (d) => {
  const type = d.dog_type === "community" ? "Community" : "Pet";
  const who = IS_ADMIN ? d.caretaker_name || d.owner_name : null;
  return `
<div class="row" data-id="${d.id}">
  <div class="c-main">${avatar(d)}<div class="ellipsis"><button class="name ellipsis" type="button" data-act="edit">${esc(d.name)}</button><div class="sub mono">#${d.id}</div></div></div>
  <div class="c-col">${type}</div>
  ${IS_ADMIN ? `<div class="c-col">${contactCell(d)}</div>` : ""}
  <div class="c-col ellipsis">${esc(d.area || "—")}</div>
  <div class="c-col">${status(d.vaccinated, d.vaccinated_date)}</div>
  <div class="c-col">${status(d.sterilized, d.sterilized_date)}</div>
  <div class="c-act">
    <button class="icon-btn" type="button" data-act="qr" title="QR tag" aria-label="QR tag for ${esc(d.name)}">${icon("qr")}</button>
    <button class="icon-btn" type="button" data-act="edit" title="Edit" aria-label="Edit ${esc(d.name)}">${icon("edit")}</button>
  </div>
  <div class="m-meta">
    <div class="ellipsis">${[type, who && esc(who), d.area && esc(d.area)].filter(Boolean).join(" · ")}</div>
    <span class="status ${d.vaccinated ? "yes" : "no"}">${d.vaccinated ? "Vaccinated" : "Not vaccinated"}</span><span class="status ${d.sterilized ? "yes" : "no"}">${d.sterilized ? "Sterilized" : "Not sterilized"}</span>
  </div>
</div>`;
};

function renderDogs() {
  const n = dogs.length;
  const count = (f) => dogs.filter(f).length;
  $("#summary").textContent = n
    ? `${n} registered · ${count((d) => d.vaccinated)} vaccinated · ${count((d) => d.sterilized)} sterilized · ${count(FILTERS.community)} community`
    : "No dogs registered yet";
  const q = $("#q").value.trim().toLowerCase();
  const rows = dogs.filter(FILTERS[$("#filter").value]).filter((d) =>
    !q || [d.name, d.area, d.id, d.owner_name, d.caretaker_name].some((v) => (v || "").toLowerCase().includes(q))
  );
  $("#dogRows").innerHTML = rows.map(dogRow).join("");
  $("#dogHead").hidden = !rows.length;
  $("#dogState").innerHTML = !n
    ? `<h3>No dogs yet</h3><p>Add a dog to create its public profile and printable QR tag.</p>
       <p><button class="btn btn-primary" type="button" data-act="add">${icon("plus")}Add dog</button></p>`
    : rows.length ? "" : `<h3>No matching dogs</h3><p>Try a different search or filter.</p>`;
}

$("#q").oninput = renderDogs;
$("#filter").onchange = renderDogs;
$("#addDog").onclick = () => openDogForm(null);

$("#dogPanel").onclick = (e) => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  if (b.dataset.act === "add") return openDogForm(null);
  const dog = dogs.find((d) => d.id === b.closest(".row").dataset.id);
  if (b.dataset.act === "edit") openDogForm(dog);
  if (b.dataset.act === "qr") showQr(dog);
};

const dogForm = $("#dogForm");

function syncDogForm() {
  for (const k of ["vaccinated", "sterilized"]) dogForm.elements[`${k}_date`].disabled = !dogForm.elements[k].checked;
}
dogForm.addEventListener("change", syncDogForm);

function setPreview(src, letter) {
  $("#pv").innerHTML = src ? `<img src="${src}" alt="">` : esc(letter || "");
}

function fillCaretakerSelect() {
  if (!IS_ADMIN) return;
  $("#ctSelect").innerHTML = `<option value="">No account (admins handle messages)</option>` +
    caretakers.map((c) => `<option value="${c.id}">${esc(c.name)}${c.area ? ` · ${esc(c.area)}` : ""}</option>`).join("");
}

function openDogForm(dog) {
  editingDog = dog || null;
  pendingPhoto = null;
  dogForm.reset();
  fillCaretakerSelect();
  $("#dogErr").textContent = "";
  for (const el of dogForm.querySelectorAll(".invalid")) el.classList.remove("invalid");
  $("#dogTitle").textContent = dog ? dog.name : "Add dog";
  $("#dogSub").textContent = dog ? `ID ${dog.id}` : "Creates a public profile and a QR tag.";
  $("#dogDel").hidden = !dog;
  $("#photoField").hidden = !photosEnabled;
  if (dog) {
    for (const [k, v] of Object.entries(dog)) {
      const el = dogForm.elements[k];
      if (!el) continue;
      if (el.type === "checkbox") el.checked = !!v;
      else el.value = v ?? "";
    }
    dogForm.elements.phone.value = localPhone(dog.phone);
  }
  setPreview(dog?.photo_key ? photoUrl(dog) : null, dog?.name[0]?.toUpperCase());
  syncDogForm();
  $("#dogDrawer").showModal();
  $("#dogDrawer .drawer-body").scrollTop = 0;
}

$("#photo").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    pendingPhoto = await resizeImage(file, 800);
    setPreview(URL.createObjectURL(pendingPhoto));
  } catch (err) {
    toast(err.message, true);
  }
  e.target.value = "";
};

// Shrink to max 800px JPEG so public pages load fast on cheap phones.
function resizeImage(file, max) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't read that photo"))), "image/jpeg", 0.82);
    };
    img.onerror = () => reject(new Error("Couldn't read that photo"));
    img.src = URL.createObjectURL(file);
  });
}

dogForm.onsubmit = async (e) => {
  e.preventDefault();
  if (markInvalid(dogForm)) return ($("#dogErr").textContent = "Fill in the required fields.");
  const body = formValues(dogForm);
  const save = $("#dogSave");
  save.disabled = true;
  save.textContent = "Saving…";
  $("#dogErr").textContent = "";
  try {
    let id = editingDog?.id;
    if (id) await api(`/dogs/${id}`, { method: "PUT", body: JSON.stringify(body) });
    else ({ id } = await api("/dogs", { method: "POST", body: JSON.stringify(body) }));
    if (pendingPhoto) await api(`/dogs/${id}/photo`, { method: "PUT", headers: { "content-type": "image/jpeg" }, body: pendingPhoto });
    const wasNew = !editingDog;
    $("#dogDrawer").close();
    toast(wasNew ? `${body.name} added` : "Changes saved");
    await loadDogs();
    if (wasNew) {
      const dog = dogs.find((d) => d.id === id);
      if (dog) showQr(dog);
    }
  } catch (err) {
    $("#dogErr").textContent = err.message;
  } finally {
    save.disabled = false;
    save.textContent = "Save";
  }
};

$("#dogDel").onclick = async () => {
  const dog = editingDog;
  const ok = await confirmDialog(`Delete ${dog.name}?`, "The profile page, QR tag and all messages about this dog will be removed. This can't be undone.");
  if (!ok) return;
  try {
    await api(`/dogs/${dog.id}`, { method: "DELETE" });
    $("#dogDrawer").close();
    toast(`${dog.name} deleted`);
    loadDogs();
  } catch (err) {
    toast(err.message, true);
  }
};

// ---------- QR tag ----------
let qrCanvas = null;
let qrDog = null;
const FONT = "Inter, Arial, sans-serif";

// Printable black-and-white tag: heading, QR code, dog name and ID inside a cut line.
function tagCanvas(dog) {
  const W = 720, pad = 64, qrSize = W - pad * 2, top = 120, foot = 160;
  const qr = qrcode(0, "M");
  qr.addData(profileUrl(dog));
  qr.make();

  const c = document.createElement("canvas");
  c.width = W;
  c.height = top + qrSize + foot;
  const x = c.getContext("2d");
  x.fillStyle = "#fff";
  x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = "#111";
  x.lineWidth = 3;
  x.strokeRect(10, 10, c.width - 20, c.height - 20);

  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillStyle = "#111";
  x.font = `700 36px ${FONT}`;
  x.fillText("IF FOUND, PLEASE SCAN", W / 2, top / 2 + 14);

  // Modules with a 2-module quiet zone, snapped to whole pixels for crisp printing.
  const n = qr.getModuleCount();
  const cell = Math.floor(qrSize / (n + 4));
  const ox = Math.round((W - cell * n) / 2);
  const oy = top + Math.round((qrSize - cell * n) / 2);
  for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) {
    if (qr.isDark(r, col)) x.fillRect(ox + col * cell, oy + r * cell, cell, cell);
  }

  const nameY = top + qrSize + 50;
  let size = 58;
  do x.font = `700 ${(size -= 2)}px ${FONT}`; while (x.measureText(dog.name).width > W - pad * 2 && size > 26);
  x.fillText(dog.name, W / 2, nameY);
  x.fillStyle = "#555";
  x.font = `500 26px ${FONT}`;
  x.fillText(`Message my ${dog.dog_type === "community" ? "caretaker" : "owner"} · ID ${dog.id}`, W / 2, nameY + 56);
  return c;
}

async function showQr(dog) {
  qrDog = dog;
  await document.fonts.ready;
  try {
    qrCanvas = tagCanvas(dog);
  } catch {
    return toast("Couldn't create the QR code. Reload and try again.", true);
  }
  $("#qrTitle").textContent = `QR tag · ${dog.name}`;
  $("#qrImg").src = qrCanvas.toDataURL("image/png");
  $("#qrUrl").value = profileUrl(dog);
  $("#qrOpen").href = profileUrl(dog);
  $("#qrShare").hidden = !navigator.share;
  $("#qrModal").showModal();
}

const qrFileName = () => `qr-${qrDog.name.replace(/[^\w-]+/g, "_")}-${qrDog.id}.png`;

$("#qrDownload").onclick = () => {
  const a = document.createElement("a");
  a.download = qrFileName();
  a.href = qrCanvas.toDataURL("image/png");
  a.click();
};
$("#qrCopy").onclick = () => copyText(profileUrl(qrDog), $("#qrUrl"));
$("#qrShare").onclick = async () => {
  try {
    const blob = await new Promise((r) => qrCanvas.toBlob(r, "image/png"));
    const file = new File([blob], qrFileName(), { type: "image/png" });
    const data = navigator.canShare?.({ files: [file] })
      ? { files: [file], title: `${qrDog.name} QR tag` }
      : { url: profileUrl(qrDog), title: `${qrDog.name} · Dog ID` };
    await navigator.share(data);
  } catch (err) {
    if (err.name !== "AbortError") toast("Sharing isn't available here", true);
  }
};

// ---------- messages ----------
let convs = [];
let openConvId = null;
let openConvCount = 0;

async function loadInbox() {
  try {
    convs = await api("/inbox");
    renderConvList();
  } catch (e) {
    if (!signedOut) $("#convList").innerHTML = `<div class="state"><h3>Couldn't load messages</h3><p>${esc(e.message)}</p></div>`;
  }
}

function senderLabel(sender, finderName) {
  if (sender === ROLE) return "You";
  if (sender === "finder") return finderName || "Finder";
  return sender === "admin" ? "Admin" : "Caretaker";
}

function renderConvList() {
  const unread = convs.filter((c) => c.unread_staff).length;
  $("#unread").hidden = !unread;
  $("#unread").textContent = unread;
  $("#convList").innerHTML = convs.length
    ? convs.map((c) => `
      <button class="conv${c.unread_staff ? " unread" : ""}" type="button" data-id="${c.id}" aria-current="${c.id === openConvId}">
        <div class="conv-top"><b class="ellipsis">${esc(c.dog_name)}</b><span class="sub">${ago(c.last_message_at)}</span></div>
        <div class="conv-from ellipsis">${esc(c.finder_name || "Anonymous finder")}</div>
        <div class="conv-last ellipsis">${c.last_sender === "finder" ? "" : `${senderLabel(c.last_sender)}: `}${esc(c.last_body)}</div>
      </button>`).join("")
    : `<div class="state"><h3>No messages yet</h3><p>When someone scans a tag and sends a message, it appears here.</p></div>`;
}

$("#convList").onclick = (e) => {
  const b = e.target.closest(".conv");
  if (b) openThread(b.dataset.id);
};

function bubbles(c) {
  return c.messages.map((m) => `
    <div class="msg${m.sender === ROLE ? " mine" : ""}"><span class="who">${esc(senderLabel(m.sender, c.finder_name))}</span>${linkify(m.body)}<span class="when">${fmtTime(m.created_at)}</span></div>`).join("");
}

async function openThread(id) {
  openConvId = id;
  $("#inbox").classList.add("show-thread");
  $("#thread").innerHTML = `<div class="thread-empty">Loading…</div>`;
  try {
    const c = await api(`/inbox/${id}`);
    openConvCount = c.messages.length;
    $("#thread").innerHTML = `
      <div class="thread-head">
        <button class="icon-btn back" type="button" id="threadBack" aria-label="Back to conversations">${icon("back")}</button>
        <div class="thread-title"><b>${esc(c.dog_name)}</b><div class="sub ellipsis">${esc(c.finder_name || "Anonymous finder")} · started ${fmtTime(c.created_at)}</div></div>
        <a class="btn btn-sm" href="/d/${c.dog_id}" target="_blank" rel="noopener">View dog</a>
      </div>
      <div class="msgs" id="msgs">${bubbles(c)}</div>
      <form class="composer" id="composer" novalidate>
        <textarea id="replyBox" maxlength="1000" placeholder="Write a reply…" aria-label="Reply"></textarea>
        <button class="btn btn-primary" type="submit">Send</button>
      </form>
      <p class="thread-note">The finder sees your reply as "${IS_ADMIN ? "Volunteer team" : "Caretaker"}". Your phone number stays hidden.</p>`;
    $("#msgs").scrollTop = $("#msgs").scrollHeight;
    $("#threadBack").onclick = () => { openConvId = null; $("#inbox").classList.remove("show-thread"); renderConvList(); };
    $("#composer").onsubmit = sendReply;
    $("#replyBox").onkeydown = (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendReply(e); };
    const item = convs.find((x) => x.id === id);
    if (item && (!IS_ADMIN || !c.has_caretaker)) item.unread_staff = 0;
    renderConvList();
  } catch (err) {
    $("#thread").innerHTML = `<div class="thread-empty">${esc(err.message)}</div>`;
  }
}

async function refreshThread() {
  if (!openConvId || !$("#msgs")) return;
  const c = await api(`/inbox/${openConvId}`);
  if (c.messages.length === openConvCount) return;
  openConvCount = c.messages.length;
  const box = $("#msgs");
  const atBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 40;
  box.innerHTML = bubbles(c);
  if (atBottom) box.scrollTop = box.scrollHeight;
}

async function sendReply(e) {
  e.preventDefault();
  const box = $("#replyBox");
  const text = box.value.trim();
  if (!text) return;
  box.disabled = true;
  try {
    await api(`/inbox/${openConvId}`, { method: "POST", body: JSON.stringify({ body: text }) });
    box.value = "";
    await refreshThread();
    $("#msgs").scrollTop = $("#msgs").scrollHeight;
    loadInbox();
  } catch (err) {
    toast(err.message, true);
  } finally {
    box.disabled = false;
    box.focus();
  }
}

// No push notifications yet: keep the unread badge and open thread fresh while the dashboard is open.
setInterval(() => {
  if (document.hidden || signedOut) return;
  loadInbox();
  if (view === "messages") refreshThread().catch(() => {});
}, 15000);

// ---------- caretakers (admin) ----------
let editingCt = null;

async function loadCaretakers() {
  if (!IS_ADMIN) return;
  try {
    caretakers = await api("/caretakers");
    renderCaretakers();
  } catch (e) {
    if (!signedOut && $("#ctState")) $("#ctState").innerHTML = `<h3>Couldn't load caretakers</h3><p>${esc(e.message)}</p>`;
  }
}

function renderCaretakers() {
  const n = caretakers.length;
  $("#ctSummary").textContent = n
    ? `${n} caretaker${n === 1 ? "" : "s"}. Each signs in with a personal link and sees only their own dogs and messages.`
    : "Caretakers sign in with a personal link and see only their own dogs and messages.";
  $("#ctHead").hidden = !n;
  $("#ctRows").innerHTML = caretakers.map((c) => `
    <div class="row" data-id="${c.id}">
      <div class="c-main"><span class="avatar round">${esc(c.name[0]?.toUpperCase())}</span><div class="ellipsis"><button class="name ellipsis" type="button" data-act="edit">${esc(c.name)}</button></div></div>
      <div class="c-col">${fmtPhone(c.phone) || "—"}</div>
      <div class="c-col ellipsis">${esc(c.area || "—")}</div>
      <div class="c-col">${c.dog_count}</div>
      <div class="c-col">${c.last_login_at ? ago(c.last_login_at) + (ago(c.last_login_at) === "now" ? "" : " ago") : `<span class="sub">Never</span>`}</div>
      <div class="c-act">
        <button class="icon-btn" type="button" data-act="link" title="New login link" aria-label="New login link for ${esc(c.name)}">${icon("link")}</button>
        <button class="icon-btn" type="button" data-act="edit" title="Edit" aria-label="Edit ${esc(c.name)}">${icon("edit")}</button>
      </div>
      <div class="m-meta"><div class="ellipsis">${[fmtPhone(c.phone), c.area && esc(c.area), `${c.dog_count} dog${c.dog_count === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}</div></div>
    </div>`).join("");
  $("#ctState").innerHTML = n ? "" : `<h3>No caretakers yet</h3><p>Add feeders and owners so they can register their own dogs, print QR tags and answer messages.</p>
    <p><button class="btn btn-primary" type="button" data-act="add">${icon("plus")}Add caretaker</button></p>`;
}

if (IS_ADMIN) {
  const ctForm = $("#ctForm");

  const openCtForm = (c) => {
    editingCt = c || null;
    ctForm.reset();
    $("#ctErr").textContent = "";
    for (const el of ctForm.querySelectorAll(".invalid")) el.classList.remove("invalid");
    $("#ctTitle").textContent = c ? c.name : "Add caretaker";
    $("#ctDel").hidden = !c;
    if (c) {
      ctForm.elements.name.value = c.name;
      ctForm.elements.phone.value = localPhone(c.phone);
      ctForm.elements.area.value = c.area || "";
    }
    $("#ctDrawer").showModal();
  };

  const showLink = (c, token) => {
    const url = `${location.origin}/login/#${token}`;
    $("#linkTitle").textContent = `Login link · ${c.name}`;
    $("#linkText").textContent = `Send this private link to ${c.name}. Opening it signs them in on that phone, with no password. Anyone with the link can manage their dogs, so share it only with them. Making a new link turns this one off.`;
    $("#linkUrl").value = url;
    const wa = $("#linkWa");
    wa.hidden = !c.phone;
    if (c.phone) wa.href = `https://wa.me/${c.phone}?text=${encodeURIComponent(`Hi ${c.name}, here is your Dog ID login link. Keep it private:\n${url}`)}`;
    $("#linkModal").showModal();
  };

  $("#linkCopy").onclick = () => copyText($("#linkUrl").value, $("#linkUrl"));
  $("#addCt").onclick = () => openCtForm(null);

  document.querySelector(".cts").onclick = async (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    if (b.dataset.act === "add") return openCtForm(null);
    const c = caretakers.find((x) => x.id === b.closest(".row").dataset.id);
    if (b.dataset.act === "edit") openCtForm(c);
    if (b.dataset.act === "link") {
      const ok = await confirmDialog(`New login link for ${c.name}?`, "Their current link will stop working, and they'll need the new one to sign in again.", "Create new link");
      if (!ok) return;
      try {
        const { token } = await api(`/caretakers/${c.id}/link`, { method: "POST" });
        showLink(c, token);
      } catch (err) {
        toast(err.message, true);
      }
    }
  };

  ctForm.onsubmit = async (e) => {
    e.preventDefault();
    if (markInvalid(ctForm)) return ($("#ctErr").textContent = "Fill in the required fields.");
    const body = formValues(ctForm);
    const save = $("#ctSave");
    save.disabled = true;
    try {
      if (editingCt) {
        await api(`/caretakers/${editingCt.id}`, { method: "PUT", body: JSON.stringify(body) });
        $("#ctDrawer").close();
        toast("Changes saved");
        await loadCaretakers();
      } else {
        const { id, token } = await api("/caretakers", { method: "POST", body: JSON.stringify(body) });
        $("#ctDrawer").close();
        await loadCaretakers();
        showLink(caretakers.find((x) => x.id === id) || { name: body.name }, token);
      }
      loadDogs();
    } catch (err) {
      $("#ctErr").textContent = err.message;
    } finally {
      save.disabled = false;
    }
  };

  $("#ctDel").onclick = async () => {
    const c = editingCt;
    const ok = await confirmDialog(`Delete ${c.name}?`, "Their login link stops working. Their dogs stay registered, and admins will receive messages about them instead.");
    if (!ok) return;
    try {
      await api(`/caretakers/${c.id}`, { method: "DELETE" });
      $("#ctDrawer").close();
      toast(`${c.name} deleted`);
      loadCaretakers();
      loadDogs();
    } catch (err) {
      toast(err.message, true);
    }
  };
}

// ---------- start ----------
$("#logout").onclick = async () => {
  await fetch(`${API}/logout`, { method: "POST" }).catch(() => {});
  if (IS_ADMIN) location.reload();
  else location.href = "/login/?out=1";
};

(async () => {
  try {
    const config = await api("/config");
    photosEnabled = config.photos;
    $("#me").textContent = config.me.email || config.me.name || "";
    $("#logout").hidden = !config.can_sign_out;
  } catch {
    return;
  }
  route();
  await Promise.all([loadDogs(), loadInbox(), loadCaretakers()]);
})();
