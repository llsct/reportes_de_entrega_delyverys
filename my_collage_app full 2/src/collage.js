// src/collage.js
// Este módulo gestiona la creación y manipulación del collage de fotos,
// incluyendo el dibujo de metadatos automáticos.

import *  as Metadata from './metadata.js';
import *  as Watermark from './watermark.js'; // Importar el módulo de marca de agua

let photos = [];
let collageGridElement = null;
export function initCollage(gridSelector) {
    collageGridElement = document.querySelector(gridSelector);
    if (!collageGridElement) {
        console.error(`Error: Elemento de rejilla del collage no encontrado con el selector: ${gridSelector}`);
    }
    renderCollage();
    console.log("[Collage] Módulo Collage inicializado.");
}

export function addPhotoToCollage(photoObject) {
    photos.push(photoObject);
    renderCollage();
    console.log("[Collage] Foto añadida al collage. Total de fotos:", photos.length, "con metadatos.");
}

export function clearPhotos() {
    photos = [];
    renderCollage();
    console.log("[Collage] Todas las fotos del collage han sido eliminadas.");
}

function renderCollage() {
    if (!collageGridElement) return;

    collageGridElement.innerHTML = '';
    if (photos.length === 0) {
        collageGridElement.innerHTML = '<p class="placeholder-text">Toma fotos para crear tu reporte de entrega.</p>';
        collageGridElement.classList.add('empty');
        return;
    } else {
        collageGridElement.classList.remove('empty');
    }

    photos.forEach(photoObject => {
        const img = document.createElement('img');
        img.src = photoObject.photoDataUrl;
        img.classList.add('collage-photo');
        collageGridElement.appendChild(img);
    });
    console.log("[Collage] Rejilla del collage actualizada con", photos.length, "fotos.");
}

/**
 * Dibuja texto en un lienzo Canvas.
 * @param {CanvasRenderingContext2D} ctx - El contexto de renderizado 2D del canvas.
 * @param {string} text - El texto a dibujar. Puede contener saltos de línea (\n).
 * @param {number} canvasWidth - Ancho del canvas.
 * @param {number} canvasHeight - Alto del canvas.
 * @param {object} options - Opciones de estilo y posición.
 */
function drawTextOnCanvas(ctx, text, canvasWidth, canvasHeight, options = {}) {
    const defaultOptions = {
        font: '20px Arial',
        fillStyle: '#000',
        textAlign: 'left',
        textBaseline: 'top',
        x: 0,
        y: 0
    };
    const settings = { ...defaultOptions, ...options };

    ctx.font = settings.font;
    ctx.fillStyle = settings.fillStyle;
    ctx.textAlign = settings.textAlign;
    ctx.textBaseline = settings.textBaseline;

    const lines = text.split('\n');
    let currentY = settings.y;
    const fontSizeMatch = settings.font.match(/(\d+)px/);
    const fontSize = fontSizeMatch ? parseFloat(fontSizeMatch[1]) : 20;
    const lineHeight = fontSize * 1.2;

    lines.forEach(line => {
        ctx.fillText(line, settings.x, currentY);
        currentY += lineHeight;
    });
    console.log(`[Collage] Texto "${text.replace(/\n/g, ' ')}" dibujado en el collage.`);
}


export async function exportCollage(imageType = 'image/jpeg') {
    if (photos.length === 0) {
        alert("No hay fotos para exportar en el collage.");
        throw new Error("No hay fotos en el collage para exportar.");
    }

    const exportWidth = 1200;
    const exportHeight = 900;
    const bottomFrameHeight = 80;
    const collageAreaHeight = exportHeight - bottomFrameHeight;

    const canvas = document.createElement('canvas');
    canvas.width = exportWidth;
    canvas.height = exportHeight;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, exportWidth, collageAreaHeight);

    ctx.fillStyle = '#F0F0F0';
    ctx.fillRect(0, collageAreaHeight, exportWidth, bottomFrameHeight);


    const numCols = 2;
    const numRows = Math.ceil(photos.length / numCols);
    const photoWidth = exportWidth / numCols;
    const photoHeight = collageAreaHeight / numRows;

    let currentX = 0;
    let currentY = 0;

    for (let i = 0; i < photos.length; i++) {
        const img = new Image();
        img.src = photos[i].photoDataUrl;
        await new Promise(resolve => img.onload = resolve);

        const hRatio = photoWidth / img.width;
        const vRatio = photoHeight / img.height;
        const ratio = Math.min(hRatio, vRatio);

        const sWidth = img.width * ratio;
        const sHeight = img.height * ratio;

        const xOffset = (photoWidth - sWidth) / 2;
        const yOffset = (photoHeight - sHeight) / 2;

        ctx.drawImage(img, currentX + xOffset, currentY + yOffset, sWidth, sHeight);

        currentX += photoWidth;
        if (currentX >= exportWidth) {
            currentX = 0;
            currentY += photoHeight;
        }
    }

    // Dibujar la marca de agua
    if (Watermark.hasWatermark()) {
        const watermarkImage = await Watermark.getWatermarkImage();
        if (watermarkImage) {
            const wmOpacity = 0.5; // Opacidad de la marca de agua
            ctx.globalAlpha = wmOpacity;

            // Escalar la marca de agua para que ocupe una porción del collage (ej. 20% del ancho del collageArea)
            const wmDesiredWidth = exportWidth * 0.2;
            const wmRatio = wmDesiredWidth / watermarkImage.width;
            const wmWidth = watermarkImage.width * wmRatio;
            const wmHeight = watermarkImage.height * wmRatio;

            // Calcular posición para centrar la marca de agua
            const wmX = (exportWidth - wmWidth) / 2;
            const wmY = (collageAreaHeight - wmHeight) / 2;

            ctx.drawImage(watermarkImage, wmX, wmY, wmWidth, wmHeight);
            ctx.globalAlpha = 1.0; // Restablecer la opacidad
            console.log("[Collage] Marca de agua dibujada.");
        }
    }


    const includeMetadata = Metadata.shouldIncludeMetadata();

    if (includeMetadata && photos.length > 0) {
        const firstPhotoMetadata = photos[0];
        let automaticMetadataText = "";

        // Incluir el ID de Entrega primero
        if (firstPhotoMetadata.deliveryId) {
            automaticMetadataText += `ID: ${firstPhotoMetadata.deliveryId}\n`;
        }

        if (firstPhotoMetadata.date instanceof Date && !isNaN(firstPhotoMetadata.date)) {
            const dateOptions = { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            const formattedDate = firstPhotoMetadata.date.toLocaleDateString('es-ES', dateOptions);
            automaticMetadataText += `Fecha: ${formattedDate}`;
        }

        if (firstPhotoMetadata.address) {
            const maxCharsPerLine = 35; // Aumentado ligeramente para direcciones largas
            const words = firstPhotoMetadata.address.split(' ');
            let currentLine = '';
            let addressLines = [];

            for (const word of words) {
                if ((currentLine + word).length > maxCharsPerLine && currentLine.length > 0) {
                    addressLines.push(currentLine.trim());
                    currentLine = word + ' ';
                } else {
                    currentLine += word + ' ';
                }
            }
            addressLines.push(currentLine.trim());

            if (automaticMetadataText !== "") {
                automaticMetadataText += `\nUbicación: ${addressLines.join('\n')}`;
            } else {
                automaticMetadataText += `Ubicación: ${addressLines.join('\n')}`;
            }

        } else if (firstPhotoMetadata.location) {
            const lat = firstPhotoMetadata.location.latitude.toFixed(4);
            const lon = firstPhotoMetadata.location.longitude.toFixed(4);
            if (automaticMetadataText !== "") {
                automaticMetadataText += `\nUbicación: Lat: ${lat}, Lon: ${lon}`;
            } else {
                automaticMetadataText += `Ubicación: Lat: ${lat}, Lon: ${lon}`;
            }
        } else {
            if (automaticMetadataText.trim() === "") { // Si no hay nada, usar "No disponible"
                 automaticMetadataText = "Metadatos no disponibles";
            } else { // Si hay fecha/ID pero no ubicación
                 automaticMetadataText += "\nUbicación: No disponible";
            }
        }

        if (automaticMetadataText.trim() !== '') {
            console.log(`[Collage] Intentando dibujar metadatos automáticos: "${automaticMetadataText.replace(/\n/g, ' ')}"`);

            let metadataFontSize = 20;
            const maxTextWidth = exportWidth - 40;
            let tempCtx = canvas.getContext('2d');
            tempCtx.font = `${metadataFontSize}px Arial`;

            const lines = automaticMetadataText.split('\n');
            let longestLineLength = 0;
            for(const line of lines) {
                const lineWidth = tempCtx.measureText(line).width;
                if (lineWidth > longestLineLength) {
                    longestLineLength = lineWidth;
                }
            }

            if (longestLineLength > maxTextWidth) {
                metadataFontSize = Math.floor(metadataFontSize * (maxTextWidth / longestLineLength));
                if (metadataFontSize < 10) metadataFontSize = 10;
                console.log(`[Collage] Ajustando tamaño de fuente de metadatos a ${metadataFontSize}px.`);
            }

            const totalTextHeight = lines.length * (metadataFontSize * 1.2);
            const startY = collageAreaHeight + (bottomFrameHeight / 2) - (totalTextHeight / 2) + (metadataFontSize * 0.5);

            drawTextOnCanvas(ctx, automaticMetadataText, canvas.width, canvas.height, {
                font: `${metadataFontSize}px Arial`,
                fillStyle: '#333333',
                textAlign: 'center',
                textBaseline: 'top',
                x: canvas.width / 2,
                y: startY
            });
        } else {
            console.warn("[Collage] Se solicitó incluir metadatos, pero el texto automático generado está vacío.");
        }
    } else if (includeMetadata && photos.length === 0) {
        console.warn("[Collage] No hay fotos en el collage para incluir metadatos.");
    } else {
        console.log("[Collage] No se solicitó incluir metadatos.");
    }

    const quality = (imageType === 'image/jpeg') ? 0.95 : 1.0;
    const collageDataUrl = canvas.toDataURL(imageType, quality);

    console.log(`[Collage] Collage generado como ${imageType}.`);
    return collageDataUrl;
}

/**
 * Obtiene el número actual de fotos en el collage.
 * @returns {number} El número de fotos.
 */
export function getPhotoCount() {
    return photos.length;
}

/**
 * Obtiene los metadatos de la última foto tomada en el collage.
 * Esto es útil para guardar los metadatos asociados a la entrega en la sesión.
 * @returns {object|null} Los metadatos de la última foto, o null si no hay fotos.
 */
export function getLastPhotoMetadata() {
    if (photos.length > 0) {
        // Devuelve una copia de los metadatos para evitar modificaciones directas
        return { ...photos[photos.length - 1] };
    }
    return null;
}