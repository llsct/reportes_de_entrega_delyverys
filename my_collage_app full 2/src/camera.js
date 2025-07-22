// src/camera.js
// Módulo para gestionar la interacción con la cámara del dispositivo.

let videoElement = null;
let mediaStream = null;
let currentDeviceId = null; // Para rastrear la cámara activa

export function initCamera(videoSelector) {
    videoElement = document.querySelector(videoSelector);
    if (!videoElement) {
        console.error(`[Camera] Error: Elemento de video no encontrado con el selector: ${videoSelector}`);
        throw new Error(`[Camera] Elemento de video no encontrado: ${videoSelector}`);
    }
    console.log("[Camera] Módulo de cámara inicializado. Elemento de video preparado.");
}

/**
 * Inicia la transmisión de la cámara.
 * @param {string} [deviceId] - ID del dispositivo de la cámara a usar. Si no se especifica, usa la predeterminada.
 * @returns {Promise<void>} Una promesa que se resuelve cuando la cámara se inicia.
 */
export async function startCamera(deviceId) {
    console.log(`[Camera] Intentando iniciar cámara. Device ID solicitado: ${deviceId || 'ninguno (predeterminado)'}.`);

    if (!videoElement) {
        throw new Error("[Camera] Elemento de video no inicializado. Llama a initCamera() primero.");
    }

    if (mediaStream) { // Detener cualquier stream activo primero
        console.log("[Camera] Deteniendo stream anterior antes de iniciar uno nuevo.");
        stopCamera();
    }

    const constraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : true, // Usar ID exacto si se proporciona
        audio: false // No necesitamos audio para esta aplicación
    };

    try {
        console.log("[Camera] Solicitando acceso a la cámara con constraints:", constraints);
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoElement.srcObject = mediaStream;
        await videoElement.play(); // Asegura que el video se esté reproduciendo
        const videoTrack = mediaStream.getVideoTracks()[0];
        currentDeviceId = videoTrack ? videoTrack.getSettings().deviceId : null;
        console.log(`[Camera] Cámara iniciada con éxito. Device ID activo: ${currentDeviceId || 'predeterminado'}.`);
        videoElement.classList.remove('hidden'); // Asegura que el video sea visible
    } catch (error) {
        console.error("[Camera] Error al iniciar la cámara:", error);
        videoElement.classList.add('hidden'); // Ocultar video si falla
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
            throw new Error("[Camera] Permiso de cámara denegado. Por favor, concede acceso a la cámara en la configuración de tu navegador o sistema.");
        } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
            throw new Error("[Camera] No se encontró ninguna cámara disponible con el ID solicitado.");
        } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
            throw new Error("[Camera] La cámara ya está en uso o hay un problema de hardware que impide su lectura.");
        } else if (error.name === "AbortError") {
             throw new Error("[Camera] La operación de cámara fue abortada (ej. por otro proceso o un error interno del dispositivo).");
        } else if (error.name === "OverconstrainedError") {
            throw new Error("[Camera] Los requisitos de la cámara no pudieron ser satisfechos (ej. ID de dispositivo incorrecto o cámara no disponible).");
        }
        else {
            throw new Error(`[Camera] Error desconocido al iniciar la cámara: ${error.message}.`);
        }
    }
}

/**
 * Detiene la transmisión de la cámara.
 */
export function stopCamera() {
    if (mediaStream) {
        console.log("[Camera] Deteniendo stream de la cámara.");
        mediaStream.getTracks().forEach(track => {
            track.stop(); // Detiene cada pista del stream
            console.log(`[Camera] Pista detenida: ${track.kind}`);
        });
        mediaStream = null; // Resetea la referencia del stream
    }
    if (videoElement) {
        videoElement.srcObject = null; // Limpia la fuente del video
        // videoElement.classList.add('hidden'); // Ocultar el elemento de video si no hay stream
    }
    currentDeviceId = null;
    console.log("[Camera] Cámara detenida y recursos liberados.");
}

/**
 * Toma una foto del stream de video actual.
 * @param {string} [deliveryId] - ID de la entrega para incluir en los metadatos.
 * @returns {Promise<object|null>} Un objeto con el Data URL de la foto y metadatos, o null si no hay cámara activa.
 */
export async function takePhoto(deliveryId = '') {
    console.log("[Camera] Intentando tomar foto.");
    if (!videoElement || !mediaStream) {
        alert("La cámara no está activa. Por favor, activa la cámara primero.");
        console.warn("[Camera] No se pudo tomar foto: cámara no activa.");
        return null;
    }

    const canvas = document.createElement('canvas');
    // Usar las dimensiones reales del video para la foto
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    const photoDataUrl = canvas.toDataURL('image/jpeg');
    console.log("[Camera] Foto tomada exitosamente.");

    // Obtener metadatos
    const metadata = await getPhotoMetadata(deliveryId);

    return { photoDataUrl, ...metadata };
}

/**
 * Obtiene los metadatos de la foto (fecha, ubicación, dirección).
 * @param {string} [deliveryId] - ID de la entrega proporcionado por el usuario.
 * @returns {Promise<object>} Objeto con los metadatos.
 */
async function getPhotoMetadata(deliveryId) {
    console.log("[Camera] Obteniendo metadatos para la foto.");
    const metadata = {
        date: new Date(),
        location: null,
        address: null,
        deliveryId: deliveryId || ''
    };

    // La geolocalización es asíncrona y puede fallar, la manejamos aquí
    if (navigator.geolocation) {
        try {
            const position = await new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    reject(new Error("Tiempo de espera agotado para la geolocalización."));
                }, 10000); // 10 segundos de timeout
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                });
            });
            metadata.location = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };
            console.log(`[Camera] Geolocalización obtenida: Lat ${metadata.location.latitude}, Lon ${metadata.location.longitude}`);

            // Intentar obtener la dirección inversa (reverse geocoding)
            try {
                // Aquí deberías usar una API de geocodificación inversa (como Google Maps Geocoding API, OpenStreetMap Nominatim, etc.)
                // Por simplicidad, y como no tenemos una clave API aquí, esto es solo un placeholder
                // Ejemplo con Nominatim (requiere una URL de servicio):
                // const geoApiUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${metadata.location.latitude}&lon=${metadata.location.longitude}`;
                // const response = await fetch(geoApiUrl);
                // const data = await response.json();
                // if (data.address) {
                //     metadata.address = `${data.address.road || ''}, ${data.address.house_number || ''}, ${data.address.city || ''}, ${data.address.state || ''}, ${data.address.country || ''}`;
                //     console.log(`[Camera] Dirección obtenida: ${metadata.address}`);
                // } else {
                //     metadata.address = "Dirección no disponible";
                //     console.warn("[Camera] No se pudo obtener la dirección inversa.");
                // }
                metadata.address = "Ubicación obtenida (Dirección inversa no implementada sin API key)"; // Placeholder
            } catch (geoError) {
                console.warn("[Camera] Error al obtener dirección inversa (posiblemente sin API o error de red):", geoError.message);
                metadata.address = "Dirección no disponible";
            }

        } catch (geoError) {
            console.warn("[Camera] Error al obtener geolocalización:", geoError.message);
            metadata.location = null;
            metadata.address = "Ubicación no disponible";
        }
    } else {
        console.warn("[Camera] Geolocalización no soportada por el navegador.");
        metadata.location = null;
        metadata.address = "Geolocalización no soportada";
    }

    return metadata;
}

/**
 * Obtiene una lista de todas las cámaras de video conectadas.
 * @returns {Promise<MediaDeviceInfo[]>} Una promesa que resuelve con un array de objetos MediaDeviceInfo.
 */
export async function getConnectedCameras() {
    console.log("[Camera] Buscando cámaras conectadas...");
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log(`[Camera] Cámaras conectadas encontradas: ${videoDevices.length}`);
        return videoDevices;
    } catch (error) {
        console.error("[Camera] Error al enumerar dispositivos de cámara:", error);
        alert("Error al acceder a la lista de cámaras: " + error.message);
        return [];
    }
}

/**
 * Retorna true si la cámara está actualmente activa y transmitiendo.
 * @returns {boolean}
 */
export function isCameraActive() {
    return mediaStream !== null && videoElement.srcObject !== null && !videoElement.paused;
}

/**
 * Retorna el ID del dispositivo de la cámara que está actualmente activa.
 * @returns {string|null} El ID del dispositivo o null si no hay cámara activa.
 */
export function getCurrentCameraDeviceId() {
    return currentDeviceId;
}