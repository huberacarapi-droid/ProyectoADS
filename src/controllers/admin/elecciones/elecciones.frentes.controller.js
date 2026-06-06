import pool from "../../../database.js";
import { rgbIntToHex, hexToRgbInt, isValidId } from "../../../lib/helpers.js";

import eleccionesModel from "../../../models/elecciones/elecciones.model.js";
import frentesModel from "../../../models/elecciones/elecciones.frentes.model.js";
import config from "../../../config.js";

//TODO: Manejo de Archivos
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(
    import.meta.url));
import { promises as fs } from 'fs'; // Usar promesas de fs
const storage = multer.diskStorage({
    destination: path.join(__dirname, "../../../tmp/uploads"),
    filename: (req, file, cb) => {
        let filename = `${uuidv4()}.${file.originalname.split('.').pop()}`;
        cb(null, filename)
    }
});
const uploadImage = multer({
    storage: storage,
    limits: { fileSize: 2000000 }
}).single('logo');

const { db } = config;
const frentesCtrl = {};

//<GET> Renderizar lista de frebtes
frentesCtrl.renderList = async function(req, res) {
    const { id } = req.params;
    if (!isValidId(id)) {
        return res.status(400).render("error/4xx.hbs", {layout:"error.layout.hbs", code: 400, title: "Solicitud incorrecta", message: "ID inválido.", redirect: "/inicio" });
    }
    try {
        const [result_eleccion, result_frentes] = await Promise.all([
            eleccionesModel.findOnePlanned(id),
            frentesModel.findAll(id),
        ]);
        if (result_eleccion.success && result_frentes.success){
            const eleccion = result_eleccion.data;
            const frentes = result_frentes.data;
            for (const frente of frentes) {
                frente.color = rgbIntToHex(frente.color);
                if (frente.logoFilename != null) {
                    let filePath = path.join(__dirname, "../../../tmp/downloads", frente.logoFilename);
                    try {
                        // Verificar si el archivo ya existe
                        await fs.access(filePath);
                    } catch (error) {
                        await fs.writeFile(filePath, Buffer.from(frente.logoFile.data));
                    }
                }
            }
            res.render('admin/elecciones/frentes/list.hbs', { layout: 'admin.layout.hbs', eleccion, frentes });
        }
        else {
            return res.status(500).render("error/4xx.hbs", {layout:"error.layout.hbs", code: 500, title: "Error en el Servidor", message: "No se pudo completar la solicitud.", redirect: "/inicio" });
        }
    } catch (error) {
        console.error("Error al renderizar la lista:", error);
        return res.status(500).render("error/4xx.hbs", {layout:"error.layout.hbs", code: 500, title: "Error en el Servidor", message: "Error inesperado.", redirect: "/inicio" });
    }
};

frentesCtrl.renderCreate = async function(req, res) {
    const { id } = req.params;
    let eleccion = await eleccionesModel.findOnePlanned(id);
    if(eleccion.success)
        res.render('admin/elecciones/frentes/create.hbs', { layout: 'admin.layout.hbs', eleccion:eleccion.data });
    else
        return res.status(500).render("error/4xx.hbs", {layout:"error.layout.hbs", code: 500, title: "Error en el Servidor", message: "No se pudo completar la solicitud.", redirect: "/inicio" });
}

frentesCtrl.create = async function(req, res) {
    try {
        // Subir imagen
        await new Promise((resolve, reject) => {
            uploadImage(req, res, (err) => {
                if (err) {
                    err.message = 'The file is too large for my service';
                    return reject(err);
                }
                resolve();
            });
        });

        // Obtener parámetros y archivo
        const { id } = req.params;
        const { sigla, descripcion, color } = req.body;
        const file = req.file;

        // Validación de campos requeridos
        if (!sigla || !descripcion || !color) {
            return res.status(400).json({ message: 'Faltan claves requeridas' });
        }

        // Convertir color a RGB
        const colorRgb = hexToRgbInt(color);

        // Leer el archivo de imagen
        const logoFile = await fs.readFile(
            path.join(__dirname, "../../../tmp/uploads", file.filename)
        );

        // Preparar datos para la base de datos
        const values = [
            id,
            sigla,
            descripcion,
            logoFile,
            file.filename,
            file.originalname,
            colorRgb
        ];

        // Inserción en la base de datos
        const query = `
            INSERT INTO ${db.database}.elecciones_frentes 
            (id_eleccion, sigla, detalle, logoFile, logoFilename, logoOriginalname, color)
            VALUES (?, ?, ?, ?, ?, ?, ?);
        `;

        const result = await pool.query(query, values);
        //console.log(result);
        // Verificar si la inserción fue exitosa
        if (result.affectedRows > 0) {
            res.redirect(`/administrar/elecciones/programar/frentes/${id}`);
        } else {
            return res.status(500).json({ message: 'Error interno del servidor' });
        }
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
}

frentesCtrl.renderUpdate = async function(req, res) {
    let { id_eleccion, id_frente } = req.params;
    if(isValidId(id_eleccion) && isValidId(id_frente)){
        let eleccion = await eleccionesModel.findOnePlanned(id_eleccion);
        let frente = await frentesModel.findOne(id_eleccion, id_frente);
        if(eleccion.success && frente.success){
            frente.data.color = rgbIntToHex(frente.data.color);
            res.render('admin/elecciones/frentes/edit.hbs', { layout: 'admin.layout.hbs', eleccion:eleccion.data, frente:frente.data });
        }
    }
};

frentesCtrl.update = async function(req, res) {
    try {
        // Subir imagen (en caso de que haya una)
        await new Promise((resolve, reject) => {
            uploadImage(req, res, (err) => {
                if (err) {
                    err.message = 'The file is too large for my service';
                    return reject(err);
                }
                resolve();
            });
        });

        let { id_eleccion, id_frente } = req.params;
        const { sigla, descripcion, color } = req.body;
        const file = req.file;
        
        // Validación de campos requeridos
        if (!sigla || !descripcion || !color) {
            return res.status(400).json({ message: 'Faltan claves requeridas' });
        }

        // Convertir color a RGB
        const colorRgb = hexToRgbInt(color);

        // Declarar variables para `query` y `values`
        let query;
        let values;

        if(file){
            // Leer el archivo de imagen
            const logoFile = await fs.readFile(
                path.join(__dirname, "../../../tmp/uploads", file.filename)
            );

            // Actualizar eleccion en la base de datos
            query = `
                UPDATE ${db.database}.elecciones_frentes 
                SET sigla = ?,
                    detalle = ?,
                    logoFile = ?,
                    logoFilename = ?,
                    logoOriginalName = ?,
                    color = ?,
                    updatedAt = current_timestamp() 
                WHERE id_frente = ? AND id_eleccion = ?`;
            
            // Preparar datos para la base de datos
            values = [
                sigla,
                descripcion,
                logoFile,
                file.filename,
                file.originalname,
                colorRgb,
                id_frente,
                id_eleccion,
            ];
        } else {
            // Preparar datos para la base de datos sin archivo de imagen
            query = `
                UPDATE ${db.database}.elecciones_frentes 
                SET sigla = ?,
                    detalle = ?,
                    color = ?,
                    updatedAt = current_timestamp() 
                WHERE id_frente = ? AND id_eleccion = ?`;
            values = [
                sigla,
                descripcion,
                colorRgb,
                id_frente,
                id_eleccion,
            ];
        }
        
        const result = await pool.query(query,values);

        // Verificar si se realizó la actualización
        if (result.affectedRows > 0) {
            res.redirect(`/administrar/elecciones/programar/frentes/${id_eleccion}`);
        } else {
            return res.status(500).json({ message: 'Error interno del servidor' });
        }
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
};

frentesCtrl.remove = async function(req, res) {
    let { id_eleccion, id_frente } = req.params;
    if(!isValidId(id_eleccion || !isValidId(id_frente)))
        return res.status(400).render("error/4xx.hbs", {layout:"error.layout.hbs", code: 400, title: "Solicitud incorrecta", message: "ID inválido.", redirect: "/inicio" });
    try {
        // Usar parámetros para evitar inyecciones SQL
        const query = `
            DELETE FROM ${db.database}.elecciones_frentes
            WHERE id_eleccion = ? AND id_frente = ?;
        `;
        const result = await pool.query(query, [id_eleccion, id_frente]);
        if (result.affectedRows > 0) {
            // Redirigir si la eliminación fue exitosa
            return res.status(204).send();
            //res.redirect(`/administrar/elecciones/programar/frentes/${id_eleccion}`)
        } else {
            return res.status(404).send('Frente no encontrado');
        }
    } catch (err) {
        console.error('Error en la actualización:', err);
        return res.status(500).send('Ocurrió un error en el servidor');
    }
};

export default frentesCtrl;