// ✅ Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

// ✅ Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAR3KIgxzn12zoWwF3rMs7b0FfP-qe3mO4",
  authDomain: "schools-cdce8.firebaseapp.com",
  databaseURL: "https://schools-cdce8-default-rtdb.firebaseio.com",
  projectId: "schools-cdce8",
  storageBucket: "schools-cdce8.appspot.com",
  messagingSenderId: "772712220138",
  appId: "1:772712220138:web:381c173dccf1a6513fde93"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ✅ DOM Elements
const dataTypeSelect = document.getElementById("dataType"); // ID सही किया गया
const schoolFilter = document.getElementById("schoolFilter");
const resetBtn = document.getElementById("resetBtn");
const tableHead = document.getElementById("tableHead");
const tableBody = document.getElementById("tableBody");
const notification = document.getElementById("notification");
const recordCount = document.getElementById("recordCount");

let fullDataArray = [];

function showToast(message, type = "success") {
  notification.textContent = message;
  notification.className = `notification-${type}`;
  notification.style.display = "block";
  setTimeout(() => notification.style.display = "none", 3000);
}

function fetchData(type) {
  tableHead.innerHTML = "";
  tableBody.innerHTML = "";
  recordCount.textContent = "Loading...";

  const dbRef = ref(db, type);
  onValue(dbRef, (snapshot) => {
    const dataObj = snapshot.val();
    fullDataArray = [];

    if (dataObj) {
      Object.entries(dataObj).forEach(([key, item]) => {
        if (item && typeof item === "object") {
          const photo = item.photo || "";
          if (!photo.toLowerCase().includes("deleted") && photo.startsWith("http")) {
            item.__key = key;
            fullDataArray.push(item);
          }
        }
      });
    }

    populateSchoolFilter(fullDataArray);
    renderTable(fullDataArray);
  });
}

function populateSchoolFilter(data) {
  const schools = [...new Set(data.map(item => item.school || Object.values(item)[1]))]
    .filter(Boolean).sort();

  schoolFilter.innerHTML = `<option value="">All Schools</option>`;
  schools.forEach(school => {
    const option = document.createElement("option");
    option.value = school;
    option.textContent = school;
    schoolFilter.appendChild(option);
  });
}

function renderTable(dataArray) {
  tableHead.innerHTML = "";
  tableBody.innerHTML = "";

  if (dataArray.length === 0) {
    tableBody.innerHTML = `<tr><td colspan='100%' class="text-center p-4">No data available.</td></tr>`;
    recordCount.textContent = "Total Records: 0";
    return;
  }

  const keys = Object.keys(dataArray[0]).filter(k => k !== "__key");
  const headerRow = document.createElement("tr");

  const selectAllTh = document.createElement("th");
  const selectAllCheckbox = document.createElement("input");
  selectAllCheckbox.type = "checkbox";
  selectAllCheckbox.addEventListener("change", function () {
    const checkboxes = tableBody.querySelectorAll("input[type='checkbox']");
    checkboxes.forEach(cb => cb.checked = this.checked);
  });
  selectAllTh.appendChild(selectAllCheckbox);
  headerRow.appendChild(selectAllTh);

  keys.forEach(key => {
    const th = document.createElement("th");
    th.textContent = key;
    headerRow.appendChild(th);
  });

  tableHead.appendChild(headerRow);

  dataArray.forEach(item => {
    const tr = document.createElement("tr");
    tr.dataset.key = item.__key;

    const cbTd = document.createElement("td");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cbTd.appendChild(cb);
    tr.appendChild(cbTd);

    keys.forEach(key => {
      const td = document.createElement("td");
      td.classList.add("border", "p-2");
      td.setAttribute("data-field", key);

      if (key.toLowerCase() === "photo" && item[key]) {
        td.innerHTML = `<img src="${item[key]}" alt="photo" class="w-12 h-12 rounded-full">`;
      } else {
        td.textContent = item[key] || "";
      }

      tr.appendChild(td);
    });

    tableBody.appendChild(tr);
  });

  recordCount.textContent = `Total Records: ${dataArray.length}`;
}

function applyFilters() {
  const schoolVal = schoolFilter.value.trim().toLowerCase();
  const filtered = fullDataArray.filter(item => {
    const schoolCol = (item.school || Object.values(item)[1] || "").toLowerCase();
    return !schoolVal || schoolCol === schoolVal;
  });
  renderTable(filtered);
}

function resetFilters() {
  schoolFilter.value = "";
  const selectAll = tableHead.querySelector("input[type='checkbox']");
  if (selectAll) selectAll.checked = false;
  renderTable(fullDataArray);
}

function getSelectedData() {
  const table = document.getElementById("data-table") || document.querySelector("table");
  const rows = table.querySelectorAll("tbody tr");
  const selected = [];

  // ✅ ID Type Fix - यह अब हमेशा सही वैल्यू देगा
  const type = dataTypeSelect?.value?.toLowerCase() || "unknown";

  rows.forEach(row => {
    const checkbox = row.querySelector("input[type='checkbox']");
    if (checkbox?.checked) {
      const record = {};

      row.querySelectorAll("td[data-field]").forEach(td => {
        const field = td.getAttribute("data-field").toLowerCase().trim();
        const img = td.querySelector("img");
        if (img) {
          record[field] = img.src;
        } else {
          record[field] = td.textContent.trim();
        }
      });

      // ✅ सही टाइप जोड़ें
      record.type = type;

      selected.push(record);
    }
  });

  return selected;
}

// ✅ Export
export {
  fetchData,
  applyFilters,
  resetFilters,
  getSelectedData,
  dataTypeSelect,
  schoolFilter,
  resetBtn,
};
