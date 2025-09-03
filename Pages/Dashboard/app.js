// ----------------------------------------------------
// ✅ 1. Import Firebase Modules
// ----------------------------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getDatabase, ref, get, remove, set } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

// ----------------------------------------------------
// ✅ 2. Firebase Configuration
// ----------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyAR3KIgxzn12zoWwF3rMs7b0FfP-qe3mO4",
  authDomain: "schools-cdce8.firebaseapp.com",
  databaseURL: "https://schools-cdce8-default-rtdb.firebaseio.com",
  projectId: "schools-cdce8",
  storageBucket: "schools-cdce8.appspot.com",
  messagingSenderId: "772712220138",
  appId: "1:772712220138:web:381c173dccf1a6513fde93"
};

// ----------------------------------------------------
// ✅ 3. Initialize Firebase App and Database
// ----------------------------------------------------
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ----------------------------------------------------
// ✅ 4. DOM Elements
// ----------------------------------------------------
const schoolFilter = document.getElementById("schoolFilter");
const schoolIDSelect = document.getElementById("schoolIDSelect");
const dataTypeSelect = document.getElementById("dataType");
const resetBtn = document.getElementById("resetBtn");
const exportBtn = document.getElementById("exportBtn");
const deleteBtn = document.getElementById("deleteBtn");
const tableHead = document.getElementById("tableHead");
const tableBody = document.getElementById("tableBody");
const notification = document.getElementById("notification");
const dataCount = document.getElementById("dataCount");

let fullDataArray = [];

// ----------------------------------------------------
// ✅ 5. Show Toast
// ----------------------------------------------------
function showToast(message, type = "success") {
  notification.textContent = message;
  notification.className = `notification-${type}`;
  notification.style.display = "block";
  setTimeout(() => (notification.style.display = "none"), 3000);
}

// ----------------------------------------------------
// ✅ 6. Fetch School Names from DATA-MASTER
// ----------------------------------------------------
async function fetchSchoolNames() {
  try {
    const snapshot = await get(ref(db, "DATA-MASTER"));
    const schools = snapshot.exists() ? Object.keys(snapshot.val()).sort() : [];

    schoolFilter.innerHTML = `<option value="">Select School</option>`;
    schools.forEach((schoolName) => {
      const option = document.createElement("option");
      option.value = schoolName;
      option.textContent = schoolName;
      schoolFilter.appendChild(option);
    });
  } catch (err) {
    console.error("Error fetching school names:", err);
    showToast("Failed to load schools", "error");
  }
}

// ----------------------------------------------------
// ✅ 7. Fetch School IDs for Selected School
// ----------------------------------------------------
async function fetchSchoolIDs(schoolName) {
  schoolIDSelect.innerHTML = `<option value="">Select School ID</option>`;
  fullDataArray = [];
  renderTable([]);

  if (!schoolName) return;

  try {
    const snapshot = await get(ref(db, `DATA-MASTER/${schoolName}`));
    const ids = snapshot.exists() ? Object.keys(snapshot.val()).sort() : [];

    ids.forEach((id) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = id;
      schoolIDSelect.appendChild(option);
    });

    if (ids.length > 0) {
      schoolIDSelect.value = ids[0];
      if (dataTypeSelect.value) fetchDataForSchool();
    }
  } catch (err) {
    console.error("Error fetching school IDs:", err);
    showToast("Failed to load School IDs", "error");
  }
}

// ----------------------------------------------------
// ✅ 8. Fetch Data for Selected SchoolID & Type
// ----------------------------------------------------
async function fetchDataForSchool() {
  const schoolName = schoolFilter.value;
  const schoolID = schoolIDSelect.value;
  const type = dataTypeSelect.value;

  if (!schoolName || !schoolID || !type) return;

  try {
    const snapshot = await get(ref(db, `DATA-MASTER/${schoolName}/${schoolID}/${type}`));
    const dataObj = snapshot.val();
    fullDataArray = [];

    if (dataObj) {
      Object.entries(dataObj).forEach(([enrollID, record]) => {
        if (record && typeof record === "object") {
          record.__key = enrollID;
          record.__schoolName = schoolName;
          record.__schoolID = schoolID;
          fullDataArray.push(record);
        }
      });
    }

    renderTable(fullDataArray);
  } catch (err) {
    console.error("Error fetching data:", err);
    showToast("Failed to load data", "error");
  }
}

// ----------------------------------------------------
// ✅ 9. Render Table
// ----------------------------------------------------
function renderTable(dataArray) {
  tableHead.innerHTML = "";
  tableBody.innerHTML = "";
  dataCount.textContent = `Total: ${dataArray.length}`;

  if (!dataArray.length) {
    tableBody.innerHTML = `<tr><td colspan='100%' class="text-center p-4">No matching records found.</td></tr>`;
    return;
  }

  const keys = Object.keys(dataArray[0]).filter((k) => !k.startsWith("__"));
  const headerRow = document.createElement("tr");

  // Checkbox column
  const selectAllTh = document.createElement("th");
  const selectAllCheckbox = document.createElement("input");
  selectAllCheckbox.type = "checkbox";
  selectAllCheckbox.addEventListener("change", function () {
    tableBody.querySelectorAll("input[type='checkbox']").forEach((cb) => (cb.checked = this.checked));
  });
  selectAllTh.appendChild(selectAllCheckbox);
  headerRow.appendChild(selectAllTh);

  // Headers
  keys.forEach((key) => {
    const th = document.createElement("th");
    th.textContent = key;
    headerRow.appendChild(th);
  });
  tableHead.appendChild(headerRow);

  // Rows
  dataArray.forEach((item) => {
    const tr = document.createElement("tr");
    tr.dataset.key = item.__key;

    const cbTd = document.createElement("td");
    cbTd.innerHTML = `<input type="checkbox">`;
    tr.appendChild(cbTd);

    keys.forEach((key) => {
      const td = document.createElement("td");
      td.classList.add("border", "p-2");
      if (key.toLowerCase() === "photo" && item[key]) {
        td.innerHTML = `<img src="${item[key]}" alt="photo" class="w-12 h-12 rounded-full">`;
      } else {
        td.textContent = item[key] || "";
      }
      tr.appendChild(td);
    });

    tableBody.appendChild(tr);
  });
}

// ----------------------------------------------------
// ✅ 10. Reset Filters
// ----------------------------------------------------
function resetFilters() {
  schoolFilter.value = "";
  schoolIDSelect.innerHTML = `<option value="">Select School ID</option>`;
  dataTypeSelect.value = "";
  fullDataArray = [];
  renderTable([]);
}

// ----------------------------------------------------
// ✅ 12. Delete Selected Records
// ----------------------------------------------------
async function deleteSelectedData() {
  const selectedRows = Array.from(tableBody.querySelectorAll("input[type='checkbox']:checked"))
    .map(cb => cb.closest("tr"));

  if (!selectedRows.length) return showToast("No records selected to delete.", "error");

  if (!confirm(`Are you sure you want to delete ${selectedRows.length} record(s)? This action cannot be undone.`)) return;

  const type = dataTypeSelect.value;
  const deletePromises = [];

  selectedRows.forEach(row => {
    const key = row.dataset.key;
    const recordData = fullDataArray.find(item => item.__key === key);
    if (!recordData) return;

    const schoolName = recordData.__schoolName;
    const schoolID = recordData.__schoolID;

    const recordRef = ref(db, `DATA-MASTER/${schoolName}/${schoolID}/${type}/${key}`);
    const workdoneRef = ref(db, `workdone/${schoolName}/${type}/${key}`);
    const timestamp = new Date().toISOString();

    deletePromises.push(
      set(workdoneRef, { deletedAt: timestamp, type: type, key: key })
        .catch(err => console.warn(`Failed to log deletion for ${key}:`, err))
        .then(() => remove(recordRef))
        .catch(err => console.error(`Failed to delete record ${key}:`, err))
    );
  });

  try {
    await Promise.all(deletePromises);

    selectedRows.forEach(row => row.remove());
    fullDataArray = fullDataArray.filter(item => !selectedRows.some(row => row.dataset.key === item.__key));
    dataCount.textContent = `Total: ${fullDataArray.length}`;
    showToast(`${selectedRows.length} record(s) deleted successfully.`, "success");
  } catch (err) {
    console.error("Error deleting records:", err);
    showToast("Some records could not be deleted. Check console.", "error");
  }
}

// ----------------------------------------------------
// ✅ 13. Export Selected Rows as CSV + Photos ZIP
// ----------------------------------------------------
async function exportSelectedData() {
  const selectedRows = Array.from(tableBody.querySelectorAll("input[type='checkbox']:checked"))
    .map(cb => cb.closest("tr"));

  if (!selectedRows.length) return showToast("No records selected to export.", "error");

  const headers = ["Enrollment"];
  const columnHeaders = Array.from(tableHead.querySelectorAll("th")).slice(1).map(th => th.textContent.trim());
  headers.push(...columnHeaders);

  const data = [];
  const zip = new JSZip();
  const imageFolder = zip.folder("Photos");

  for (const row of selectedRows) {
    const cells = row.querySelectorAll("td");
    const enrollment = row.dataset.key || "unknown";
    const rowData = { Enrollment: enrollment };

    columnHeaders.forEach((header, idx) => {
      const cell = cells[idx + 1];
      rowData[header] = cell?.textContent.trim() || "";
    });

    data.push(rowData);

    const img = cells[1]?.querySelector("img");
    if (img?.src) {
      try {
        const resp = await fetch(img.src);
        if (!resp.ok) throw new Error("Photo fetch failed");
        const blob = await resp.blob();
        imageFolder.file(`${enrollment}.jpg`, blob);
      } catch (err) {
        console.warn(`Failed to download photo for ${enrollment}: ${err.message}`);
      }
    }
  }

  const csvRows = [headers.join(",")];
  data.forEach(row => {
    const values = headers.map(h => `"${(row[h] || "").replace(/"/g, '""')}"`);
    csvRows.push(values.join(","));
  });

  zip.file("data.csv", csvRows.join("\n"));
  const zipBlob = await zip.generateAsync({ type: "blob" });
  saveAs(zipBlob, `Exported-Data-${Date.now()}.zip`);

  showToast(`${selectedRows.length} records exported successfully.`, "success");
}

// ----------------------------------------------------
// ✅ 14. Event Listeners
// ----------------------------------------------------
resetBtn.addEventListener("click", resetFilters);
deleteBtn.addEventListener("click", deleteSelectedData);
exportBtn.addEventListener("click", exportSelectedData);

schoolFilter.addEventListener("change", () => fetchSchoolIDs(schoolFilter.value));
schoolIDSelect.addEventListener("change", fetchDataForSchool);
dataTypeSelect.addEventListener("change", fetchDataForSchool);

// ----------------------------------------------------
// ✅ 15. Initial Load
// ----------------------------------------------------
fetchSchoolNames();
