// -------------------- Imports -------------------- //
import {
  fetchDataForSchool,
  resetFilters,
  getSelectedData,
  dataTypeSelect,
  schoolFilter,
  resetBtn
} from './firebase.js';

let templateData = null;
let renderedData = [];
let cropper = null; // single cropper instance

// -------------------- Page Toggle -------------------- //
function togglePages(hideId, showId) {
  document.getElementById(hideId)?.classList.remove("active");
  document.getElementById(showId)?.classList.add("active");
}

// -------------------- DOM Ready -------------------- //
document.addEventListener("DOMContentLoaded", () => {
  // Filters
  dataTypeSelect?.addEventListener("change", fetchDataForSchool);
  schoolFilter?.addEventListener("change", fetchDataForSchool);
  resetBtn?.addEventListener("click", resetFilters);

  // Buttons
  const generateBtn    = document.getElementById("generateBtn");
  const templateUpload = document.getElementById("templateUpload");
  const renderBtn      = document.getElementById("renderBtn");
  const printBtn       = document.getElementById("printBtn");
  const goToDataBtn    = document.getElementById("goToDataBtn");

  generateBtn?.addEventListener("click", handleGenerateClick);
  goToDataBtn?.addEventListener("click", handleBackToData);
  templateUpload?.addEventListener("change", handleTemplateUpload);
  renderBtn?.addEventListener("click", handleRenderClick);
  printBtn?.addEventListener("click", handleA4Print);
});

// -------------------- Generate Button -------------------- //
function handleGenerateClick() {
  const selected = getSelectedData();
  if (!selected?.length) return alert("⚠️ Please select at least one record.");

  const type = dataTypeSelect?.value?.toLowerCase() || "unknown";
  const selectedWithType = selected.map(r => ({
    ...r,
    type,
    __key: r.__key || crypto.randomUUID()
  }));

  localStorage.setItem("selectedRecords", JSON.stringify(selectedWithType));
  alert(`✅ ${selectedWithType.length} record(s) saved.`);
  togglePages("page-1", "page-2");
}

// -------------------- Back to Data Page -------------------- //
function handleBackToData() {
  const wrapper = document.getElementById("slidesWrapper");
  if (wrapper) wrapper.innerHTML = "";

  templateData = null;
  renderedData = [];
  document.getElementById("templateUpload") && (document.getElementById("templateUpload").value = "");
  document.querySelectorAll(".uploaded-template, .rendered-card").forEach(el => el.remove());

  togglePages("page-2", "page-1");
}

// -------------------- Template Upload -------------------- //
function handleTemplateUpload(event) {
  const file = event.target.files[0];
  if (!file) return alert("No JSON file selected.");

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      templateData = JSON.parse(e.target.result);
      alert("Template uploaded successfully. Click Render to continue.");
    } catch (err) {
      alert("Invalid JSON format.");
      console.error("Template JSON Parse Error:", err);
      templateData = null;
    }
  };
  reader.readAsText(file);
}

// -------------------- Rendering -------------------- //
function handleRenderClick() {
  if (!templateData?.front) return alert("Please upload a valid template JSON with a 'front' page.");
  const selectedData = JSON.parse(localStorage.getItem("selectedRecords") || "[]");
  if (!selectedData.length) return alert("No selected record found. Please select records on Page-1.");

  const wrapper = document.getElementById("slidesWrapper");
  if (!wrapper) return alert("Target container not found (slidesWrapper).");

  wrapper.innerHTML = "";
  renderedData = selectedData;

  const slide = document.createElement("div");
  slide.className = "slide";

  selectedData.forEach(record => {
    const front = createCardElement(templateData.front, record);
    slide.appendChild(front);
    if (templateData.back) {
      const back = createCardElement(templateData.back, record);
      slide.appendChild(back);
    }
  });

  wrapper.appendChild(slide);
  alert(`${selectedData.length} card(s) rendered successfully.`);
}

// -------------------- Create Card -------------------- //
function createCardElement(template, record = {}) {
  const container = document.createElement("div");
  container.className = "editor";

  if (!template?.items?.length) {
    container.innerText = "Invalid template data.";
    Object.assign(container.style, { color: "red", padding: "20px" });
    return container;
  }

  renderCard(template, container, record);
  return container;
}

// -------------------- Render Card -------------------- //
function renderCard(template, container, record = {}) {
  container.innerHTML = "";
  container.templateData = template;

  const cardHeight = template.pageStyle?.height || "220px";
  const cardWidth = template.pageStyle?.width || "350px";

  Object.assign(container.style, {
    position: "relative",
    width: cardWidth,
    height: cardHeight,
    border: "1px solid #ccc",
    margin: "10px",
    background: template.pageStyle?.background || "",
    backgroundImage: template.pageStyle?.backgroundImage || "",
    backgroundSize: template.pageStyle?.backgroundSize || "cover",
    backgroundPosition: template.pageStyle?.backgroundPosition || "center",
    boxSizing: "border-box",
    borderRadius: template.pageStyle?.borderRadius || "0",
    boxShadow: template.pageStyle?.boxShadow || "none",
    fontFamily: template.pageStyle?.fontFamily || "sans-serif"
  });

  template.items.forEach(item => {
    const el = document.createElement("div");
    const key = item.bookmark?.toLowerCase()?.trim();

    const savedLeft = key && record[key + "_left"] ? record[key + "_left"] : item.left || "0px";
    const savedTop = key && record[key + "_top"] ? record[key + "_top"] : item.top || "0px";

    // Apply rotation and transform properties
    Object.assign(el.style, {
      position: "absolute",
      left: savedLeft,
      top: savedTop,
      width: item.width || "auto",
      height: item.height || "auto",
      fontSize: item.fontSize || "14px",
      color: item.color || "#000",
      fontWeight: item.fontWeight || "normal",
      lineHeight: item.lineHeight || "normal",
      border: item.borderWidth ? `${item.borderWidth}px ${item.borderStyle || "solid"} ${item.borderColor || "#000"}` : "none",
      borderRadius: item.borderRadius || "0",
      boxShadow: item.boxShadow || "none",
      boxSizing: "border-box",
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      justifyContent: item.textAlign === "center" ? "center" : item.textAlign === "right" ? "flex-end" : "flex-start",
      textAlign: item.textAlign || "left",
      padding: "2px",
      cursor: "pointer",
      userSelect: "none",
      transform: item.transform || "none", // Added transform property
      transformOrigin: item.transformOrigin || "center" // Added transformOrigin property
    });

    let rawText = item.text || "";
    rawText = rawText.replace(/{{(.*?)}}/g, (_, k) => {
      const cleanKey = k.trim().toLowerCase();
      return record[cleanKey] !== undefined ? record[cleanKey] : "";
    });

    const value = key && record[key] !== undefined ? record[key] : rawText;

    if (item.type === "image") {
      const img = document.createElement("img");
      img.src = value.startsWith("http") || value.startsWith("data:image") ? value : "";
      
      // Use 100% width and height to fit parent div
      Object.assign(img.style, {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        borderRadius: item.borderRadius || "0",
        border: item.border || "none"
      });
      img.addEventListener("click", () => openCropModal(img));
      el.appendChild(img);
    } else {
      el.innerText = value;
    }

    makeElementDraggable(el, record, key);
    container.appendChild(el);
  });

  if (templateData?.front && templateData?.back) appendQRCode(container, record);
}

// -------------------- Draggable -------------------- //
function makeElementDraggable(el, record, key) {
  let isDragging = false, startX, startY, origX, origY;

  el.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    origX = parseInt(el.style.left) || 0;
    origY = parseInt(el.style.top) || 0;
    el.style.cursor = "grabbing";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    el.style.left = origX + (e.clientX - startX) + "px";
    el.style.top = origY + (e.clientY - startY) + "px";
  });

  document.addEventListener("mouseup", () => {
    if (!isDragging) return;
    isDragging = false;
    el.style.cursor = "pointer";
    if (key) {
      record[key + "_left"] = el.style.left;
      record[key + "_top"] = el.style.top;
      const selectedData = JSON.parse(localStorage.getItem("selectedRecords") || "[]");
      const updatedData = selectedData.map(r => r.__key === record.__key ? record : r);
      localStorage.setItem("selectedRecords", JSON.stringify(updatedData));
    }
  });
}

// -------------------- Cropper -------------------- //
function openCropModal(imgElement) {
  const cropContainer = document.getElementById("cropContainer");
  const cropImage = document.getElementById("cropImage");
  if (!cropContainer || !cropImage) return;

  cropContainer.style.display = "flex";
  cropImage.src = imgElement.src;

  cropper?.destroy();
  cropper = null;

  cropImage.onload = () => {
    cropper = new Cropper(cropImage, {
      aspectRatio: imgElement.naturalWidth / imgElement.naturalHeight,
      viewMode: 1,
      autoCropArea: 1,
      responsive: true,
      background: false
    });
  };

  const cropConfirm = document.getElementById("cropConfirm").cloneNode(true);
  const cropCancel = document.getElementById("cropCancel").cloneNode(true);
  document.getElementById("cropConfirm").replaceWith(cropConfirm);
  document.getElementById("cropCancel").replaceWith(cropCancel);

  cropConfirm.addEventListener("click", () => {
    const canvas = cropper?.getCroppedCanvas();
    if (canvas) {
      imgElement.src = canvas.toDataURL();
      imgElement.style.objectFit = "cover";
    }
    cropContainer.style.display = "none";
    cropper?.destroy();
    cropper = null;
  });

  cropCancel.addEventListener("click", () => {
    cropContainer.style.display = "none";
    cropper?.destroy();
    cropper = null;
  });
}

// -------------------- QR Code -------------------- //
function capitalize(str) {
  return str.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function appendQRCode(container, record) {
  if (!record || typeof record !== 'object') return;

  const qrDiv = document.createElement("div");
  Object.assign(qrDiv.style, {
    position: "absolute",
    right: "10px",
    bottom: "10px",
    width: "50px",
    height: "50px"
  });
  container.appendChild(qrDiv);

  let fieldsToInclude = [];
  if (record.type === "student") fieldsToInclude = ["student_name", "student_adm"];
  else if (record.type === "staff") fieldsToInclude = ["staff_empid", "staff_name"];
  else {
    Object.assign(qrDiv.style, { fontSize: "10px", color: "gray", textAlign: "center", lineHeight: "50px" });
    qrDiv.innerText = "QR: Unknown Type";
    return;
  }

  const readableText = fieldsToInclude.map(key => `${capitalize(key)}: ${record[key] ?? "N/A"}`).join("\n");

  try {
    new QRCode(qrDiv, { text: readableText, width: 50, height: 50, colorDark: "#000000", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.H });
    qrDiv.title = readableText;
  } catch (err) {
    console.error("QR Code Error:", err);
    qrDiv.innerText = "QR Error";
  }
}

// -------------------- Print -------------------- //
function handleA4Print() {
  const renderedCards = document.querySelectorAll("#slidesWrapper .editor");
  if (!renderedCards.length) return alert("No rendered cards to print.");

  const printWindow = window.open("", "_blank");
  if (!printWindow) return alert("Pop-up blocked. Please allow pop-ups for this site.");

  const style = `<style>
    @page { size: 297mm 210mm; margin: 0; }
    html, body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: Arial, sans-serif; }
    @media print { body { transform: scale(1); transform-origin: top left; } }
    .page { width: 297mm; height: 210mm; display: grid; grid-template-columns: repeat(5, 5.5cm); grid-template-rows: auto auto; column-gap: 5mm; row-gap: 5mm; padding: 7mm 0 7mm 7mm; box-sizing: border-box; page-break-after: always; }
    .card { width: 5.5cm; height: 8.5cm; overflow: hidden; position: relative; background: #fff; page-break-inside: avoid; }
    .editor { width: 100%; height: 100%; box-shadow: none !important; border: none !important; margin: 0 !important; }
    img { max-width: 100%; max-height: 100%; display: block; }
  </style>`;

  let allPagesHTML = '';
  for (let i = 0; i < renderedCards.length; i += 10) {
    let pageCardsHTML = '';
    for (let j = i; j < i + 10 && j < renderedCards.length; j++) {
      const clone = renderedCards[j].cloneNode(true);
      clone.classList.add("card");
      pageCardsHTML += clone.outerHTML;
    }
    allPagesHTML += `<div class="page">${pageCardsHTML}</div>`;
  }

  const html = `<html><head><title>Print ID Cards</title>${style}</head><body onload="setTimeout(()=>{window.print();},100);">${allPagesHTML}</body></html>`;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
