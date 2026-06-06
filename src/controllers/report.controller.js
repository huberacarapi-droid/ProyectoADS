import {buildPDFDocument} from "../reports/usuarios/usuarios.list.report.js";
import moment from "moment";
const reportCtrl = {};

reportCtrl.elecciones = function(req, res) {
    const data_reporte = {
        "report":{
            "name":"Lista de usuarios habilitados",
            "title": "Elecciones Generales 2024",
            "subtitle": "Este es un proceso electoral para determinar a los nuevos representantes de la cooperativa."
        },
        "users":[

        ]
    };
    const filename = `Usuarios Habilitados ${moment().format('YYYY.MM.DD HH.mm.ss')}.pdf`;
    const stream = res.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=${filename}`,
    });

    buildPDFDocument(
        (data) => stream.write(data),
        () => stream.end(),
        data_reporte
    );
};

export default reportCtrl;