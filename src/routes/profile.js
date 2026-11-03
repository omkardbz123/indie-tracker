import { validId } from "../lib/util.js";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDate = (d) => (d ? `${+d.slice(8, 10)} ${MONTHS[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}` : "");

const svg = (body) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
const I = {
  chat: svg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
  lock: svg('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
};

const CSS = `
:root{--text:#111827;--text-2:#374151;--muted:#6b7280;--border:#e5e7eb;--soft:#f9fafb;--green:#16a34a}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:#f3f4f6;color:var(--text);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans",sans-serif;-webkit-font-smoothing:antialiased}
.i{width:18px;height:18px;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.page{max-width:560px;margin:0 auto;min-height:100vh;background:#fff;padding-bottom:calc(84px + env(safe-area-inset-bottom))}
@media (min-width:561px){.page{border-left:1px solid var(--border);border-right:1px solid var(--border)}}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid var(--border)}
.wordmark{display:flex;align-items:center;gap:8px;font-weight:600;font-size:14px;color:var(--text);text-decoration:none}
.mark{width:22px;height:22px;border-radius:5px;background:var(--text);color:#fff;display:grid;place-items:center;font-size:12px;font-weight:700}
.tagid{font:12px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--muted)}
.photo{position:relative;aspect-ratio:4/3;background:#f3f4f6}
.photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.intro{padding:24px 20px 20px}
.label{font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:0}
h1{font-size:30px;line-height:1.2;font-weight:700;letter-spacing:-.015em;margin:6px 0 4px;overflow-wrap:anywhere}
.callout{margin:0 20px 4px;padding:12px 14px;border-left:3px solid var(--text);background:var(--soft);color:var(--text-2);font-size:15px}
.section{padding:20px;border-top:1px solid var(--border);margin-top:20px}
.section + .section{margin-top:0}
h2{font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:0 0 12px}
dl{display:grid;grid-template-columns:max-content 1fr;gap:10px 24px;margin:0}
dt{color:var(--muted)}dd{margin:0;font-weight:500;overflow-wrap:anywhere}
.status{display:inline-flex;align-items:center;gap:8px}
.status::before{content:"";width:7px;height:7px;border-radius:50%;background:#d1d5db}
.status.yes::before{background:var(--green)}.status.no{color:var(--muted)}
.notes{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--text-2)}
.privacy{display:flex;gap:10px;margin:0;color:var(--text-2);font-size:15px}.privacy .i{margin-top:3px;color:var(--muted)}
.foot{padding:16px 20px 24px;text-align:center;color:var(--muted);font-size:13px}
.bar{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid var(--border);padding:12px 16px calc(12px + env(safe-area-inset-bottom))}
.bar-in{max-width:528px;margin:0 auto}
.btn{display:flex;align-items:center;justify-content:center;gap:8px;height:52px;border-radius:8px;font-weight:600;font-size:16px;text-decoration:none;background:var(--text);color:#fff}
.nf{padding:64px 24px;text-align:center}.nf h1{font-size:24px}.nf p{color:var(--muted);max-width:340px;margin:8px auto 0}
`;

function page(title, inner, status = 200) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex"><meta name="theme-color" content="#ffffff">
<link rel="icon" href="/favicon.svg"><title>${esc(title)}</title><style>${CSS}</style></head>
<body>${inner}</body></html>`;
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": status === 200 ? "public, max-age=60" : "public, max-age=30",
    },
  });
}

const status = (on, date) =>
  on ? `<span class="status yes">Yes${date ? `, ${fmtDate(date)}` : ""}</span>` : `<span class="status no">No</span>`;

// Public profile. Shows only the dog's details; the owner/caretaker is reached through anonymous messages.
export async function onRequestGet({ env, params }) {
  if (!validId(params.id)) return notFound();
  const d = await env.DB.prepare(
    `SELECT id, name, dog_type, photo_key, breed, gender, sterilized, sterilized_date, vaccinated,
       vaccinated_date, area, notes FROM dogs WHERE id = ?`
  ).bind(params.id).first();
  if (!d) return notFound();

  const community = d.dog_type === "community";
  const role = community ? "caretaker" : "owner";
  const gender = d.gender ? d.gender[0].toUpperCase() + d.gender.slice(1) : null;
  const facts = [
    ["Breed / colour", d.breed && esc(d.breed)],
    ["Gender", gender],
    ["Area", d.area && esc(d.area)],
    ["Vaccinated", status(d.vaccinated, d.vaccinated_date)],
    ["Sterilized", status(d.sterilized, d.sterilized_date)],
  ].filter(([, v]) => v);
  const photo = d.photo_key && env.PHOTOS
    ? `<div class="photo"><img src="/api/photo/${d.id}/${d.photo_key}" alt="Photo of ${esc(d.name)}" fetchpriority="high" onerror="this.parentNode.remove()"></div>`
    : "";

  return page(
    `${d.name} · Dog ID`,
    `<div class="page">
<header class="topbar"><a class="wordmark" href="/"><span class="mark">D</span>Dog ID</a><span class="tagid">ID ${d.id}</span></header>
${photo}
<div class="intro">
  <p class="label">Registered ${community ? "community" : "pet"} dog</p>
  <h1>${esc(d.name)}</h1>
</div>
<p class="callout">${community
      ? "This is a community dog with a registered caretaker. If the dog looks lost, injured or unwell, please send the caretaker a message."
      : "If this dog is alone, it may be lost. Please send the owner a message."}</p>
<section class="section"><h2>Details</h2><dl>${facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl></section>
${d.notes ? `<section class="section"><h2>Notes</h2><p class="notes">${esc(d.notes)}</p></section>` : ""}
<section class="section"><h2>Contact</h2>
  <p class="privacy">${I.lock}<span>Messages are anonymous. You won't see the ${role}'s phone number, and they won't see yours.</span></p>
</section>
<p class="foot">Thank you for helping.</p>
</div>
<nav class="bar"><div class="bar-in">
  <a class="btn" href="/chat/?dog=${d.id}">${I.chat}Message the ${role}</a>
</div></nav>`
  );
}

function notFound() {
  return page(
    "Tag not found · Dog ID",
    `<div class="page"><header class="topbar"><a class="wordmark" href="/"><span class="mark">D</span>Dog ID</a></header>
<div class="nf"><h1>Tag not found</h1>
<p>This QR tag isn't registered or has been removed. If you found a dog, please contact a local animal rescue group.</p></div></div>`,
    404
  );
}
