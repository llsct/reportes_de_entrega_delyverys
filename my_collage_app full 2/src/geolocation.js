// src/geolocation.js
// Este módulo se encarga de obtener la geolocalización del usuario (coordenadas)
// y luego, opcionalmente, la dirección legible usando OpenStreetMap Nominatim.

/**
 * Obtiene la ubicación actual del usuario (latitud y longitud).
 * @returns {Promise<{latitude: number, longitude: number}|null>} Una promesa que resuelve
 * con un objeto que contiene latitud y longitud, o null si falla.
 */
export async function getCurrentCoordinates() {
    if (!navigator.geolocation) {
        console.warn("[Geolocation] La geolocalización no es soportada por este navegador.");
        return null;
    }

    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                console.log(`[Geolocation] Coordenadas obtenidas: Latitud ${latitude}, Longitud ${longitude}`);
                resolve({ latitude, longitude });
            },
            (error) => {
                console.error("[Geolocation] Error al obtener las coordenadas:", error.message);
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        console.warn("[Geolocation] Permiso de geolocalización denegado por el usuario.");
                        break;
                    case error.POSITION_UNAVAILABLE:
                        console.warn("[Geolocation] Información de ubicación no disponible.");
                        break;
                    case error.TIMEOUT:
                        console.warn("[Geolocation] La solicitud para obtener las coordenadas ha caducado.");
                        break;
                    default:
                        break;
                }
                resolve(null);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}

/**
 * Realiza geocodificación inversa para obtener una dirección legible.
 * Utiliza OpenStreetMap Nominatim API (considera sus límites de uso).
 * @param {number} latitude - Latitud.
 * @param {number} longitude - Longitud.
 * @returns {Promise<string|null>} Una promesa que resuelve con una cadena de dirección legible, o null si falla.
 */
export async function getAddressFromCoordinates(latitude, longitude) {
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&extratags=0&namedetails=0`;

    try {
        console.log(`[Geolocation] Solicitando dirección para Lat: ${latitude}, Lon: ${longitude}`);
        const response = await fetch(nominatimUrl, {
            headers: {
                'User-Agent': 'MiCollageApp/1.0 (dev.test.user@example.com)'
            }
        });
        if (!response.ok) {
            console.error(`[Geolocation] Error de red o API Nominatim: ${response.status} - ${response.statusText}`);
            const errorText = await response.text();
            console.error("[Geolocation] Respuesta de error de Nominatim:", errorText);
            return null;
        }
        const data = await response.json();

        if (data.address) {
            const addressParts = [];
            if (data.address.road) addressParts.push(data.address.road);
            if (data.address.house_number) addressParts.push(data.address.house_number);
            if (data.address.suburb) addressParts.push(data.address.suburb);
            if (data.address.city) addressParts.push(data.address.city);
            else if (data.address.town) addressParts.push(data.address.town);
            else if (data.address.village) addressParts.push(data.address.village);
            if (data.address.state) addressParts.push(data.address.state);
            if (data.address.country) addressParts.push(data.address.country);

            const fullAddress = addressParts.join(', ');
            console.log("[Geolocation] Dirección obtenida:", fullAddress);
            return fullAddress;
        } else if (data.display_name) {
            console.warn("[Geolocation] Nominatim no pudo encontrar una dirección detallada, usando display_name:", data.display_name);
            return data.display_name;
        } else {
            console.warn("[Geolocation] Nominatim no pudo encontrar una dirección legible para estas coordenadas.");
            return null;
        }
    } catch (error) {
        console.error("[Geolocation] Error al realizar geocodificación inversa con Nominatim:", error);
        return null;
    }
}