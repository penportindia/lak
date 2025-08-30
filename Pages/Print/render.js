import {
  fetchData,
  applyFilters,
  resetFilters,
  getSelectedData,
  dataTypeSelect,
  schoolFilter,
  resetBtn
} from './firebase.js';

let templateData = null;
let renderedData = []; // store rendered data for reset

document.addEventListener("DOMContentLoaded", () => {
  // Event Listeners for filters
  dataTypeSelect.addEventListener("change", () => {
    fetchData(dataTypeSelect.value);
  });

  schoolFilter.addEventListener("change", applyFilters);
  resetBtn.addEventListener("click", resetFilters);

  // Buttons
  const generateBtn = document.getElementById("generateBtn");
  const templateUpload = document.getElementById("templateUpload");
  const renderBtn = document.getElementById("renderBtn");
  const printBtn = document.getElementById("printBtn");
  const goToDataBtn = document.getElementById("goToDataBtn");

  // Generate button click: save selected records and switch to page 2
  if (generateBtn) {
    generateBtn.addEventListener("click", () => {
      const selected = getSelectedData();
      if (!selected.length) {
        alert("Please select at least one record.");
        return;
      }

      const type = dataTypeSelect.value?.toLowerCase();
      const selectedWithType = selected.map(r => ({ ...r, type }));

      localStorage.setItem("selectedRecords", JSON.stringify(selectedWithType));
      alert(`${selectedWithType.length} record(s) saved.`);

      togglePages("page-1", "page-2");
    });
  }

  // Go to Data Button: reset page 2 content but keep selected rows
  if (goToDataBtn) {
    goToDataBtn.addEventListener("click", () => {
      // Clear rendered cards
      const wrapper = document.getElementById("slidesWrapper");
      if (wrapper) wrapper.innerHTML = "";

      // Clear preview container if any
      const previewContainer = document.getElementById("previewContainer");
      if (previewContainer) previewContainer.innerHTML = "";

      // Reset uploaded template input
      if (templateUpload) templateUpload.value = "";
      templateData = null;

      // Clear renderedData array
      renderedData = [];

      // Remove any dynamically added images/cards by class
      document.querySelectorAll(".uploaded-template, .rendered-card").forEach(el => el.remove());

      // Switch back to page 1
      togglePages("page-2", "page-1");
    });
  }

  // Template upload handler
  if (templateUpload) {
    templateUpload.addEventListener("change", handleTemplateUpload);
  }

  // Render and Print buttons
  if (renderBtn) {
    renderBtn.addEventListener("click", handleRenderClick);
  }

  if (printBtn) {
    printBtn.addEventListener("click", handleA4Print);
  }

  // Initial data fetch on page load
  fetchData(dataTypeSelect.value);
});

// Utility function to toggle between pages by controlling display styles
function togglePages(hideId, showId) {
  const hideElem = document.getElementById(hideId);
  const showElem = document.getElementById(showId);

  if (hideElem) hideElem.style.display = "none";
  if (showElem) showElem.style.display = "flex";
}

// Template upload file reading and parsing
function handleTemplateUpload(event) {
  const file = event.target.files[0];
  if (!file) {
    alert("No JSON file selected.");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      templateData = JSON.parse(e.target.result);
      alert("Template uploaded successfully. Click the Render button to continue.");
    } catch (err) {
      alert("Invalid JSON format.");
      console.error("Template JSON Parse Error:", err);
    }
  };
  reader.readAsText(file);
}

// ------------------------- Rendering Cards -------------------------------

function handleRenderClick() {
  if (!templateData?.front) {
    return alert("Please upload a valid template JSON with at least a 'front' page.");
  }

  const selectedData = JSON.parse(localStorage.getItem("selectedRecords")) || [];
  if (!selectedData.length) {
    return alert("No selected record found. Please select records on Page-1.");
  }

  const wrapper = document.getElementById("slidesWrapper");
  if (!wrapper) return alert("Target container not found (slidesWrapper).");

  // Reset wrapper & store rendered data
  wrapper.innerHTML = "";
  renderedData = selectedData;

  const slide = document.createElement("div");
  slide.className = "slide";

  selectedData.forEach((record) => {
    // Always render front
    const front = createCardElement(templateData.front, record);
    slide.appendChild(front);

    // Render back if exists
    if (templateData.back) {
      const back = createCardElement(templateData.back, record);
      slide.appendChild(back);
    }
  });

  wrapper.appendChild(slide);
  alert(`${selectedData.length} card(s) rendered successfully.`);
}

// ------------------------- Create Card Element -------------------------------

function createCardElement(template, record = {}) {
  const container = document.createElement("div");
  container.className = "editor";

  if (!template?.items?.length) {
    container.innerText = "Invalid template data.";
    container.style.color = "red";
    container.style.padding = "20px";
    return container;
  }

  renderCard(template, container, record);
  return container;
}

// ------------------------- Render Card with Draggable Items -------------------------------

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
    boxSizing: "border-box"
  });

  template.items.forEach(item => {
    const el = document.createElement("div");
    const key = item.bookmark?.toLowerCase()?.trim();

    const savedLeft = key && record[key + "_left"] ? record[key + "_left"] : item.left || "0px";
    const savedTop = key && record[key + "_top"] ? record[key + "_top"] : item.top || "0px";

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
      userSelect: "none"
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
      img.style.width = item.width || "100px";
      img.style.height = item.height || "100px";
      img.style.objectFit = "cover";
      img.style.borderRadius = item.borderRadius || "0";
      img.style.border = item.border || "none";

      img.addEventListener("click", () => openCropModal(img));

      el.appendChild(img);
    } else {
      el.innerText = value;
    }

    makeElementDraggable(el, record, key);

    container.appendChild(el);
  });

  if (templateData?.front && templateData?.back) {
    appendQRCode(container, record);
  }
}

// ------------------------- Draggable Helper -------------------------------
function makeElementDraggable(el, record, key) {
  let isDragging = false;
  let startX, startY, origX, origY;

  el.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    origX = parseInt(el.style.left || 0);
    origY = parseInt(el.style.top || 0);
    el.style.cursor = "grabbing";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    el.style.left = origX + dx + "px";
    el.style.top = origY + dy + "px";
  });

  document.addEventListener("mouseup", () => {
    if (!isDragging) return;
    isDragging = false;
    el.style.cursor = "pointer";
    if (key) {
      record[key + "_left"] = el.style.left;
      record[key + "_top"] = el.style.top;
    }

    const selectedData = JSON.parse(localStorage.getItem("selectedRecords") || "[]");
    const updatedData = selectedData.map(r => r.id === record.id ? record : r);
    localStorage.setItem("selectedRecords", JSON.stringify(updatedData));
  });
}

// ------------------------- Cropper Function  -------------------------------
let cropper;

function openCropModal(imgElement) {
  const cropContainer = document.getElementById("cropContainer");
  const cropImage = document.getElementById("cropImage");

  // Modal दिखाएं
  cropContainer.style.display = "flex";
  cropImage.src = imgElement.src;

  // पुराना cropper destroy
  if (cropper) { cropper.destroy(); cropper = null; }

  // Cropper initialize
  cropImage.onload = () => {
    cropper = new Cropper(cropImage, { 
      aspectRatio: NaN, 
      viewMode: 1, 
      autoCropArea: 1, 
      responsive: true 
    });
  };

  // Buttons को reset करें (class को preserve करते हुए)
  const cropConfirmOld = document.getElementById("cropConfirm");
  const cropCancelOld = document.getElementById("cropCancel");

  const cropConfirm = cropConfirmOld.cloneNode(true);
  cropConfirm.className = cropConfirmOld.className;
  cropConfirmOld.replaceWith(cropConfirm);

  const cropCancel = cropCancelOld.cloneNode(true);
  cropCancel.className = cropCancelOld.className;
  cropCancelOld.replaceWith(cropCancel);

  // Confirm Crop Event
  cropConfirm.addEventListener("click", () => {
    const croppedCanvas = cropper?.getCroppedCanvas({
      width: cropper.getData().width + 2,  // extra width for border
      height: cropper.getData().height
    });

    if (croppedCanvas) {
      imgElement.src = croppedCanvas.toDataURL();

      // Image load होने के बाद original size maintain करें
      imgElement.onload = () => {
        imgElement.style.width = "100%";
        imgElement.style.height = "auto";
      };
    }

    cropContainer.style.display = "none";
    cropper?.destroy();
    cropper = null;
  });

  // Cancel Event
  cropCancel.addEventListener("click", () => {
    cropContainer.style.display = "none";
    cropper?.destroy();
    cropper = null;
  });
}


// ------------------------- QR Code Section -------------------------------
function capitalize(str) {
  return str.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function appendQRCode(container, record) {
  if (!record || typeof record !== 'object') return;

  const qrDiv = document.createElement("div");
  qrDiv.style.position = "absolute";
  qrDiv.style.right = "10px";
  qrDiv.style.bottom = "10px";
  qrDiv.style.width = "50px";
  qrDiv.style.height = "50px";

  container.appendChild(qrDiv);

  let fieldsToInclude = [];
  if (record.type === "student") fieldsToInclude = ["student_name", "student_adm"];
  else if (record.type === "staff") fieldsToInclude = ["staff_empid", "staff_name"];
  else {
    qrDiv.innerText = "QR: Unknown Type";
    qrDiv.style.fontSize = "10px";
    qrDiv.style.color = "gray";
    qrDiv.style.textAlign = "center";
    qrDiv.style.lineHeight = "50px";
    return;
  }

  const readableText = fieldsToInclude.map(key => {
    const label = capitalize(key);
    const value = record[key] ?? "N/A";
    return `${label}: ${value}`;
  }).join('\n');

  try {
    new QRCode(qrDiv, { text: readableText, width: 50, height: 50, colorDark: "#000000", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.H });
    qrDiv.title = readableText;
  } catch (err) {
    console.error("QR Code Error:", err);
    qrDiv.innerText = "QR Error";
  }
}

// ------------------------- Print Function -------------------------------
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

