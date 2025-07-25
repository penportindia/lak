import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAR3KIgxzn12zoWwF3rMs7b0FfP-qe3mO4",
  authDomain: "schools-cdce8.firebaseapp.com",
  databaseURL: "https://schools-cdce8-default-rtdb.firebaseio.com",
  projectId: "schools-cdce8",
  storageBucket: "schools-cdce8.firebasestorage.app",
  messagingSenderId: "772712220138",
  appId: "1:772712220138:web:381c173dccf1a6513fde93"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// DOM elements
const studentCountEl = document.getElementById('studentCount');
const staffCountEl = document.getElementById('staffCount');
const totalEnrollmentEl = document.getElementById('totalEnrollment');
const uniqueSchoolsEl = document.getElementById('uniqueSchools');
const schoolSelect = document.getElementById('schoolSelect');
const selectedSchoolEnrollmentEl = document.getElementById('selectedSchoolEnrollment');

// Main function to load and display data
async function loadDashboardData() {
  const dbRef = ref(db);
  const snapshot = await get(dbRef);

  if (snapshot.exists()) {
    const data = snapshot.val();
    const students = data.student || {};
    const staff = data.staff || {};

    let studentCount = 0;
    let staffCount = 0;
    let schoolSet = new Set();
    let schoolWiseEnrollment = {};

    // Process student data
    for (const key in students) {
      const student = students[key];
      studentCount++;
      if (student.schoolName) {
        const name = student.schoolName.trim();
        schoolSet.add(name);
        schoolWiseEnrollment[name] = (schoolWiseEnrollment[name] || 0) + 1;
      }
    }

    // Process staff data
    for (const key in staff) {
      const staffMember = staff[key];
      staffCount++;
      if (staffMember.schoolName) {
        const name = staffMember.schoolName.trim();
        schoolSet.add(name);
        schoolWiseEnrollment[name] = (schoolWiseEnrollment[name] || 0) + 1;
      }
    }

    // Display counts
    studentCountEl.textContent = studentCount;
    staffCountEl.textContent = staffCount;
    totalEnrollmentEl.textContent = studentCount + staffCount;
    uniqueSchoolsEl.textContent = schoolSet.size;

    // Populate school dropdown
    schoolSet.forEach(school => {
      const option = document.createElement('option');
      option.value = school;
      option.textContent = school;
      schoolSelect.appendChild(option);
    });

    // Handle dropdown change
    schoolSelect.addEventListener('change', () => {
      const selected = schoolSelect.value;
      if (selected && schoolWiseEnrollment[selected]) {
        selectedSchoolEnrollmentEl.textContent = schoolWiseEnrollment[selected];
      } else {
        selectedSchoolEnrollmentEl.textContent = 0;
      }
    });
  } else {
    alert("No data found in Firebase.");
  }
}

// Load data on page load
loadDashboardData();
