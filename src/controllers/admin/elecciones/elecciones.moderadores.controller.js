import moment from "moment";
import pool from "../../../database.js";
import { hasRequiredKeys, isValidId } from "../../../lib/helpers.js";

import eleccionesModel from "../../../models/elecciones/elecciones.model.js";
import moderadoresModel from "../../../models/elecciones/elecciones.moderadores.model.js";
import config from "../../../config.js";

const { db } = config;
const moderadoresCtrl = {};

//<GET> Renderizar lista de moderadores
moderadoresCtrl.renderList = async function(req, res) {
    const { id } = req.params;
    if (!isValidId(id)) {
        return res.status(400).render("error/4xx.hbs", {layout:"error.layout.hbs", code: 400, title: "Solicitud incorrecta", message: "ID inválido.", redirect: "/inicio" });
    }
    try {
        const [eleccion, usuarios, moderadores] = await Promise.all([
            eleccionesModel.findOnePlanned(id),
            moderadoresModel.findAllUsuarios(id),
            moderadoresModel.findAll(id)
        ]);
        if(eleccion.success && usuarios.success && moderadores.success){
            res.render('admin/elecciones/moderadores/list.hbs', { layout: 'admin.layout.hbs', eleccion:eleccion.data, usuarios:usuarios.data, moderadores:moderadores.data });
        } else {
            return res.status(500).render("error/4xx.hbs", {layout:"error.layout.hbs", code: 500, title: "Error en el Servidor", message: "No se pudo completar la solicitud.", redirect: "/inicio" });
        }
    } catch (error) {
        console.error("Error al renderizar la lista:", error);
        return res.status(500).render("error/4xx.hbs", { code: 500, title: "Error en el Servidor", message: "Error inesperado.", redirect: "/inicio" });
    }
};

//<POST> Agregar moderador a una elección
moderadoresCtrl.add = async function(req, res) {
    let { id_eleccion, id_usuario } = req.params;
    if (!isValidId(id_eleccion)||!isValidId(id_usuario)) {
        return res.status(400).render("error/4xx.hbs", {layout:"error.layout.hbs", code: 400, title: "Solicitud incorrecta", message: "ID inválido.", redirect: "/inicio" });
    }
    try {
        // Inserción del nuevo eleccion
        const result = await pool.query(
            `INSERT INTO ${db.database}.elecciones_moderadores (id_eleccion, id_usuario) VALUES (?, ?)`,
            [id_eleccion, id_usuario]
        );
        if (result.affectedRows > 0) {
            return res.status(201).send({ message: 'Moderador registrado exitosamente' });
            //res.redirect(`/administrar/elecciones/programar/moderadores/${id_eleccion}`)
        } else {
            return res.status(500).send({ message: 'Error interno del servidor' });
        }
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return res.status(500).send({ message: 'Error interno del servidor' });
    }
};

//<DELETE> Eliminar un moderador específico de una elección
moderadoresCtrl.remove = async function(req, res) {
    let { id_eleccion, id_usuario } = req.params;
    const { id } = JSON.parse(JSON.stringify(req.body));
    if (!isValidId(id_eleccion)||!isValidId(id_usuario)) {
        return res.status(400).render("error/4xx.hbs", {layout:"error.layout.hbs", code: 400, title: "Solicitud incorrecta", message: "ID inválido.", redirect: "/inicio" });
    }
    try {
        // Usar parámetros para evitar inyecciones SQL
        const result = await pool.query(
            `DELETE FROM ${db.database}.elecciones_moderadores WHERE id_eleccion = ? AND id_usuario = ?`,
            [id_eleccion, id_usuario]
        );
        if (result.affectedRows > 0) {
            return res.status(201).send({ message: 'Moderador eliminado exitosamente' });
            //res.redirect(`/administrar/elecciones/programar/moderadores/${id_eleccion}`)
        } else {
            return res.status(404).send({message:'Frente no encontrado'});
        }
    } catch (err) {
        console.error('Error en la actualización:', err);
        return res.status(500).send({message:'Ocurrió un error en el servidor'});
    }
};

moderadoresCtrl.addAll = async function(req, res) {
    let { id_eleccion } = req.params;
    if (!isValidId(id_eleccion)) {
        return res.status(400).render("error/4xx.hbs", {layout:"error.layout.hbs", code: 400, title: "Solicitud incorrecta", message: "ID inválido.", redirect: "/inicio" });
    }
    try {
        const result = await pool.query(
            `INSERT INTO ${db.database}.elecciones_moderadores (id_eleccion, id_usuario)
            SELECT ?, u.id FROM ${db.database}.usuarios u
            WHERE u.id NOT IN (
                SELECT i.id_usuario FROM ${db.database}.elecciones_moderadores i WHERE i.id_eleccion = ?
            ) AND u.deletedAt IS NULL`,
            [id_eleccion, id_eleccion]
        );
        if (result.affectedRows > 0) {
            return res.status(201).send({ message: 'Moderadores registrados exitosamente' });
            //res.redirect(`/administrar/elecciones/programar/moderadores/${id_eleccion}`)
        } else {
            return res.status(500).send({ message: 'Error interno del servidor' });
        }
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return res.status(500).send({ message: 'Error interno del servidor' });
    }
};

moderadoresCtrl.removeAll = async function(req, res) {
    let { id_eleccion } = req.params;
    if (!isValidId(id_eleccion)) {
        return res.status(400).render("error/4xx.hbs", {layout:"error.layout.hbs", code: 400, title: "Solicitud incorrecta", message: "ID inválido.", redirect: "/inicio" });
    }
    try {
        // Inserción del nuevo eleccion
        const result = await pool.query(
            `DELETE FROM ${db.database}.elecciones_moderadores WHERE id_eleccion = ?`,
            [id_eleccion]
        );
        if (result.affectedRows > 0) {
            return res.status(201).send({ message: 'Moderadores eliminados exitosamente' });
            //res.redirect(`/administrar/elecciones/programar/moderadores/${id_eleccion}`)
        } else {
            return res.status(500).send({ message: 'Error interno del servidor' });
        }
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return res.status(500).send({ message: 'Error interno del servidor' });
    }
};
export default moderadoresCtrl;