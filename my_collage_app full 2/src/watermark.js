// src/watermark.js
// Este módulo gestiona la carga y el estado de la imagen de marca de agua.

let watermarkImage = null; // Almacena el objeto Image de la marca de agua

export function initWatermark() {
    console.log("[Watermark] Módulo de marca de agua inicializado.");
    // Aquí se podría cargar una marca de agua persistente desde localStorage si se quisiera.
}

/**
 * Carga una imagen para usarla como marca de agua.
 * @param {File} file - El objeto File de la imagen (debe ser PNG).
 * @returns {Promise<boolean>} True si la imagen se cargó correctamente, false en caso contrario.
 */
export function setWatermarkImage(file) {
    return new Promise((resolve) => {
        if (!file || file.type !== 'image/png') {
            console.warn("[Watermark] Archivo no es una imagen PNG válida.");
            watermarkImage = null;
            return resolve(false);
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                watermarkImage = img;
                console.log("[Watermark] Marca de agua cargada exitosamente.");
                resolve(true);
            };
            img.onerror = () => {
                console.error("[Watermark] Error al cargar la imagen de la marca de agua.");
                watermarkImage = null;
                resolve(false);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

/**
 * Elimina la marca de agua actualmente cargada.
 */
export function clearWatermarkImage() {
    watermarkImage = null;
    console.log("[Watermark] Marca de agua eliminada.");
}

/**
 * Retorna el objeto Image de la marca de agua.
 * @returns {HTMLImageElement|null} El objeto Image si está cargado, o null.
 */
export function getWatermarkImage() {
    return watermarkImage;
}

/**
 * Verifica si hay una marca de agua cargada.
 * @returns {boolean} True si hay una marca de agua, false en caso contrario.
 */
export function hasWatermark() {
    return watermarkImage !== null;
}