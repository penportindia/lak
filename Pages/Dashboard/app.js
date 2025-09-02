// ----------------------------------------------------
// Active Schools Dashboard - Fully updated
// ----------------------------------------------------

// ----------------------------------------------------
// 1. Import Firebase Modules
// ----------------------------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getDatabase, ref, get, onValue } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

// ----------------------------------------------------
// 2. Firebase Configuration
// ----------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyAR3KIgxzn12zoWwF3rMs7b0FfP-qe3mO4",
  authDomain: "schools-cdce8.firebaseapp.com",
  databaseURL: "https://schools-cdce8-default-rtdb.firebaseio.com",
  projectId: "schools-cdce8",
  storageBucket: "schools-cdce8.firebasestorage.app",
  messagingSenderId: "772712220138",
  appId: "1:772712220138:web:381c173dccf1a6513fde93"
};

// ----------------------------------------------------
// 3. Init Firebase
// ----------------------------------------------------
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ----------------------------------------------------
// 4. DOM Elements
// ----------------------------------------------------
const studentCountEl = document.getElementById("studentCount");
const staffCountEl = document.getElementById("staffCount");
const totalEnrollmentEl = document.getElementById("totalEnrollment");
const uniqueSchoolsEl = document.getElementById("uniqueSchools");
const schoolListEl = document.getElementById("schoolList");
const searchBox = document.getElementById("searchBox");
const sortType = document.getElementById("sortType");
const dateWiseListEl = document.getElementById("dateWiseList");
const totalOnlineEl = document.getElementById("totalOnlineUsers"); 

// ----------------------------------------------------
// 5. Global State
// ----------------------------------------------------
let schoolsData = [];     
let activeSchools = {};   

// ----------------------------------------------------
// 6. Helpers
// ----------------------------------------------------
function normalizeName(name) {
  if (!name) return "";
  return name.toString().trim().replace(/\s+/g, " ").toLowerCase();
}

function parseEnrollmentDate(enrollmentId) {
  const match = (enrollmentId || "").match(/\d{2}[A-Z]{3}/);
  if (!match) return null;
  const str = match[0];
  const day = parseInt(str.slice(0, 2));
  const monthStr = str.slice(2, 5);
  const months = { JAN:0, FEB:1, MAR:2, APR:3, MAY:4, JUN:5, JUL:6, AUG:7, SEP:8, OCT:9, NOV:10, DEC:11 };
  const month = months[monthStr];
  if (month === undefined) return null;
  const year = new Date().getFullYear();
  return new Date(year, month, day);
}

// ----------------------------------------------------
// 7. Load Dashboard Data (Students + Staff + Dates)
// ----------------------------------------------------
async function loadDashboardData() {
  try {
    const rootRef = ref(db);
    const snapshot = await get(rootRef);

    let studentCount = 0;
    let staffCount = 0;
    let schoolMap = {};
    let dateMap = {};

    if (!snapshot.exists()) {
      studentCountEl && (studentCountEl.textContent = 0);
      staffCountEl && (staffCountEl.textContent = 0);
      totalEnrollmentEl && (totalEnrollmentEl.textContent = 0);
      uniqueSchoolsEl && (uniqueSchoolsEl.textContent = 0);
      totalOnlineEl && (totalOnlineEl.textContent = 0); 
      schoolsData = [];
      renderSchools();
      renderDateWise({});
      return;
    }

    const data = snapshot.val();
    const students = data.student || {};
    const staff = data.staff || {};

    for (const key in students) {
      const s = students[key];
      studentCount++;
      const date = parseEnrollmentDate(key);
      if (date) {
        const d = date.toISOString().slice(0, 10);
        if (!dateMap[d]) dateMap[d] = { students: 0, staff: 0 };
        dateMap[d].students++;
      }
      if (s.schoolName) {
        const raw = s.schoolName.toString();
        const norm = normalizeName(raw);
        if (!schoolMap[norm]) schoolMap[norm] = { displayName: raw.trim(), students: 0, staff: 0 };
        schoolMap[norm].students++;
      }
    }

    for (const key in staff) {
      const st = staff[key];
      staffCount++;
      const date = parseEnrollmentDate(key);
      if (date) {
        const d = date.toISOString().slice(0, 10);
        if (!dateMap[d]) dateMap[d] = { students: 0, staff: 0 };
        dateMap[d].staff++;
      }
      if (st.schoolName) {
        const raw = st.schoolName.toString();
        const norm = normalizeName(raw);
        if (!schoolMap[norm]) schoolMap[norm] = { displayName: raw.trim(), students: 0, staff: 0 };
        schoolMap[norm].staff++;
      }
    }

    studentCountEl && (studentCountEl.textContent = studentCount);
    staffCountEl && (staffCountEl.textContent = staffCount);
    totalEnrollmentEl && (totalEnrollmentEl.textContent = studentCount + staffCount);
    uniqueSchoolsEl && (uniqueSchoolsEl.textContent = Object.keys(schoolMap).length);

    schoolsData = Object.keys(schoolMap).map(norm => ({
      name: schoolMap[norm].displayName,
      normalized: norm,
      students: schoolMap[norm].students,
      staff: schoolMap[norm].staff,
      total: schoolMap[norm].students + schoolMap[norm].staff
    }));

    renderSchools();
    renderDateWise(dateMap);
  } catch (err) {
    console.error("loadDashboardData error:", err);
  }
}

// ----------------------------------------------------
// 8. Render Schools (Search + Sort)
// ----------------------------------------------------
function renderSchools() {
  if (!schoolListEl) return;

  let filtered = [...schoolsData];

  const searchVal = (searchBox && searchBox.value || "").toLowerCase();
  if (searchVal) filtered = filtered.filter(s => (s.name || "").toLowerCase().includes(searchVal));

  if (sortType) {
    if (sortType.value === "az") filtered.sort((a,b)=>a.name.localeCompare(b.name));
    else if (sortType.value === "za") filtered.sort((a,b)=>b.name.localeCompare(a.name));
    else if (sortType.value === "high") filtered.sort((a,b)=>b.total - a.total);
    else if (sortType.value === "low") filtered.sort((a,b)=>a.total - b.total);
  }

  const totalOnlineSchools = schoolsData.filter(s => !!activeSchools[s.normalized]).length;
  if (totalOnlineEl) totalOnlineEl.textContent = `Online Schools: ${totalOnlineSchools}`;

  schoolListEl.innerHTML = "";
  if (filtered.length === 0) {
    schoolListEl.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;background:#f9fafb;border-radius:16px;border:2px dashed #d1d5db;color:#6b7280;font-size:15px;"><i class="ri-search-eye-line" style="font-size:32px;color:#9ca3af;margin-bottom:10px;display:block;"></i>No schools found.<br>Try adjusting your search or filters.</div>`;
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

// ----------------------------------------------------
// 8a. Attach Event Listeners for Search & Sort
// ----------------------------------------------------
if(searchBox) searchBox.addEventListener("input", renderSchools);
if(sortType) sortType.addEventListener("change", renderSchools);

// ----------------------------------------------------
// 9. Online dot pulse CSS
// ----------------------------------------------------
(function addOnlineStyles(){
  const style = document.createElement('style');
  style.innerHTML = `
    .online-dot-pulse {
      width: 14px;
      height: 14px;
      background: #16a34a;
      border-radius: 50%;
      display: inline-block;
      animation: pulse 1.5s infinite;
      box-shadow: 0 0 10px #16a34a, 0 0 20px #16a34a66;
    }
    @keyframes pulse {
      0% { transform: scale(1); opacity: 0.7; }
      50% { transform: scale(1.4); opacity: 0.4; }
      100% { transform: scale(1); opacity: 0.7; }
    }
  `;
  document.head.appendChild(style);
})();

// ----------------------------------------------------
// 10. Render Date-Wise (unchanged)
// ----------------------------------------------------
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

// ----------------------------------------------------
// 11. Listen for Active Schools (unchanged)
// ----------------------------------------------------
      function listenActiveSchools() {
      try {
        const activeRef = ref(db, "activeSchools");
        onValue(activeRef, (snapshot) => {
          const val = snapshot.exists() ? snapshot.val() : {};
          const map = {};
          const onlineNames = [];

          // Process active schools
          Object.values(val).forEach(item => {
            if (!item) return;
            const name = item.name || item.schoolName || "";
            const status = item.status;
            const isOnline = (status === true) || (String(status).toLowerCase() === 'online');
            if (name && isOnline) {
              const normName = normalizeName(name);
              map[normName] = true;
              onlineNames.push(name.trim()); // store original name for display
            }
          });

          // Update global activeSchools
          activeSchools = map;

          // Refresh school cards
          renderSchools();

          // Update online count with blinking circle
          const onlineCount = onlineNames.length || 0;
          const onlineContainer = document.getElementById("onlineSchoolsCount");
          if (onlineContainer) {
            onlineContainer.innerHTML = `
              <i class="ri-user-line" style="font-size:18px;"></i>
              <span id="onlineNumber">${onlineCount}</span>
              <span id="blinkCircle" style="width:12px;height:12px;background-color:green;border-radius:50%;display:inline-block;animation:blink 1s infinite;margin-left:6px;"></span>
            `;
          }

          // Render online schools as mini cards
          const onlineListContainer = document.getElementById("onlineSchoolsList");
          if (onlineListContainer) {
            onlineListContainer.innerHTML = ""; // clear previous

            onlineNames.forEach(name => {
              const card = document.createElement("div");
              card.className = "online-school-card";
              card.title = name; // show full name on hover
              card.innerHTML = `<span class="online-school-dot"></span>${name}`;
              onlineListContainer.appendChild(card);
            });
          }

        });
      } catch(err){ 
        console.error("listenActiveSchools error:", err); 
      }
    }

// ----------------------------------------------------
// 12. Init
// ----------------------------------------------------
loadDashboardData();
listenActiveSchools();
