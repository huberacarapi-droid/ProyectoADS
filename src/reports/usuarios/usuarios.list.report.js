//import PDFDocument from 'pdfkit';
import PDFDocument from 'pdfkit-table';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
export function buildPDFDocument(dataCallback, endCallback, data_reporte){
    const doc = new PDFDocument({
        size: 'LETTER', // 612x792
        layout:'portrait',
    });
    let margins ={
        top: 40,
        bottom: 40,
        left: 80,
        right: 40
    };
    // Desestructurar datos de reporte y usuarios
    const { report, users } = data_reporte;
    // Registrar y usar la fuente Arial MT
    doc.registerFont('ArialMT', path.join(__dirname, '../fonts', 'ArialMT.ttf'));
    doc.registerFont('Arial Narrow', path.join(__dirname, '../fonts', 'Arial Narrow.ttf'));
    doc.registerFont('Arial Narrow Bold', path.join(__dirname, '../fonts', 'Arial Narrow Bold.ttf'));

    doc.on('data', dataCallback);
    doc.on('end', endCallback);

    // Añadir el logo en la esquina superior izquierda
    console.log(__dirname)
    const logoPath =  path.join(__dirname, '../images','logo.png');
    doc.image(logoPath, margins.left, margins.top, { width: 72 });

    // Título del reporte
    doc
        .font('Arial Narrow Bold') // Establecer la fuente a Arial MT
        .fontSize(14)
        .fillColor('#F90708')
        .text(
            report.name.toUpperCase(),
            margins.left + 80, margins.top, 
            { align: 'center', width:360, height:16, underline: true}
        );
    doc
        .fontSize(12)
        .fillColor('#000000')
        .text(
            report.title,
            margins.left + 80, margins.top + 24, 
            { align: 'center', width:360, height:14 }
        );
    doc
        .fontSize(11)
        .fillColor('#808080')
        .text(
            report.subtitle,
            margins.left + 80+30, margins.top + 48,
            { align: 'center', width:300 ,height:32 });
    
    doc
        .strokeColor('#292929')
        .rect(margins.left, margins.top + 88, 480, 1)
        .stroke();
    
    // Configuración de la tabla
    const table = {
        //title: report.title,
        //subtitle: report.subtitle,
        headers: [
            { label: 'NRO.', property: 'index', width: 30, align: 'right' },
            { label: 'CEDULA DE IDENTIDAD', property: 'dni', width: 70, align: 'left' },
            { label: 'APELLIDOS y NOMBRES', property: 'user_name', width: 210, align: 'left' },
            { label: 'RESIDENCIA ACTUAL', property: 'residence', width: 70, align: 'left' },
            { label: 'OBSERVACIONES', property: 'reason', width: 100, align: 'left' },
        ],
        datas: users.map((user, index) => ({
            index: index + 1+9888,
            dni: user.dni,
            user_name: `${user.last_name} ${user.first_name}`.toUpperCase(),
            residence: user.residence.toUpperCase(),
        })),
    };

    // Agregar la tabla al documento PDF
    doc.table(table, {
        x:margins.left, y:margins.top + 96,
        padding: 5,
        minRowHeight: 5,
        columnSpacing: 5,
        width: 480,
        divider: {
            header: { disabled: false, width: 2, opacity: 1 },
            horizontal: { disabled: false, width: 0.5, opacity: 0.5 },
        },
        //prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8), // {Function} 
        //prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => doc.font("Arial Narrow").fontSize(8), // 
        prepareHeader: () => {
            doc.font('Arial Narrow Bold').fontSize(9).fillColor('#292929');
        },
        prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
            const {x, y, width, height} = rectCell;
            doc.font('Arial Narrow').fontSize(8).fillColor('#292929');
            // first line 
            if(indexColumn === 0){
                doc
                    .lineWidth(.5)
                    .moveTo(x, y)
                    .lineTo(x, y + height)
                    .stroke();  
            }
            doc
                .lineWidth(.5)
                .moveTo(x + width, y)
                .lineTo(x + width, y + height)
                .stroke();
        },
    });
    doc.end();
}