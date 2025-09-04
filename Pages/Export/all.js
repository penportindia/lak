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
// ✅ 3. Initialize Firebase
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
// ✅ 5. Toast Notification
// ----------------------------------------------------
function showToast(message, type = "success") {
  if (!notification) return console.warn("Notification element missing");
  notification.textContent = message || "";
  notification.className = `notification-${type}`;
  notification.style.display = "block";
  setTimeout(() => (notification.style.display = "none"), 3000);
}

// ----------------------------------------------------
// ✅ 6. Fetch School Names
// ----------------------------------------------------
async function fetchSchoolNames() {
  try {
    const snapshot = await get(ref(db, "DATA-MASTER"));
    const schools = snapshot.exists() ? Object.keys(snapshot.val()).sort() : [];
    schoolFilter.innerHTML = `<option value="">Select School</option>`;
    schools.forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      schoolFilter.appendChild(option);
    });
  } catch (err) {
    console.error("Failed to fetch school names:", err);
    showToast("Failed to load schools", "error");
  }
}

// ----------------------------------------------------
// ✅ 7. Fetch School IDs
// ----------------------------------------------------
async function fetchSchoolIDs(schoolName) {
  schoolIDSelect.innerHTML = `<option value="">Select School ID</option>`;
  fullDataArray = [];
  renderTable([]);
  if (!schoolName) return;

  try {
    const snapshot = await get(ref(db, `DATA-MASTER/${schoolName}`));
    const ids = snapshot.exists() ? Object.keys(snapshot.val()).sort() : [];
    ids.forEach(id => {
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
    console.error("Failed to fetch school IDs:", err);
    showToast("Failed to load School IDs", "error");
  }
}

// ----------------------------------------------------
// ✅ 8. Fetch Data for selected schoolID & type
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
    if (dataObj && typeof dataObj === "object") {
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
    console.error("Failed to fetch data:", err);
    showToast("Failed to load data", "error");
  }
}

// ----------------------------------------------------
// ✅ 9. Render Table
// ----------------------------------------------------
function renderTable(dataArray) {
  tableHead.innerHTML = "";
  tableBody.innerHTML = "";
  dataCount.textContent = `Total: ${dataArray.length || 0}`;

  if (!Array.isArray(dataArray) || !dataArray.length) {
    tableBody.innerHTML = `<tr><td colspan="100%" class="text-center p-4">No matching records found.</td></tr>`;
    return;
  }

  const keys = Object.keys(dataArray[0]).filter(k => !k.startsWith("__"));
  const headerRow = document.createElement("tr");

  // Checkbox column
  const selectAllTh = document.createElement("th");
  const selectAllCheckbox = document.createElement("input");
  selectAllCheckbox.type = "checkbox";
  selectAllCheckbox.addEventListener("change", function () {
    tableBody.querySelectorAll("input[type='checkbox']").forEach(cb => cb.checked = this.checked);
  });
  selectAllTh.appendChild(selectAllCheckbox);
  headerRow.appendChild(selectAllTh);

  // Table headers
  keys.forEach(key => {
    const th = document.createElement("th");
    th.textContent = key;
    headerRow.appendChild(th);
  });
  tableHead.appendChild(headerRow);

  // Table rows
  dataArray.forEach(item => {
    const tr = document.createElement("tr");
    tr.dataset.key = item.__key || "";
    const cbTd = document.createElement("td");
    cbTd.innerHTML = `<input type="checkbox">`;
    tr.appendChild(cbTd);

    keys.forEach(key => {
      const td = document.createElement("td");
      td.classList.add("border", "p-2");
      if (key.toLowerCase() === "photo" && item[key]) {
        td.innerHTML = `<img src="${item[key]}" alt="photo" class="w-12 h-12 rounded-full" onerror="this.src='';">`;
      } else td.textContent = item[key] != null ? item[key] : "";
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
// ✅ 11. Delete Selected Records
// ----------------------------------------------------
async function deleteSelectedData() {
  const selectedRows = Array.from(tableBody.querySelectorAll("input[type='checkbox']:checked"))
    .map(cb => cb.closest("tr"));
  if (!selectedRows.length) return showToast("No records selected to delete.", "error");
  if (!confirm(`Are you sure you want to delete ${selectedRows.length} record(s)?`)) return;

  const type = dataTypeSelect.value;
  const deletePromises = [];

  selectedRows.forEach(row => {
    const key = row.dataset.key;
    const recordData = fullDataArray.find(item => item.__key === key);
    if (!recordData) return;

    const { __schoolName: schoolName, __schoolID: schoolID } = recordData;
    const recordRef = ref(db, `DATA-MASTER/${schoolName}/${schoolID}/${type}/${key}`);
    const workdoneRef = ref(db, `workdone/${schoolName}/${type}/${key}`);
    const timestamp = new Date().toISOString();

    deletePromises.push(
      set(workdoneRef, { deletedAt: timestamp, type, key })
        .catch(err => console.warn(`Failed to log deletion for ${key}:`, err))
        .then(() => remove(recordRef).catch(err => console.error(`Failed to delete record ${key}:`, err)))
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
// ✅ 12. Export Selected Data (XLSX + ZIP)
// ----------------------------------------------------
async function exportSelectedData() {
  try {
    const selectedRows = Array.from(tableBody.querySelectorAll("input[type='checkbox']:checked"))
      .map(cb => cb.closest("tr"));

    if (!selectedRows.length) return showToast("No records selected to export.", "error");

    const schoolName = schoolFilter.value || "UnknownSchool";
    const schoolId = schoolIDSelect.value || "UnknownID";

    // Column headers (exclude staff_enrollment & student_enrollment)
    const allThs = Array.from(tableHead.querySelectorAll("th")).slice(1);
    const excludeHeaders = ["staff_enrollment","student_enrollment"];
    const columnHeaders = allThs.map(th => th.textContent.trim()).filter(h => !excludeHeaders.includes(h.toLowerCase()));

    const data = [];
    const zip = new JSZip();
    const imageFolder = zip.folder("Photos");

    const formatDateToDDMMMYYYY = (dateStr) => {
      if (!dateStr) return "";
      const parts = dateStr.includes("-") ? dateStr.split("-") : dateStr.includes("/") ? dateStr.split("/") : null;
      if (!parts) return dateStr;
      let day, month, year;
      if (parts[0].length === 4) [year, month, day] = parts.map(p => parseInt(p));
      else [day, month, year] = parts.map(p => parseInt(p));
      if (!day || !month || !year) return dateStr;
      const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${String(day).padStart(2,"0")}-${monthNames[month-1]}-${year}`;
    };

    for (const row of selectedRows) {
      const cells = row.querySelectorAll("td");
      const enrollment = row.dataset.key || `unknown-${Date.now()}`;
      const rowData = {};
      let headerIdx = 0;

      for (let i = 1; i < cells.length; i++) {
        const header = allThs[i - 1].textContent.trim();
        if (excludeHeaders.includes(header.toLowerCase())) continue;
        let value = cells[i]?.textContent.trim() || "";

        if (["staffdob","studentdob"].includes(header.toLowerCase())) value = formatDateToDDMMMYYYY(value);

        if (header.toLowerCase() === "photo") {
          const img = cells[i].querySelector("img");
          if (img?.src) {
            value = `${enrollment}.jpg`;
            try {
              const response = await fetch(img.src);
              if (response.ok) {
                const blob = await response.blob();
                imageFolder.file(`${enrollment}.jpg`, blob);
              }
            } catch (err) {
              console.warn(`Failed to fetch photo for ${enrollment}: ${err.message}`);
            }
          } else value = "";
        }

        rowData[header] = value;
        headerIdx++;
      }
      data.push(rowData);
    }

    const worksheet = XLSX.utils.json_to_sheet(data, { header: columnHeaders });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const excelBlob = new Blob([excelBuffer], { type: "application/octet-stream" });
    zip.file(`${schoolName}-${schoolId}-Exported-Data.xlsx`, excelBlob);

    const zipBlob = await zip.generateAsync({ type: "blob" });
    saveAs(zipBlob, `${schoolName}-${schoolId}-Exported-Data.zip`);

    showToast(`${selectedRows.length} records exported successfully.`, "success");
  } catch (err) {
    console.error("Export failed:", err);
    showToast("Export failed. Check console.", "error");
  }
}

// ----------------------------------------------------
// ✅ 13. Event Listeners
// ----------------------------------------------------
resetBtn?.addEventListener("click", resetFilters);
deleteBtn?.addEventListener("click", deleteSelectedData);
exportBtn?.addEventListener("click", exportSelectedData);
schoolFilter?.addEventListener("change", () => fetchSchoolIDs(schoolFilter.value));
schoolIDSelect?.addEventListener("change", fetchDataForSchool);
dataTypeSelect?.addEventListener("change", fetchDataForSchool);

// ----------------------------------------------------
// ✅ 14. Initial Load
// ----------------------------------------------------
fetchSchoolNames();
