import pool from "../../database.js";
import config from "../../config.js";
import { queryDatabase } from "../../lib/helpers.js";

const { db } = config;
const moderadoresModel = {};

moderadoresModel.findAllUsuarios = async function(id_eleccion) {
    let query = `
    SELECT 
        u.id, i.id_eleccion,
        CONCAT(u.cedula,IF(u.complemento<>'', CONCAT('-',u.complemento), '')) as cedula,
        CONCAT(u.apellidos, ' ', u.nombres) as nombre
    FROM ${db.database}.elecciones_inscritos i
    INNER JOIN ${db.database}.usuarios u ON u.id = i.id_usuario
    WHERE u.id NOT IN (
            SELECT m.id_usuario
            FROM ${db.database}.elecciones_moderadores m
            WHERE m.id_eleccion = ?
        )
        AND i.id_eleccion = ?
        AND u.deletedAt IS NULL 
        ORDER BY u.updatedAt DESC;
    `;
    return await queryDatabase(query, [id_eleccion, id_eleccion]);
};

moderadoresModel.findAll = async function(id_eleccion) {
    let query = `
    SELECT
        i.id_usuario, id_eleccion,
        CONCAT(u.cedula,IF(u.complemento<>'', CONCAT('-',u.complemento), '')) as cedula,
        CONCAT(u.apellidos, ' ', u.nombres) AS nombre
    FROM ${db.database}.elecciones_moderadores i
    INNER JOIN ${db.database}.usuarios u ON u.id = i.id_usuario
    WHERE i.id_eleccion = ?
    ORDER BY i.updatedAt DESC;
    `;
    return await queryDatabase(query, [id_eleccion]);
};

moderadoresModel.findOne = async function(id_usuario, id_eleccion) {
    const query = `SELECT * FROM ${db.database}.elecciones_moderadores WHERE id_usuario = ? AND id_eleccion = ?;`
    const result = await queryDatabase(query, [id_usuario, id_eleccion]);
    return { success: result.success, data: result.data[0] || null };
};
export default moderadoresModel;