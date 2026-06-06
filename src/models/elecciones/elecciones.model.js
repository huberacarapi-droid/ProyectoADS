import moment from "moment";
import pool from "../../database.js";
import { formatDateinArray, queryDatabase } from "../../lib/helpers.js";
import config from "../../config.js";

const { db } = config;
const eleccionesModel = {};

// Utilidad para formatear y validar fechas
function formatDates(elecciones, ...fields) {
    elecciones.forEach(eleccion => {
        fields.forEach(field => {
            if (eleccion[field]) {
                eleccion[`${field}`] = moment(eleccion[field]).format('YYYY-MM-DD HH:mm');
            }
        });
    });
}

// Métodos para obtener elecciones según su estado
eleccionesModel.findAllByState = async function(state) {
    const query = `SELECT * FROM ${db.database}.elecciones WHERE deletedAt IS NULL AND estado = ? ORDER BY updatedAt DESC;`;
    const response = await queryDatabase(query, [state]);
    if (response.success) formatDates(response.data, 'fecha_inicio', 'fecha_final');
    return response;
};
// Métodos para obtener elecciones según su id y su estado
eleccionesModel.findOneByState = async function(id, state) {
    const query = `SELECT * FROM ${db.database}.elecciones WHERE id = ? AND deletedAt IS NULL AND estado = ?;`;
    const response = await queryDatabase(query, [id, state]);
    if (response.success && response.data.length === 1) {
        formatDates(response.data, 'fecha_inicio', 'fecha_final');
        return { success: true, data: response.data[0] };
    }
    return { success: false, error: "Election not found or multiple entries exist." };
};

eleccionesModel.findAllPlanned = async function() {
    return this.findAllByState('planned');
};

eleccionesModel.findOnePlanned = async function(id) {
    return this.findOneByState(id,'planned');
};

eleccionesModel.findAllScheduled = async function() {
    return this.findAllByState('scheduled');
};
eleccionesModel.findOneScheduled = async function(id) {
    return this.findOneByState(id,'scheduled');
};

eleccionesModel.findAllExecuted = async function() {
    return this.findAllByState('executed');
};

eleccionesModel.findOneExecuted = async function(id) {
    return this.findOneByState(id,'executed');
};

eleccionesModel.new = function() {
    return {
        id: '0',
        titulo: '',
        descripcion: '',
        fecha_inicio: '',
        fecha_final: ''
    };
}
// Verificar el voto de un usuario en una elección específica
eleccionesModel.findOneVoteByUser = async function(id_usuario, id_eleccion) {
    const query = `SELECT * FROM ${db.database}.elecciones_votos WHERE id_eleccion = ? AND id_usuario = ?;`;
    const response = await queryDatabase(query, [id_eleccion, id_usuario]);
    if (response.success && response.data.length === 1) {
        return { success: true, data: response.data[0] };
    }
    return { success: false, error: "Vote not found or multiple entries exist." };
};
// Obtener todos los votos de una elección
eleccionesModel.findAllVotes = async function(id) {
    const query = `SELECT * FROM ${db.database}.elecciones_votos WHERE id_eleccion = ?;`;
    return await queryDatabase(query, [id]);
};

// Calcular puntuación de la elección
eleccionesModel.score = async function(id) {
    const query = `
        SELECT v.id_eleccion, f.sigla, COUNT(*) as total
        FROM ${db.database}.elecciones_votos v
        LEFT JOIN ${db.database}.elecciones_frentes f ON f.id_frente = v.id_frente
        WHERE v.id_eleccion = ?
        GROUP BY v.id_eleccion, v.id_frente;
    `;
    return await queryDatabase(query, [id]);
};

// Obtener votos por candidato en una votación específica
eleccionesModel.getVotosPorCandidato = async function(votacion) {
    const query = `CALL ${db.database}.VerCantidadVotosPorCandidato(?);`;
    const response = await queryDatabase(query, [votacion]);

    if (response.success) {
        const votosPorCandidato = { candidatos: [], votos: [], porcentaje: [] };
        response.data[0].forEach(element => {
            votosPorCandidato.candidatos.push(element.candidato);
            votosPorCandidato.votos.push(element.cantidad_votos);
            votosPorCandidato.porcentaje.push(element.porcentaje_votacion);
        });
        return { success: true, data: votosPorCandidato };
    }
    return { success: false, error: "Failed to retrieve votes per candidate." };
};

// Validación de datos de la elección
eleccionesModel.validate = async function(eleccion) {
    const regexId = /^\d+$/;
    const regexTitulo = /^[A-Za-zÀ-ÿ0-9 .,'-/:]{1,100}$/;
    const regexDescripcion = /^(?!\s*$).{1,1000}$/;
    const regexFecha = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/;

    if (!regexId.test(`${eleccion.id}`)) return { success: false, message: 'Id Inválido.' };
    if (!regexTitulo.test(`${eleccion.titulo}`)) return { success: false, message: 'Titulo invalido.' };
    if (!regexDescripcion.test(`${eleccion.descripcion}`)) return { success: false, message: 'Descripción inválida.' };

    const startDate = moment(eleccion.fecha_inicio, 'YYYY-MM-DD HH:mm', true);
    const endDate = moment(eleccion.fecha_final, 'YYYY-MM-DD HH:mm', true);

    if (!startDate.isValid()) return { success: false, message: 'La fecha de inicio es Inválida.' };
    if (!endDate.isValid()) return { success: false, message: 'La fecha final Inválida.' };
    if (startDate.isAfter(endDate)) return { success: false, message: 'La fecha de inicio debe ser anterior a la fecha final.' };
    if (moment().isAfter(startDate)) return { success: false, message: 'La fecha de inicio debe ser posterior a la fecha y hora actuales.' };
    if (moment().isAfter(endDate)) return { success: false, message: 'La fecha final debe ser posterior a la fecha y hora actuales.' };

    return { success: true, message: 'Datos correctos.' };
};
export default eleccionesModel;