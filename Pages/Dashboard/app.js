// ----------------------------------------------------
// Active Schools Dashboard - Optimized (Shallow Enrollment Read)
// ----------------------------------------------------

// 1) Import Firebase Modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getDatabase,
  ref,
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
const BASE_URL = firebaseConfig.databaseURL;

// 4) DOM Elements
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
let activeSchools = Object.create(null);

const CACHE_KEY = "dashboard:v5:aggregates"; 
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
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ timestamp: Date.now(), payload })
    );
  } catch {}
}

// 6) Helpers
function normalizeName(name) {
  return (name || "").toString().trim().replace(/\s+/g, " ").toLowerCase();
}
function parseEnrollmentDate(enrollmentId) {
  if (!enrollmentId || typeof enrollmentId !== "string" || enrollmentId.length < 18) return null;
  const dateStr = enrollmentId.slice(7, 16); // DDMMMYYYY
  const day = parseInt(dateStr.slice(0, 2), 10);
  const monStr = dateStr.slice(2, 5).toUpperCase();
  const year = parseInt(dateStr.slice(5), 10);
  const months = { JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11 };
  const month = months[monStr];
  if (!Number.isFinite(day) || !Number.isFinite(year) || month === undefined) return null;
  return new Date(year, month, day);
}
function setText(el, val) { if (el) el.textContent = String(val ?? 0); }
function debounce(fn, wait = 150) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(null, args), wait); };
}

// 🔹 Helper: shallow fetch (keys only, no values)
async function fetchKeys(path) {
  const url = `${BASE_URL}/${path}.json?shallow=true`;
  const res = await fetch(url);
  if (!res.ok) return {};
  return res.json();
}

// 7) Load Dashboard Data (with shallow fetch)
async function loadDashboardData() {
  try {
    const cached = readCache();
    if (cached) { applyAggregatesToUI(cached); return; }

    let studentCount = 0, staffCount = 0;
    const schoolMap = Object.create(null);
    const dateMap = Object.create(null);

    // 🔹 Level-1: all SCHOOL_NAME
    const schoolNames = await fetchKeys("DATA-MASTER");
    for (const schoolName in schoolNames) {
      // 🔹 Level-2: all SCHOOL_ID under that school
      const schoolIds = await fetchKeys(`DATA-MASTER/${schoolName}`);
      for (const schoolId in schoolIds) {
        const displayName = schoolName || schoolId;
        const norm = normalizeName(displayName);
        if (!schoolMap[norm]) schoolMap[norm] = { displayName, students: 0, staff: 0 };

        // Students enrollment IDs (keys only)
        const students = await fetchKeys(`DATA-MASTER/${schoolName}/${schoolId}/STUDENT`);
        for (const enrollId in students || {}) {
          studentCount++;
          schoolMap[norm].students++;
          const d = parseEnrollmentDate(enrollId);
          if (d) {
            const key = d.toISOString().slice(0, 10);
            (dateMap[key] ??= { students: 0, staff: 0 }).students++;
          }
        }

        // Staff enrollment IDs (keys only)
        const staff = await fetchKeys(`DATA-MASTER/${schoolName}/${schoolId}/STAFF`);
        for (const enrollId in staff || {}) {
          staffCount++;
          schoolMap[norm].staff++;
          const d = parseEnrollmentDate(enrollId);
          if (d) {
            const key = d.toISOString().slice(0, 10);
            (dateMap[key] ??= { students: 0, staff: 0 }).staff++;
          }
        }
      }
    }

    const schoolsDataArr = Object.keys(schoolMap).map(norm => {
      const s = schoolMap[norm];
      return { name: s.displayName, normalized: norm, students: s.students, staff: s.staff, total: s.students+s.staff };
    });

    const aggregates = {
      studentCount,
      staffCount,
      totalEnrollment: studentCount+staffCount,
      uniqueSchools: Object.keys(schoolMap).length,
      schoolsData: schoolsDataArr.sort((a,b)=>b.total-a.total),
      dateMap
    };

    applyAggregatesToUI(aggregates);
    writeCache(aggregates);
  } catch (err) {
    console.error("loadDashboardData error:", err);
    setText(studentCountEl,0);setText(staffCountEl,0);setText(totalEnrollmentEl,0);setText(uniqueSchoolsEl,0);
    schoolsData=[];renderSchools();renderDateWise({});
  }
}

function applyAggregatesToUI({ studentCount, staffCount, totalEnrollment, uniqueSchools, schoolsData: sd, dateMap }) {
  setText(studentCountEl, studentCount||0);
  setText(staffCountEl, staffCount||0);
  setText(totalEnrollmentEl, totalEnrollment||0);
  setText(uniqueSchoolsEl, uniqueSchools||0);
  schoolsData = Array.isArray(sd)?sd:[];
  renderSchools();
  renderDateWise(dateMap||{});
}

// ----------------------------------------------------
// 8) Render Schools (optimized with keys only)
// ----------------------------------------------------
function renderSchools() {
  if (!schoolListEl) return;

  let filtered = [...schoolsData];
  const searchVal = (searchBox?.value || "").toLowerCase();
  if (searchVal) {
    filtered = filtered.filter(s =>
      (s.name || "").toLowerCase().includes(searchVal)
    );
  }

  if (sortType) {
    const v = sortType.value;
    if (v === "az") filtered.sort((a, b) => a.name.localeCompare(b.name));
    else if (v === "za") filtered.sort((a, b) => b.name.localeCompare(a.name));
    else if (v === "high") filtered.sort((a, b) => b.total - a.total);
    else if (v === "low") filtered.sort((a, b) => a.total - b.total);
  }

  const totalOnlineSchools = filtered.filter(s => activeSchools[s.normalized]).length;
  if (totalOnlineEl) {
    totalOnlineEl.textContent = `Online Schools: ${totalOnlineSchools}`;
  }

  schoolListEl.innerHTML = "";
  if (!filtered.length) {
    schoolListEl.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px;background:#f9fafb;
      border-radius:16px;border:2px dashed #d1d5db;color:#6b7280;font-size:15px;">
        <i class="ri-search-eye-line" style="font-size:32px;color:#9ca3af;
        margin-bottom:10px;display:block;"></i>
        No schools found.<br>Try adjusting your search or filters.
      </div>`;
    return;
  }

  filtered.forEach(s => {
    const card = document.createElement("div");
    card.className = "school-card";
    card.style = `
      background:#fff;border-radius:14px;box-shadow:0 3px 8px rgba(0,0,0,0.08);
      overflow:hidden;transition:all 0.25s ease;display:flex;flex-direction:column;position:relative;`;

    card.onmouseenter = () => {
      card.style.transform = "translateY(-4px)";
      card.style.boxShadow = "0 6px 16px rgba(0,0,0,0.12)";
    };
    card.onmouseleave = () => {
      card.style.transform = "translateY(0)";
      card.style.boxShadow = "0 3px 8px rgba(0,0,0,0.08)";
    };

    const displayName = s.name || "School";
    const isOnline = !!activeSchools[s.normalized];
    const onlineDot = isOnline ? `<span class="online-dot-pulse"></span>` : "";
    const headerBg = isOnline
      ? "linear-gradient(135deg,#16a34a,#22c55e)"
      : "linear-gradient(135deg,#2563eb,#3b82f6)";

    card.innerHTML = `
      <div style="background:${headerBg};padding:12px;color:white;font-weight:600;
      font-size:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:8px;">
          <i class="ri-building-4-line"></i>
          <div>${displayName}</div>
        </div>
        ${onlineDot}
      </div>
      <div style="flex:1;padding:14px 16px;display:grid;gap:10px;font-size:14px;color:#374151;">
        <div><i class="ri-user-3-line"></i> Students: <b>${s.students}</b></div>
        <div><i class="ri-team-line"></i> Staff: <b>${s.staff}</b></div>
        <div><i class="ri-bar-chart-2-line"></i> Total: <b>${s.total}</b></div>
      </div>`;
    schoolListEl.appendChild(card);
  });
}

if (searchBox) searchBox.addEventListener("input", debounce(renderSchools, 150));
if (sortType) sortType.addEventListener("change", renderSchools);

// ----------------------------------------------------
// 9) Render Date-Wise
// ----------------------------------------------------
function renderDateWise(dateMap) {
  if (!dateWiseListEl) return;
  dateWiseListEl.innerHTML = "";

  const entries = Object.entries(dateMap || {}).sort(
    (a, b) => new Date(b[0]) - new Date(a[0])
  );

  if (!entries.length) {
    dateWiseListEl.innerHTML =
      `<div style="text-align:center;padding:20px;color:#6b7280;">No date-wise data</div>`;
    return;
  }

  const last7 = entries.slice(0, 7);
  last7.forEach(([dateKey, counts]) => {
    const uiDate = new Date(dateKey).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    const card = document.createElement("div");
    card.className = "date-card";
    card.style = `
      background:#fff;border-radius:14px;box-shadow:0 3px 8px rgba(0,0,0,0.08);
      overflow:hidden;transition:all 0.25s ease;margin-bottom:14px;`;

    card.innerHTML = `
      <div style="background:linear-gradient(135deg,#9333ea,#a855f7);
      padding:12px;color:white;font-weight:600;font-size:15px;">
        <i class="ri-calendar-event-line"></i> ${uiDate}
      </div>
      <div style="padding:14px 16px;display:grid;gap:10px;font-size:14px;color:#374151;">
        <div><i class="ri-user-3-line"></i> Students: <b>${counts.students || 0}</b></div>
        <div><i class="ri-team-line"></i> Staff: <b>${counts.staff || 0}</b></div>
        <div><i class="ri-bar-chart-2-line"></i> Total: <b>${(counts.students||0)+(counts.staff||0)}</b></div>
      </div>`;
    dateWiseListEl.appendChild(card);
  });
}

// ----------------------------------------------------
// 10) Listen for Active Schools
// ----------------------------------------------------
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
  const map = Object.create(null);
  const onlineNames = [];

  Object.values(val || {}).forEach(schoolSessions => {
    if (!schoolSessions) return;
    let chosenName = "";
    let maxExpiry = 0;

    Object.values(schoolSessions).forEach(session => {
      if (!session) return;
      const name = (session.name || session.schoolName || "").trim();
      const status = session.status;
      const expiry = Number(session.expiresAt) || 0;
      if (name && status === "online" && Date.now() < expiry) {
        if (expiry > maxExpiry) {
          maxExpiry = expiry;
          chosenName = name;
        }
      }
    });

    if (chosenName) {
      const norm = normalizeName(chosenName);
      map[norm] = true;
      onlineNames.push(chosenName);
    }
  });

  activeSchools = map;
  renderSchools();

  const onlineContainer = document.getElementById("onlineSchoolsCount");
  if (onlineContainer) {
    onlineContainer.innerHTML = `
      <i class="ri-user-line"></i> ${onlineNames.length}
      <span style="width:10px;height:10px;background:green;border-radius:50%;display:inline-block;margin-left:6px;"></span>`;
  }

  const onlineListContainer = document.getElementById("onlineSchoolsList");
  if (onlineListContainer) {
    onlineListContainer.innerHTML = "";
    onlineNames.sort((a, b) => a.localeCompare(b)).forEach(name => {
      const card = document.createElement("div");
      card.className = "online-school-card";
      card.innerHTML = `<span class="online-school-dot"></span>${name}`;
      onlineListContainer.appendChild(card);
    });
  }
}

// ----------------------------------------------------
// 11) Polling Dashboard Data (Reuse loadDashboardData)
// ----------------------------------------------------
async function pollDashboardData() {
  try {
    await loadDashboardData(); // ऊपर वाला shallow + cache वाला function
  } catch (err) {
    console.error("pollDashboardData error:", err);
  }
}

// ----------------------------------------------------
// 12) Start Listeners (Polling + Realtime for Active Schools)
// ----------------------------------------------------
pollDashboardData();                   // पहली बार तुरंत लोड
setInterval(pollDashboardData, 60000); // हर 60 सेकंड बाद shallow refresh
listenActiveSchools();                 // Active schools अभी भी realtime पर
