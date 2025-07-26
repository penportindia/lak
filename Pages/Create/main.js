// ✅ Firebase Modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getDatabase, ref as dbRef, get, child, set, update } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

// ✅ Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAR3KIgxzn12zoWwF3rMs7b0FfP-qe3mO4",
  authDomain: "schools-cdce8.firebaseapp.com",
  databaseURL: "https://schools-cdce8-default-rtdb.firebaseio.com/",
  projectId: "schools-cdce8",
  storageBucket: "schools-cdce8.appspot.com",
  messagingSenderId: "772712220138",
  appId: "1:772712220138:web:381c173dccf1a6513fde93"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// ✅ Global Variables
let imageData = '';
let lastType = '';
let stream = null;
let schoolCode = '';
let schoolName = ''; 
let entryData = {};

window.verifyLogin = async function () {
  const uidOrPhone = document.getElementById("loginUser").value.trim(); // userid या phone
  const pwd = document.getElementById("loginPass").value.trim();        // password

  if (!uidOrPhone || !pwd) {
    showOrAlert("Please enter both User ID or Phone Number and Password.", "error");
    return;
  }

  try {
    const snapshot = await get(child(dbRef(database), `schools`));
    if (snapshot.exists()) {
      const schools = snapshot.val();

      let matchedUser = null;

      // 🔍 Loop through all schools to find matching userid or phone
      for (let key in schools) {
        const data = schools[key];
        if ((data.userid === uidOrPhone || data.phone === uidOrPhone) && data.password === pwd) {
          matchedUser = data;
          break;
        }
      }

      if (matchedUser) {
        // ✅ Login success
        document.getElementById("loginPage").classList.add("hidden");
        document.getElementById("homePage").classList.remove("hidden");
        document.getElementById("schoolName").innerHTML = `<option selected>${matchedUser.name}</option>`;
        schoolCode = matchedUser.userid || 'SCHOOL';
        schoolName = matchedUser.name;
        showOrAlert("Login Successful!", "success");
      } else {
        showOrAlert("Invalid User ID / Phone or Password", "error");
      }
    } else {
      showOrAlert("No school records found", "error");
    }
  } catch (error) {
    showOrAlert("Firebase Error: " + error.message, "error");
  }
};

// ✅ Generate Unique Enrollment
async function generateUniqueEnrollment(type) {
  const dbRoot = dbRef(database);
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mmm = monthNames[now.getMonth()];
  const yy = String(now.getFullYear()).slice(-2);

  let unique = false;
  let enrollNo = "";

  while (!unique) {
    const serial = String(Math.floor(1000 + Math.random() * 9000));
    enrollNo = `INR${dd}${mmm}${yy}${serial}`;
    const snapshot = await get(child(dbRoot, `${type}/${enrollNo}`));
    if (!snapshot.exists()) unique = true;
  }

  return enrollNo;
}

// ✅ Navigate to Form
window.navigateToForm = async function () {
  const type = document.getElementById("idType").value;
  if (!type) return alert("Please select ID type");
  lastType = type;
  document.getElementById("homePage").classList.add("hidden");
  document.getElementById("idForm").classList.remove("hidden");
  await generateFormFields(type);
};

// ✅ Generate Form Fields
async function generateFormFields(type) {
  const numberFields = ['adm', 'roll', 'contact', 'empid'];

  const studentFields = [
    ['enroll', 'Enrollment Number', 'text', true],
    ['adm', 'Admission Number', 'text'],
    ['name', 'Student Name', 'text'],
    ['class', 'Class', 'select', ['PG','LKG','UKG','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII']],
    ['section', 'Section', 'select', ['A','B','C','D','E','F','G','H','I','J','K']],
    ['roll', 'Roll Number', 'text'],
    ['dob', 'Date of Birth', 'date'],
    ['father', "Father's Name", 'text'],
    ['mother', "Mother's Name", 'text'],
    ['contact', 'Contact Number', 'text'],
    ['address', 'Address', 'textarea'],
    ['transport', 'Mode of Transport', 'select', ['SELF','TRANSPORT']],
    ['house', 'House Name', 'text'],
    ['blood', 'Blood Group', 'select', ['A+','A-','B+','B-','AB+','AB-','O+','O-','UNDER INVESTIGATION']]
  ];

  const staffFields = [
    ['enroll', 'Enrollment Number', 'text', true],
    ['empid', 'Employee ID', 'text'],
    ['name', 'Name', 'text'],
    ['designation', 'Designation', 'select', ['DIRECTOR','PRINCIPAL','VICE PRINCIPAL','ADMIN','ACCOUNTANT','LIBRARIAN','TEACHER','CLERK','COMPUTER OPERATOR','RECEPTIONIST','DRIVER','ATTENDANT','GUARD','CARETAKER','HELPER','PEON','MED','OTHER']],
    ['father', "Father's Name", 'text'],
    ['dob', 'Date of Birth', 'date'],
    ['contact', 'Contact Number', 'text'],
    ['address', 'Address', 'textarea'],
    ['blood', 'Blood Group', 'select', ['A+','A-','B+','B-','AB+','AB-','O+','O-','UNDER INVESTIGATION']]
  ];

  const fields = type === 'student' ? studentFields : staffFields;
  const container = document.getElementById("formFields");
  container.innerHTML = '';
  const enrollNo = await generateUniqueEnrollment(type);

  fields.forEach(([id, label, controlType, readonly]) => {
    const fullId = `${type}_${id}`;
    let inputHTML = '';

    if (controlType === 'select') {
      const options = readonly || [];
      inputHTML = `<select id="${fullId}" name="${fullId}" required>
        <option value="" disabled selected>Select ${label}</option>`;
      options.forEach(opt => inputHTML += `<option value="${opt}">${opt}</option>`);
      inputHTML += `</select>`;
    } else if (controlType === 'textarea') {
      inputHTML = `<textarea id="${fullId}" name="${fullId}" rows="2" required></textarea>`;
    } else {
      const value = id === 'enroll' ? enrollNo : '';
      const ro = id === 'enroll' ? 'readonly' : '';
      const inputType = id === 'dob' ? 'date' : (numberFields.includes(id) ? 'tel' : 'text');
      const inputAttributes = numberFields.includes(id) ? 'pattern="\\d*" inputmode="numeric"' : '';
      inputHTML = `<input type="${inputType}" id="${fullId}" name="${fullId}" ${ro} value="${value}" ${inputAttributes} required />`;
    }

    container.innerHTML += `
      <div class="form-group">
        <label for="${fullId}">${label}</label>
        ${inputHTML}
      </div>`;
  });
}

function compressImage(canvas, maxWidth = 480, quality = 0.6) {
  const ctx = canvas.getContext("2d");
  const ratio = canvas.width / canvas.height;
  const newWidth = Math.min(canvas.width, maxWidth);
  const newHeight = newWidth / ratio;

  // नया canvas बनाएं compress करने के लिए
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = newWidth;
  outputCanvas.height = newHeight;
  const outputCtx = outputCanvas.getContext("2d");

  outputCtx.drawImage(canvas, 0, 0, newWidth, newHeight);

  // JPEG format में compress करें (0.6 = 60% quality)
  return outputCanvas.toDataURL("image/jpeg", quality);
}


// ✅ Camera Functions
function startCamera() {
  navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } })
    .then(s => {
      stream = s;
      const video = document.getElementById("video");
      video.srcObject = stream;
      video.play();
      video.classList.remove("hidden");
    })
    .catch(err => showOrAlert("Unable To Access Camera", "error"));
}
function stopCamera() {
  if (stream) stream.getTracks().forEach(track => track.stop());
  const video = document.getElementById("video");
  video.srcObject = null;
  video.classList.add("hidden");
}
function takePicture() {
  const video = document.getElementById("video");
  const canvas = document.getElementById("canvas");

  if (!video.videoWidth) return alert("Camera not ready.");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);

  canvas.classList.remove("hidden");

  // 🔄 Replace PNG with compressed JPEG
  imageData = compressImage(canvas, 480, 0.6);  // Resize width = 480px, quality = 60%

  stopCamera();

  const cameraBtn = document.getElementById("cameraBtn");
  cameraBtn.innerHTML = `<i class="fas fa-redo"></i><span>Retake</span>`;
  cameraBtn.onclick = retakePicture;
}
function retakePicture() {
  imageData = '';
  document.getElementById("canvas").classList.add("hidden");
  startCamera();
  const cameraBtn = document.getElementById("cameraBtn");
  cameraBtn.innerHTML = `<i class="fas fa-video"></i><span>Camera</span>`;
  cameraBtn.onclick = startCamera;
}

// ✅ Submit Handler
function handleSubmit(e) {
  e.preventDefault();

  const formFields = document.querySelectorAll("#formFields input, #formFields select, #formFields textarea");
  const rawData = {};

  formFields.forEach(field => {
    let value = field.value.trim();
    const isUpperCase = (field.type === "text" || field.tagName === "TEXTAREA" || field.tagName === "SELECT") &&
      !['email', 'ifsc'].includes(field.name?.toLowerCase());

    if (isUpperCase) value = value.toUpperCase();
    rawData[field.name] = value;
  });

  const enroll = rawData[`${lastType}_enroll`];
  const dobKey = `${lastType}_dob`;
  const dbPath = `${lastType}/${enroll}`;

  // ✅ Format DOB (e.g. 23-JUL-2025)
  if (rawData[dobKey]) {
    const dobDate = new Date(rawData[dobKey]);
    if (!isNaN(dobDate)) {
      const day = String(dobDate.getDate()).padStart(2, '0');
      const month = dobDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      const year = dobDate.getFullYear();
      rawData[dobKey] = `${day}-${month}-${year}`;
    } else {
      return showOrAlert("\u274C Please enter a valid Date of Birth!", "error");
    }
  }

  rawData.schoolName = schoolName?.toUpperCase?.() || "SCHOOL NAME";

  const data = {
    [`${lastType}_enroll`]: rawData[`${lastType}_enroll`],
    [`${lastType}_name`]: rawData[`${lastType}_name`],
    schoolName: rawData.schoolName,
    photo: ""
  };

  Object.keys(rawData).forEach(key => {
    if (!["photo", "schoolName", `${lastType}_name`, `${lastType}_enroll`].includes(key)) {
      data[key] = rawData[key];
    }
  });

  entryData = data;

  // ✅ Show local preview immediately if imageData is present
  if (imageData) {
    showPreview(imageData, enroll);
  }

  // ✅ Save data to Firebase immediately
  set(dbRef(database, dbPath), data)
    .then(() => uploadImageToImgBB(enroll, dbPath))
    .catch(() => showOrAlert("\u274C Failed to save data. Please try again.", "error"));
}

function uploadImageToImgBB(enroll, dbPath) {
  if (!imageData) {
    showOrAlert("📸 Please capture or select an image!", "error");
    return;
  }

  const base64 = imageData.replace(/^data:image\/[a-z]+;base64,/, "");
  const formData = new FormData();
  formData.append("key", "403847857c5df16d7db901c4017519c7");
  formData.append("image", base64);
  formData.append("name", enroll);

  updateProgressBar(0); // Start at 0%

  const xhr = new XMLHttpRequest();
  xhr.open("POST", "https://api.imgbb.com/1/upload");

  // Progress tracker
  xhr.upload.onprogress = function (e) {
    if (e.lengthComputable) {
      const percent = Math.round((e.loaded / e.total) * 100);
      updateProgressBar(percent);
    }
  };

  xhr.onload = function () {
    if (xhr.status === 200) {
      const result = JSON.parse(xhr.responseText);
      if (result.success) {
        const photoURL = result.data.display_url;
        update(dbRef(database, dbPath), { photo: photoURL }).then(() => {
          updateProgressBar(100);
          showOrAlert("Submitted Successfully!", "success");
        });
      } else {
        showOrAlert("❌ Image upload failed!", "error");
        updateProgressBar(0);
      }
    } else {
      showOrAlert(`❌ Upload error: ${xhr.status}`, "error");
      updateProgressBar(0);
    }
  };

  xhr.onerror = function () {
    showOrAlert("❌ Network error during upload.", "error");
    updateProgressBar(0);
  };

  xhr.send(formData);
}

function updateProgressBar(percent) {
  const el = document.getElementById("uploadProgress");
  if (el) {
    el.style.width = percent + "%";
    el.textContent = percent + "%";
  }
}

// ✅ Show Preview using provided image source
function showPreview(photoUrl, enrollmentNumber) {
  if (!photoUrl || !enrollmentNumber) {
    showOrAlert("\u274C Missing photo or enrollment number!", "error");
    return;
  }

  const previewPage = document.getElementById("previewPage");
  const idForm = document.getElementById("idForm");
  const previewContainer = document.getElementById("preview");

  if (!previewPage || !idForm || !previewContainer) {
    alert("\u274C Required preview elements not found in DOM.");
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

  if (typeof JsBarcode === "undefined") {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.5/JsBarcode.all.min.js";
    script.onload = () => generateBarcodeImage(enrollmentNumber);
    document.body.appendChild(script);
  } else {
    generateBarcodeImage(enrollmentNumber);
  }
}

function generateBarcodeImage(enroll) {
  if (!enroll) return;

  JsBarcode("#barcode", enroll, {
    format: "CODE128",
    width: 1.5,
    height: 40,
    displayValue: false
  });

  const checkAndConvert = () => {
    const svg = document.querySelector("#barcode");
    if (!svg || svg.children.length === 0) {
      return setTimeout(checkAndConvert, 100);
    }

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

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  checkAndConvert();
}


// ✅ Save ID as JPG
function saveIDAsImage() {
  const previewEl = document.getElementById("idCardBox");
  if (!previewEl) return alert("❌ Preview not found!");

  const enrollmentNumber = entryData?.[`${lastType}_enroll`] || "id-card";
  const studentName = (entryData?.[`${lastType}_name`] || "Unknown").replace(/\s+/g, '');
  const fileName = `${enrollmentNumber}-${studentName}.jpg`;

  html2canvas(previewEl, {
    scale: 3,
    useCORS: true,
    scrollY: -window.scrollY
  }).then(canvas => {
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/jpeg", 1.0);
    a.download = fileName;
    a.click();
  }).catch(err => alert("❌ Failed to save image: " + err.message));
}

// ✅ Form Navigation / UI Handling
function editEntry() {
  document.getElementById("previewPage").classList.add("hidden");
  document.getElementById("idForm").classList.remove("hidden");
}

function newEntry() {
  document.getElementById("previewPage").classList.add("hidden");
  document.getElementById("formFields").innerHTML = '';
  imageData = '';
  entryData = {};
  lastType = '';
  stopCamera();
  document.getElementById("canvas").classList.add("hidden");
  document.getElementById("video").classList.add("hidden");
  document.getElementById("idForm").classList.remove("hidden");
  const cameraBtn = document.getElementById("cameraBtn");
  cameraBtn.innerHTML = `<i class="fas fa-video"></i><span>Camera</span>`;
  cameraBtn.onclick = startCamera;
  generateFormFields(document.getElementById("idType").value);
}

function goHome() {
  document.getElementById("previewPage").classList.add("hidden");
  document.getElementById("idForm").classList.add("hidden");
  document.getElementById("formFields").innerHTML = '';
  imageData = '';
  entryData = {};
  lastType = '';
  stopCamera();
  document.getElementById("canvas").classList.add("hidden");
  document.getElementById("video").classList.add("hidden");
  document.getElementById("preview").innerHTML = '';
  document.getElementById("homePage").classList.remove("hidden");
  document.getElementById("idType").value = "";
  const cameraBtn = document.getElementById("cameraBtn");
  cameraBtn.innerHTML = `<i class="fas fa-video"></i><span>Camera</span>`;
  cameraBtn.onclick = startCamera;
}

// ✅ Message Display Utility
function showOrAlert(message, type = "success") {
  const popup = document.getElementById("messagePopup");
  if (popup) {
    popup.textContent = message;
    popup.className = type;
    popup.style.display = "block";
    setTimeout(() => popup.style.display = "none", 4000);
  } else {
    alert(message);
  }
}

// ✅ Export to Global Scope
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
