// src/session.js
// Este módulo gestiona los reportes de entrega (collages) guardados durante la jornada.

let savedDeliveryCollages = []; // Array para almacenar los Data URLs de los collages de entrega
let nextStopNumber = 1; // Contador para el nombre automático de la parada

export function initSession() {
    console.log("[Session] Módulo de sesión inicializado.");
    // Aquí podríamos cargar collages guardados de una sesión anterior (ej. localStorage)
    // si el cliente quisiera que la jornada persistiera entre cierres del navegador.
    // Por ahora, la sesión inicia vacía.
    nextStopNumber = 1; // Asegurarse de que el contador se reinicie al inicio de la sesión
}

/**
 * Añade el Data URL de un collage de entrega completado a la sesión actual.
 * Genera automáticamente un nombre "Parada X" para la entrega si no se proporciona un ID.
 * @param {string} collageDataUrl - El Data URL del collage de la entrega.
 * @param {object} metadata - Metadatos adicionales de la entrega (ubicación, etc., obtenidos de la última foto).
 * @param {string} [providedDeliveryId] - Un ID opcional proporcionado por el usuario.
 */
export function addCollageToSession(collageDataUrl, metadata, providedDeliveryId = '') {
    // Si no se proporciona un ID, generamos uno automático
    const deliveryId = providedDeliveryId.trim() !== '' ? providedDeliveryId : `Parada ${nextStopNumber}`;
    
    savedDeliveryCollages.push({
        id: deliveryId, // Usamos el ID generado o proporcionado
        collage: collageDataUrl,
        metadata: {
            date: metadata.date,
            location: metadata.location,
            address: metadata.address,
            // Aquí puedes añadir más metadatos si los necesitas de la foto (ej. deliveryId de la foto)
            deliveryId: metadata.deliveryId // Asegúrate de que el deliveryId de la foto también se guarda
        }
    });

    // Solo incrementamos el contador si el ID fue generado automáticamente por "Parada X"
    if (providedDeliveryId.trim() === '') {
        nextStopNumber++;
    }

    console.log(`[Session] Reporte de entrega "${deliveryId}" añadido a la jornada. Total de reportes guardados: ${savedDeliveryCollages.length}`);
}

/**
 * Retorna una copia de todos los collages de entrega guardados en la sesión.
 * @returns {Array<object>} Un array de objetos, cada uno conteniendo { id: string, collage: string, metadata: object }.
 */
export function getAllCollages() {
    return [...savedDeliveryCollages]; // Retorna una copia para evitar modificaciones externas directas
}

/**
 * Limpia todos los collages de entrega guardados en la sesión.
 * Esto se llamará al cerrar la jornada.
 */
export function clearSessionCollages() {
    savedDeliveryCollages = [];
    nextStopNumber = 1; // Resetear el contador al limpiar la sesión
    console.log("[Session] Reportes de entrega de la jornada limpiados y contador de paradas reiniciado.");
}

/**
 * Retorna el número actual de collages de entrega guardados en la sesión.
 * @returns {number} El número de collages de entrega guardados.
 */
export function getSessionCollageCount() {
    return savedDeliveryCollages.length;
}

/**
 * Retorna el próximo número de parada que se utilizará.
 * @returns {number} El número de la próxima parada.
 */
export function getNextStopNumber() {
    return nextStopNumber;
}