// ✅ 1. Import Firebase Modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getDatabase, ref, onValue, remove } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

// ✅ 2. Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAR3KIgxzn12zoWwF3rMs7b0FfP-qe3mO4",
  authDomain: "schools-cdce8.firebaseapp.com",
  databaseURL: "https://schools-cdce8-default-rtdb.firebaseio.com",
  projectId: "schools-cdce8",
  storageBucket: "schools-cdce8.appspot.com",
  messagingSenderId: "772712220138",
  appId: "1:772712220138:web:381c173dccf1a6513fde93"
};

// ✅ 3. Initialize Firebase App and Database
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ✅ 4. DOM Element References
const dataTypeSelect = document.getElementById("dataType");
const schoolFilter = document.getElementById("schoolFilter");
const resetBtn = document.getElementById("resetBtn");
const exportBtn = document.getElementById("exportBtn");
const deleteBtn = document.getElementById("deleteBtn");
const tableHead = document.getElementById("tableHead");
const tableBody = document.getElementById("tableBody");
const notification = document.getElementById("notification");
const dataCount = document.getElementById("dataCount");

// ✅ 5. Data Storage Variable
let fullDataArray = [];

// ✅ 6. Show Toast Notification
function showToast(message, type = "success") {
  notification.textContent = message;
  notification.className = `notification-${type}`;
  notification.style.display = "block";
  setTimeout(() => {
    notification.style.display = "none";
  }, 3000);
}

// ✅ 7. Fetch Data from Firebase
function fetchData(type) {
  const dbRef = ref(db, type);
  onValue(dbRef, (snapshot) => {
    const dataObj = snapshot.val();
    fullDataArray = [];

    if (dataObj) {
      Object.entries(dataObj).forEach(([key, item]) => {
        if (item && typeof item === "object") {
          item.__key = key; // store Firebase key for later use
          fullDataArray.push(item);
        }
      });
    }

    populateSchoolFilter(fullDataArray);
    renderTable(fullDataArray);
  });
}

// ✅ 8. Populate School Dropdown with Unique School Names
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

// ✅ 9. Render Data Table
function renderTable(dataArray) {
  tableHead.innerHTML = "";
  tableBody.innerHTML = "";

  // Update count display
  dataCount.textContent = `Total: ${dataArray.length}`;

  if (dataArray.length === 0) {
    tableBody.innerHTML = `<tr><td colspan='100%' class="text-center p-4">No matching records found.</td></tr>`;
    return;
  }

  const keys = Object.keys(dataArray[0]).filter(k => k !== "__key");
  const headerRow = document.createElement("tr");

  // Add checkbox column
  const selectAllTh = document.createElement("th");
  const selectAllCheckbox = document.createElement("input");
  selectAllCheckbox.type = "checkbox";
  selectAllCheckbox.addEventListener("change", function () {
    const checkboxes = tableBody.querySelectorAll("input[type='checkbox']");
    checkboxes.forEach(cb => cb.checked = this.checked);
  });
  selectAllTh.appendChild(selectAllCheckbox);
  headerRow.appendChild(selectAllTh);

  // Add header columns
  keys.forEach(key => {
    const th = document.createElement("th");
    th.textContent = key;
    headerRow.appendChild(th);
  });

  tableHead.appendChild(headerRow);

  // Render each row
  dataArray.forEach(item => {
    const tr = document.createElement("tr");
    tr.dataset.key = item.__key;

    const cbTd = document.createElement("td");
    cbTd.innerHTML = `<input type="checkbox">`;
    tr.appendChild(cbTd);

    keys.forEach(key => {
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

// ✅ 10. Filter Table by School
function applyFilters() {
  const schoolVal = schoolFilter.value.trim().toLowerCase();
  const filtered = fullDataArray.filter(item => {
    const schoolCol = (item.school || Object.values(item)[1] || "").toLowerCase();
    return !schoolVal || schoolCol === schoolVal;
  });
  renderTable(filtered);
}

// ✅ 11. Reset Filters
function resetFilters() {
  schoolFilter.value = "";
  const selectAll = tableHead.querySelector("input[type='checkbox']");
  if (selectAll) selectAll.checked = false;
  renderTable(fullDataArray);
}

// ✅ 12. Delete Selected Records from Firebase
function deleteSelectedData() {
  const rows = Array.from(document.querySelectorAll("#tableBody tr"));
  const selectedRows = rows.filter(row => row.querySelector("input[type='checkbox']").checked);

  if (selectedRows.length === 0) {
    showToast("No records selected to delete.", "error");
    return;
  }

  const confirmDelete = confirm(`Are you sure you want to delete ${selectedRows.length} record(s)?`);
  if (!confirmDelete) return;

  const type = dataTypeSelect.value;
  const deletePromises = [];

  selectedRows.forEach(row => {
    const key = row.getAttribute("data-key");
    if (key) {
      const recordRef = ref(db, `${type}/${key}`);
      deletePromises.push(remove(recordRef));
    }
  });

  Promise.all(deletePromises)
    .then(() => {
      showToast(`${selectedRows.length} record(s) deleted successfully.`, "success");
      fetchData(type);
    })
    .catch(error => {
      console.error("Error deleting records:", error);
      showToast("Some records could not be deleted.", "error");
    });
}

// ✅ 13. Export Selected Rows as CSV + Photos as ZIP
async function exportSelectedData() {
  const rows = Array.from(document.querySelectorAll("#tableBody tr"));
  const selectedRows = rows.filter(r => r.querySelector("input[type='checkbox']").checked);

  if (selectedRows.length === 0) {
    showToast("No records selected to export.", "error");
    return;
  }

  const headers = ["Enrollment"];
  const columnHeaders = Array.from(document.querySelectorAll("#tableHead th")).slice(1).map(th => th.textContent.trim());
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
      let cellText = cell?.textContent.trim() || "";
      rowData[header] = cellText;
    });

    data.push(rowData);

    const img = cells[1]?.querySelector("img");
    const photoURL = img?.src || "";

    if (photoURL && enrollment) {
      try {
        const response = await fetch(photoURL);
        if (!response.ok) throw new Error("Photo fetch failed");
        const blob = await response.blob();
        imageFolder.file(`${enrollment}.jpg`, blob);
      } catch (err) {
        console.warn(`❌ Failed to download photo for ${enrollment}:`, err.message);
      }
    }
  }

  const csvRows = [headers.join(",")];
  data.forEach(row => {
    const values = headers.map(h => {
      let val = (row[h] || "").replace(/"/g, '""');
      if (h.toLowerCase().includes("dob")) {
        return `"=""${val}"""`; // force Excel to treat as text
      } else {
        return `"${val}"`;
      }
    });
    csvRows.push(values.join(","));
  });

  const csvContent = csvRows.join("\n");
  zip.file("data.csv", csvContent);
  const zipBlob = await zip.generateAsync({ type: "blob" });
  saveAs(zipBlob, `Exported-Data-${Date.now()}.zip`);

  showToast(`${selectedRows.length} records exported as zip.`, "success");
}

// ✅ 14. Event Listeners
dataTypeSelect.addEventListener("change", () => fetchData(dataTypeSelect.value));
schoolFilter.addEventListener("change", applyFilters);
resetBtn.addEventListener("click", resetFilters);
deleteBtn.addEventListener("click", deleteSelectedData);
exportBtn.addEventListener("click", exportSelectedData);

// ✅ 15. Load Initial Data on Page Load
fetchData(dataTypeSelect.value);
