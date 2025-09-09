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
// 🚀 Modern Stylish Inline Edit Module (3 Columns Fields + Bigger Photo)
// ----------------------------------------------------
function openEditModule(item, keys) {
  document.getElementById("editModule")?.remove();

  const module = document.createElement("div");
  module.id = "editModule";
  module.style.cssText = `
    position: fixed; top: 5%; left: 50%;
    transform: translateX(-50%);
    background: #ffffff;
    padding: 0;
    border-radius: 16px;
    box-shadow: 0 12px 35px rgba(0,0,0,0.2);
    z-index: 10000;
    max-height: 95vh;
    overflow-y: auto;
    min-width: 950px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    display: flex;
    flex-direction: column;
    animation: fadeIn 0.3s ease-in-out;
  `;

  // CSS Animation
  const styleTag = document.createElement("style");
  styleTag.textContent = `
    @keyframes fadeIn {
      from {opacity: 0; transform: translateY(-20px);}
      to {opacity: 1; transform: translateY(0);}
    }
    @media(max-width: 900px) {
      #editModule {
        min-width: 95%;
        flex-direction: column;
      }
      #editModule .edit-body {
        flex-direction: column;
      }
      #editModule .photo-section {
        width: 100%;
      }
    }
  `;
  document.head.appendChild(styleTag);

  // Header
  const header = document.createElement("div");
  header.style.cssText = `
    background: linear-gradient(135deg, #4CAF50, #2e7d32);
    color: white;
    padding: 18px 24px;
    border-radius: 16px 16px 0 0;
    font-size: 1.3rem;
    font-weight: bold;
    letter-spacing: 0.5px;
    text-align: center;
  `;
  header.textContent = `Edit: ${item.__key}`;
  module.appendChild(header);

  // Body (Left + Right)
  const body = document.createElement("div");
  body.className = "edit-body";
  body.style.cssText = `
    display: flex;
    gap: 35px;
    padding: 25px;
  `;

  // ===== Left (Fields)
  const leftSection = document.createElement("div");
  leftSection.style.cssText = `
    flex: 2.5;
    display: flex;
    flex-direction: column;
  `;

  const formFields = {};
  const formGrid = document.createElement("div");
  formGrid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(3, 1fr);   /* ✅ 3 columns fixed */
    gap: 20px;
  `;

  keys.forEach(key => {
    if (key.toLowerCase() === "photo") return; // skip photo here

    const fieldDiv = document.createElement("div");
    fieldDiv.style.cssText = "display: flex; flex-direction: column;";

    const label = document.createElement("label");
    label.textContent = key;
    label.style.cssText = `
      font-weight: 600;
      margin-bottom: 6px;
      color: #333;
      font-size: 0.9rem;
    `;

    if (["schoolname","schoolid","studentenrollment","staffenrollment"].includes(key.toLowerCase())) {
      const input = document.createElement("input");
      input.type = "text";
      input.value = item[key]?.toUpperCase() ?? "";
      input.disabled = true;
      input.readOnly = true;
      input.style.cssText = `
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 10px;
        background: #f5f5f5;
        color: #888;
        font-size: 0.95rem;
      `;
      fieldDiv.appendChild(label);
      fieldDiv.appendChild(input);
      formFields[key] = input;
    } else {
      const input = document.createElement("input");
      input.type = !isNaN(item[key]) ? "number" : "text";
      input.value = item[key]?.toString().toUpperCase() ?? "";
      input.style.cssText = `
        padding: 10px 12px;
        border: 1px solid #ccc;
        border-radius: 10px;
        font-size: 0.95rem;
        color: #333;
        outline: none;
        transition: 0.2s;
        text-transform: uppercase;
      `;
      input.addEventListener("focus", () => {
        input.style.borderColor = "#4CAF50";
        input.style.boxShadow = "0 0 6px rgba(76,175,80,0.4)";
      });
      input.addEventListener("blur", () => {
        input.style.borderColor = "#ccc";
        input.style.boxShadow = "none";
      });
      // ✅ Yahan badlav kiya gaya hai
      input.addEventListener("input", () => {
        const cursorPosition = input.selectionStart;
        input.value = input.value.toUpperCase();
        input.setSelectionRange(cursorPosition, cursorPosition);
      });

      fieldDiv.appendChild(label);
      fieldDiv.appendChild(input);
      formFields[key] = input;
    }

    formGrid.appendChild(fieldDiv);
  });
  leftSection.appendChild(formGrid);

  // ===== Right (Photo + Buttons)
  const rightSection = document.createElement("div");
  rightSection.className = "photo-section";
  rightSection.style.cssText = `
    flex: 1.2;
    display: flex;
    flex-direction: column;
    align-items: center;
  `;

  const imgCard = document.createElement("div");
  imgCard.style.cssText = `
    background: #fafafa;
    border: 1px solid #eee;
    padding: 18px;
    border-radius: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    margin-bottom: 25px;
    text-align: center;
    width: 100%;
  `;

  const imgPreview = document.createElement("img");
  imgPreview.src = item.photo ?? "";
  imgPreview.alt = "Photo Preview";
  imgPreview.style.cssText = `
    width: 200px;    /* ✅ Bigger size */
    height: 200px;
    object-fit: cover;
    border-radius: 14px;
    border: 1px solid #ddd;
  `;
  imgCard.appendChild(imgPreview);
  rightSection.appendChild(imgCard);

  // Buttons
  const btnDiv = document.createElement("div");
  btnDiv.style.cssText = `
    display: flex;
    justify-content: center;
    gap: 16px;
    width: 100%;
  `;

  const updateBtn = document.createElement("button");
  updateBtn.textContent = "Update";
  updateBtn.style.cssText = `
    flex: 1;
    padding: 12px 20px;
    background: linear-gradient(135deg, #4CAF50, #2e7d32);
    color: white;
    border: none;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  `;
  updateBtn.addEventListener("mouseover", () => {
    updateBtn.style.transform = "translateY(-2px)";
    updateBtn.style.boxShadow = "0 4px 10px rgba(0,0,0,0.2)";
  });
  updateBtn.addEventListener("mouseout", () => {
    updateBtn.style.transform = "none";
    updateBtn.style.boxShadow = "none";
  });

  updateBtn.addEventListener("click", async () => {
    try {
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
    flex: 1;
    padding: 12px 20px;
    background: linear-gradient(135deg, #9e9e9e, #616161);
    color: white;
    border: none;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  `;
  cancelBtn.addEventListener("mouseover", () => {
    cancelBtn.style.transform = "translateY(-2px)";
    cancelBtn.style.boxShadow = "0 4px 10px rgba(0,0,0,0.2)";
  });
  cancelBtn.addEventListener("mouseout", () => {
    cancelBtn.style.transform = "none";
    cancelBtn.style.boxShadow = "none";
  });
  cancelBtn.addEventListener("click", () => module.remove());

  btnDiv.appendChild(updateBtn);
  btnDiv.appendChild(cancelBtn);
  rightSection.appendChild(btnDiv);

  // Add sections
  body.appendChild(leftSection);
  body.appendChild(rightSection);
  module.appendChild(body);
  document.body.appendChild(module);

  // Auto focus
  const firstEditable = keys.find(k => !["schoolname","schoolid","studentenrollment","staffenrollment","photo"].includes(k.toLowerCase()));
  if(firstEditable) formFields[firstEditable]?.focus();
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
