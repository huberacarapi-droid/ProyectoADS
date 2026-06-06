import moment from "moment";
import pool from "../../database.js";
import { hasRequiredKeys, queryDatabase } from "../../lib/helpers.js";
import config from "../../config.js";
const { db } = config;

const frentesModel = {};

frentesModel.findAll = async function(id_eleccion) {
    const query = `SELECT * FROM ${db.database}.elecciones_frentes WHERE id_eleccion = ? ORDER BY updatedAt DESC;`;
    const response = await queryDatabase(query, [id_eleccion]);
    return response;
};

frentesModel.findOne = async function(id_eleccion, id_frente) {
    const query = `SELECT * FROM ${db.database}.elecciones_frentes WHERE id_eleccion = ? AND id_frente = ?;`;
    const response = await queryDatabase(query, [id_eleccion, id_frente]);
    if (response.success && response.data.length === 1) {
        return { success: true, data: response.data[0] };
    }
    return { success: false, error: "No se pudo encontrar el Frente." };
};

export default frentesModel;