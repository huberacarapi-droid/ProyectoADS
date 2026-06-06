import pool from "../../database.js";
import config from "../../config.js";
const { db } = config;

const departamentoModel = {};

departamentoModel.findAll = async function() {
    try {
        const result = await pool.query(`SELECT * FROM ${db.database}.departamento ORDER BY orden ASC;`);
        const departamento = JSON.parse(JSON.stringify(result));
        return departamento;
    } catch (error) {
        console.error('Error al obtener departamentos:', error);
        throw error;
    }
};

export default departamentoModel;