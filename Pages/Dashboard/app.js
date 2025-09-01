import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAR3KIgxzn12zoWwF3rMs7b0FfP-qe3mO4",
  authDomain: "schools-cdce8.firebaseapp.com",
  databaseURL: "https://schools-cdce8-default-rtdb.firebaseio.com",
  projectId: "schools-cdce8",
  storageBucket: "schools-cdce8.firebasestorage.app",
  messagingSenderId: "772712220138",
  appId: "1:772712220138:web:381c173dccf1a6513fde93"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Elements
const studentCountEl = document.getElementById('studentCount');
const staffCountEl = document.getElementById('staffCount');
const totalEnrollmentEl = document.getElementById('totalEnrollment');
const uniqueSchoolsEl = document.getElementById('uniqueSchools');
const schoolListEl = document.getElementById('schoolList');
const searchBox = document.getElementById('searchBox');
const sortType = document.getElementById('sortType');

// Date-wise container
const dateWiseListEl = document.getElementById('dateWiseList');

let schoolsData = [];

/* -------------------------------
   Helper functions for Date Parse
--------------------------------*/
function parseEnrollmentDate(enrollmentId) {
  const match = enrollmentId.match(/\d{2}[A-Z]{3}/);
  if (!match) return null;

  const str = match[0];
  const day = parseInt(str.slice(0, 2));
  const monthStr = str.slice(2, 5);

  const months = {
    JAN:0, FEB:1, MAR:2, APR:3, MAY:4, JUN:5,
    JUL:6, AUG:7, SEP:8, OCT:9, NOV:10, DEC:11
  };

  const month = months[monthStr];
  if (month === undefined) return null;

  const year = new Date().getFullYear();
  return new Date(year, month, day);
}

/* -------------------------------
   Load Dashboard Data
--------------------------------*/
async function loadDashboardData() {
  const dbRef = ref(db);
  const snapshot = await get(dbRef);

  if (snapshot.exists()) {
    const data = snapshot.val();
    const students = data.student || {};
    const staff = data.staff || {};

    let studentCount = 0;
    let staffCount = 0;
    let schoolMap = {};
    let dateMap = {}; // for date-wise summary

    // Students
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
        let name = s.schoolName.trim();
        if (!schoolMap[name]) schoolMap[name] = { students: 0, staff: 0 };
        schoolMap[name].students++;
      }
    }

    // Staff
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
        let name = st.schoolName.trim();
        if (!schoolMap[name]) schoolMap[name] = { students: 0, staff: 0 };
        schoolMap[name].staff++;
      }
    }

    // Top Stats
    studentCountEl.textContent = studentCount;
    staffCountEl.textContent = staffCount;
    totalEnrollmentEl.textContent = studentCount + staffCount;
    uniqueSchoolsEl.textContent = Object.keys(schoolMap).length;

    // Array for rendering schools
    schoolsData = Object.keys(schoolMap).map(name => ({
      name,
      students: schoolMap[name].students,
      staff: schoolMap[name].staff,
      total: schoolMap[name].students + schoolMap[name].staff
    }));

    renderSchools();
    renderDateWise(dateMap);
  }
}

/* -------------------------------
   Render Schools (Dashboard Look)
--------------------------------*/
function renderSchools() {
  let filtered = [...schoolsData];

  // Search
  const searchVal = searchBox.value.toLowerCase();
  if (searchVal) {
    filtered = filtered.filter(s => s.name.toLowerCase().includes(searchVal));
  }

  // Sort
  if (sortType.value === "az") {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortType.value === "za") {
    filtered.sort((a, b) => b.name.localeCompare(a.name));
  } else if (sortType.value === "high") {
    filtered.sort((a, b) => b.total - a.total);
  } else if (sortType.value === "low") {
    filtered.sort((a, b) => a.total - b.total);
  }

  // Render
  schoolListEl.innerHTML = "";
  if (filtered.length === 0) {
    schoolListEl.innerHTML = `
      <div style="
        grid-column:1/-1;
        text-align:center;
        padding:40px;
        background:#f9fafb;
        border-radius:16px;
        border:2px dashed #d1d5db;
        color:#6b7280;
        font-size:15px;
      ">
        <i class="ri-search-eye-line"
           style="font-size:32px;color:#9ca3af;margin-bottom:10px;display:block;">
        </i>
        No schools found.<br>Try adjusting your search or filters.
      </div>`;
  } else {
    filtered.forEach(s => {
      const card = document.createElement("div");
      card.className = "school-card";
      card.style = `
        background:#fff;
        border-radius:14px;
        box-shadow:0 3px 8px rgba(0,0,0,0.08);
        overflow:hidden;
        transition: all 0.25s ease;
        display:flex;
        flex-direction:column;
      `;

      // hover effect
      card.onmouseenter = () => {
        card.style.transform = "translateY(-4px)";
        card.style.boxShadow = "0 6px 16px rgba(0,0,0,0.12)";
      };
      card.onmouseleave = () => {
        card.style.transform = "translateY(0)";
        card.style.boxShadow = "0 3px 8px rgba(0,0,0,0.08)";
      };

      card.innerHTML = `
        <!-- Header -->
        <div style="
          background:linear-gradient(135deg,#2563eb,#3b82f6);
          padding:12px;
          color:white;
          font-weight:600;
          font-size:16px;
          text-align:center;
          letter-spacing:0.3px;
        ">
          <i class="ri-building-4-line" style="margin-right:6px;"></i>
          ${s.name}
        </div>

        <!-- Body -->
        <div style="flex:1;padding:14px 16px;display:grid;gap:10px;font-size:14px;color:#374151;">
          <div style="display:flex;align-items:center;gap:8px;">
            <i class="ri-user-3-line" style="color:#2563eb;font-size:16px;"></i>
            <span>Students: <b>${s.students}</b></span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <i class="ri-team-line" style="color:#16a34a;font-size:16px;"></i>
            <span>Staff: <b>${s.staff}</b></span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <i class="ri-bar-chart-2-line" style="color:#f59e0b;font-size:16px;"></i>
            <span>Total: <b>${s.total}</b></span>
          </div>
        </div>
      `;

      schoolListEl.appendChild(card);
    });
  }
}


/* -------------------------------
   Render Date-Wise (Last 7 Days) [+1 day shift only for DB keys]
--------------------------------*/
function renderDateWise(dateMap) {
  if (!dateWiseListEl) return;
  dateWiseListEl.innerHTML = "";

  // Helper: yyyy-mm-dd (local time safe)
  function toKey(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Helper: normalize DB keys to yyyy-mm-dd (+1 day shift)
  function normalizeDateKey(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return null;
    d.setDate(d.getDate() + 1); // 👈 shift by +1 only here
    return toKey(d);
  }

  // Normalize the incoming dateMap
  const fixedMap = {};
  for (const k in dateMap) {
    const normalized = normalizeDateKey(k);
    if (normalized) {
      fixedMap[normalized] = dateMap[k];
    }
  }

  // Helper: pretty label (e.g. 30 AUG 2025)
  function formatLabel(key) {
    const d = new Date(key + "T00:00:00");
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleString("default", { month: "short" }).toUpperCase();
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  }

  // last 7 days list (today + past 6 days) [NO shift here]
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(toKey(d));
  }

  // grid container
    dateWiseListEl.style = `
      display: grid;
      grid-template-columns: repeat(7, 1fr); /* exactly 7 per row */
      gap: 14px;
      width: 100%;
      padding: 10px 0;
    `;

    // Render each day card
    days.forEach(key => {
      const val = fixedMap[key] || { students: 0, staff: 0 };
      const total = (val.students || 0) + (val.staff || 0);

      const card = document.createElement("div");
      card.className = "date-card";
      card.style = `
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        min-height: 140px; /* fixed height for dashboard look */
        transition: all 0.2s ease;
      `;

      // hover effect
      card.onmouseenter = () => {
        card.style.transform = "translateY(-4px)";
        card.style.boxShadow = "0 6px 14px rgba(0,0,0,0.12)";
      };
      card.onmouseleave = () => {
        card.style.transform = "translateY(0)";
        card.style.boxShadow = "0 2px 6px rgba(0,0,0,0.06)";
      };

      // header (date label as top band)
      const header = `
        <div style="background: linear-gradient(90deg,#4f46e5,#7c3aed);
                    padding: 6px;
                    color: #fff;
                    font-weight: 600;
                    font-size: 13px;
                    text-align: center;
                    letter-spacing: 0.5px;">
          ${formatLabel(key)}
        </div>
      `;

      // body (counts or NA)
      let body = "";
      if (total === 0) {
        body = `
          <div style="flex:1;display:flex;align-items:center;justify-content:center;
                      font-size: 13px;
                      font-weight: 600;
                      color: #9ca3af;
                      background: #fafafa;">
            NA
          </div>
        `;
      } else {
        body = `
          <div style="flex:1;display:flex;flex-direction:column;justify-content:center;
                      padding: 8px 10px;
                      font-size: 12px;
                      gap: 6px;">
            <div style="display:flex;align-items:center;gap:6px;color:#374151;">
              <i class="ri-user-3-line" style="color:#2563eb;font-size:16px;"></i>
              <b>${val.students}</b> Students
            </div>
            <div style="display:flex;align-items:center;gap:6px;color:#374151;">
              <i class="ri-team-line" style="color:#16a34a;font-size:16px;"></i>
              <b>${val.staff}</b> Staff
            </div>
            <div style="display:flex;align-items:center;gap:6px;color:#374151;">
              <i class="ri-bar-chart-2-line" style="color:#f59e0b;font-size:16px;"></i>
              <b>${total}</b> Total
            </div>
          </div>
        `;
      }

      card.innerHTML = header + body;
      dateWiseListEl.appendChild(card);
    });


  // Debugging: uncomment to check what keys matched
  // console.log("DB Keys:", Object.keys(dateMap));
  // console.log("Normalized Keys:", Object.keys(fixedMap));
  // console.log("Days to render:", days);
}


/* -------------------------------
   Events
--------------------------------*/
searchBox.addEventListener("input", renderSchools);
sortType.addEventListener("change", renderSchools);

loadDashboardData();
