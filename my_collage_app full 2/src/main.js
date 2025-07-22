// src/main.js
// Punto de entrada principal de la aplicación.
// Orquesta la interacción entre los diferentes módulos (Camera, Collage, Export, Metadata, Session, Auth, Watermark).

import * as Camera from './camera.js';
import * as Collage from './collage.js';
import * as Export from './export.js';
import * as Metadata from './metadata.js';
import * as Session from './session.js';
import * as Auth from './auth.js';
import * as Watermark from './watermark.js';

// Referencias a elementos de la UI
const loginScreen = document.getElementById('loginScreen');
const passwordInput = document.getElementById('passwordInput');
const loginButton = document.getElementById('loginButton');
const loginMessage = document.getElementById('loginMessage');
const appContent = document.getElementById('appContent');

const activateCameraButton = document.getElementById('activateCameraButton');
const takePhotoButton = document.getElementById('takePhotoButton');
const stopCameraButton = document.getElementById('stopCameraButton');
const clearPhotosButton = document.getElementById('clearPhotosButton');
const saveCollageButton = document.getElementById('saveCollageButton');
const closeSessionButton = document.getElementById('closeSessionButton');
const cameraSelect = document.getElementById('cameraSelect');
const cameraVideo = document.getElementById('camera-video');
const cameraSelectContainer = document.querySelector('.camera-select-container');
const includeMetadataCheckbox = document.getElementById('includeMetadataCheckbox');
const metadataControls = document.querySelector('.metadata-controls');

// Elementos de la nueva sección de Entrega
const deliveryIdInput = document.getElementById('deliveryIdInput');
const deliveryIdLabel = document.getElementById('deliveryIdLabel');

// Elementos de Marca de Agua
const watermarkFileInput = document.getElementById('watermarkFileInput');
const clearWatermarkButton = document.getElementById('clearWatermarkButton');
const watermarkMessage = document.getElementById('watermarkMessage');

function updateButtonStates() {
    const isCameraOn = Camera.isCameraActive();
    const hasPhotosInCurrentDelivery = Collage.getPhotoCount() > 0;
    const hasSavedCollagesInSession = Session.getSessionCollageCount() > 0;

    // Actualizar el placeholder del input de ID de Entrega y el label
    if (deliveryIdInput && deliveryIdLabel) {
        deliveryIdInput.placeholder = `Ej: ${Session.getNextStopNumber() > 0 ? `Parada ${Session.getNextStopNumber()}` : 'Parada 1'} / Nombre Cliente`;
        deliveryIdLabel.textContent = `ID de Entrega (Opcional - por defecto: Parada ${Session.getNextStopNumber()}):`;
    }

    // Controles de cámara
    if (activateCameraButton) activateCameraButton.classList.add('hidden'); // Siempre oculto, la cámara se activa automáticamente
    if (takePhotoButton) takePhotoButton.classList.toggle('hidden', !isCameraOn);
    if (stopCameraButton) stopCameraButton.classList.toggle('hidden', !isCameraOn);
    if (cameraVideo) cameraVideo.classList.toggle('hidden', !isCameraOn);

    // Muestra/oculta el selector de cámara solo si hay cámaras disponibles
    if (cameraSelectContainer) {
        Camera.getConnectedCameras().then(cameras => {
            cameraSelectContainer.classList.toggle('hidden', cameras.length === 0);
        }).catch(err => {
            console.error("[Main] Error al obtener cámaras para actualizar UI:", err);
            cameraSelectContainer.classList.add('hidden'); // Ocultar si hay error
        });
    }

    // Controles de fotos de la entrega actual
    if (clearPhotosButton) clearPhotosButton.classList.toggle('hidden', !hasPhotosInCurrentDelivery);
    if (saveCollageButton) saveCollageButton.classList.toggle('hidden', !hasPhotosInCurrentDelivery);

    // Control de jornada (reporte total)
    if (closeSessionButton) closeSessionButton.classList.toggle('hidden', !hasSavedCollagesInSession);

    // Si hay fotos en la entrega actual, ocultar el placeholder del collageGrid
    const collageGridPlaceholder = document.querySelector('#collageGrid .placeholder-text');
    if (collageGridPlaceholder) {
        collageGridPlaceholder.classList.toggle('hidden', hasPhotosInCurrentDelivery);
    }

    // Control de la marca de agua
    if (clearWatermarkButton && Watermark && typeof Watermark.hasWatermark === 'function') {
        clearWatermarkButton.classList.toggle('hidden', !Watermark.hasWatermark());
    } else if (clearWatermarkButton) {
        clearWatermarkButton.classList.add('hidden'); // Ocultar si Watermark no está listo
    }
}

// --- Lógica de Autenticación ---
if (loginButton) {
    loginButton.addEventListener('click', async () => {
        const password = passwordInput.value;
        if (Auth.login(password)) {
            loginScreen.classList.add('hidden');
            appContent.classList.remove('hidden');
            loginMessage.textContent = '';
            passwordInput.value = '';
            console.log("[Main] Usuario autenticado. Iniciando aplicación principal.");

            try {
                await initApp();
            } catch (error) {
                alert('Error crítico al iniciar la aplicación tras login: ' + error.message);
                console.error("[Main] Error al iniciar app tras login:", error);
            }

        } else {
            loginMessage.textContent = 'Contraseña incorrecta. Intenta de nuevo.';
            console.warn("[Main] Intento de login fallido.");
        }
    });

    passwordInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            loginButton.click();
        }
    });
}

// --- Inicialización de la App (después del login) ---
async function initApp() {
    console.log("[Main] initApp: Inicializando módulos...");
    Camera.initCamera('#camera-video');
    Collage.initCollage('#collageGrid');
    Export.initExport();
    Metadata.initMetadata('#includeMetadataCheckbox');
    Session.initSession();
    Watermark.initWatermark();

    await populateCameraSelect();

    try {
        const cameras = await Camera.getConnectedCameras();
        let cameraToStart = null;

        const savedCameraId = localStorage.getItem('lastUsedCameraId');
        if (savedCameraId && cameras.some(cam => cam.deviceId === savedCameraId)) {
            cameraToStart = savedCameraId;
            console.log(`[Main] initApp: Usando cámara guardada: ${savedCameraId}`);
        } else if (cameras.length > 0) {
            cameraToStart = cameras[0].deviceId;
            console.log(`[Main] initApp: Usando la primera cámara disponible: ${cameraToStart}`);
        }

        if (cameraToStart) {
            console.log(`[Main] initApp: Intentando iniciar cámara ${cameraToStart}...`);
            await Camera.startCamera(cameraToStart);
            if (cameraSelect) cameraSelect.value = cameraToStart;
            console.log("[Main] initApp: Cámara activada automáticamente al inicio de la app.");
        } else {
            console.warn("[Main] initApp: No se encontró ninguna cámara para activar automáticamente.");
            alert("Advertencia: No se detectó ninguna cámara. Por favor, asegúrate de tener una conectada y los permisos concedidos.");
        }
    } catch (error) {
        alert('Error al activar la cámara automáticamente: ' + error.message + '\nPor favor, asegúrate de conceder los permisos de la cámara.');
        console.error("[Main] initApp: Error al activar cámara automáticamente:", error);
    }

    updateButtonStates();
    console.log("[Main] Aplicación principal cargada y lista para interactuar.");
}

// Función para poblar el selector de cámaras
async function populateCameraSelect() {
    if (!cameraSelect) return;
    cameraSelect.innerHTML = '';
    try {
        const cameras = await Camera.getConnectedCameras();
        if (cameras.length > 0) {
            cameras.forEach(camera => {
                const option = document.createElement('option');
                option.value = camera.deviceId;
                option.textContent = camera.label || `Cámara ${camera.deviceId.substring(0, 5)}...`;
                cameraSelect.appendChild(option);
            });
            cameraSelectContainer.classList.remove('hidden');
            console.log("[Main] Selector de cámaras poblado. Cámaras detectadas:", cameras.length);
        } else {
            cameraSelectContainer.classList.add('hidden');
            console.warn("[Main] No se encontraron cámaras conectadas para poblar el selector.");
        }
    } catch (error) {
        console.error("[Main] Error al poblar selector de cámaras:", error);
        cameraSelectContainer.classList.add('hidden');
    }
}

// --- Event Listeners Principales de la Aplicación ---
if (takePhotoButton) {
    takePhotoButton.addEventListener('click', async () => {
        const inputDeliveryId = deliveryIdInput.value.trim();

        try {
            const photoObject = await Camera.takePhoto(inputDeliveryId);
            if (photoObject) {
                Collage.addPhotoToCollage(photoObject);
                updateButtonStates();
                console.log("[Main] Foto tomada y añadida al collage de la entrega.");
            }
        } catch (error) {
            alert('Error al tomar la foto: ' + error.message);
            console.error("[Main] Error al tomar foto:", error);
        }
    });
}

if (stopCameraButton) {
    stopCameraButton.addEventListener('click', () => {
        Camera.stopCamera();
        updateButtonStates();
        console.log("[Main] Cámara detenida manualmente.");
    });
}

if (clearPhotosButton) {
    clearPhotosButton.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres limpiar todas las fotos de la entrega actual?')) {
            Collage.clearPhotos();
            updateButtonStates();
            console.log("[Main] Fotos de la entrega actual limpiadas.");
        }
    });
}

if (saveCollageButton) {
    saveCollageButton.addEventListener('click', async () => {
        const inputDeliveryId = deliveryIdInput.value.trim();

        try {
            const collageDataUrl = await Collage.exportCollage('image/jpeg');
            if (collageDataUrl) {
                const lastPhotoMetadata = typeof Collage.getLastPhotoMetadata === 'function' ? Collage.getLastPhotoMetadata() : null;

                Session.addCollageToSession(collageDataUrl, lastPhotoMetadata, inputDeliveryId);

                Collage.clearPhotos();
                deliveryIdInput.value = '';
                updateButtonStates();
                alert(`Reporte "${Session.getAllCollages()[Session.getAllCollages().length-1].id}" guardado en la jornada. ¡Listo para la siguiente!`);
                console.log("[Main] Reporte de entrega actual guardado en la sesión.");
            }
        } catch (error) {
            alert('Error al guardar el reporte de entrega: ' + error.message);
            console.error("[Main] Error al guardar reporte de entrega:", error);
        }
    });
}

if (closeSessionButton) {
    closeSessionButton.addEventListener('click', async () => {
        if (confirm('¿Estás seguro de que quieres cerrar la jornada y exportar todos los reportes de entrega a un único PDF?')) {
            try {
                const allDeliveryReports = Session.getAllCollages();
                if (allDeliveryReports.length > 0) {
                    await Export.exportSessionPdf(allDeliveryReports, 'Reporte_Jornada_Entregas');
                    Session.clearSessionCollages();
                    Collage.clearPhotos();
                    deliveryIdInput.value = '';
                    Auth.logout();
                    loginScreen.classList.remove('hidden');
                    appContent.classList.add('hidden');
                    updateButtonStates();
                    alert("¡Todos tus reportes de entrega han sido exportados a un único PDF y la sesión ha sido cerrada!");
                    console.log("[Main] Jornada cerrada y reportes exportados.");
                } else {
                    alert("No hay reportes de entrega guardados en la jornada para exportar.");
                    console.warn("[Main] Intento de exportar jornada sin reportes guardados.");
                }
            } catch (error) {
                alert('Error al exportar el reporte total de la jornada: ' + error.message);
                console.error("[Main] Error al exportar reporte total de jornada:", error);
            }
        }
    });
}

if (deliveryIdInput) {
    deliveryIdInput.addEventListener('input', updateButtonStates);
}

if (cameraSelect) {
    cameraSelect.addEventListener('change', async () => {
        const selectedDeviceId = cameraSelect.value;
        console.log(`[Main] Selector de cámara cambiado a: ${selectedDeviceId}`);
        try {
            // Siempre intentamos detener la cámara actual antes de iniciar una nueva
            if (Camera.isCameraActive()) {
                console.log("[Main] Deteniendo cámara actual antes de cambiar...");
                Camera.stopCamera(); // Detener para liberar el recurso
            }

            console.log(`[Main] Iniciando nueva cámara: ${selectedDeviceId}`);
            await Camera.startCamera(selectedDeviceId);
            localStorage.setItem('lastUsedCameraId', selectedDeviceId);
            console.log(`[Main] Cámara cambiada exitosamente a: ${selectedDeviceId} y guardada como preferida.`);
        } catch (error) {
            alert('Error al cambiar de cámara: ' + error.message + '\nPor favor, verifica permisos y disponibilidad.');
            console.error("[Main] Error al cambiar cámara:", error);
        }
        updateButtonStates();
    });
}

// --- Lógica de la Marca de Agua ---
if (watermarkFileInput) {
    watermarkFileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
            watermarkMessage.textContent = 'Cargando marca de agua...';
            const success = await Watermark.setWatermarkImage(file);
            if (success) {
                watermarkMessage.textContent = 'Marca de agua cargada exitosamente.';
                clearWatermarkButton.classList.remove('hidden');
            } else {
                watermarkMessage.textContent = 'Error al cargar la marca de agua. Asegúrate de que sea PNG.';
                clearWatermarkButton.classList.add('hidden');
            }
        } else {
            watermarkMessage.textContent = '';
            clearWatermarkButton.classList.add('hidden');
        }
        updateButtonStates();
    });
}

if (clearWatermarkButton) {
    clearWatermarkButton.addEventListener('click', () => {
        if (Watermark && typeof Watermark.clearWatermarkImage === 'function' && confirm('¿Estás seguro de que quieres eliminar la marca de agua?')) {
            Watermark.clearWatermarkImage();
            watermarkFileInput.value = '';
            watermarkMessage.textContent = 'Marca de agua eliminada.';
            clearWatermarkButton.classList.add('hidden');
        }
        updateButtonStates();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    Auth.initAuth();
    console.log("[Main] DOM completamente cargado. Esperando autenticación para iniciar la aplicación.");
});