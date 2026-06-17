const ICONOS = {
  success: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
  warning: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
  error: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function ocultarResultado() {
  const resultArea = document.getElementById('resultArea');
  resultArea.classList.add('hidden');
  resultArea.innerHTML = '';
}

function ocultarProgreso() {
  document.getElementById('progressArea').classList.add('hidden');
  document.getElementById('progressFill').style.width = '0%';
}

function mostrarAlerta(tipo, mensaje) {
  const resultArea = document.getElementById('resultArea');
  resultArea.classList.remove('hidden');
  resultArea.innerHTML = `<div class="alert alert-${tipo}">${ICONOS[tipo]}<span>${mensaje}</span></div>`;
}

function setProgreso(pct, etiqueta) {
  document.getElementById('progressArea').classList.remove('hidden');
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressLabel').textContent = etiqueta;
}

function descargarBlob(bytes, nombre, mime) {
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function descargarZip(archivos, nombreZip) {
  const zip = new JSZip();
  for (const archivo of archivos) {
    zip.file(archivo.nombre, archivo.bytes);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreZip;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Wiring de una zona de arrastrar/soltar de un solo archivo.
 * Requiere en el DOM: #dropzone, #fileInput, #fileInfo, #fileName, #fileSize, #removeFile.
 */
function initDropzoneUnArchivo({ extensionesAceptadas, mensajeTipoInvalido, onArchivo }) {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const fileInfo = document.getElementById('fileInfo');
  const fileName = document.getElementById('fileName');
  const fileSize = document.getElementById('fileSize');
  const removeFileBtn = document.getElementById('removeFile');

  function esExtensionValida(file) {
    const nombre = file.name.toLowerCase();
    return extensionesAceptadas.some((ext) => nombre.endsWith(ext));
  }

  function seleccionarArchivo(file) {
    ocultarResultado();
    ocultarProgreso();
    if (!file) return;

    if (!esExtensionValida(file)) {
      mostrarAlerta('error', mensajeTipoInvalido);
      return;
    }

    fileName.textContent = file.name;
    fileSize.textContent = formatBytes(file.size);
    dropzone.classList.add('hidden');
    fileInfo.classList.remove('hidden');
    onArchivo(file);
  }

  function limpiarSeleccion() {
    fileInput.value = '';
    fileInfo.classList.add('hidden');
    dropzone.classList.remove('hidden');
    ocultarResultado();
    ocultarProgreso();
    onArchivo(null);
  }

  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => seleccionarArchivo(e.target.files[0]));

  ['dragenter', 'dragover'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('drag-active');
    });
  });

  ['dragleave', 'drop'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('drag-active');
    });
  });

  dropzone.addEventListener('drop', (e) => seleccionarArchivo(e.dataTransfer.files[0]));

  removeFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    limpiarSeleccion();
  });
}

/**
 * Wiring de una zona de arrastrar/soltar de múltiples archivos con lista reordenable.
 * Requiere en el DOM: #dropzone, #fileInput, #fileList.
 */
function initDropzoneMultiArchivo({ extensionesAceptadas, mensajeTipoInvalido, onCambio }) {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const fileList = document.getElementById('fileList');

  let archivos = [];

  function esExtensionValida(file) {
    const nombre = file.name.toLowerCase();
    return extensionesAceptadas.some((ext) => nombre.endsWith(ext));
  }

  function renderizar() {
    fileList.innerHTML = '';
    archivos.forEach((file, i) => {
      const row = document.createElement('div');
      row.className = 'file-row';
      row.innerHTML = `
        <div class="file-order">${i + 1}</div>
        <div class="file-details">
          <p class="file-name">${file.name}</p>
          <p class="file-size">${formatBytes(file.size)}</p>
        </div>
        <div class="file-actions">
          <button type="button" class="btn-icon" data-accion="subir" data-i="${i}" title="Subir"${i === 0 ? ' disabled' : ''}>&uarr;</button>
          <button type="button" class="btn-icon" data-accion="bajar" data-i="${i}" title="Bajar"${i === archivos.length - 1 ? ' disabled' : ''}>&darr;</button>
          <button type="button" class="btn-icon" data-accion="quitar" data-i="${i}" title="Quitar">&#10005;</button>
        </div>
      `;
      fileList.appendChild(row);
    });
    onCambio(archivos);
  }

  fileList.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-accion]');
    if (!btn) return;
    const i = Number(btn.dataset.i);
    const accion = btn.dataset.accion;
    if (accion === 'quitar') {
      archivos.splice(i, 1);
    } else if (accion === 'subir' && i > 0) {
      [archivos[i - 1], archivos[i]] = [archivos[i], archivos[i - 1]];
    } else if (accion === 'bajar' && i < archivos.length - 1) {
      [archivos[i + 1], archivos[i]] = [archivos[i], archivos[i + 1]];
    }
    renderizar();
  });

  function agregarArchivos(lista) {
    ocultarResultado();
    ocultarProgreso();
    let huboInvalido = false;
    for (const file of lista) {
      if (!esExtensionValida(file)) {
        huboInvalido = true;
        continue;
      }
      archivos.push(file);
    }
    if (huboInvalido) mostrarAlerta('error', mensajeTipoInvalido);
    renderizar();
  }

  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    agregarArchivos(Array.from(e.target.files));
    fileInput.value = '';
  });

  ['dragenter', 'dragover'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('drag-active');
    });
  });

  ['dragleave', 'drop'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('drag-active');
    });
  });

  dropzone.addEventListener('drop', (e) => agregarArchivos(Array.from(e.dataTransfer.files)));
}
