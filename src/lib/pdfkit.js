import PDFDocument from 'pdfkit';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
export function buildPDFDocument(dataCallback, endCallback){
    const doc = new PDFDocument({
        size: 'A4',
        layout:'portrait',
    });
    let margins ={
        top: 50,
        bottom: 50,
        left: 72,
        right: 50
    };
    // Registrar y usar la fuente Arial MT
    const fontPath = path.join(__dirname, '../reports/fonts', 'ArialMT.ttf'); // Asegúrate de que este path sea correcto
    doc.registerFont('ArialMT', fontPath);

    doc.on('data', dataCallback);
    doc.on('end', endCallback);

    // Añadir el logo en la esquina superior izquierda
    console.log(__dirname)
    const logoPath =  path.join(__dirname, "../reports/logo.png");  // Reemplaza con la ruta de tu logo
    doc.image(logoPath, margins.left, margins.top, { width: 100 });  // Ajusta el ancho y la posición

    // Título del reporte
    doc
        .font('ArialMT') // Establecer la fuente a Arial MT
        .fontSize(16)
        .fillColor('#F90708')
        .text(
            'LISTA DE USUARIOS HABILITADOS',
            margins.left + 100, margins.top + 16, 
            { align: 'center', width:360, height:32}
        );
    doc
        .fontSize(14)
        .fillColor('#000000')
        .text(
            'ELECCIONES GENERALES 2024',
            margins.left + 100, margins.top + 40, 
            { align: 'center', width:360, height:16 }
        );
    doc
        .fontSize(12)
        .fillColor('#808080')
        .text(
            'Este es un proceso electoral para determinar a los nuevos representantes de la cooperativa.',
            margins.left + 130, margins.top + 64,
            { align: 'center', width:300 ,height:32 })
    
            doc
                .strokeColor('#808080')
                .rect(margins.left, margins.top + 106,450,1)
                .stroke();

    doc.end();
}