// ----------------------------------------------------
// Active Schools Dashboard - Optimized to minimize downloads
// Functions 1 to 12, production-ready (UI unchanged)
// ----------------------------------------------------

// 1) Import Firebase Modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  onValue
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

// 2) Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAR3KIgxzn12zoWwF3rMs7b0FfP-qe3mO4",
  authDomain: "schools-cdce8.firebaseapp.com",
  databaseURL: "https://schools-cdce8-default-rtdb.firebaseio.com",
  projectId: "schools-cdce8",
  storageBucket: "schools-cdce8.firebasestorage.app",
  messagingSenderId: "772712220138",
  appId: "1:772712220138:web:381c173dccf1a6513fde93"
};

// 3) Init
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 4) DOM Elements (UI unchanged)
const studentCountEl = document.getElementById("studentCount");
const staffCountEl = document.getElementById("staffCount");
const totalEnrollmentEl = document.getElementById("totalEnrollment");
const uniqueSchoolsEl = document.getElementById("uniqueSchools");
const schoolListEl = document.getElementById("schoolList");
const searchBox = document.getElementById("searchBox");
const sortType = document.getElementById("sortType");
const dateWiseListEl = document.getElementById("dateWiseList");
const totalOnlineEl = document.getElementById("totalOnlineUsers");

// 5) Global State + Cache
let schoolsData = [];
let activeSchools = {};

const CACHE_KEY = "dashboard:v2:aggregates";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp) return null;
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
    return parsed.payload;
  } catch { return null; }
}
function writeCache(payload) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), payload }));
  } catch {}
}

// 6) Helpers (unchanged)
function normalizeName(name) {
  return (name || "").toString().trim().replace(/\s+/g, " ").toLowerCase();
}
function parseEnrollmentDate(enrollmentId) {
  const match = (enrollmentId || "").match(/\d{2}[A-Z]{3}/);
  if (!match) return null;
  const str = match[0];
  const day = parseInt(str.slice(0, 2));
  const months = { JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11 };
  const month = months[str.slice(2, 5)];
  if (month === undefined) return null;
  return new Date(new Date().getFullYear(), month, day);
}
function setText(el, val) { if (el) el.textContent = String(val); }

// 7) Load Dashboard Data (with cache)
async function loadDashboardData() {
  try {
    const cached = readCache();
    if (cached) {
      applyAggregatesToUI(cached);
      return;
    }

    const [studentsSnap, staffSnap] = await Promise.all([
      get(ref(db, "student")),
      get(ref(db, "staff"))
    ]);

    const students = studentsSnap.exists() ? studentsSnap.val() : {};
    const staff = staffSnap.exists() ? staffSnap.val() : {};

    let studentCount = 0, staffCount = 0;
    const schoolMap = {}, dateMap = {};

    // Process Students
    for (const key in students) {
      studentCount++;
      const s = students[key];
      const date = parseEnrollmentDate(key);
      if (date) {
        const d = date.toISOString().slice(0, 10);
        (dateMap[d] ??= { students: 0, staff: 0 }).students++;
      }
      const raw = s?.schoolName || "";
      if (raw) {
        const norm = normalizeName(raw);
        (schoolMap[norm] ??= { displayName: raw.trim(), students: 0, staff: 0 }).students++;
      }
    }

    // Process Staff
    for (const key in staff) {
      staffCount++;
      const st = staff[key];
      const date = parseEnrollmentDate(key);
      if (date) {
        const d = date.toISOString().slice(0, 10);
        (dateMap[d] ??= { students: 0, staff: 0 }).staff++;
      }
      const raw = st?.schoolName || "";
      if (raw) {
        const norm = normalizeName(raw);
        (schoolMap[norm] ??= { displayName: raw.trim(), students: 0, staff: 0 }).staff++;
      }
    }

    const aggregates = {
      studentCount,
      staffCount,
      totalEnrollment: studentCount + staffCount,
      uniqueSchools: Object.keys(schoolMap).length,
      schoolsData: Object.keys(schoolMap).map(norm => ({
        name: schoolMap[norm].displayName,
        normalized: norm,
        students: schoolMap[norm].students,
        staff: schoolMap[norm].staff,
        total: schoolMap[norm].students + schoolMap[norm].staff
      })),
      dateMap
    };

    applyAggregatesToUI(aggregates);
    writeCache(aggregates);
  } catch (err) {
    console.error("loadDashboardData error:", err);
    setText(studentCountEl, 0);
    setText(staffCountEl, 0);
    setText(totalEnrollmentEl, 0);
    setText(uniqueSchoolsEl, 0);
    schoolsData = [];
    renderSchools();
    renderDateWise({});
  }
}
function applyAggregatesToUI({ studentCount, staffCount, totalEnrollment, uniqueSchools, schoolsData: sd, dateMap }) {
  setText(studentCountEl, studentCount || 0);
  setText(staffCountEl, staffCount || 0);
  setText(totalEnrollmentEl, totalEnrollment || 0);
  setText(uniqueSchoolsEl, uniqueSchools || 0);
  schoolsData = Array.isArray(sd) ? sd : [];
  renderSchools();
  renderDateWise(dateMap || {});
}

// 8) Render Schools (UI unchanged)
function renderSchools() {
  if (!schoolListEl) return;
  let filtered = [...schoolsData];
  const searchVal = (searchBox?.value || "").toLowerCase();
  if (searchVal) filtered = filtered.filter(s => (s.name || "").toLowerCase().includes(searchVal));

  if (sortType) {
    if (sortType.value === "az") filtered.sort((a,b)=>a.name.localeCompare(b.name));
    else if (sortType.value === "za") filtered.sort((a,b)=>b.name.localeCompare(a.name));
    else if (sortType.value === "high") filtered.sort((a,b)=>b.total - a.total);
    else if (sortType.value === "low") filtered.sort((a,b)=>a.total - b.total);
  }

  const totalOnlineSchools = schoolsData.filter(s => activeSchools[s.normalized]).length;
  if (totalOnlineEl) totalOnlineEl.textContent = `Online Schools: ${totalOnlineSchools}`;

  schoolListEl.innerHTML = "";
  if (!filtered.length) {
    schoolListEl.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;background:#f9fafb;border-radius:16px;border:2px dashed #d1d5db;color:#6b7280;font-size:15px;">
      <i class="ri-search-eye-line" style="font-size:32px;color:#9ca3af;margin-bottom:10px;display:block;"></i>
      No schools found.<br>Try adjusting your search or filters.
    </div>`;
    return;
  }

  filtered.forEach(s => {
    const card = document.createElement("div");
    card.className = "school-card";
    card.style = `background:#fff;border-radius:14px;box-shadow:0 3px 8px rgba(0,0,0,0.08);overflow:hidden;transition: all 0.25s ease;display:flex;flex-direction:column;position:relative;`;
    card.onmouseenter = ()=>{ card.style.transform="translateY(-4px)"; card.style.boxShadow="0 6px 16px rgba(0,0,0,0.12)"; };
    card.onmouseleave = ()=>{ card.style.transform="translateY(0)"; card.style.boxShadow="0 3px 8px rgba(0,0,0,0.08)"; };

    const isOnline = !!activeSchools[s.normalized];
    const onlineDot = isOnline ? `<span class="online-dot-pulse"></span>` : "";
    const headerBg = isOnline ? 'linear-gradient(135deg,#16a34a,#22c55e)' : 'linear-gradient(135deg,#2563eb,#3b82f6)';

    card.innerHTML = `
      <div style="background:${headerBg};padding:12px;color:white;font-weight:600;font-size:16px;display:flex;align-items:center;justify-content:space-between;letter-spacing:0.3px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
          <i class="ri-building-4-line"></i>
          <div style="overflow-wrap:break-word;">${s.name}</div>
        </div>
        ${onlineDot}
      </div>
      <div style="flex:1;padding:14px 16px;display:grid;gap:10px;font-size:14px;color:#374151;">
        <div style="display:flex;align-items:center;gap:8px;"><i class="ri-user-3-line" style="color:#2563eb;font-size:16px;"></i><span>Students: <b>${s.students}</b></span></div>
        <div style="display:flex;align-items:center;gap:8px;"><i class="ri-team-line" style="color:#16a34a;font-size:16px;"></i><span>Staff: <b>${s.staff}</b></span></div>
        <div style="display:flex;align-items:center;gap:8px;"><i class="ri-bar-chart-2-line" style="color:#f59e0b;font-size:16px;"></i><span>Total: <b>${s.total}</b></span></div>
      </div>`;
    schoolListEl.appendChild(card);
  });
}
if (searchBox) searchBox.addEventListener("input", renderSchools);
if (sortType) sortType.addEventListener("change", renderSchools);

// 9) Online dot pulse CSS (unchanged)
(function addOnlineStyles(){
  const style = document.createElement('style');
  style.innerHTML = `
    .online-dot-pulse { width: 14px; height: 14px; background: #16a34a; border-radius: 50%; display: inline-block; animation: pulse 1.5s infinite; box-shadow: 0 0 10px #16a34a, 0 0 20px #16a34a66; }
    @keyframes pulse { 0% { transform: scale(1); opacity: 0.7; } 50% { transform: scale(1.4); opacity: 0.4; } 100% { transform: scale(1); opacity: 0.7; } }
  `;
  document.head.appendChild(style);
})();

// 10) Render Date-Wise (unchanged)
function renderDateWise(dateMap) {
  if (!dateWiseListEl) return;
  dateWiseListEl.innerHTML = "";
  function toKey(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  function normalizeDateKey(dateStr){ const d=new Date(dateStr); if(isNaN(d)) return null; d.setDate(d.getDate()+1); return toKey(d); }
  const fixedMap={}; for(const k in dateMap){ const normalized=normalizeDateKey(k); if(normalized) fixedMap[normalized]=dateMap[k]; }
  function formatLabel(key){ const d=new Date(key+"T00:00:00"); return `${String(d.getDate()).padStart(2,"0")} ${d.toLocaleString("default",{month:"short"}).toUpperCase()} ${d.getFullYear()}`; }

  const today = new Date(); today.setHours(0,0,0,0);
  const days=[]; for(let i=0;i<7;i++){ const d=new Date(today); d.setDate(today.getDate()-i); days.push(toKey(d)); }

  dateWiseListEl.style=`display:grid;grid-template-columns:repeat(7,1fr);gap:14px;width:100%;padding:10px 0;`;
  days.forEach(key=>{
    const val=fixedMap[key]||{students:0,staff:0}, total=val.students+val.staff;
    const card=document.createElement("div");
    card.className="date-card";
    card.style=`background:#fff;border-radius:12px;box-shadow:0 2px 6px rgba(0,0,0,0.06);overflow:hidden;display:flex;flex-direction:column;min-height:140px;transition:all 0.2s ease;`;
    card.onmouseenter=()=>{ card.style.transform="translateY(-4px)"; card.style.boxShadow="0 6px 14px rgba(0,0,0,0.12)"; };
    card.onmouseleave=()=>{ card.style.transform="translateY(0)"; card.style.boxShadow="0 2px 6px rgba(0,0,0,0.06)"; };
    const header=`<div style="background:linear-gradient(90deg,#4f46e5,#7c3aed);padding:6px;color:#fff;font-weight:600;font-size:13px;text-align:center;letter-spacing:0.5px;">${formatLabel(key)}</div>`;
    let body="";
    if(total===0) body=`<div style="flex:1;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:#9ca3af;background:#fafafa;">NA</div>`;
    else body=`<div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:8px 10px;font-size:12px;gap:6px;">
      <div style="display:flex;align-items:center;gap:6px;color:#374151;"><i class="ri-user-3-line" style="color:#2563eb;font-size:16px;"></i><b>${val.students}</b> Students</div>
      <div style="display:flex;align-items:center;gap:6px;color:#374151;"><i class="ri-team-line" style="color:#16a34a;font-size:16px;"></i><b>${val.staff}</b> Staff</div>
      <div style="display:flex;align-items:center;gap:6px;color:#374151;"><i class="ri-bar-chart-2-line" style="color:#f59e0b;font-size:16px;"></i><b>${total}</b> Total</div>
    </div>`;
    card.innerHTML=header+body;
    dateWiseListEl.appendChild(card);
  });
}

// 11) Listen for Active Schools ✅ FIXED
function listenActiveSchools() {
  try {
    const baseRef = ref(db, "activeSchools");
    onValue(baseRef, (snapshot) => {
      processActiveSchools(snapshot.exists() ? snapshot.val() : {});
    });
  } catch (err) {
    console.error("listenActiveSchools error:", err);
  }
}

function processActiveSchools(val) {
  const map = {};
  const onlineNames = [];

  Object.values(val || {}).forEach(schoolSessions => {
    if (!schoolSessions) return;
    let schoolName = "", isOnline = false;

    Object.values(schoolSessions).forEach(session => {
      if (!session) return;

      // 🔹 FIXED: use "name" field from DB
      const name = session.name || session.schoolName || "";

      // 🔹 FIXED: status is string "online"
      const status = session.status;

      // 🔹 FIXED: expiry field is "expiresAt"
      const expiry = session.expiresAt || 0;

      if (name && status === "online" && Date.now() < expiry) {
        schoolName = name;
        isOnline = true;
      }
    });

    if (isOnline && schoolName) {
      const normName = normalizeName(schoolName);
      map[normName] = true;
      onlineNames.push(String(schoolName).trim());
    }
  });

  activeSchools = map;
  renderSchools();

  const onlineContainer = document.getElementById("onlineSchoolsCount");
  if (onlineContainer) {
    onlineContainer.innerHTML = `
      <i class="ri-user-line" style="font-size:18px;"></i>
      <span id="onlineNumber">${onlineNames.length || 0}</span>
      <span id="blinkCircle" style="width:12px;height:12px;background-color:green;border-radius:50%;display:inline-block;animation:blink 1s infinite;margin-left:6px;"></span>
    `;
  }

  const onlineListContainer = document.getElementById("onlineSchoolsList");
  if (onlineListContainer) {
    onlineListContainer.innerHTML = "";
    onlineNames.forEach(name => {
      const card = document.createElement("div");
      card.className = "online-school-card";
      card.title = name;
      card.innerHTML = `<span class="online-school-dot"></span>${name}`;
      onlineListContainer.appendChild(card);
    });
  }
}

// 12) Init
loadDashboardData();
listenActiveSchools();
