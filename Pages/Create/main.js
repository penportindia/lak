// ============================
// ✅ Firebase Modules
// ============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getDatabase,
  ref as dbRef,
  get,
  child,
  set,
  remove,
  onDisconnect
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

// ============================
// ✅ Firebase Config
// ============================
const firebaseConfig = {
  apiKey: "AIzaSyAR3KIgxzn12zoWwF3rMs7b0FfP-qe3mO4",
  authDomain: "schools-cdce8.firebaseapp.com",
  databaseURL: "https://schools-cdce8-default-rtdb.firebaseio.com/",
  projectId: "schools-cdce8",
  storageBucket: "schools-cdce8.appspot.com",
  messagingSenderId: "772712220138",
  appId: "1:772712220138:web:381c173dccf1a6513fde93"
};

// ============================
// ✅ Initialize Firebase
// ============================
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// ============================
// ✅ Global Variables
// ============================
let imageData = '';
let lastType = '';
let stream = null;

let schoolCode = '';
let schoolName = '';
let entryData = {};

let userIP = '';     // original IP (for value)
let safeIP = '';     // Firebase-safe key (dots -> dashes)

let sessionTimeout = null;  // inactivity logout
let hardTimeout = null;     // 1-hour hard logout

const MAX_IDLE = 10 * 60 * 1000;    // 10 minutes
const MAX_SESSION = 60 * 60 * 1000; // 1 hour

// ============================
// ✅ DOM Helpers
// ============================
const el = id => document.getElementById(id);
const exists = id => !!el(id);

// ============================
// ✅ Get Public IP
// ============================
async function fetchUserIP() {
  try {
    const res = await fetch("https://api64.ipify.org?format=json");
    const data = await res.json();
    return data.ip || "unknown_ip";
  } catch {
    return "unknown_ip";
  }
}

// ============================
// ✅ Auto Logout / Inactivity
// ============================
function resetSessionTimer() {
  if (sessionTimeout) clearTimeout(sessionTimeout);
  sessionTimeout = setTimeout(async () => {
    await logoutUser("Session expired due to inactivity.");
  }, MAX_IDLE);
}

async function logoutUser(message = "You have been logged out.") {
  if (!schoolCode || !safeIP) return;
  try {
    const ipRef = dbRef(database, `activeSchools/${schoolCode}/${safeIP}`);
    await remove(ipRef);

    // UI updates
    if (exists("loginPage")) el("loginPage").classList.remove("hidden");
    if (exists("homePage")) el("homePage").classList.add("hidden");

    // Reset state
    schoolCode = '';
    schoolName = '';
    entryData = {};
    userIP = '';
    safeIP = '';

    if (sessionTimeout) clearTimeout(sessionTimeout);
    if (hardTimeout) clearTimeout(hardTimeout);

    alert(message);
  } catch (error) {
    console.error("Error during logout:", error);
  }
}

// ============================
// ✅ Activity listeners (for idle)
// ============================
['click', 'keydown', 'input', 'change', 'mousemove', 'touchstart'].forEach(evt => {
  document.addEventListener(evt, resetSessionTimer, { passive: true });
});

// ============================
// ✅ Login Function
// ============================
window.verifyLogin = async function () {
  const uidOrPhone = (el("loginUser")?.value || "").trim();
  const pwd = (el("loginPass")?.value || "").trim();

  if (!uidOrPhone || !pwd) {
    showOrAlert("Please enter both User ID or Phone Number and Password.", "error");
    return;
  }

  try {
    const rootRef = dbRef(database);
    const snapshot = await get(child(rootRef, `schools`));

    if (!snapshot.exists()) {
      showOrAlert("No school records found", "error");
      return;
    }

    const schools = snapshot.val();
    let matchedUser = null;

    // Find user by userid+password OR phone+password
    for (let key in schools) {
      const data = schools[key];
      if (!data) continue;

      const inputDigits = uidOrPhone.replace(/\D/g, "");
      const dbPhoneDigits = String(data.phone || "").replace(/\D/g, "");
      const inputUserId = uidOrPhone.startsWith("+") ? uidOrPhone : "+" + uidOrPhone;

      const uidMatch = (data.userid === uidOrPhone || data.userid === inputUserId) && data.password === pwd;
      const phoneMatch = dbPhoneDigits && dbPhoneDigits === inputDigits && data.password === pwd;

      if (uidMatch || phoneMatch) { matchedUser = data; break; }
    }

    if (!matchedUser) {
      showOrAlert("Invalid User ID / Phone or Password", "error");
      return;
    }

    // Clean school name
    const rawSchoolName = matchedUser.name || '';
    const cleanSchoolName = rawSchoolName.replace(/[^a-zA-Z0-9 ,]/g, '').replace(/\s+/g, ' ').trim();

    if (!cleanSchoolName) {
      showOrAlert("School name is invalid in database!", "error");
      return;
    }

    // Get IP and make Firebase-safe key
    userIP = await fetchUserIP();
    safeIP = userIP.replace(/\./g, "-"); // "." not allowed in Firebase keys

    // UI switch
    if (exists("loginPage")) el("loginPage").classList.add("hidden");
    if (exists("homePage")) el("homePage").classList.remove("hidden");
    if (exists("schoolName")) el("schoolName").innerHTML = `<option selected>${cleanSchoolName}</option>`;

    // Identify school/user code
    schoolCode = matchedUser.userid || 'SCHOOL';
    schoolName = cleanSchoolName;

    // Session path per user + IP (multi-device allowed)
    const ipRef = dbRef(database, `activeSchools/${schoolCode}/${safeIP}`);

    // Save/overwrite this IP session
    await set(ipRef, {
      name: schoolName,
      ip: userIP,            // store original IP as value
      status: "online",
      loginAt: Date.now(),
      expiresAt: Date.now() + MAX_SESSION
    });

    // Auto-remove this IP session if connection drops abruptly
    try { onDisconnect(ipRef).remove(); } catch (_) {}

    // Start timers
    resetSessionTimer();
    if (hardTimeout) clearTimeout(hardTimeout);
    hardTimeout = setTimeout(async () => {
      await logoutUser("Session ended after 1 hour.");
    }, MAX_SESSION);

    // ✅ Clean, simple success message
    showOrAlert("Login Successful!", "success");
  } catch (error) {
    showOrAlert("Firebase Error: " + (error.message || error), "error");
    console.error(error);
  }
};

// ============================
// ✅ Auto Logout on Page Close / Refresh
// ============================
window.addEventListener("beforeunload", () => {
  if (schoolCode && safeIP) {
    try {
      // Best-effort cleanup (non-blocking)
      remove(dbRef(database, `activeSchools/${schoolCode}/${safeIP}`));
    } catch (_) {}
  }
});


// -----------------------------
// ✅ Generate Unique Enrollment
// -----------------------------
async function generateUniqueEnrollment(type) {
  if (!type || typeof type !== 'string') {
    throw new Error("Invalid 'type' parameter");
  }

  if (!schoolName || !schoolName.trim()) {
    throw new Error("School name is empty! Cannot generate enrollment.");
  }

  const dbRoot = dbRef(database);
  const monthNames = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

  // Clean school name -> words
  const words = schoolName
    .replace(/[^a-zA-Z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

  if (words.length === 0) {
    throw new Error("School name has no valid letters!");
  }

  // Generate initials
  let initials = '';
  if (words.length === 1) {
    initials = words[0].toUpperCase();
  } else {
    initials = words.map(word => word[0].toUpperCase()).join('');
  }

  // Ensure exactly 4 letters
  initials = (initials + "XXXX").slice(0, 4); // pad or cut

  // Date
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mmm = monthNames[now.getMonth()];

  let unique = false;
  let enrollNo = "";

  while (!unique) {
    const serial = String(Math.floor(1000 + Math.random() * 9000)); // 4-digit random
    enrollNo = `${initials}${dd}${mmm}${serial}`;

    try {
      const snapshot = await get(child(dbRoot, `${type}/${enrollNo}`));
      if (!snapshot.exists()) unique = true;
      else {
        // tiny pause — but keep loop safe (avoid infinite fast loop)
        await new Promise(res => setTimeout(res, 40));
      }
    } catch (error) {
      console.error("Database error while generating enrollment:", error);
      throw new Error("Unable to generate enrollment number");
    }
  }

  return enrollNo;
}

// -----------------------------
// ✅ Navigation to Form
// -----------------------------
window.navigateToForm = async function () {
  const type = (el("idType")?.value || "").trim().toLowerCase();
  if (!type) return alert("Please select ID type");
  lastType = type;
  if (exists("homePage")) el("homePage").classList.add("hidden");
  if (exists("idForm")) el("idForm").classList.remove("hidden");
  await generateFormFields(type);
};

// -----------------------------
// ✅ Generate Form Fields
// -----------------------------
async function generateFormFields(type) {
  const numberFields = ['adm', 'roll', 'contact', 'empid'];

  const studentFields = [
    ['enroll', 'Enrollment Number *', 'text', true],
    ['adm', 'Admission Number', 'text'],
    ['name', 'Student Name *', 'text'],
    ['class', 'Class *', 'select', ['PG', 'NURSERY', 'LKG', 'UKG', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']],
    ['section', 'Section *', 'select', ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K']],
    ['roll', 'Roll Number *', 'text'],
    ['dob', 'Date of Birth', 'date'],
    ['father', "Father's Name *", 'text'],
    ['mother', "Mother's Name *", 'text'],
    ['contact', 'Contact Number', 'text'],
    ['address', 'Address *', 'textarea'],
    ['transport', 'Mode of Transport *', 'select', ['SELF', 'TRANSPORT']],
    ['house', 'House Name', 'text'],
    ['blood', 'Blood Group *', 'select', ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'NA']]
  ];

  const staffFields = [
    ['enroll', 'Enrollment Number *', 'text', true],
    ['empid', 'Employee ID', 'text'],
    ['name', 'Name *', 'text'],
    ['designation', 'Designation *', 'select', ['DIRECTOR', 'PRINCIPAL', 'VICE PRINCIPAL', 'ADMIN', 'ACCOUNTANT', 'LIBRARIAN', 'TEACHER', 'CLERK', 'COMPUTER OPERATOR', 'RECEPTIONIST', 'DRIVER', 'ATTENDANT', 'GUARD', 'CARETAKER', 'HELPER', 'PEON', 'MED', 'OTHER']],
    ['father', "Father / Spouse Name *", 'text'],
    ['dob', 'Date of Birth', 'date'],
    ['contact', 'Contact Number', 'text'],
    ['address', 'Address *', 'textarea'],
    ['blood', 'Blood Group *', 'select', ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'NA']]
  ];

  const fields = type === 'student' ? studentFields : staffFields;
  const container = el("formFields");
  if (!container) {
    console.warn("formFields container not found in DOM");
    return;
  }
  container.innerHTML = '';

  let enrollNo = "";
  try {
    enrollNo = await generateUniqueEnrollment(type);
  } catch (e) {
    console.error("Enrollment generation failed:", e);
    enrollNo = `${type.toUpperCase()}-TEMP-${Date.now()}`;
  }

  fields.forEach(fieldDef => {
    const [id, label, controlType, optOrReadonly] = fieldDef;
    const fullId = `${type}_${id}`;
    let inputHTML = '';

    // Required if label has * AND not 'dob' or 'contact'
    const isRequired = (label.includes('*') && !['dob', 'contact'].includes(id)) ? 'required' : '';

    if (controlType === 'select') {
      const options = Array.isArray(optOrReadonly) ? optOrReadonly : [];
      inputHTML = `<select id="${fullId}" name="${fullId}" ${isRequired}>
        <option value="" disabled selected>Select ${label.replace('*', '').trim()}</option>`;
      options.forEach(opt => inputHTML += `<option value="${opt}">${opt}</option>`);
      inputHTML += `</select>`;
    } else if (controlType === 'textarea') {
      inputHTML = `<textarea id="${fullId}" name="${fullId}" rows="2" ${isRequired}></textarea>`;
    } else {
      const value = id === 'enroll' ? enrollNo : '';
      const ro = id === 'enroll' ? 'readonly' : '';
      const inputType = id === 'dob' ? 'date' : (numberFields.includes(id) ? 'tel' : 'text');
      const inputAttributes = numberFields.includes(id) ? 'pattern="\\d*" inputmode="numeric"' : '';
      inputHTML = `<input type="${inputType}" id="${fullId}" name="${fullId}" value="${value}" ${ro} ${inputAttributes} ${isRequired} />`;
    }

    const wrapper = document.createElement('div');
    wrapper.className = "form-group";
    wrapper.innerHTML = `<label for="${fullId}">${label}</label>${inputHTML}`;
    container.appendChild(wrapper);
  });
}

// -----------------------------
// ✅ Image Compression (improved)
// -----------------------------
function compressImage(canvas, maxWidth = 600, targetSizeKB = 40) {
  // Accept either canvas element or image element
  if (!canvas) return '';

  const ratio = canvas.width / canvas.height;
  const newWidth = Math.min(canvas.width, maxWidth);
  const newHeight = Math.round(newWidth / ratio);

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = newWidth;
  outputCanvas.height = newHeight;
  const ctx = outputCanvas.getContext("2d");

  ctx.drawImage(canvas, 0, 0, newWidth, newHeight);

  let quality = 0.9; // start high
  let dataUrl = outputCanvas.toDataURL("image/jpeg", quality);

  // Decrease quality until below target or quality hits floor
  while ((dataUrl.length / 1024) > targetSizeKB && quality > 0.2) {
    quality -= 0.05;
    dataUrl = outputCanvas.toDataURL("image/jpeg", quality);
  }

  return dataUrl;
}

// -----------------------------
// ✅ Camera Functions
// -----------------------------
function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showOrAlert("Camera API not supported on this device.", "error");
    return;
  }
  navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } })
    .then(s => {
      stream = s;
      const video = el("video");
      if (!video) return;
      video.srcObject = stream;
      video.play().catch(()=>{});
      video.classList.remove("hidden");
    })
    .catch(err => {
      console.error(err);
      showOrAlert("Unable To Access Camera", "error");
    });
}

function stopCamera() {
  if (stream) {
    try {
      stream.getTracks().forEach(track => track.stop());
    } catch (e) {}
    stream = null;
  }
  const video = el("video");
  if (video) {
    video.srcObject = null;
    video.classList.add("hidden");
  }
}

function takePicture() {
  const video = el("video");
  const canvas = el("canvas");

  if (!video || !canvas) return alert("Camera elements missing.");

  if (!video.videoWidth || !video.videoHeight) return alert("Camera not ready.");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.classList.remove("hidden");

  // Compress JPEG for Firebase (~target ~60KB)
  imageData = compressImage(canvas, 600, 60);

  stopCamera();

  const cameraBtn = el("cameraBtn");
  if (cameraBtn) {
    cameraBtn.innerHTML = `<i class="fas fa-redo"></i><span>Retake</span>`;
    cameraBtn.onclick = retakePicture;
  }
}

function retakePicture() {
  imageData = '';
  const canvas = el("canvas");
  if (canvas) canvas.classList.add("hidden");
  startCamera();
  const cameraBtn = el("cameraBtn");
  if (cameraBtn) {
    cameraBtn.innerHTML = `<i class="fas fa-video"></i><span>Camera</span>`;
    cameraBtn.onclick = startCamera;
  }
}

// -----------------------------
// ✅ Submit Handler
// -----------------------------
async function handleSubmit(e) {
  try {
    if (e && e.preventDefault) e.preventDefault();

    const newEntryBtn = el("newEntryBtn");
    if (newEntryBtn) newEntryBtn.disabled = true;

    const formFields = document.querySelectorAll("#formFields input, #formFields select, #formFields textarea");
    if (!formFields || formFields.length === 0) {
      throw new Error("Form fields not found");
    }

    const rawData = {};
    formFields.forEach(field => {
      const fname = field.name || field.id || '';
      let value = (field.value || "").toString().trim();
      const isUpperCase = (field.type === "text" || field.tagName === "TEXTAREA" || field.tagName === "SELECT") &&
        !['email', 'ifsc'].includes(fname.toLowerCase());
      if (isUpperCase) value = value.toUpperCase();
      rawData[fname || `field_${Math.random()}`] = value;
    });

    const enrollKey = `${lastType || 'default'}_enroll`;
    const nameKey = `${lastType || 'default'}_name`;
    const dobKey = `${lastType || 'default'}_dob`;
    const enroll = rawData[enrollKey];
    const dbPath = `${lastType || 'default'}/${enroll || 'unknown'}`;

    if (!enroll || !imageData) {
      showOrAlert("❌ Submit failed! Enrollment or photo missing.", "error");
      setTimeout(goHomeSafe, 2000);
      if (newEntryBtn) newEntryBtn.disabled = false;
      return;
    }

    // DOB formatting if present
    if (rawData[dobKey]) {
      const dobDate = new Date(rawData[dobKey]);
      if (!isNaN(dobDate)) {
        const day = String(dobDate.getDate()).padStart(2, '0');
        const month = dobDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
        const year = dobDate.getFullYear();
        rawData[dobKey] = `${day}-${month}-${year}`;
      }
    }

    rawData.schoolName = (schoolName || "SCHOOL NAME").toUpperCase();

    // build data object
    const data = {
      [enrollKey]: enroll,
      [nameKey]: rawData[nameKey] || "",
      schoolName: rawData.schoolName,
      photo: imageData
    };

    Object.keys(rawData).forEach(key => {
      if (!["photo", "schoolName", nameKey, enrollKey].includes(key)) data[key] = rawData[key];
    });

    entryData = data;
    // show preview immediately
    showPreview(imageData, enroll);

    // Save to Firebase with progress simulation
    const refPath = dbRef(database, dbPath);
    updateProgressBarSafe(0);

    // Use set to write the object
    await set(refPath, data);

    // simulated progress bar
    let percent = 0;
    const interval = setInterval(() => {
      percent += 20;
      if (percent > 100) percent = 100;
      updateProgressBarSafe(percent);
      if (percent >= 100) clearInterval(interval);
    }, 100);

    showOrAlert("✅ Submitted Successfully!", "success");
    if (newEntryBtn) newEntryBtn.disabled = false;

  } catch (err) {
    console.error("Unexpected error during submit:", err);
    showSubmitFailedAndGoHomeSafe();
  }
}

// -----------------------------
// ✅ Progress bar update
// -----------------------------
function updateProgressBarSafe(percent) {
  try {
    const elBar = el("uploadProgress");
    if (elBar) { elBar.style.width = percent + "%"; elBar.textContent = percent + "%"; }
  } catch (e) { console.error(e); }
}

// -----------------------------
// ✅ Preview (ShowPreview)
// -----------------------------
function showPreview(photoUrl, enrollmentNumber) {
  if (!photoUrl || !enrollmentNumber) {
    showOrAlert("❌ Missing photo or enrollment number!", "error");
    return;
  }

  const previewPage = el("previewPage");
  const idForm = el("idForm");
  const previewContainer = el("preview");

  if (!previewPage || !idForm || !previewContainer) {
    alert("❌ Required preview elements not found in DOM.");
    return;
  }

  idForm.classList.add("hidden");
  previewPage.classList.remove("hidden");

  const data = entryData || {};
  const frontKeys = ['name', 'dob', 'class', 'section', 'gender'];

  const formatLabel = key =>
    key.replace(/^(student|staff)_/, '')
       .replace(/_/g, ' ')
       .replace(/\b\w/g, c => c.toUpperCase());

  const buildTableRows = (keysToInclude) => {
    return Object.entries(data).reduce((rows, [key, value]) => {
      if (!value || ['image', 'type', 'photo', 'enrollment_number'].includes(key)) return rows;
      const row = `
        <tr>
          <td style="font-weight:600;font-size:12px;padding:2px 6px;">${formatLabel(key)}</td>
          <td style="font-size:12px;padding:2px 6px;">${value}</td>
        </tr>`;
      if (keysToInclude.includes(key.toLowerCase())) rows.front += row;
      else rows.back += row;
      return rows;
    }, { front: '', back: '' });
  };

  const { front, back } = buildTableRows(frontKeys);

  previewContainer.innerHTML = `
    <div id="idCardBox" style="max-width: 400px; margin: 30px auto; font-family: 'Poppins', sans-serif; border-radius: 16px; overflow: hidden; background: #ffffff; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25); transition: all 0.3s ease-in-out;">
      <div style="background: #1e293b; color: #ffffff; padding: 20px 16px; text-align: center;">
        <div style="font-size: 24px; font-weight: 700;">${data.schoolName || 'SCHOOL NAME'}</div>
        <div style="font-size: 15px; font-weight: 500; margin-top: 4px;">ID CARD ENROLLMENT</div>
        <div style="font-size: 10px; margin-top: 8px; color: #cfd8dc;">
          Thank you. Your data has been received.<br>ID will be delivered in 5–7 working days.
        </div>
        <div style="margin: 16px auto 12px; width: 120px; height: 160px; overflow: hidden; border-radius: 12px; border: 3px solid #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
          <img src="${photoUrl}" crossorigin="anonymous" style="width: 100%; height: 100%; object-fit: cover;">
        </div>
        <table style="width: 100%; margin-top: 12px; font-size: 13px; color: #e3f2fd;">${front}</table>
      </div>
      <div style="background: #f1f1f1; padding: 18px 20px;">
        <table style="width: 100%; font-size: 13px; color: #333;">${back}</table>
        <div style="text-align: center; margin-top: 18px;">
          <div style="font-size: 14px; font-weight: 600; color: #2c3e50;">Enrollment No: ${enrollmentNumber}</div>
          <svg id="barcode" style="margin-top: 6px; width: 140px; height: 40px;"></svg>
        </div>
        <hr style="margin: 20px 0; border: none; border-top: 1px dashed #b0bec5;">
        <div style="font-size: 10px; text-align: center; color: #78909c;">
          Printed by <strong>Lakshmi ID Maker</strong> | Query? Call: 9304394825
        </div>
      </div>
    </div>
  `;

  // Load JsBarcode if missing
  if (typeof window.JsBarcode === "undefined") {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.5/JsBarcode.all.min.js";
    script.onload = () => generateBarcodeImage(enrollmentNumber);
    script.onerror = () => console.warn("Failed to load JsBarcode CDN");
    document.body.appendChild(script);
  } else {
    generateBarcodeImage(enrollmentNumber);
  }
}

// -----------------------------
// ✅ Generate Barcode as PNG
// -----------------------------
function generateBarcodeImage(enroll) {
  if (!enroll) return;

  try {
    JsBarcode("#barcode", enroll, {
      format: "CODE128",
      width: 1.5,
      height: 40,
      displayValue: false
    });
  } catch (e) {
    console.error("JsBarcode error:", e);
  }

  const checkAndConvert = () => {
    const svg = document.querySelector("#barcode");
    if (!svg) return;
    // wait until barcode children are drawn
    if (svg.children.length === 0) return setTimeout(checkAndConvert, 80);

    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL("image/png");
        svg.outerHTML = `<img src="${pngFile}" style="width:140px;height:40px;">`;
      };

      img.onerror = () => console.warn("Barcode image conversion failed");
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (err) {
      console.error("Barcode conversion error:", err);
    }
  };

  checkAndConvert();
}

// -----------------------------
// ✅ Save ID as JPG
// -----------------------------
function saveIDAsImage() {
  const previewEl = el("idCardBox");
  if (!previewEl) return alert("❌ Preview not found!");

  const enrollmentNumber = entryData?.[`${lastType}_enroll`] || "id-card";
  const studentName = (entryData?.[`${lastType}_name`] || "Unknown").replace(/\s+/g, '');
  const fileName = `${enrollmentNumber}-${studentName}.jpg`;

  if (typeof html2canvas === "undefined") {
    alert("html2canvas library is required to save image. Include html2canvas CDN.");
    return;
  }

  html2canvas(previewEl, {
    scale: 3,
    useCORS: true,
    scrollY: -window.scrollY
  }).then(canvas => {
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/jpeg", 1.0);
    a.download = fileName;
    a.click();
  }).catch(err => alert("❌ Failed to save image: " + (err.message || err)));
}

// -----------------------------
// ✅ Form Navigation / UI Handling
// -----------------------------
function editEntry() {
  if (exists("previewPage")) el("previewPage").classList.add("hidden");
  if (exists("idForm")) el("idForm").classList.remove("hidden");
}

async function newEntry() {
  const previewPage = el("previewPage");
  const formFields = el("formFields");
  const idForm = el("idForm");
  const canvas = el("canvas");
  const video = el("video");
  const cameraBtn = el("cameraBtn");
  const idTypeSelect = el("idType");

  if (previewPage) previewPage.classList.add("hidden");
  if (formFields) formFields.innerHTML = '';
  if (canvas) canvas.classList.add("hidden");
  if (video) video.classList.add("hidden");
  if (idForm) idForm.classList.remove("hidden");

  // Reset global values
  imageData = '';
  entryData = {};
  lastType = idTypeSelect?.value?.trim().toLowerCase() || '';

  stopCamera();

  if (cameraBtn) {
    cameraBtn.innerHTML = `<i class="fas fa-video"></i><span>Camera</span>`;
    cameraBtn.onclick = startCamera;
  }

  // Generate dynamic form fields
  await generateFormFields(lastType || 'student');
}

function goHome() {
  if (exists("previewPage")) el("previewPage").classList.add("hidden");
  if (exists("idForm")) el("idForm").classList.add("hidden");
  if (exists("formFields")) el("formFields").innerHTML = '';
  imageData = '';
  entryData = {};
  lastType = '';
  stopCamera();
  if (exists("canvas")) el("canvas").classList.add("hidden");
  if (exists("video")) el("video").classList.add("hidden");
  if (exists("preview")) el("preview").innerHTML = '';
  if (exists("homePage")) el("homePage").classList.remove("hidden");
  if (exists("idType")) el("idType").value = "";
  const cameraBtn = el("cameraBtn");
  if (cameraBtn) {
    cameraBtn.innerHTML = `<i class="fas fa-video"></i><span>Camera</span>`;
    cameraBtn.onclick = startCamera;
  }
}

// Safe wrappers that were missing before
function goHomeSafe() {
  try { goHome(); } catch (e) { console.error(e); }
}

function showSubmitFailedAndGoHomeSafe(dbPath) {
  showOrAlert("❌ Submit failed. Please try again.", "error");
  console.warn("Submit failed for path:", dbPath);
  setTimeout(goHomeSafe, 1500);
}

// -----------------------------
// ✅ Message Display Utility
// -----------------------------
function showOrAlert(message, type = "success") {
  const popup = el("messagePopup");
  if (popup) {
    popup.textContent = message;
    popup.className = type;
    popup.style.display = "block";
    setTimeout(() => popup.style.display = "none", 4000);
  } else {
    alert(message);
  }
}

// -----------------------------
// ✅ Expose functions to window
// -----------------------------
window.handleSubmit = handleSubmit;
window.startCamera = startCamera;
window.takePicture = takePicture;
window.retakePicture = retakePicture;
window.showPreview = showPreview;
window.saveIDAsImage = saveIDAsImage;
window.editEntry = editEntry;
window.newEntry = newEntry;
window.goHome = goHome;
window.generateBarcodeImage = generateBarcodeImage;
window.verifyLogin = window.verifyLogin; // already set earlier
