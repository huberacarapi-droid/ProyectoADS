import pool from "../../../database.js";
import { isValidId } from "../../../lib/helpers.js";

import eleccionesModel from "../../../models/elecciones/elecciones.model.js";
import inscritosModel from "../../../models/elecciones/elecciones.inscritos.model.js";
import config from "../../../config.js";

const { db } = config;
const inscritosCtrl = {};

//<GET> Renderizar lista de inscritos
inscritosCtrl.renderList = async function (req, res) {
    const { id } = req.params;
    if (!isValidId(id)) {
        return res.status(400).render("error/4xx.hbs", {layout:"error.layout.hbs", code: 400, title: "Solicitud incorrecta", message: "ID inválido.", redirect: "/inicio" });
    }

    try {
        const [eleccion, usuarios, inscritos] = await Promise.all([
            eleccionesModel.findOnePlanned(id),
            inscritosModel.findAllUsuarios(id),
            inscritosModel.findAll(id)
        ]);

        if (eleccion.success && usuarios.success && inscritos.success) {
            res.render("admin/elecciones/inscritos/list.hbs", { layout: "admin.layout.hbs", eleccion:eleccion.data, usuarios:usuarios.data, inscritos:inscritos.data });
        } else {
            return res.status(500).render("error/4xx.hbs", {layout:"error.layout.hbs", code: 500, title: "Error en el Servidor", message: "No se pudo completar la solicitud.", redirect: "/inicio" });
        }
    } catch (error) {
        console.error("Error al renderizar la lista:", error);
        return res.status(500).render("error/4xx.hbs", { code: 500, title: "Error en el Servidor", message: "Error inesperado.", redirect: "/inicio" });
    }
};

inscritosCtrl.add = async function(req, res) {
    let { id_eleccion, id_usuario } = req.params;
    try {
        // Inserción del nuevo eleccion
        const result = await pool.query(
            `INSERT INTO ${db.database}.elecciones_inscritos (id_eleccion, id_usuario)
            VALUES (${id_eleccion},${id_usuario});`
        );
        if (result.affectedRows > 0) {
            //return res.status(201).json({ message: 'Frente politico registrado exitosamente' });
            res.redirect(`/administrar/elecciones/programar/inscritos/${id_eleccion}`)
        } else {
            return res.status(500).json({ message: 'Error interno del servidor' });
        }
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
};

inscritosCtrl.remove = async function(req, res) {
    let { id_eleccion, id_usuario} = req.params;
    const { params } = JSON.parse(JSON.stringify(req.body));

    try {
        // Usar parámetros para evitar inyecciones SQL
        const result = await pool.query(`
            DELETE FROM ${db.database}.elecciones_inscritos 
            WHERE id_usuario=${id_usuario} AND id_eleccion = ${id_eleccion};
        `);
        if (result.affectedRows > 0) {
            //res.status(204).send(); // No content response
            res.redirect(`/administrar/elecciones/programar/inscritos/${id_eleccion}`)
        } else {
            return res.status(404).send('Frente no encontrado');
        }
    } catch (err) {
        console.error('Error en la actualización:', err);
        return res.status(500).send('Ocurrió un error en el servidor');
    }
};

inscritosCtrl.addAll = async function(req, res) {
    let { id_eleccion } = req.params;
    try {
        // Inserción del nuevo eleccion
        const result = await pool.query(
            `INSERT INTO ${db.database}.elecciones_inscritos (id_eleccion, id_usuario)
            SELECT 
                ${id_eleccion}, u.id
            FROM ${db.database}.usuarios u
            WHERE u.id NOT IN (
                SELECT i.id_usuario
                FROM ${db.database}.elecciones_inscritos i
                WHERE i.id_eleccion = ${id_eleccion}
            ) AND u.deletedAt IS NULL;
            `
        );
        if (result.affectedRows > 0) {
            //return res.status(201).json({ message: 'Frente politico registrado exitosamente' });
            res.redirect(`/administrar/elecciones/programar/inscritos/${id_eleccion}`)
        } else {
            return res.status(500).json({ message: 'Error interno del servidor' });
        }
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
};

inscritosCtrl.removeAll = async function(req, res) {
    let { id_eleccion } = req.params;
    try {
        // Inserción del nuevo eleccion
        const result = await pool.query(
            `DELETE FROM ${db.database}.elecciones_inscritos
            WHERE id_eleccion = ${id_eleccion} AND id_usuario>0;
            `
        );
        if (result.affectedRows > 0) {
            //return res.status(201).json({ message: 'Frente politico registrado exitosamente' });
            res.redirect(`/administrar/elecciones/programar/inscritos/${id_eleccion}`)
        } else {
            return res.status(500).json({ message: 'Error interno del servidor' });
        }
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
};
export default inscritosCtrl;