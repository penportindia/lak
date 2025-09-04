// ----------------------------------------------------
// ✅ Firebase Imports
// ----------------------------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

// ----------------------------------------------------
// ✅ Firebase Config
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
// ✅ Initialize Firebase
// ----------------------------------------------------
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ----------------------------------------------------
// ✅ DOM Elements
// ----------------------------------------------------
const dataTypeSelect   = document.getElementById("dataTypeSelect");
const schoolFilter     = document.getElementById("schoolFilter");
const schoolIDSelect   = document.getElementById("schoolIDSelect");
const resetBtn         = document.getElementById("resetBtn");
const tableHead        = document.getElementById("tableHead");
const tableBody        = document.getElementById("tableBody");
const recordCount      = document.getElementById("recordCount");

let fullDataArray = [];

// ----------------------------------------------------
// ✅ 1. Fetch School Names
// ----------------------------------------------------
async function fetchSchoolNames() {
  if (!schoolFilter) return;

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
    console.error("Error fetching schools:", err);
    alert("⚠️ Failed to load schools");
  }
}

// ----------------------------------------------------
// ✅ 2. Fetch School IDs
// ----------------------------------------------------
async function fetchSchoolIDs(schoolName) {
  if (!schoolIDSelect) return;
  schoolIDSelect.innerHTML = "";
  fullDataArray = [];
  renderTable([]);

  if (!schoolName) return;

  try {
    const snapshot = await get(ref(db, `DATA-MASTER/${schoolName}`));
    const ids = snapshot.exists() ? Object.keys(snapshot.val()).sort() : [];

    if (ids.length > 0) {
      schoolIDSelect.innerHTML = "";
      ids.forEach(id => {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = id;
        schoolIDSelect.appendChild(option);
      });
      schoolIDSelect.value = ids[0];
      schoolIDSelect.disabled = true;

      await fetchDataForSchool();
    } else {
      schoolIDSelect.innerHTML = `<option value="">No ID Found</option>`;
      schoolIDSelect.disabled = true;
    }
  } catch (err) {
    console.error("Error fetching IDs:", err);
    alert("⚠️ Failed to load IDs");
  }
}

// ----------------------------------------------------
// ✅ 3. Fetch Data for Selected School
// ----------------------------------------------------
async function fetchDataForSchool() {
  const schoolName = schoolFilter?.value;
  const schoolID   = schoolIDSelect?.value;
  const type       = dataTypeSelect?.value;

  if (!schoolName || !schoolID || !type) return;

  try {
    const snapshot = await get(ref(db, `DATA-MASTER/${schoolName}/${schoolID}/${type}`));
    const dataObj = snapshot.val();
    fullDataArray = [];

    if (dataObj && typeof dataObj === "object") {
      Object.entries(dataObj).forEach(([enrollID, record]) => {
        if (record && typeof record === "object") {
          fullDataArray.push({
            ...record,
            __key: enrollID,
            __schoolName: schoolName,
            __schoolID: schoolID,
            __type: type
          });
        }
      });
    }

    renderTable(fullDataArray);
  } catch (err) {
    console.error("Error fetching data:", err);
    alert("⚠️ Failed to load data");
  }
}

// ----------------------------------------------------
// ✅ Render Table
// ----------------------------------------------------
function renderTable(dataArray) {
  if (!tableHead || !tableBody || !recordCount) return;

  tableHead.innerHTML = "";
  tableBody.innerHTML = "";
  recordCount.textContent = `Total Records: ${dataArray.length}`;

  if (!dataArray.length) {
    tableBody.innerHTML = `<tr><td colspan='100%' class="text-center p-4">No records found.</td></tr>`;
    return;
  }

  const keys = Object.keys(dataArray[0]).filter(k => !k.startsWith("__"));
  const headerRow = document.createElement("tr");

  // ✅ Select All Checkbox
  const selectAllTh = document.createElement("th");
  const selectAllCheckbox = document.createElement("input");
  selectAllCheckbox.type = "checkbox";
  selectAllCheckbox.addEventListener("change", function () {
    tableBody.querySelectorAll("input[type='checkbox']").forEach(cb => cb.checked = this.checked);
  });
  selectAllTh.appendChild(selectAllCheckbox);
  headerRow.appendChild(selectAllTh);

  // ✅ Column Headers
  keys.forEach(key => {
    const th = document.createElement("th");
    th.textContent = key;
    headerRow.appendChild(th);
  });

  // ✅ Edit Column
  const editTh = document.createElement("th");
  editTh.textContent = "Edit";
  headerRow.appendChild(editTh);

  tableHead.appendChild(headerRow);

  // ✅ Table Rows
  dataArray.forEach(item => {
    const tr = document.createElement("tr");
    tr.dataset.key = item.__key;

    // Checkbox
    const cbTd = document.createElement("td");
    const cbInput = document.createElement("input");
    cbInput.type = "checkbox";
    cbTd.appendChild(cbInput);
    tr.appendChild(cbTd);

    // Data cells
    keys.forEach(key => {
      const td = document.createElement("td");
      td.classList.add("border", "p-2");
      td.setAttribute("data-field", key);

      if (key.toLowerCase() === "photo" && item[key]) {
        const img = document.createElement("img");
        img.src = item[key].trim();
        img.alt = "Photo";
        img.loading = "lazy";
        img.style.cssText = "width:50px;height:50px;object-fit:cover;border-radius:4px;cursor:pointer;";
        img.addEventListener("click", () => showImagePreview(item[key]));
        td.appendChild(img);
      } else {
        td.textContent = item[key] ?? "";
      }

      tr.appendChild(td);
    });

    // Edit Button
    const editTd = document.createElement("td");
    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.classList.add("px-2", "py-1", "bg-blue-500", "text-white", "rounded", "hover:bg-blue-600");
    editBtn.addEventListener("click", () => openEditModule(item, keys));
    editTd.appendChild(editBtn);
    tr.appendChild(editTd);

    tableBody.appendChild(tr);
  });
}

// ----------------------------------------------------
// ✅ Image Preview
// ----------------------------------------------------
function showImagePreview(url) {
  const preview = document.createElement("div");
  preview.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:9999;";
  preview.addEventListener("click", () => preview.remove());

  const imgLarge = document.createElement("img");
  imgLarge.src = url.trim();
  imgLarge.style.cssText = "max-width:90%;max-height:90%;border-radius:8px;";
  preview.appendChild(imgLarge);

  document.body.appendChild(preview);
}

// ----------------------------------------------------
// ✅ Stylish Inline Edit Module (Locked Key Fields + Photo Preview + Uppercase)
// ----------------------------------------------------
function openEditModule(item, keys) {
  document.getElementById("editModule")?.remove();

  const module = document.createElement("div");
  module.id = "editModule";
  module.style.cssText = `
    position: fixed; top: 5%; left: 50%;
    transform: translateX(-50%);
    background: #fefefe;
    padding: 25px 30px;
    border-radius: 12px;
    box-shadow: 0 12px 30px rgba(0,0,0,0.2);
    z-index: 10000;
    max-height: 95vh;
    overflow-y: visible;  /* no scroll */
    min-width: 600px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    transition: all 0.3s ease-in-out;
  `;

  const title = document.createElement("h2");
  title.textContent = `${item.__key}`;
  title.style.cssText = `
    margin-bottom: 25px;
    text-align: center;
    font-size: 1.4rem;
    color: #222;
    letter-spacing: 0.5px;
  `;
  module.appendChild(title);

  const formFields = {};

  const formGrid = document.createElement("div");
  formGrid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 20px;
    align-items: flex-end;
  `;

  keys.forEach(key => {
    const fieldDiv = document.createElement("div");
    fieldDiv.style.cssText = "display: flex; flex-direction: column;";

    const label = document.createElement("label");
    label.textContent = key;
    label.style.cssText = `
      font-weight: 600;
      margin-bottom: 6px;
      color: #555;
      font-size: 0.95rem;
    `;

    // Fully disabled fields
    if (["schoolname","schoolid","studentenrollment","staffenrollment"].includes(key.toLowerCase())) {
      const input = document.createElement("input");
      input.type = "text";
      input.value = item[key]?.toUpperCase() ?? "";
      input.disabled = true;
      input.readOnly = true;
      input.style.cssText = `
        padding: 8px 10px;
        border: 1px solid #ccc;
        border-radius: 8px;
        background: #f0f0f0;
        color: #777;
        cursor: not-allowed;
        transition: all 0.2s;
        text-transform: uppercase;
      `;
      fieldDiv.appendChild(label);
      fieldDiv.appendChild(input);
      formFields[key] = input;
    }
    // Photo preview only
    else if (key.toLowerCase() === "photo") {
      const imgPreview = document.createElement("img");
      imgPreview.src = item[key] ?? "";
      imgPreview.alt = "Photo Preview";
      imgPreview.style.cssText = `
        width: 120px;
        height: 120px;
        object-fit: cover;
        border-radius: 10px;
        margin-top: 5px;
        border: 1px solid #ccc;
        box-shadow: 0 4px 10px rgba(0,0,0,0.1);
      `;
      fieldDiv.appendChild(label);
      fieldDiv.appendChild(imgPreview);
    }
    // Editable fields (Uppercase)
    else {
      const input = document.createElement("input");
      input.type = !isNaN(item[key]) ? "number" : "text";
      input.value = item[key]?.toString().toUpperCase() ?? "";
      input.style.cssText = `
        padding: 8px 12px;
        border: 1px solid #ccc;
        border-radius: 8px;
        font-size: 0.95rem;
        color: #333;
        outline: none;
        transition: all 0.2s;
        text-transform: uppercase;
      `;

      // Convert input to uppercase as user types
      input.addEventListener("input", () => {
        input.value = input.value.toUpperCase();
      });

      input.addEventListener("focus", () => {
        input.style.borderColor = "#4CAF50";
        input.style.boxShadow = "0 0 5px rgba(76, 175, 80, 0.5)";
      });
      input.addEventListener("blur", () => {
        input.style.borderColor = "#ccc";
        input.style.boxShadow = "none";
      });

      fieldDiv.appendChild(label);
      fieldDiv.appendChild(input);
      formFields[key] = input;
    }

    formGrid.appendChild(fieldDiv);
  });

  module.appendChild(formGrid);

  // Buttons
  const btnDiv = document.createElement("div");
  btnDiv.style.cssText = `
    display: flex;
    justify-content: flex-end;
    margin-top: 25px;
    gap: 12px;
  `;

  const updateBtn = document.createElement("button");
  updateBtn.textContent = "Update";
  updateBtn.style.cssText = `
    padding: 10px 18px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  `;
  updateBtn.addEventListener("mouseover", () => updateBtn.style.background = "#45a049");
  updateBtn.addEventListener("mouseout", () => updateBtn.style.background = "#4CAF50");

  updateBtn.addEventListener("click", async () => {
    try {
      for (let key in formFields) {
        if (!formFields[key].disabled && !formFields[key].value.trim()) {
          alert(`⚠️ ${key} cannot be empty`);
          formFields[key].focus();
          return;
        }
      }

      // Save all editable fields in uppercase
      const updatedData = Object.fromEntries(
        Object.entries(formFields)
          .filter(([k,v]) => !v.disabled)
          .map(([k,v]) => [k, v.value.trim().toUpperCase()])
      );

      if(item.photo) updatedData.photo = item.photo;

      const recordRef = ref(db, `DATA-MASTER/${item.__schoolName}/${item.__schoolID}/${item.__type}/${item.__key}`);
      await set(recordRef, {...item, ...updatedData});

      alert("✅ Record updated successfully!");
      module.remove();
      fetchDataForSchool();
    } catch(err) {
      console.error(err);
      alert("⚠️ Failed to update record: " + err.message);
    }
  });

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.cssText = `
    padding: 10px 18px;
    background: #aaa;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  `;
  cancelBtn.addEventListener("mouseover", () => cancelBtn.style.background = "#888");
  cancelBtn.addEventListener("mouseout", () => cancelBtn.style.background = "#aaa");
  cancelBtn.addEventListener("click", () => module.remove());

  btnDiv.appendChild(cancelBtn);
  btnDiv.appendChild(updateBtn);
  module.appendChild(btnDiv);

  document.body.appendChild(module);

  // Auto-focus first editable field
  const firstEditable = keys.find(k => !["schoolname","schoolid","studentenrollment","staffenrollment","photo"].includes(k.toLowerCase()));
  if(firstEditable) formFields[firstEditable]?.focus();

  // Submit on Enter
  module.addEventListener("keypress", e => {
    if (e.key === "Enter") updateBtn.click();
  });

  module.scrollIntoView({ behavior: "smooth", block: "center" });
}


// ----------------------------------------------------
// ✅ Reset Filters
// ----------------------------------------------------
function resetFilters() {
  if (!schoolFilter || !schoolIDSelect || !dataTypeSelect || !tableHead || !tableBody || !recordCount) return;

  schoolFilter.value = "";
  schoolIDSelect.innerHTML = `<option value="">Select School ID</option>`;
  schoolIDSelect.disabled = false;
  dataTypeSelect.value = "";
  tableHead.innerHTML = "";
  tableBody.innerHTML = "";
  recordCount.textContent = "Total Records: 0";
  fullDataArray = [];
}

// ----------------------------------------------------
// ✅ Get Selected Data
// ----------------------------------------------------
function getSelectedData() {
  if (!tableBody) return [];

  const rows = tableBody.querySelectorAll("tr");
  const selected = [];
  const type = dataTypeSelect?.value?.toLowerCase()?.trim() || "unknown";

  rows.forEach(row => {
    const checkbox = row.querySelector("input[type='checkbox']");
    if (!checkbox?.checked) return;

    const record = {};
    row.querySelectorAll("td[data-field]").forEach(td => {
      const field = td.getAttribute("data-field")?.toLowerCase()?.trim();
      const img = td.querySelector("img");
      record[field] = img ? img.src.trim() : td.textContent.trim();
    });

    record.type = type;
    selected.push(record);
  });

  return selected;
}

// ----------------------------------------------------
// ✅ Event Listeners
// ----------------------------------------------------
schoolFilter?.addEventListener("change", e => fetchSchoolIDs(e.target.value));
dataTypeSelect?.addEventListener("change", fetchDataForSchool);
resetBtn?.addEventListener("click", resetFilters);

// ----------------------------------------------------
// ✅ Init
// ----------------------------------------------------
fetchSchoolNames();

// ----------------------------------------------------
// ✅ Export
// ----------------------------------------------------
export {
  fetchSchoolNames,
  fetchSchoolIDs,
  fetchDataForSchool,
  resetFilters,
  getSelectedData,
  dataTypeSelect,
  schoolFilter,
  schoolIDSelect,
  resetBtn
};
