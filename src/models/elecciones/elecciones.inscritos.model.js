import pool from "../../database.js";
import config from "../../config.js";
import { queryDatabase } from "../../lib/helpers.js";

const { db } = config;
const inscritosModel = {};

// Encuentra todos los usuarios que NO están inscritos en una elección.
inscritosModel.findAllUsuarios = async function(id_eleccion) {
    const query = `
        SELECT 
            u.id,
            CONCAT(u.cedula, IF(u.complemento <> '', CONCAT('-', u.complemento), '')) AS cedula,
            CONCAT(u.apellidos, ' ', u.nombres) AS nombre
        FROM ${db.database}.usuarios u
        WHERE u.id NOT IN (
            SELECT i.id_usuario
            FROM ${db.database}.elecciones_inscritos i
            WHERE i.id_eleccion = ?
        ) 
        AND u.deletedAt IS NULL 
        ORDER BY u.updatedAt DESC;
    `;
    return await queryDatabase(query, [id_eleccion]);
};

// Encuentra todos los usuarios inscritos en una elección específica
inscritosModel.findAll = async function(id_eleccion) {
    const query = `
        SELECT
            i.id_usuario, i.id_eleccion,
            CONCAT(u.cedula, IF(u.complemento <> '', CONCAT('-', u.complemento), '')) AS cedula,
            CONCAT(u.apellidos, ' ', u.nombres) AS nombre
        FROM ${db.database}.elecciones_inscritos i
        INNER JOIN ${db.database}.usuarios u ON u.id = i.id_usuario
        WHERE i.id_eleccion = ?
        ORDER BY i.updatedAt DESC;
    `;
    return await queryDatabase(query, [id_eleccion]);
};

// Encuentra todos los usuarios inscritos en una elección específica
inscritosModel.findAllByUser = async function(id_usuario) {
    const query = `
        SELECT * 
        FROM ${db.database}.elecciones_inscritos 
        WHERE id_usuario = ?;
    `;
    return await queryDatabase(query, [id_usuario]);
};

// Encuentra un usuario inscrito específico por ID de elección e ID de usuario
inscritosModel.findOne = async function(id_usuario, id_eleccion) {
    const query = `
        SELECT * 
        FROM ${db.database}.elecciones_inscritos 
        WHERE id_usuario = ? AND id_eleccion = ?;
    `;
    const result = await queryDatabase(query, [id_usuario, id_eleccion]);
    return { success: result.success, data: result.data[0] || null };
};

export default inscritosModel;