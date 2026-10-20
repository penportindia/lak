import { CROP_WIDTH, CROP_HEIGHT, createCropTransform, constrainCropTransform, applyCropGesture, getCropFrame, getCropGesture } from "./crop-geometry.js?v=6374e1b5833f";
﻿import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getDatabase, ref as dbRef, get, child, set, update, remove, onDisconnect, runTransaction, push,
  query, orderByChild, equalTo, limitToFirst, onValue
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";
import { firebaseConfig, cloudinaryConfig } from '../Database/Database.js';

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const { uploadUrl: CLOUDINARY_UPLOAD_URL, uploadPreset: CLOUDINARY_UPLOAD_PRESET } = cloudinaryConfig;

export { app, database, dbRef, get, child, set, update, remove, onDisconnect, runTransaction, push, query, orderByChild, equalTo, limitToFirst, CLOUDINARY_UPLOAD_URL, CLOUDINARY_UPLOAD_PRESET };

let imageData = "";
let lastType = "";
let stream = null;

let schoolCode = "";
let schoolName = "";
let entryData = {};

let userIP = "";
let safeIP = "";

let sessionTimeout = null;
let hardTimeout = null;
let modalTimeout = null;
let isSubmitting = false;
let fallbackFieldIndex = 0;
let cropSourceImage = null;
let cropTransform = null;
let cropRenderFrame = 0;
let photoScrollPosition = null;
let isEditingEntry = false;
let existingPhotoUrl = "";
let editingRecordPath = "";
let stopSchoolDataSummary = null;
let schoolDataGeneration = 0;
const ID_TYPE_LABELS = Object.freeze({
  student: "Student",
  staff: "Staff"
});

function getAccountDataPath() {
  if (!hasValidSchoolIdentity()) throw new Error("Please sign in again to access your records.");
  return `DATA-MASTER/${sanitizePathSegment(schoolName)}/${sanitizePathSegment(schoolCode)}`;
}

function getCategoryDataPath(type) {
  if (!Object.prototype.hasOwnProperty.call(ID_TYPE_LABELS, type)) throw new Error("Please choose a valid ID category.");
  return `${getAccountDataPath()}/${type.toUpperCase()}`;
}

function isCategoryRecordPath(path, type, enrollment) {
  const splitAt = path.lastIndexOf("/");
  const categoryPath = path.slice(0, splitAt);
  const recordId = path.slice(splitAt + 1);
  return [getCategoryDataPath(type), `${getAccountDataPath()}/${type}`].includes(categoryPath) && recordId.toUpperCase() === String(enrollment).toUpperCase();
}

function countSchoolEnrollments(records = {}) {
  const countType = type => {
    const enrollments = new Set();
    for (const node of [type.toLowerCase(), type.toUpperCase()]) {
      for (const [id, record] of Object.entries(records?.[node] || {})) {
        if (record && typeof record === "object" && !Array.isArray(record)) enrollments.add(id.toUpperCase());
      }
    }
    return enrollments.size;
  };
  const byType = Object.fromEntries(Object.keys(ID_TYPE_LABELS).map(type => [type, countType(type)]));
  const students = byType.student;
  const staff = byType.staff;
  return { students, staff, total: students + staff, byType };
}

function clearSchoolDataSummary() {
  schoolDataGeneration += 1;
  if (stopSchoolDataSummary) stopSchoolDataSummary();
  stopSchoolDataSummary = null;
}

function startSchoolDataSummary() {
  clearSchoolDataSummary();
  if (!schoolCode || !schoolName) return;
  const generation = schoolDataGeneration;
  const summary = safeGet("schoolDataSummary");
  summary?.setAttribute("aria-busy", "true");
  safeGet("schoolDataRetry")?.classList.add("hidden");
  for (const id of ["schoolTotalCount", "schoolStudentCount", "schoolStaffCount"]) {
    if (safeGet(id)) safeGet(id).textContent = "—";
  }
  if (safeGet("schoolDataStatus")) safeGet("schoolDataStatus").textContent = "Loading records…";
  const handleError = error => {
    if (generation !== schoolDataGeneration) return;
    console.warn("School enrollment summary unavailable:", error);
    summary?.setAttribute("aria-busy", "false");
    if (safeGet("schoolDataStatus")) safeGet("schoolDataStatus").textContent = "Couldn't load records. Please try again.";
    safeGet("schoolDataRetry")?.classList.remove("hidden");
  };
  try {
    const path = getAccountDataPath();
    stopSchoolDataSummary = onValue(dbRef(database, path), snapshot => {
      if (generation !== schoolDataGeneration) return;
      const counts = countSchoolEnrollments(snapshot.val());
      const format = value => value.toLocaleString("en-IN");
      safeGet("schoolTotalCount").textContent = format(counts.total);
      safeGet("schoolStudentCount").textContent = format(counts.students);
      safeGet("schoolStaffCount").textContent = format(counts.staff);
      summary?.setAttribute("aria-busy", "false");
      safeGet("schoolDataRetry")?.classList.add("hidden");
      safeGet("schoolDataStatus").textContent = counts.total ? `We have received ${format(counts.total)} ID card ${counts.total === 1 ? "record" : "records"} for printing. Your cards will be prepared and delivered soon.` : "No enrollments yet. Create your first ID to get started.";
    }, handleError);
  } catch (error) {
    handleError(error);
  }
}
window.startSchoolDataSummary = startSchoolDataSummary;

const MAX_IDLE = 10 * 60 * 1000;
const MAX_SESSION = 60 * 60 * 1000;
const DEMO_USER_ID = "ENR0001";
const ENROLLMENT_NOT_FOUND_MESSAGE = "Your ID card is already printed or not found.";
const ENROLLMENT_GENERATION_FAILED_MESSAGE = "Enrollment number generate nahi hua. Please internet/login check karke dobara try karein.";


const el = id => document.getElementById(id);
const exists = id => !!el(id);
const safeGet = id => (exists(id) ? el(id) : null);

function getRandomSerial(length = 5) {
  const max = 10 ** length;
  if (globalThis.crypto?.getRandomValues) {
    return String(crypto.getRandomValues(new Uint32Array(1))[0] % max).padStart(length, "0");
  }
  const fallback = Math.floor((Date.now() + (globalThis.performance?.now?.() || 0) * 1000) % max);
  return String(fallback).padStart(length, "0");
}

function createFieldName() {
  fallbackFieldIndex += 1;
  if (globalThis.crypto?.randomUUID) return `field_${crypto.randomUUID()}`;
  return `field_${Date.now()}_${fallbackFieldIndex}`;
}

function digitsOnly(value, maxLength = 10) {
  return String(value || "").replace(/\D/g, "").slice(0, maxLength);
}

function enforceTenDigits(input) {
  if (!input) return;
  input.value = digitsOnly(input.value, 10);
}

function enforceDigits(input, maxLength = 10) {
  if (!input) return;
  input.value = digitsOnly(input.value, maxLength);
}

function isDemoAccount(userId = schoolCode) {
  return String(userId || "").trim().toUpperCase() === DEMO_USER_ID;
}

function getButtonRefs() {
  return {
    newEntryBtn: safeGet("newEntryBtn"),
    cameraBtn: safeGet("cameraBtn"),
    galleryBtn: safeGet("galleryBtn"),
    submitBtn: safeGet("submitBtn"),
    homeBtn: safeGet("homeBtn"),
    saveBtn: safeGet("saveBtn"),
    editBtn: safeGet("editBtn")
  };
}

function showModal(title, message, isError = false) {
    const modal = document.getElementById('messageModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalIcon = modal.querySelector('.modal-icon');
    
    modalTitle.textContent = title;
    modalMessage.textContent = message;

    if (isError) {
        modalIcon.innerHTML = '<i class="fas fa-times-circle"></i>';
        modalIcon.classList.add('error');
    } else {
        modalIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
        modalIcon.classList.remove('error');
    }

    modal.classList.add('visible');
    if (modalTimeout) clearTimeout(modalTimeout);
    modalTimeout = setTimeout(hideModal, 3000);
}

function hideModal() {
    const modal = document.getElementById('messageModal');
    modal.classList.remove('visible');
    if (modalTimeout) {
      clearTimeout(modalTimeout);
      modalTimeout = null;
    }
}

function setInlineStatus(id, message = "", isError = false) {
  const status = safeGet(id);
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("hidden", !message);
  status.classList.toggle("error", isError);
}

function clearInlineStatus() {
  setInlineStatus("formStatus");
  setInlineStatus("uploadStatus");
}

function setAppSplash(isLoading, title = "Please wait", message = "Working...") {
  const splash = safeGet("loginSplash");
  const splashTitle = safeGet("loginSplashTitle");
  const splashText = safeGet("loginSplashText");

  if (splashTitle) splashTitle.textContent = title;
  if (splashText) splashText.textContent = message;
  splash?.classList.toggle("hidden", !isLoading);
}

function setLoginLoading(isLoading, message = "Checking credentials...") {
  const loginButton = safeGet("loginSubmitBtn");
  const loginUser = safeGet("loginUser");
  const loginPass = safeGet("loginPass");

  setAppSplash(isLoading, "Signing in", message);

  [loginButton, loginUser, loginPass].forEach(control => {
    if (control) control.disabled = isLoading;
  });

  if (loginButton) {
    loginButton.innerHTML = '<span>Login</span><i class="fas fa-arrow-right"></i>';
  }
}

function setSearchLoading(isLoading) {
  const searchButton = document.querySelector(".edit-search-btn");
  const searchDate = safeGet("searchDate");
  const searchUnique = safeGet("searchUnique");

  setAppSplash(isLoading, "Searching", "Checking enrollment details...");
  [searchButton, searchDate, searchUnique].forEach(control => {
    if (control) control.disabled = isLoading;
  });

  if (searchButton) {
    searchButton.innerHTML = '<span>Search</span><i class="fas fa-search"></i>';
  }
}

function showLoginPage() {
  document.body.classList.remove("welcome-mode");
  safeGet("welcomePage")?.classList.add("hidden");
  safeGet("loginPage")?.classList.remove("hidden");
}

function showDashboardMenu(mode = "") {
  const createPanel = safeGet("createMenuPanel");
  const editPanel = safeGet("editMenuPanel");
  const createBtn = document.querySelector(".create-menu-btn");
  const editBtn = document.querySelector(".edit-menu-btn");
  const isCreate = mode === "create";
  const isEdit = mode === "edit";

  createPanel?.classList.toggle("hidden", !isCreate);
  editPanel?.classList.toggle("hidden", !isEdit);
  createBtn?.classList.toggle("active", isCreate);
  editBtn?.classList.toggle("active", isEdit);

  if (isCreate) {
    safeGet("idType")?.focus();
    setInlineStatus("searchStatus");
  }

  if (isEdit) {
    safeGet("searchDate")?.focus();
  }
}

function resetDashboardMenu() {
  if (safeGet("idType")) safeGet("idType").value = "";
  if (safeGet("searchDate")) safeGet("searchDate").value = "";
  if (safeGet("searchUnique")) safeGet("searchUnique").value = "";
  if (safeGet("searchResults")) safeGet("searchResults").replaceChildren();
  setInlineStatus("searchStatus");
  showDashboardMenu("create");
}

function renderSchoolProfile(user = null, displayName = "") {
  const profile = safeGet("schoolProfile");
  if (!profile) return;

  if (!user) {
    profile.innerHTML = `
      <div class="school-profile-top">
        <div class="school-profile-main">
          <strong>Auto-filled after login</strong>
        </div>
      </div>
      <div class="school-profile-meta">
        <span><i class="fas fa-shield-halved"></i> Verified Login</span>
        <span><i class="fas fa-circle-check"></i> Ready</span>
      </div>
      <div class="dashboard-menu">
        <button type="button" onclick="showDashboardMenu('create')" class="dashboard-menu-btn create-menu-btn">
          <i class="fas fa-plus"></i>
          <span>Create New</span>
        </button>
        <button type="button" onclick="showDashboardMenu('edit')" class="dashboard-menu-btn edit-menu-btn">
          <i class="fas fa-pen-to-square"></i>
          <span>Edit</span>
        </button>
      </div>
    `;
    return;
  }

  profile.innerHTML = `
    <div class="school-profile-top">
      <div class="school-profile-main">
        <strong>${escapeHTML(displayName || user.name || "Account")}</strong>
      </div>
    </div>
    <div class="dashboard-menu">
      <button type="button" onclick="showDashboardMenu('create')" class="dashboard-menu-btn create-menu-btn">
        <i class="fas fa-plus"></i>
        <span>Create New</span>
      </button>
      <button type="button" onclick="showDashboardMenu('edit')" class="dashboard-menu-btn edit-menu-btn">
        <i class="fas fa-pen-to-square"></i>
        <span>Edit</span>
      </button>
    </div>
  `;
}

document.querySelector('.close-btn').addEventListener('click', hideModal);
document.getElementById('modalOkBtn').addEventListener('click', hideModal);

async function fetchUserIP() {
  try {
    const res = await fetch("https://api64.ipify.org?format=json");
    const data = await res.json();
    return data.ip || "unknown_ip";
  } catch {
    return "unknown_ip";
  }
}

function resetSessionTimer() {
  if (sessionTimeout) clearTimeout(sessionTimeout);
  sessionTimeout = setTimeout(() => {
    location.reload();
  }, MAX_IDLE);
}

async function logoutUser(message = "You have been logged out.") {
  clearSchoolDataSummary();
  if (!schoolCode || !safeIP) {
    if (exists("loginPage")) el("loginPage").classList.remove("hidden");
    if (exists("homePage")) el("homePage").classList.add("hidden");
    showModal("Logout", message);
    return;
  }

  try {
    const ipRef = dbRef(database, `activeSchools/${schoolCode}/${safeIP}`);
    await remove(ipRef);

    if (exists("loginPage")) el("loginPage").classList.remove("hidden");
    if (exists("homePage")) el("homePage").classList.add("hidden");
    if (exists("idForm")) el("idForm").classList.add("hidden");
    if (exists("previewPage")) el("previewPage").classList.add("hidden");
    if (exists("formFields")) el("formFields").innerHTML = "";
    if (exists("preview")) el("preview").innerHTML = "";
    if (exists("canvas")) el("canvas").classList.add("hidden");
    if (exists("video")) el("video").classList.add("hidden");

    schoolCode = "";
    schoolName = "";
    entryData = {};
    userIP = "";
    safeIP = "";
    imageData = "";
    lastType = "";
    resetEditState();
    renderSchoolProfile();

    if (sessionTimeout) clearTimeout(sessionTimeout);
    if (hardTimeout) clearTimeout(hardTimeout);
    stopCamera();

    showModal("Logged Out", message);
  } catch (error) {
    console.error("Error during logout:", error);
    showModal("Error", "An error occurred during logout. Please refresh the page.", true);
  }
}

["click", "keydown", "input", "change", "mousemove", "touchstart"].forEach(evt => {
  document.addEventListener(evt, resetSessionTimer, {
    passive: true
  });
});

function isLoginMatch(data, uidOrPhone, pwd) {
  if (!data || data.password !== pwd) return false;
  const inputDigits = String(uidOrPhone || "").replace(/\D/g, "");
  const dbPhoneDigits = String(data.phone || "").replace(/\D/g, "");
  const inputUserId = uidOrPhone.startsWith("+") ? uidOrPhone : "+" + uidOrPhone;
  const uidMatch = data.userid === uidOrPhone || data.userid === inputUserId;
  const phoneMatch = dbPhoneDigits && dbPhoneDigits === inputDigits;
  return uidMatch || phoneMatch;
}

async function getFirstMatchingSchoolByQuery(field, value, uidOrPhone, pwd) {
  if (!value) return null;
  try {
    const schoolsRef = dbRef(database, "schools");
    const snapshot = await get(query(schoolsRef, orderByChild(field), equalTo(value), limitToFirst(5)));
    if (!snapshot.exists()) return null;

    const records = snapshot.val() || {};
    return Object.values(records).find(data => isLoginMatch(data, uidOrPhone, pwd)) || null;
  } catch (error) {
    console.warn(`Fast login query failed for ${field}:`, error);
    return null;
  }
}

async function findMatchedSchool(uidOrPhone, pwd) {
  const rootRef = dbRef(database);
  const directKeys = [
    uidOrPhone,
    `+${uidOrPhone}`,
    `91${uidOrPhone}`,
    `+91${uidOrPhone}`
  ];

  for (const key of directKeys) {
    try {
      const snapshot = await get(child(rootRef, `schools/${sanitizePathSegment(key)}`));
      if (snapshot.exists() && isLoginMatch(snapshot.val(), uidOrPhone, pwd)) {
        return snapshot.val();
      }
    } catch (_) {}
  }

  const queryCandidates = [
    ["phone", uidOrPhone],
    ["phone", Number(uidOrPhone)],
    ["phone", `+91${uidOrPhone}`],
    ["userid", uidOrPhone],
    ["userid", `+${uidOrPhone}`],
    ["userid", `+91${uidOrPhone}`]
  ];

  for (const [field, value] of queryCandidates) {
    const match = await getFirstMatchingSchoolByQuery(field, value, uidOrPhone, pwd);
    if (match) return match;
  }

  const snapshot = await get(child(rootRef, "schools"));
  if (!snapshot.exists()) return null;

  const schools = snapshot.val();
  for (let key in schools) {
    const data = schools[key];
    if (isLoginMatch(data, uidOrPhone, pwd)) return data;
  }

  return null;
}

window.verifyLogin = async function() {
  try {
    const loginInput = safeGet("loginUser");
    if (loginInput) enforceTenDigits(loginInput);
    const uidOrPhone = digitsOnly(loginInput?.value || "", 10);
    const pwd = (safeGet("loginPass")?.value || "").trim();

    if (!uidOrPhone || !pwd) {
      showModal("Login Failed", "Please enter 10 digit phone number and password.", true);
      return;
    }

    if (uidOrPhone.length !== 10) {
      showModal("Login Failed", "Phone number must be exactly 10 digits.", true);
      return;
    }

    setLoginLoading(true, "Checking your account...");

    const ipPromise = fetchUserIP();
    const matchedUser = await findMatchedSchool(uidOrPhone, pwd);

    if (!matchedUser) {
      showModal("Login Failed", "Invalid User ID / Phone or Password", true);
      return;
    }

    if (!matchedUser.status || matchedUser.status.toString().trim().toLowerCase() !== "active") {
      showModal("Login Failed", "You are an Inactive user. Please Contact Admin to Activate your account first.", true);
      return;
    }

    const rawSchoolName = matchedUser.name || '';
    const cleanSchoolName = rawSchoolName.replace(/[^a-zA-Z0-9 ,]/g, '').replace(/\s+/g, ' ').trim();

    if (!cleanSchoolName) {
      showModal("Login Failed", "Account name is invalid in database!", true);
      return;
    }

    setLoginLoading(true, "Securing your session...");
    userIP = await ipPromise;
    safeIP = userIP.replace(/\./g, "-");

    schoolCode = matchedUser.userid || 'SCHOOL';
    schoolName = cleanSchoolName;
    document.body.classList.remove("welcome-mode");
    renderSchoolProfile(matchedUser, cleanSchoolName);
    resetDashboardMenu();

    const ipRef = dbRef(database, `activeSchools/${schoolCode}/${safeIP}`);

    setLoginLoading(true, "Opening dashboard...");
    await set(ipRef, {
      name: schoolName,
      ip: userIP,
      status: "online",
      loginAt: Date.now(),
      expiresAt: Date.now() + MAX_SESSION
    });
    if (exists("loginPage")) el("loginPage").classList.add("hidden");
    if (exists("homePage")) el("homePage").classList.remove("hidden");

    try {
      onDisconnect(ipRef).remove();
    } catch (_) {}

    startSchoolDataSummary();
    resetSessionTimer();
    if (hardTimeout) clearTimeout(hardTimeout);
    hardTimeout = setTimeout(async() => {
      await logoutUser("Session ended after 1 hour.");
    }, MAX_SESSION);

  } catch (error) {
    showModal("Error", "Firebase Error: " + (error.message || error), true);
    console.error(error);
  } finally {
    setLoginLoading(false);
  }
};

window.addEventListener("beforeunload", () => {
  if (schoolCode && safeIP) {
    try {
      remove(dbRef(database, `activeSchools/${schoolCode}/${safeIP}`));
    } catch (_) {}
  }
});

async function generateUniqueEnrollment(type) {
  if (!type || typeof type !== "string") {
    throw new Error("Invalid 'type' parameter");
  }

  if (!schoolCode || !schoolCode.trim()) {
    throw new Error("School UserID is empty! Cannot generate enrollment.");
  }

  if (!schoolName || !schoolName.trim()) {
    throw new Error("School name is empty! Cannot generate enrollment.");
  }

  const dbRoot = dbRef(database);
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mmm = monthNames[now.getMonth()];
  const yyyy = now.getFullYear();

  let unique = false;
  let enrollNo = "";

  while (!unique) {
    const serial = getRandomSerial(5);
    enrollNo = `${schoolCode}${dd}${mmm}${yyyy}${serial}`;

    try {
      const snapshot = await get(child(dbRoot, `${getCategoryDataPath(type)}/${enrollNo.toUpperCase()}`));
      if (!snapshot.exists()) unique = true;
      else await new Promise(res => setTimeout(res, 40));
    } catch (error) {
      console.error("Database error while generating enrollment:", error);
      throw new Error("Unable to generate enrollment number");
    }
  }

  return enrollNo;
}

function getEnrollmentDateCode(dateValue) {
  const match = String(dateValue || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return "";
  return `${match[3]}${monthNames[monthIndex]}${match[1]}`;
}

function convertDisplayDateToInput(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const match = text.match(/^(\d{2})-([A-Z]{3})-(\d{4})$/i);
  if (!match) return "";

  const monthIndex = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
    .indexOf(match[2].toUpperCase());
  if (monthIndex < 0) return "";
  return `${match[3]}-${String(monthIndex + 1).padStart(2, "0")}-${match[1]}`;
}

function setFormHeading(mode = "create") {
  const heading = safeGet("formHeading");
  if (!heading) return;
  const title = ID_TYPE_LABELS[lastType] || "ID";
  heading.innerHTML = `<i class="fas ${mode === "edit" ? "fa-pen-to-square" : "fa-clipboard"} me-2" aria-hidden="true"></i> ${mode === "edit" ? "Edit" : "Create"} ${escapeHTML(title)} ID`;
}

function resetEditState() {
  isEditingEntry = false;
  existingPhotoUrl = "";
  editingRecordPath = "";
  setFormHeading("create");
}

function fillGeneratedForm(type, data = {}) {
  Object.entries(data).forEach(([key, value]) => {
    const field = safeGet(key);
    if (!field || ["photo", "schoolName", "schoolId"].includes(key)) return;
    field.value = key === `${type}_dob` ? convertDisplayDateToInput(value) : value;
  });
}

async function findExistingEnrollments(dateCode, uniqueDigits, selectedType = "") {
  if (selectedType && !Object.prototype.hasOwnProperty.call(ID_TYPE_LABELS, selectedType)) throw new Error("Invalid ID category.");
  const types = selectedType ? [selectedType] : Object.keys(ID_TYPE_LABELS);
  const rootPath = getAccountDataPath();
  const enrollPrefix = String(schoolCode + dateCode).toUpperCase();
  const matches = new Map();
  for (const type of types) {
    for (const node of [type.toUpperCase(), type]) {
      const path = rootPath + '/' + node;
      const snapshot = await get(child(dbRef(database), path));
      if (!snapshot.exists()) continue;
      for (const [enroll, data] of Object.entries(snapshot.val() || {})) {
        const normalized = enroll.toUpperCase();
        if (!data || typeof data !== 'object' || Array.isArray(data)) continue;
        if (!normalized.startsWith(enrollPrefix) || !normalized.endsWith(uniqueDigits)) continue;
        const key = type + ':' + normalized;
        if (!matches.has(key)) matches.set(key, { type, enroll, data, path: path + '/' + enroll });
      }
    }
  }
  return [...matches.values()];
}

function showEnrollmentMatches(matches) {
  const container = safeGet('searchResults');
  if (!container) return;
  container.replaceChildren();
  const message = document.createElement('p');
  message.className = 'enrollment-match-hint';
  message.textContent = 'Multiple matching records found. Select the ID you want to edit.';
  container.appendChild(message);
  for (const match of matches) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'enrollment-match';
    const details = document.createElement('span');
    const category = document.createElement('small');
    category.textContent = ID_TYPE_LABELS[match.type];
    const name = document.createElement('strong');
    name.textContent = match.data[match.type + '_name'] || match.enroll;
    const enrollment = document.createElement('small');
    enrollment.textContent = match.enroll;
    details.append(category, name, enrollment);
    const arrow = document.createElement('span');
    arrow.textContent = '\u203a';
    arrow.setAttribute('aria-hidden', 'true');
    button.append(details, arrow);
    button.addEventListener('click', async () => {
      if (!schoolCode || !schoolName) return;
      setSearchLoading(true);
      try { await openExistingEnrollment(match); }
      catch (error) { showModal('Unable to open ID', 'Please search again and retry.', true); }
      finally { setSearchLoading(false); }
    });
    container.appendChild(button);
  }
}

async function openExistingEnrollment(match) {
  if (!match) return;
  if (!isCategoryRecordPath(match.path, match.type, match.enroll)) throw new Error("This record does not belong to the active account or category.");

  lastType = match.type;
  if (safeGet("idType")) safeGet("idType").value = match.type;
  isEditingEntry = true;
  existingPhotoUrl = match.data?.photo || "";
  editingRecordPath = match.path;
  imageData = "";
  entryData = { ...match.data };

  safeGet("homePage")?.classList.add("hidden");
  safeGet("previewPage")?.classList.add("hidden");
  safeGet("idForm")?.classList.remove("hidden");
  setFormHeading("edit");
  clearInlineStatus();
  resetProgressBar();
  hideCropControls();
  stopCamera();
  resetPhotoButtons();

  await generateFormFields(match.type, match.enroll);
  fillGeneratedForm(match.type, match.data);

  if (existingPhotoUrl) {
    showExistingPhotoOnCanvas(existingPhotoUrl);
    setPhotoReadyState();
    setInlineStatus("formStatus", "Existing photo will be retained unless you capture or choose a new photo.");
  }
}

async function searchExistingEnrollment() {
  try {
    const searchDate = safeGet("searchDate")?.value || "";
    const uniqueDigits = digitsOnly(safeGet("searchUnique")?.value || "", 5);

    if (!schoolCode || !schoolName) {
      showModal("Login Required", "Please login again before searching.", true);
      return;
    }

    if (!searchDate || uniqueDigits.length !== 5) {
      showModal("Search Required", "Enter enrollment date and last 5 digits.", true);
      return;
    }

    setInlineStatus("searchStatus");
    safeGet("searchResults")?.replaceChildren();
    setSearchLoading(true);
    const dateCode = getEnrollmentDateCode(searchDate);
    const matches = await findExistingEnrollments(dateCode, uniqueDigits);

    if (!matches.length) {
      showModal("Not Found", ENROLLMENT_NOT_FOUND_MESSAGE, true);
      return;
    }

    if (matches.length === 1) await openExistingEnrollment(matches[0]);
    else showEnrollmentMatches(matches);
  } catch (error) {
    console.error("Enrollment search failed:", error);
    showModal("Search unavailable", "Could not load records. Please check your connection and access, then try again.", true);
  } finally {
    setSearchLoading(false);
  }
}

window.navigateToForm = async function() {
  const type = (safeGet("idType")?.value || "").trim().toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(ID_TYPE_LABELS, type)) {
    safeGet("idType")?.focus();
    return;
  }
  resetEditState();
  lastType = type;
  setFormHeading();
  if (exists("homePage")) el("homePage").classList.add("hidden");
  if (exists("idForm")) el("idForm").classList.remove("hidden");
  await generateFormFields(type);
};

async function generateFormFields(type, existingEnroll = "") {
  if (!Object.prototype.hasOwnProperty.call(ID_TYPE_LABELS, type)) {
    return;
  }

  const numberFields = ['roll', 'contact'];
  const codeFields = ['adm', 'empid'];

  const studentFields = [
    ['enroll', 'Enrollment Number *', 'text', true],
    ['adm', 'Admission Number', 'text'],
    ['name', 'Student Name *', 'text'],
    ['class', 'Class *', 'select', ['PG', 'NUR', 'LKG', 'UKG', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']],
    ['section', 'Section *', 'select', ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K']],
    ['roll', 'Roll Number *', 'text'],
    ['dob', 'Date of Birth', 'date'],
    ['father', "Father's Name *", 'text'],
    ['mother', "Mother's Name *", 'text'],
    ['contact', 'Contact Number', 'text'],
    ['address', 'Address *', 'textarea'],
    ['transport', 'Mode of Transport *', 'select', ['SELF', 'TRANSPORT']],
    ['house', 'House Name', 'text'],
    ['blood', 'Blood Group', 'select', ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'NA']]
  ];

  const staffFields = [
    ['enroll', 'Enrollment Number *', 'text', true],
    ['empid', 'Employee ID', 'text'],
    ['name', 'Name *', 'text'],
    ['designation', 'Designation *', 'select', ['DIRECTOR', 'PRINCIPAL', 'VICE PRINCIPAL', 'COORDINATOR', 'ADMIN', 'ACCOUNTANT', 'LIBRARIAN', 'TEACHER', 'CLERK', 'COMPUTER OPERATOR', 'RECEPTIONIST', 'DRIVER', 'ATTENDANT', 'GUARD', 'CARETAKER', 'HELPER', 'PEON', 'MED', 'OTHER']],
    ['father', "Father / Spouse Name *", 'text'],
    ['dob', 'Date of Birth', 'date'],
    ['contact', 'Contact Number', 'text'],
    ['address', 'Address *', 'textarea'],
    ['blood', 'Blood Group', 'select', ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'NA']]
  ];

  const fields = { student: studentFields, staff: staffFields }[type];
  const container = safeGet("formFields");
  if (!container) {
    console.warn("formFields container not found in DOM");
    return;
  }
  container.innerHTML = '';
  setFormHeading(existingEnroll ? "edit" : "create");

  let enrollNo = "";
  if (existingEnroll) {
    enrollNo = existingEnroll;
  } else {
    try {
      enrollNo = await generateUniqueEnrollment(type);
    } catch (e) {
      console.error("Enrollment generation failed:", e);
      setInlineStatus("formStatus", ENROLLMENT_GENERATION_FAILED_MESSAGE, true);
      showModal("Error", ENROLLMENT_GENERATION_FAILED_MESSAGE, true);
      safeGet("idForm")?.classList.add("hidden");
      safeGet("homePage")?.classList.remove("hidden");
      resetDashboardMenu();
      return;
    }
  }

  fields.forEach(fieldDef => {
    const [id, label, controlType, optOrReadonly] = fieldDef;
    const fullId = `${type}_${id}`;
    let inputHTML = '';

    const isRequired = (label.includes('*') && !['dob', 'contact'].includes(id)) ? 'required' : '';

    if (controlType === 'select') {
      const options = Array.isArray(optOrReadonly) ? optOrReadonly : [];

      if ((id === 'designation' && type === 'staff') || (id === 'section' && type === 'student')) {
        const datalistId = `${fullId}_list`;
        inputHTML = `
          <input type="text" list="${datalistId}" id="${fullId}" name="${fullId}" autocapitalize="characters" placeholder="Select or type ${label.replace('*', '').trim()}" ${isRequired} />
          <datalist id="${datalistId}">
            ${options.map(opt => `<option value="${opt}">`).join('')}
          </datalist>
        `;
      } else {
        inputHTML = `<select id="${fullId}" name="${fullId}" ${isRequired}>
          <option value="" disabled selected>Select ${label.replace('*', '').trim()}</option>`;
        options.forEach(opt => inputHTML += `<option value="${opt}">${opt}</option>`);
        inputHTML += `</select>`;
      }

    } else if (controlType === 'textarea') {
      const maxLength = 120;
      inputHTML = `<textarea id="${fullId}" name="${fullId}" rows="2" maxlength="${maxLength}" ${isRequired}></textarea>`;
    } else {
      const value = id === 'enroll' ? enrollNo : '';
      const ro = id === 'enroll' ? 'readonly' : '';
      const inputType = id === 'dob' ? 'date' : (numberFields.includes(id) ? 'tel' : 'text');
      const inputAttributes = numberFields.includes(id)
        ? (id === 'contact' ? 'pattern="\\d{10}" inputmode="numeric" maxlength="10" oninput="enforceTenDigits(this)"' : 'pattern="\\d*" inputmode="numeric" maxlength="15"')
        : (codeFields.includes(id) ? 'pattern="[A-Za-z0-9\\/-]*" maxlength="30"' : '');
      inputHTML = `<input type="${inputType}" id="${fullId}" name="${fullId}" value="${value}" ${ro} ${inputAttributes} ${isRequired} />`;
    }

    const displayLabel = label.replace('*', '').trim();
    const requiredStar = label.includes('*') ? ' <span class="required-star">*</span>' : '';
    const wrapper = document.createElement('div');
    wrapper.className = "form-group";
    wrapper.innerHTML = `<label for="${fullId}">${displayLabel}${requiredStar}</label>${inputHTML}`;
    container.appendChild(wrapper);
  });
}

function compressImage(sourceCanvasOrImage, maxWidth = 480, quality = 0.6, targetRatio = 120 / 155) {
  const tempCanvas = document.createElement("canvas");
  const ctx = tempCanvas.getContext("2d");
  const srcWidth = sourceCanvasOrImage.width || sourceCanvasOrImage.videoWidth || 0;
  const srcHeight = sourceCanvasOrImage.height || sourceCanvasOrImage.videoHeight || 0;
  if (!srcWidth || !srcHeight) return "";
  const newWidth = Math.min(srcWidth, maxWidth);
  const newHeight = Math.round(newWidth / targetRatio);
  const srcRatio = srcWidth / srcHeight;
  let cropWidth = srcWidth;
  let cropHeight = srcHeight;
  let cropX = 0;
  let cropY = 0;

  if (srcRatio > targetRatio) {
    cropWidth = Math.round(srcHeight * targetRatio);
    cropX = Math.round((srcWidth - cropWidth) / 2);
  } else if (srcRatio < targetRatio) {
    cropHeight = Math.round(srcWidth / targetRatio);
    cropY = Math.round((srcHeight - cropHeight) / 2);
  }

  tempCanvas.width = newWidth;
  tempCanvas.height = newHeight;
  ctx.drawImage(sourceCanvasOrImage, cropX, cropY, cropWidth, cropHeight, 0, 0, newWidth, newHeight);
  return tempCanvas.toDataURL("image/jpeg", quality);
}

function compressImageNoCrop(sourceCanvasOrImage, maxWidth = 900, quality = 0.78) {
  const tempCanvas = document.createElement("canvas");
  const ctx = tempCanvas.getContext("2d");
  const srcWidth = sourceCanvasOrImage.width || sourceCanvasOrImage.videoWidth || 0;
  const srcHeight = sourceCanvasOrImage.height || sourceCanvasOrImage.videoHeight || 0;
  if (!srcWidth || !srcHeight) return "";

  const scale = Math.min(1, maxWidth / srcWidth);
  tempCanvas.width = Math.round(srcWidth * scale);
  tempCanvas.height = Math.round(srcHeight * scale);
  ctx.drawImage(sourceCanvasOrImage, 0, 0, tempCanvas.width, tempCanvas.height);
  return tempCanvas.toDataURL("image/jpeg", quality);
}

function showCompressedPhotoOnCanvas(dataUrl) {
  const canvas = safeGet("canvas");
  if (!canvas || !dataUrl) return;
  const img = new Image();
  img.onload = () => {
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.classList.remove("hidden");
  };
  img.src = dataUrl;
}

function showExistingPhotoOnCanvas(photoUrl) {
  const canvas = safeGet("canvas");
  if (!canvas || !photoUrl) return;

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    canvas.width = img.naturalWidth || 480;
    canvas.height = img.naturalHeight || Math.round(canvas.width / (120 / 155));
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.classList.remove("hidden");
  };
  img.onerror = () => {
    setInlineStatus("formStatus", "Existing photo is saved. Choose a new photo only if you want to change it.");
  };
  img.src = photoUrl;
}

function hideCropControls() {
  clearCropPointers();
  if (cropRenderFrame) cancelAnimationFrame(cropRenderFrame);
  cropRenderFrame = 0;
  cropTransform = null;
  safeGet("cropControls")?.classList.add("hidden");
  safeGet("canvas")?.parentElement?.classList.remove("crop-mode");
  cropSourceImage = null;
}

function showCropControls(reset = true) {
  clearCropPointers();
  if (cropSourceImage && (reset || !cropTransform)) {
    cropTransform = createCropTransform(cropSourceImage.naturalWidth || cropSourceImage.width, cropSourceImage.naturalHeight || cropSourceImage.height);
  }
  safeGet('cropControls')?.classList.remove('hidden');
  safeGet('canvas')?.parentElement?.classList.add('crop-mode');
  renderCropFromControls();
}

function openPhotoAdjustment() {
  if (isSubmitting) return;
  stopCamera();
  if (cropSourceImage) {
    showCropControls(false);
    renderCropFromControls();
    return;
  }
  const source = imageData || existingPhotoUrl;
  if (!source) return;
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.onload = () => {
    try {
      cropSourceImage = image;
      showCropControls();
      renderCropFromControls();
    } catch (error) {
      hideCropControls();
      setInlineStatus("formStatus", "This photo could not be adjusted. Please choose a new photo.", true);
    }
  };
  image.onerror = () => setInlineStatus("formStatus", "Could not open the photo. Please try again or choose a new photo.", true);
  image.src = source;
}
window.openPhotoAdjustment = openPhotoAdjustment;

function renderCropFromControls() {
  if (!cropSourceImage || !cropTransform || cropRenderFrame) return;
  cropRenderFrame = requestAnimationFrame(() => {
    cropRenderFrame = 0;
    drawCropPreview();
  });
}

function drawCropPreview() {
  const overview = safeGet('cropOverview');
  if (!overview || !cropSourceImage || !cropTransform || !safeGet('canvas')?.parentElement?.classList.contains('crop-mode')) return;
  const bounds = overview.getBoundingClientRect();
  if (!(bounds.width > 0 && bounds.height > 0)) return;
  const density = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(bounds.width * density));
  const height = Math.max(1, Math.round(bounds.height * density));
  if (overview.width !== width) overview.width = width;
  if (overview.height !== height) overview.height = height;
  cropTransform = constrainCropTransform(cropTransform);
  const frame = getCropFrame(bounds.width, bounds.height);
  const context = overview.getContext('2d');
  context.setTransform(density, 0, 0, density, 0, 0);
  context.clearRect(0, 0, bounds.width, bounds.height);
  context.fillStyle = '#17243b';
  context.fillRect(0, 0, bounds.width, bounds.height);
  context.drawImage(cropSourceImage, frame.x + cropTransform.x * frame.scale, frame.y + cropTransform.y * frame.scale, cropTransform.sourceWidth * cropTransform.scale * frame.scale, cropTransform.sourceHeight * cropTransform.scale * frame.scale);
  context.fillStyle = 'rgba(8, 16, 30, .55)';
  context.beginPath();
  context.rect(0, 0, bounds.width, bounds.height);
  context.rect(frame.x, frame.y, frame.width, frame.height);
  context.fill('evenodd');
  context.strokeStyle = '#ffffff';
  context.lineWidth = 2;
  context.strokeRect(frame.x, frame.y, frame.width, frame.height);
  context.strokeStyle = 'rgba(255,255,255,.3)';
  context.lineWidth = 1;
  for (const fraction of [1 / 3, 2 / 3]) {
    context.beginPath();
    context.moveTo(frame.x + frame.width * fraction, frame.y);
    context.lineTo(frame.x + frame.width * fraction, frame.y + frame.height);
    context.moveTo(frame.x, frame.y + frame.height * fraction);
    context.lineTo(frame.x + frame.width, frame.y + frame.height * fraction);
    context.stroke();
  }
}

function adjustCrop() {
  renderCropFromControls();
}

function resetCrop() {
  if (!cropSourceImage) return;
  cropTransform = createCropTransform(cropSourceImage.naturalWidth || cropSourceImage.width, cropSourceImage.naturalHeight || cropSourceImage.height);
  clearCropPointers();
  renderCropFromControls();
}

function finishCrop() {
  if (!cropSourceImage || !cropTransform) return;
  try {
    const canvas = safeGet('canvas');
    cropTransform = constrainCropTransform(cropTransform);
    canvas.width = CROP_WIDTH;
    canvas.height = CROP_HEIGHT;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, CROP_WIDTH, CROP_HEIGHT);
    context.drawImage(cropSourceImage, cropTransform.x, cropTransform.y, cropTransform.sourceWidth * cropTransform.scale, cropTransform.sourceHeight * cropTransform.scale);
    imageData = canvas.toDataURL('image/jpeg', .85);
    canvas.classList.remove('hidden');
    clearCropPointers();
    if (cropRenderFrame) cancelAnimationFrame(cropRenderFrame);
    cropRenderFrame = 0;
    safeGet('cropControls')?.classList.add('hidden');
    canvas.parentElement?.classList.remove('crop-mode');
    setInlineStatus('formStatus');
    requestAnimationFrame(() => document.querySelector('.photo-adjust-button')?.focus({ preventScroll: true }));
  } catch (error) {
    showModal('Photo adjustment', 'Could not save this photo. Please try again or retake it.', true);
  }
}

async function getCameraStream() {
  const attempts = [
    { video: { facingMode: { exact: "environment" }, width: { ideal: 1280 }, height: { ideal: 960 }, aspectRatio: { ideal: 0.75 } }, audio: false },
    { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 960 }, aspectRatio: { ideal: 0.75 } }, audio: false },
    { video: { width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false },
    { video: true, audio: false }
  ];

  let lastError = null;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      lastError = error;
      if (error.name === "NotAllowedError" || error.name === "SecurityError") throw error;
    }
  }
  throw lastError || new Error("Camera unavailable");
}

function resetPhotoButtons() {
  const { cameraBtn } = getButtonRefs();
  if (cameraBtn) {
    cameraBtn.innerHTML = `<i class="fas fa-video"></i><span>Camera</span>`;
    cameraBtn.onclick = startCamera;
  }
}

function setPhotoReadyState() {
  const { cameraBtn } = getButtonRefs();
  if (cameraBtn) {
    cameraBtn.innerHTML = `<i class="fas fa-redo"></i><span>Retake</span>`;
    cameraBtn.onclick = retakePicture;
  }
}

async function startCamera() {
  try {
    clearInlineStatus();
    stopCamera();
    hideCropControls();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setInlineStatus("formStatus", "Camera is not available on this device. Choose photo from Gallery.", true);
      return;
    }

    stream = await getCameraStream();
    const video = safeGet("video");
    if (!video) {
      stopCamera();
      setInlineStatus("formStatus", "Camera preview is not available. Choose photo from Gallery.", true);
      return;
    }

    const canvas = safeGet("canvas");
    if (canvas) canvas.classList.add("hidden");
    imageData = "";
    video.srcObject = stream;
    await video.play();
    video.classList.remove("hidden");
    video.parentElement?.classList.add("camera-mode");

    const {
      cameraBtn
    } = getButtonRefs();
    if (cameraBtn) {
      cameraBtn.innerHTML = `<i class="fas fa-camera"></i><span>Capture</span>`;
      cameraBtn.onclick = takePicture;
    }
  } catch (err) {
    console.error("Camera error:", err);
    stopCamera();
    if (err.name === "NotAllowedError" || err.name === "SecurityError") {
      setInlineStatus("formStatus", "Camera permission blocked. Allow camera permission or choose photo from Gallery.", true);
    } else if (err.name === "NotFoundError") {
      setInlineStatus("formStatus", "No camera found. Choose photo from Gallery.", true);
    } else {
      setInlineStatus("formStatus", "Camera could not open. Choose photo from Gallery.", true);
    }
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  const video = safeGet("video");
  if (video) {
    video.srcObject = null;
    video.classList.add("hidden");
    video.parentElement?.classList.remove("camera-mode");
  }
}

function takePicture() {
  const video = safeGet("video");
  const canvas = safeGet("canvas");
  if (!video || !canvas || !video.videoWidth) {
    setInlineStatus("formStatus", "Camera is still loading. Try again.", true);
    return;
  }
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  imageData = compressImageNoCrop(canvas, 900, 0.78);
  hideCropControls();
  stopCamera();
  const capturedImage = new Image();
  capturedImage.onload = () => {
    cropSourceImage = capturedImage;
    showCropControls();
    renderCropFromControls();
  };
  capturedImage.src = imageData;
  setInlineStatus("formStatus", isEditingEntry ? "New photo selected. Submit to update this ID." : "");
  setPhotoReadyState();
}

function retakePicture() {
  imageData = '';
  const canvas = safeGet("canvas");
  if (canvas) canvas.classList.add("hidden");
  hideCropControls();
  startCamera();
}

function openGallery() {
  if (isSubmitting) return;
  stopCamera();
  const galleryInput = safeGet("galleryInput");
  if (!galleryInput) {
    setInlineStatus("formStatus", "Gallery option is not available on this device.", true);
    return;
  }
  galleryInput.value = "";
  galleryInput.click();
}

function handleGalleryChange(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    setInlineStatus("formStatus", "Please choose a valid photo.", true);
    return;
  }

  const img = new Image();
  const objectUrl = URL.createObjectURL(file);
  img.onload = () => {
    cropSourceImage = img;
    showCropControls();
    renderCropFromControls();
    safeGet("video")?.classList.add("hidden");
    setInlineStatus("formStatus", isEditingEntry ? "New photo selected. Submit to update this ID." : "");
    setPhotoReadyState();
    URL.revokeObjectURL(objectUrl);
  };
  img.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    setInlineStatus("formStatus", "Could not load this photo. Please choose another image.", true);
  };
  img.src = objectUrl;
}

function setBusyState(isBusy) {
  const { submitBtn, cameraBtn, galleryBtn, homeBtn, newEntryBtn, saveBtn, editBtn } = getButtonRefs();
  [submitBtn, cameraBtn, galleryBtn, homeBtn, newEntryBtn, saveBtn, editBtn].forEach(button => {
    if (button) button.disabled = isBusy;
  });
  if (submitBtn) {
    submitBtn.innerHTML = isBusy
      ? `<i class="fas fa-spinner fa-spin"></i><span>Saving</span>`
      : `<i class="fas fa-paper-plane"></i><span>Submit</span>`;
  }
}

function setPreviewActionsUploading(isUploading) {
  document.querySelectorAll(".btn-group").forEach(group => {
    group.classList.toggle("uploading", isUploading);
  });
}

function normalizeFormValue(field) {
  const tag = (field.tagName || "").toUpperCase();
  let value = (field.value || "").trim();
  if (field.type === "text" || field.type === "tel" || tag === "TEXTAREA" || tag === "SELECT") {
    value = value.toUpperCase().replace(/\s+/g, " ");
  }
  return value;
}

function validateFormData(rawData) {
  const type = lastType || "default";
  if (!Object.prototype.hasOwnProperty.call(ID_TYPE_LABELS, type)) return "Please choose a valid ID category.";
  const enroll = rawData[`${type}_enroll`];
  const contact = rawData[`${type}_contact`];
  const roll = rawData[`${type}_roll`];
  const adm = rawData[`${type}_adm`];
  const empid = rawData[`${type}_empid`];

  if (!enroll) return "Enrollment number is required.";
  if (!isSafeEnrollmentNumber(enroll)) return ENROLLMENT_GENERATION_FAILED_MESSAGE;
  if (contact && !/^\d{10}$/.test(contact)) return "Contact number must be exactly 10 digits.";
  if (roll && !/^\d+$/.test(roll)) return "Roll number must contain digits only.";
  if (adm && !/^[A-Z0-9/-]+$/.test(adm)) return "Admission number can contain letters, numbers, / and - only.";
  if (empid && !/^[A-Z0-9/-]+$/.test(empid)) return "Employee ID can contain letters, numbers, / and - only.";
  return "";
}

function hasValidSchoolIdentity() {
  return !!String(schoolCode || "").trim() && !!String(schoolName || "").trim();
}

function isSafeEnrollmentNumber(enroll) {
  const value = String(enroll || "").trim().toUpperCase();
  if (!value) return false;
  if (value.includes("-TEMP-") || value.includes("UNKNOWN")) return false;
  if (!hasValidSchoolIdentity()) return false;
  return value.startsWith(String(schoolCode).trim().toUpperCase());
}

function sanitizePathSegment(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[.#$/[\]]/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 120) || "UNKNOWN";
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function formatEnrollmentForReceipt(enrollmentNumber) {
  const raw = String(enrollmentNumber || "").trim();
  const schoolId = String(schoolCode || entryData?.schoolId || "").trim();
  const datePattern = /(\d{2}[A-Z]{3}\d{4})(\d+)$/i;

  if (schoolId && raw.toUpperCase().startsWith(schoolId.toUpperCase())) {
    const rest = raw.slice(schoolId.length);
    const match = rest.match(datePattern);
    if (match) {
      return {
        top: `${schoolId}-${match[1].toUpperCase()}`,
        unique: match[2]
      };
    }
  }

  const genericMatch = raw.match(/^(.+?)(\d{2}[A-Z]{3}\d{4})(\d+)$/i);
  if (genericMatch) {
    return {
      top: `${genericMatch[1]}-${genericMatch[2].toUpperCase()}`,
      unique: genericMatch[3]
    };
  }

  return { top: raw, unique: "" };
}

async function handleSubmit(e) {
  if (isSubmitting) return;

  try {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    isSubmitting = true;
    setBusyState(true);
    setPreviewActionsUploading(true);
    hideModal();
    clearInlineStatus();
    resetProgressBar();

    const dataForm = safeGet("dataForm");
    if (dataForm && !dataForm.checkValidity()) {
      dataForm.reportValidity();
      setInlineStatus("formStatus", "Please complete the required fields.", true);
      return;
    }

    if (!imageData && !existingPhotoUrl) {
      setInlineStatus("formStatus", "Please capture photo before submitting.", true);
      return;
    }

    const formFields = document.querySelectorAll("#formFields input, #formFields select, #formFields textarea");
    if (!formFields || formFields.length === 0) {
      setInlineStatus("formStatus", "Form fields not found.", true);
      return;
    }

    const rawData = {};
    formFields.forEach(field => {
      rawData[field.name || createFieldName()] = normalizeFormValue(field);
    });

    const enrollKey = `${lastType || 'default'}_enroll`;
    const nameKey = `${lastType || 'default'}_name`;
    const dobKey = `${lastType || 'default'}_dob`;
    const enroll = rawData[enrollKey];
    const validationError = validateFormData(rawData);

    if (validationError) {
      setInlineStatus("formStatus", validationError, true);
      return;
    }

    if (rawData[dobKey]) {
      const dobDate = new Date(rawData[dobKey]);
      if (!isNaN(dobDate)) {
        const day = String(dobDate.getDate()).padStart(2, '0');
        const month = dobDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
        const year = dobDate.getFullYear();
        rawData[dobKey] = `${day}-${month}-${year}`;
      } else {
        setInlineStatus("formStatus", "Invalid Date of Birth.", true);
        return;
      }
    }

    const schoolId = sanitizePathSegment(schoolCode || "UNKNOWN_ID");
    const schoolNode = sanitizePathSegment(schoolName || "UNKNOWN_SCHOOL");
    const categoryPath = getCategoryDataPath(lastType);
    const dbPath = editingRecordPath || `${categoryPath}/${enroll}`;
    if (editingRecordPath && !isCategoryRecordPath(editingRecordPath, lastType, enroll)) throw new Error("This ID does not belong to the selected category or account.");
    const recordRef = dbRef(database, dbPath);

    const snapshot = await get(recordRef);
    if (isEditingEntry && !snapshot.exists()) throw new Error("This record is no longer available for editing. Please search again.");
    if (!isEditingEntry && snapshot.exists()) {
      const replacement = await generateUniqueEnrollment(lastType);
      if (safeGet(enrollKey)) safeGet(enrollKey).value = replacement;
      setInlineStatus("formStatus", "A new registration number has been assigned. Please tap Submit again.");
      return;
    }
    const isNewEnrollment = !isEditingEntry && !snapshot.exists();

    const data = { type: lastType, [enrollKey]: enroll, [nameKey]: rawData[nameKey] || "", schoolName: schoolNode, schoolId: schoolId, photo: existingPhotoUrl || "" };
    Object.keys(rawData).forEach(key => { if (!["photo","schoolName","schoolId",nameKey,enrollKey].includes(key)) data[key] = rawData[key]; });
    entryData = data;

    showPreviewSafe(imageData || existingPhotoUrl, enroll, true);
    updateProgressBarSafe(0, "Preparing upload...");

    let photoURL = existingPhotoUrl;
    if (imageData) {
      photoURL = await uploadImageToCloudinarySafe(enroll, isEditingEntry);
      if (!photoURL) {
        showSubmitFailedAndGoHomeSafe();
        return;
      }
    }
    data.photo = photoURL;
    entryData = data;

    updateProgressBarSafe(100, "Saving data...");
    await setSafe(recordRef, data);

    if (isNewEnrollment && !isDemoAccount()) {
      const vendorRef = dbRef(database, 'roles/vendor');
      await runTransaction(vendorRef, current => {
        if (!current) return current;
        let credits = Number(current.credits || 0);
        let deu = Number(current.deu || 0);
        if (credits > 0) {
          credits -= 1;
          current.credits = credits;
          if (credits === 0) current.isActive = false;
        } else {
          deu += 1;
          current.deu = deu;
          current.isActive = false;
        }
        return current;
      });
    }

    showPreviewSafe(photoURL, enroll);
    updateProgressBarSafe(100, "Submitted successfully.");
    setPreviewActionsUploading(false);
    isEditingEntry = true;
    existingPhotoUrl = photoURL;
    imageData = "";
    editingRecordPath = dbPath;

  } catch (err) {
    console.error("Unexpected error:", err);
    showSubmitFailedAndGoHomeSafe(err?.message || "Submit failed.");
  } finally {
    isSubmitting = false;
    setBusyState(false);
    setPreviewActionsUploading(false);
  }
}

function uploadImageToCloudinarySafe(enroll, useUniquePublicId = false) {
  return new Promise((resolve, reject) => {
    try {
      if (!imageData) return reject("No image data");
      if (!CLOUDINARY_UPLOAD_URL) return reject("Cloudinary upload URL is missing.");
      const basePublicId = String(enroll || `photo_${Date.now()}`).replace(/[^\w-]/g, "_");
      const categoryPublicId = `${sanitizePathSegment(schoolCode)}_${lastType}_${basePublicId}`.replace(/[^\w-]/g, "_");
      const publicId = useUniquePublicId ? `${categoryPublicId}_${Date.now()}` : categoryPublicId;
      const formData = new FormData();
      formData.append("file", imageData);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      formData.append("public_id", publicId);
      updateProgressBarSafe(0, useUniquePublicId ? "Uploading updated photo..." : "Uploading photo...");
      const xhr = new XMLHttpRequest();
      xhr.open("POST", CLOUDINARY_UPLOAD_URL);
      xhr.timeout = 120000;
      xhr.ontimeout = () => reject(new Error("Photo upload timed out. Please check your connection and try again."));
      xhr.upload.onloadstart = () => updateProgressBarSafe(0, useUniquePublicId ? "Uploading updated photo..." : "Uploading photo...");
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) {
          updateProgressBarSafe(Math.round((e.loaded / e.total) * 100), useUniquePublicId ? "Uploading updated photo..." : "Uploading photo...");
        } else {
          updateProgressBarSafe(Number.NaN, useUniquePublicId ? "Uploading updated photo..." : "Uploading photo...");
        }
      };
      xhr.onload = () => {
        try {
          const result = JSON.parse(xhr.responseText || "{}");
          if (xhr.status === 200 && result.secure_url) {
            updateProgressBarSafe(100, "Photo uploaded. Saving data...");
            resolve(result.secure_url);
          } else {
            const cloudinaryMessage = result?.error?.message || result?.message || `HTTP status ${xhr.status}`;
            reject(new Error(`Cloudinary upload failed: ${cloudinaryMessage}`));
          }
        } catch (e) {
          reject(e);
        }
      };
      xhr.onerror = () => reject(new Error("Network error uploading image"));
      xhr.send(formData);
    } catch (e) { reject(e); }
  });
}

function setSafe(ref, data) { try { return set(ref, data); } catch (e) { return Promise.reject(e); } }
function showPreviewSafe(img, enroll, isPending = false) { try { showPreview(img, enroll, isPending); } catch (e) { console.warn("Preview failed", e); } }
function updateProgressBarSafe(percent, message = "") {
  try {
    const progressContainer = safeGet("progressContainer");
    const progressEl = safeGet("uploadProgress");
    if (!progressContainer || !progressEl) return;

    const value = Number(percent);
    const isFiniteValue = Number.isFinite(value);

    progressContainer.classList.remove("hidden");
    progressContainer.classList.toggle("active", isFiniteValue && value > 0 && value < 100);
    progressContainer.classList.toggle("indeterminate", !isFiniteValue);

    if (isFiniteValue) {
      const safePercent = Math.max(0, Math.min(100, Math.round(value)));
      progressEl.style.width = `${safePercent}%`;
      progressEl.setAttribute("aria-valuenow", String(safePercent));
    } else {
      progressEl.style.width = "";
      progressEl.removeAttribute("aria-valuenow");
    }

    progressContainer.setAttribute("role", "progressbar");
    progressContainer.setAttribute("aria-valuemin", "0");
    progressContainer.setAttribute("aria-valuemax", "100");
    setInlineStatus("uploadStatus", message);
  } catch (e) {
    console.warn(e);
  }
}

function resetProgressBar() {
  const progressContainer = safeGet("progressContainer");
  const progressEl = safeGet("uploadProgress");
  if (progressEl) {
    progressEl.style.width = "0%";
    progressEl.removeAttribute("aria-valuenow");
  }
  if (progressContainer) {
    progressContainer.classList.add("hidden");
    progressContainer.classList.remove("active", "indeterminate");
  }
  setInlineStatus("uploadStatus");
}
function goHomeSafe() { try { goHome(); } catch (e) { console.warn("goHome failed", e); } }
function showSubmitFailedAndGoHomeSafe(message = "Submit failed.") {
  try {
    setInlineStatus("formStatus", message, true);
    updateProgressBarSafe(0, message);
    setInlineStatus("uploadStatus", message, true);
    if (safeGet("receiptStatus")) safeGet("receiptStatus").textContent = "Submission incomplete";
    if (safeGet("receiptDelivery")) safeGet("receiptDelivery").textContent = "Please return to Edit and retry your submission.";
  } catch (e) {
    console.warn("Submit failed status error:", e);
  }
}

function showPreview(photoUrl, enrollmentNumber, isPending = false) {
  try {
    if (!photoUrl || !enrollmentNumber) {
      showModal("Error", "Missing photo or enrollment number.", true);
      return;
    }

    const previewPage = safeGet("previewPage");
    const idForm = safeGet("idForm");
    const previewContainer = safeGet("preview");

    if (!previewPage || !idForm || !previewContainer) {
      showModal("Error", "Required preview elements not found.", true);
      return;
    }

    idForm.classList.add("hidden");
    previewPage.classList.remove("hidden");

    const data = entryData || {};
    const receiptEnrollmentNumber = formatEnrollmentForReceipt(enrollmentNumber);
    const formatLabel = (key) =>
      ({ empid: "Employee ID", dob: "Date of Birth" }[key.replace(/^(student|staff)_/, "")] || key.replace(/^(student|staff)_/, "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()));

    const typeLabel = ID_TYPE_LABELS[lastType] || "ID";
    const hiddenKeys = ["image", "type", "photo", "enrollment_number", "schoolName", "schoolId"];
    const detailRows = Object.entries(data)
      .filter(([key, value]) => value && !hiddenKeys.includes(key) && !key.endsWith("_enroll"))
      .map(([key, value], index) => `
        <tr style="background:${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="width:36%; padding:10px 8px 10px 10px; border-bottom:1px solid #e5e7eb; color:#475569; font-size:11px; font-weight:800; text-transform:uppercase; text-align:left; vertical-align:top; line-height:1.35; overflow-wrap:break-word;">
            ${escapeHTML(formatLabel(key))}
          </td>
          <td style="width:64%; padding:10px 10px 10px 12px; border-bottom:1px solid #e5e7eb; color:#111827; font-size:13px; font-weight:700; text-align:left; overflow-wrap:anywhere; vertical-align:top; line-height:1.35;">
            ${escapeHTML(value)}
          </td>
        </tr>
      `).join("");

    previewContainer.innerHTML = `
      <div id="idCardBox" data-saved="${!isPending}" style="
        max-width:420px; margin:22px auto; font-family:'Inter',Arial,sans-serif;
        border-radius:18px; overflow:hidden; background:#ffffff;
        border:1px solid #dbeafe;
        box-shadow:0 10px 28px rgba(15,23,42,0.18);
        transition:all .3s ease-in-out;">
        <div style="background:#0d47a1; color:#fff; padding:18px 16px; text-align:center;">
          <div style="font-size:11px; font-weight:900; letter-spacing:1px; text-transform:uppercase; opacity:0.9;">
            Enrollment Slip
          </div>
          <div style="margin-top:5px; font-size:22px; font-weight:900; letter-spacing:0.4px; font-family:'Exo 2',Arial,sans-serif; text-transform:uppercase; line-height:1.15;">
            ${escapeHTML(data.schoolName || schoolName || "ACCOUNT")}
          </div>
          <div style="display:inline-flex; align-items:center; justify-content:center; margin-top:10px; padding:6px 12px; border-radius:999px; background:rgba(255,255,255,0.16); border:1px solid rgba(255,255,255,0.22); font-size:11px; font-weight:900; text-transform:uppercase;">
            ${escapeHTML(typeLabel)} ID Registration
          </div>
        </div>

        <div style="padding:16px; background:#ffffff;">
          <div style="display:flex; gap:14px; align-items:center; padding:12px; border-radius:16px; background:#f8fbff; border:1px solid #dbeafe;">
            <div style="width:102px; height:132px; flex:0 0 102px; overflow:hidden; border-radius:14px; border:3px solid #ffffff; box-shadow:0 8px 18px rgba(15,23,42,0.18); background:#e5e7eb;">
              <img src="${escapeHTML(photoUrl)}" crossorigin="anonymous" style="width:100%; height:100%; object-fit:cover;">
            </div>
            <div style="min-width:0; text-align:left;">
              <div style="color:#64748b; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:0.7px;">Enrollment Number</div>
              <div style="margin-top:5px; color:#0d47a1; font-weight:900; line-height:1.2;">
                <div style="font-size:11px; overflow-wrap:anywhere;">
                  ${escapeHTML(receiptEnrollmentNumber.top)}
                </div>
                ${receiptEnrollmentNumber.unique ? `
                  <div style="margin-top:3px; display:inline-flex; padding:4px 8px; border-radius:10px; background:#eaf3ff; color:#0d47a1; font-size:16px; letter-spacing:1px;">
                    ${escapeHTML(receiptEnrollmentNumber.unique)}
                  </div>
                ` : ""}
              </div>
              <div style="margin-top:11px; color:#64748b; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:0.7px;">Status</div>
              <div id="receiptStatus" style="display:inline-flex; margin-top:5px; padding:6px 10px; border-radius:999px; color:#166534; background:#dcfce7; font-size:10px; font-weight:900; text-transform:uppercase;">
                ${isPending ? "Saving enrollment…" : "Submitted Successfully"}
              </div>
            </div>
          </div>

          <div style="margin-top:14px; text-align:left;">
            <div style="margin-bottom:8px; color:#0f172a; font-family:'Exo 2',Arial,sans-serif; font-size:16px; font-weight:900; text-transform:uppercase;">
              Filled Details
            </div>
          </div>
          <table style="width:100%; table-layout:fixed; border-collapse:collapse; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
            ${detailRows || `
              <tr>
                <td style="padding:12px; color:#64748b; font-size:13px; font-weight:700; text-align:center;">
                  No filled details found.
                </td>
              </tr>
            `}
          </table>

          <div style="text-align:center; margin-top:15px; padding:12px; border-radius:14px; background:#f8fafc; border:1px dashed #cbd5e1;">
            <svg id="barcode" style="width:140px; height:40px;"></svg>
          </div>

          <div style="margin-top:14px; padding-top:12px; border-top:1px dashed #cbd5e1; font-size:11px; text-align:center; color:#475569; line-height:1.45;">
            <span id="receiptDelivery">${isPending ? "Please wait while your photo and details are saved." : "Your enrollment was successful. ID card will be delivered within <strong>5-7 working days</strong>."}</span><br>
            Printed by <strong>Lakshmi ID Maker</strong>
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

  } catch (err) {
    console.error("showPreview failed:", err);
    showModal("Error", "Preview generation failed.", true);
  }
}

function generateBarcodeImage(enroll) {
  if (!enroll) return;
  try {
    JsBarcode("#barcode", enroll, { format: "CODE128", width: 1.5, height: 40, displayValue: false });
  } catch (e) {
    console.warn("JsBarcode call failed:", e);
    return;
  }

  const checkAndConvert = () => {
    const svg = document.querySelector("#barcode");
    if (!svg || svg.children.length === 0) return setTimeout(checkAndConvert, 120);
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
      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    } catch (e) {
      console.error("Failed to convert barcode SVG to PNG:", e);
    }
  };
  checkAndConvert();
}

function saveIDAsImage() {
  if (isSubmitting) return;
  const previewEl = document.getElementById("idCardBox");
  if (!previewEl) return showModal("Error", "Preview not found!", true);
  if (previewEl.dataset.saved !== "true") return showModal("Save unavailable", "Please submit your enrollment successfully before saving the PDF.", true);

  const enrollmentNumber = entryData?.[`${lastType}_enroll`] || "id-card";
  const fileName = `${enrollmentNumber}.pdf`;

  const generatePDF = () => {
    html2canvas(previewEl, {
      scale: 3,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#fefefe',
      scrollY: -window.scrollY,
      scrollX: -window.scrollX
    }).then(canvas => {
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const scaleX = (pageWidth - margin * 2) / canvasWidth;
      const scaleY = (pageHeight - margin * 2) / canvasHeight;
      const scale = Math.min(scaleX, scaleY);
      const imgWidth = canvasWidth * scale;
      const imgHeight = canvasHeight * scale;
      const x = (pageWidth - imgWidth) / 2;
      const y = (pageHeight - imgHeight) / 2;
      pdf.setDrawColor(200);
      pdf.setLineWidth(0.5);
      pdf.rect(x - 2, y - 2, imgWidth + 4, imgHeight + 4, 'S');
      pdf.addImage(imgData, "JPEG", x, y, imgWidth, imgHeight);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(120);
      pdf.text("Powered by Penport India", pageWidth / 2, pageHeight - 10, { align: "center" });

      if (window.Android && typeof window.Android.savePDFFromJS === "function") {
        const pdfBlob = pdf.output("blob");
        const reader = new FileReader();
        reader.onload = function() {
          const base64Data = reader.result.split(',')[1];
          window.Android.savePDFFromJS(base64Data, fileName);
        };
        reader.readAsDataURL(pdfBlob);
      } else {
        pdf.save(fileName);
      }
    }).catch(err => {
      showModal("Error", "Failed to generate PDF: " + (err?.message || err), true);
    });
  };

  const loadScript = (src, onLoad) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = onLoad;
    script.onerror = () => showModal("Error", "Failed to load script: " + src, true);
    document.body.appendChild(script);
  };

  if (typeof html2canvas === "undefined") {
    loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js", () => {
      if (typeof window.jspdf === "undefined") {
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", generatePDF);
      } else {
        generatePDF();
      }
    });
  } else if (typeof window.jspdf === "undefined") {
    loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", generatePDF);
  } else {
    generatePDF();
  }
}

function editEntry() {
  if (isSubmitting) return;
  setPreviewActionsUploading(false);
  safeGet("previewPage")?.classList.add("hidden");
  safeGet("idForm")?.classList.remove("hidden");
}

function newEntry() {
  if (isSubmitting) return;
  setPreviewActionsUploading(false);
  const previousType = lastType;
  const previewPage = safeGet("previewPage");
  const formFields = safeGet("formFields");
  const idForm = safeGet("idForm");
  const canvas = safeGet("canvas");
  const video = safeGet("video");
  const idTypeSelect = safeGet("idType");
  const galleryInput = safeGet("galleryInput");

  if (previewPage) previewPage.classList.add("hidden");
  if (formFields) formFields.innerHTML = '';
  if (canvas) canvas.classList.add("hidden");
  if (video) video.classList.add("hidden");
  if (idForm) idForm.classList.remove("hidden");
  clearInlineStatus();
  resetProgressBar();
  hideCropControls();

  imageData = '';
  entryData = {};
  resetEditState();
  lastType = idTypeSelect?.value?.trim().toLowerCase() || previousType || '';
  if (galleryInput) galleryInput.value = "";
  stopCamera();
  resetPhotoButtons();
  if (lastType) generateFormFields(lastType);
}

function goHome() {
  if (isSubmitting) return;
  setPreviewActionsUploading(false);
  safeGet("previewPage")?.classList.add("hidden");
  safeGet("idForm")?.classList.add("hidden");
  if (safeGet("formFields")) safeGet("formFields").innerHTML = '';
  clearInlineStatus();
  resetProgressBar();
  hideCropControls();
  imageData = '';
  entryData = {};
  lastType = '';
  resetEditState();
  if (safeGet("galleryInput")) safeGet("galleryInput").value = "";
  stopCamera();
  safeGet("canvas")?.classList.add("hidden");
  safeGet("video")?.classList.add("hidden");
  if (safeGet("preview")) safeGet("preview").innerHTML = '';
  safeGet("homePage")?.classList.remove("hidden");
  resetDashboardMenu();
  resetPhotoButtons();
}

function togglePassword() {
  const passwordInput = document.getElementById('loginPass');
  const eyeIcon = document.getElementById('eyeIcon');

  if (!passwordInput || !eyeIcon) {
    console.error('Password input or eye icon not found');
    return;
  }

  if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      eyeIcon.classList.remove('fa-eye');
      eyeIcon.classList.add('fa-eye-slash');
  } else {
      passwordInput.type = 'password';
      eyeIcon.classList.remove('fa-eye-slash');
      eyeIcon.classList.add('fa-eye');
  }
}

window.handleSubmit = handleSubmit;
window.showLoginPage = showLoginPage;
window.logoutUser = logoutUser;
window.navigateToForm = navigateToForm;
window.startCamera = startCamera;
window.openGallery = openGallery;
window.handleGalleryChange = handleGalleryChange;
window.adjustCrop = adjustCrop;
window.resetCrop = resetCrop;
window.finishCrop = finishCrop;
window.takePicture = takePicture;
window.closeCameraPreview = function() {
  stopCamera();
  resetPhotoButtons();
  if (imageData || existingPhotoUrl) setPhotoReadyState();
};
window.retakePicture = retakePicture;
window.newEntry = newEntry;
window.goHome = goHome;
window.editEntry = editEntry;
window.saveIDAsImage = saveIDAsImage;
window.togglePassword = togglePassword;
window.enforceTenDigits = enforceTenDigits;
window.enforceDigits = enforceDigits;
window.searchExistingEnrollment = searchExistingEnrollment;
window.showDashboardMenu = showDashboardMenu;

function capitalizeEnrollmentField(field) {
  if (!field || !field.matches('#formFields input[type="text"], #formFields input:not([type]), #formFields textarea, #formFields select')) return;
  const value = field.value;
  const uppercase = value.toUpperCase();
  if (value === uppercase) return;
  const start = field.selectionStart;
  const end = field.selectionEnd;
  const direction = field.selectionDirection;
  field.value = uppercase;
  if (typeof start === "number" && typeof end === "number" && typeof field.setSelectionRange === "function") {
    field.setSelectionRange(value.slice(0, start).toUpperCase().length, value.slice(0, end).toUpperCase().length, direction);
  }
}
document.addEventListener('input', event => {
  if (!event.isComposing) capitalizeEnrollmentField(event.target);
});
document.addEventListener('compositionend', event => capitalizeEnrollmentField(event.target));
document.addEventListener('change', event => capitalizeEnrollmentField(event.target));

const photoCanvas = safeGet('canvas');
const photoStage = photoCanvas?.parentElement;
function syncPhotoPreview() {
  syncPhotoWorkspace();
  if (!photoStage || !photoCanvas) return;
  const ready = !photoCanvas.classList.contains('hidden') && !photoStage.classList.contains('camera-mode') && !photoStage.classList.contains('crop-mode');
  if (photoStage.classList.contains('photo-ready') !== ready) photoStage.classList.toggle('photo-ready', ready);
}
if (photoStage && photoCanvas) {
  const photoObserver = new MutationObserver(syncPhotoPreview);
  photoObserver.observe(photoStage, { attributes: true, attributeFilter: ['class'] });
  photoObserver.observe(photoCanvas, { attributes: true, attributeFilter: ['class'] });
  syncPhotoPreview();
}

function syncPhotoWorkspace() {
  const workspace = safeGet('photoWorkspace');
  const stage = safeGet('canvas')?.parentElement;
  if (!workspace || !stage) return;
  const editing = stage.classList.contains('crop-mode');
  const camera = stage.classList.contains('camera-mode');
  const active = editing || camera;
  if (active && photoScrollPosition === null) {
    photoScrollPosition = window.scrollY;
    document.body.style.setProperty('--photo-scroll-top', `${-photoScrollPosition}px`);
    document.activeElement?.blur();
  }
  workspace.classList.toggle('is-active', active);
  workspace.classList.toggle('is-adjusting', editing);
  document.body.classList.toggle('photo-workspace-open', active);
  document.documentElement.classList.toggle('photo-workspace-open', active);
  if (active) syncPhotoViewport();
  if (!active && photoScrollPosition !== null) {
    const position = photoScrollPosition;
    photoScrollPosition = null;
    document.body.style.removeProperty('--photo-scroll-top');
    const behavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, position);
    document.documentElement.style.scrollBehavior = behavior;
  }
  if (active) {
    workspace.setAttribute('role', 'dialog');
    workspace.setAttribute('aria-modal', 'true');
    workspace.setAttribute('aria-label', editing ? 'Adjust photo' : 'Capture photo');
  } else {
    workspace.removeAttribute('role');
    workspace.removeAttribute('aria-modal');
    workspace.removeAttribute('aria-label');
  }
  for (const element of [safeGet('formFields'), document.querySelector('#dataForm > .btn-group'), document.querySelector('.android-header'), document.querySelector('.branding-footer')]) {
    if (element) element.inert = active;
  }
}

function syncPhotoViewport() {
  safeGet('photoWorkspace')?.style.setProperty('--photo-viewport-height', `${window.visualViewport?.height || window.innerHeight}px`);
  renderCropFromControls();
}

const cropOverview = safeGet('cropOverview');
const cropPointers = new Map();
function clearCropPointers() {
  const ids = [...cropPointers.keys()];
  cropPointers.clear();
  for (const id of ids) {
    try { if (cropOverview?.hasPointerCapture(id)) cropOverview.releasePointerCapture(id); } catch (error) {}
  }
}
function cropIsActive() {
  return !!cropSourceImage && !!cropTransform && !!safeGet('canvas')?.parentElement?.classList.contains('crop-mode');
}
if (cropOverview) {
  cropOverview.addEventListener('pointerdown', event => {
    if (!cropIsActive() || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    cropPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try { cropOverview.setPointerCapture(event.pointerId); } catch (error) {}
  }, { passive: false });
  cropOverview.addEventListener('pointermove', event => {
    if (!cropIsActive() || !cropPointers.has(event.pointerId)) return;
    event.preventDefault();
    const bounds = cropOverview.getBoundingClientRect();
    const previous = getCropGesture([...cropPointers.values()], bounds);
    cropPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const current = getCropGesture([...cropPointers.values()], bounds);
    if (previous && current) cropTransform = applyCropGesture(cropTransform, previous, current);
    renderCropFromControls();
  }, { passive: false });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) cropOverview.addEventListener(type, event => {
    cropPointers.delete(event.pointerId);
  });
  cropOverview.addEventListener('wheel', event => {
    if (!cropIsActive()) return;
    event.preventDefault();
    const bounds = cropOverview.getBoundingClientRect();
    const point = getCropGesture([{ x: event.clientX, y: event.clientY }], bounds);
    if (!point) return;
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? bounds.height : 1);
    cropTransform = applyCropGesture(cropTransform, { ...point, distance: 1 }, { ...point, distance: Math.exp(Math.max(-1, Math.min(1, -delta * .002))) });
    renderCropFromControls();
  }, { passive: false });
  cropOverview.addEventListener('dragstart', event => event.preventDefault());
  cropOverview.addEventListener('touchmove', event => {
    if (cropIsActive()) event.preventDefault();
  }, { passive: false });
  new ResizeObserver(() => {
    renderCropFromControls();
  }).observe(cropOverview);
  window.addEventListener('resize', syncPhotoViewport);
  window.visualViewport?.addEventListener('resize', syncPhotoViewport);
  window.addEventListener('blur', clearCropPointers);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearCropPointers();
  });
}

for (const id of ['searchDate', 'searchUnique']) {
  const field = safeGet(id);
  if (field) {
    for (const event of ['input', 'change']) field.addEventListener(event, () => safeGet('searchResults')?.replaceChildren());
  }
}
