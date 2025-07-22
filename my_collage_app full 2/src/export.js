// src/export.js
// Este módulo se encarga de la lógica de descarga de archivos y la exportación de PDF.

export function initExport() {
    console.log("[Export] Módulo Export inicializado.");
}

export function downloadFile(dataUrl, filename) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log(`[Export] Archivo "${filename}" intentando descargar.`);
}

/**
 * Exporta todos los collages de la sesión a un único archivo PDF.
 * Requiere que la librería jsPDF esté disponible (ej. cargada vía CDN en index.html).
 * @param {Array<object>} collages - Un array de objetos de collage, cada uno con { id, collage, metadata }.
 * @param {string} filename - El nombre del archivo PDF a descargar.
 */
export async function exportSessionPdf(collages, filename = 'reporte_jornada.pdf') {
    if (typeof window.jspdf === 'undefined' && typeof window.html2canvas === 'undefined') {
        alert('Las librerías jsPDF y html2canvas no están cargadas. No se puede exportar a PDF.');
        console.error("[Export] jsPDF o html2canvas no disponibles para exportar PDF.");
        // Intenta cargar las librerías si no están disponibles
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');

        if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
             throw new Error("No se pudo cargar jsPDF o html2canvas para la exportación de PDF.");
        }
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4' // ~595x842 px
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const padding = 20;
    let yOffset = padding;

    for (let i = 0; i < collages.length; i++) {
        const collageData = collages[i];
        const img = new Image();
        img.src = collageData.collage;

        await new Promise(resolve => img.onload = resolve);

        // Calcular las dimensiones para ajustar la imagen a la página
        const imgWidth = pageWidth - (padding * 2);
        const imgHeight = (img.height * imgWidth) / img.width;

        // Añadir una nueva página si la imagen actual no cabe
        if (yOffset + imgHeight + padding > pageHeight && i > 0) {
            doc.addPage();
            yOffset = padding;
        }

        // Título de la entrega
        doc.setFontSize(16);
        doc.setTextColor(40, 40, 40); // Gris oscuro
        doc.text(`Reporte de Entrega: ${collageData.id}`, padding, yOffset);
        yOffset += 20; // Espacio para el título

        // Añadir la imagen del collage
        doc.addImage(img, 'JPEG', padding, yOffset, imgWidth, imgHeight);
        yOffset += imgHeight + 10; // Espacio después de la imagen

        // Añadir metadatos
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100); // Gris más claro para metadatos

        let metadataText = "";
        if (collageData.metadata.date) {
            const date = new Date(collageData.metadata.date);
            const dateOptions = { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            metadataText += `Fecha: ${date.toLocaleDateString('es-ES', dateOptions)}\n`;
        }
        if (collageData.metadata.location && collageData.metadata.address) {
            metadataText += `Ubicación: ${collageData.metadata.address}\n`;
        } else if (collageData.metadata.location) {
             metadataText += `Ubicación: Lat: ${collageData.metadata.location.latitude.toFixed(4)}, Lon: ${collageData.metadata.location.longitude.toFixed(4)}\n`;
        } else {
             metadataText += `Ubicación: No disponible\n`;
        }

        doc.text(metadataText, padding, yOffset);
        yOffset += doc.getTextDimensions(metadataText).h + padding; // Espacio después de metadatos

        // Si no es la última, preparar para la siguiente página
        if (i < collages.length - 1) {
            yOffset += padding; // Espacio extra entre reportes
        }
    }

    doc.save(filename);
    console.log(`[Export] PDF "${filename}" exportado con ${collages.length} reportes.`);
}

// Función auxiliar para cargar scripts dinámicamente
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
            console.log(`[Export] Script cargado: ${src}`);
            resolve();
        };
        script.onerror = () => {
            console.error(`[Export] Error al cargar el script: ${src}`);
            reject(new Error(`Failed to load script: ${src}`));
        };
        document.head.appendChild(script);
    });
}