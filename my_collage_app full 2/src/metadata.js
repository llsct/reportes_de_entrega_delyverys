// src/metadata.js
// Este módulo gestiona si se deben incluir metadatos automáticos.

let includeMetadataCheckbox = null;
let includeMetadata = true; // Por defecto, incluir metadatos

/**
 * Inicializa el módulo de metadatos, conectándolo al checkbox.
 * @param {string} checkboxSelector - El selector CSS del checkbox para incluir metadatos.
 */
export function initMetadata(checkboxSelector) {
    includeMetadataCheckbox = document.querySelector(checkboxSelector);
    if (includeMetadataCheckbox) {
        // Sincronizar el estado interno con el checkbox inicial
        includeMetadata = includeMetadataCheckbox.checked;
        includeMetadataCheckbox.addEventListener('change', () => {
            includeMetadata = includeMetadataCheckbox.checked;
            console.log(`[Metadata] Incluir metadatos automáticos: ${includeMetadata}`);
        });
    } else {
        console.error(`Error: Checkbox de metadatos no encontrado con el selector: ${checkboxSelector}`);
    }
    console.log("[Metadata] Módulo Metadata inicializado. Estado inicial:", includeMetadata);
}

/**
 * Retorna si los metadatos deben ser incluidos en el collage.
 * @returns {boolean} True si los metadatos deben incluirse, false en caso contrario.
 */
export function shouldIncludeMetadata() {
    return includeMetadata;
}