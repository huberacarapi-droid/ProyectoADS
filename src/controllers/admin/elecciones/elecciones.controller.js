import moment from "moment";
import pool from "../../../database.js";
import { hasRequiredKeys, hexToRgbInt, rgbIntToHex } from "../../../lib/helpers.js";
import eleccionesModel from "../../../models/elecciones/elecciones.model.js";
import inscritosModel from "../../../models/elecciones/elecciones.inscritos.model.js";
import moderadoresModel from "../../../models/elecciones/elecciones.moderadores.model.js";
import frentesModel from "../../../models/elecciones/elecciones.frentes.model.js";
import config from "../../../config.js";
const { db } = config;

const eleccionesCtrl = {};
eleccionesCtrl.renderList = async function(req, res) {
    let planificadas = await eleccionesModel.findAllPlanned();
    let programadas = await eleccionesModel.findAllScheduled();
    let ejecutadas = await eleccionesModel.findAllExecuted();
    let elecciones_planificadas, elecciones_programadas, elecciones_ejecutadas = [];
    if(planificadas.success && programadas.success && ejecutadas.success){
        elecciones_planificadas = planificadas.data;
        elecciones_programadas = programadas.data;
        elecciones_ejecutadas = ejecutadas.data;
    }
    res.render('admin/elecciones/list.hbs', { layout:'admin.layout.hbs',planificadas:elecciones_planificadas, programadas:elecciones_programadas, ejecutadas:elecciones_ejecutadas });
};

eleccionesCtrl.renderCreate = function(req, res) {
    let eleccion = eleccionesModel.new();
    res.render('admin/elecciones/create.hbs', {layout:'admin.layout.hbs', eleccion });
};
eleccionesCtrl.create = async function(req, res) {
    var eleccion = req.body;
    try {
        if (!hasRequiredKeys(eleccion, ['id', 'titulo', 'descripcion', 'fecha_inicio', 'fecha_final'])) {
            return res.status(400).json({ message: 'Faltan claves requeridas' });
        }
        // Validación de eleccion
        const { success, message } = await eleccionesModel.validate(eleccion);
        if (!success) {
            return res.status(409).json({ message });
        }
        // Inserción del nuevo eleccion
        const result = await pool.query(
            `INSERT INTO ${db.database}.elecciones  (titulo, descripcion, fecha_inicio, fecha_final, estado)
            VALUES ('${eleccion.titulo}', '${eleccion.descripcion}', '${eleccion.fecha_inicio}', '${eleccion.fecha_final}', 'planned');`
        );
        if (result.affectedRows > 0) {
            return res.status(201).json({ message: 'Proceso de elección registrado exitosamente' });
        } else {
            return res.status(500).json({ message: 'Error interno del servidor' });
        }
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
};

eleccionesCtrl.renderUpdate = async function(req, res) {
    let { id } = req.params;
    let result = await eleccionesModel.findOnePlanned(id);
    let eleccion = null;
    if(result.success)  eleccion = result.data;
    res.render('admin/elecciones/edit.hbs', {layout:'admin.layout.hbs', eleccion });
};

eleccionesCtrl.update = async function(req, res) {
    var eleccion = req.body;
    try {
        if (!hasRequiredKeys(eleccion, ['id', 'titulo', 'descripcion', 'fecha_inicio', 'fecha_final'])) {
            return res.status(400).json({ message: 'Faltan claves requeridas' });
        }
        // Validación de eleccion
        const { success, message } = await eleccionesModel.validate(eleccion);
        if (!success) {
            return res.status(409).json({ message });
        }
        // Actualizar eleccion
        const result = await pool.query(
            `UPDATE ${db.database}.elecciones  
                SET titulo = '${eleccion.titulo}', 
                descripcion = '${eleccion.descripcion}',
                fecha_inicio ='${eleccion.fecha_inicio}',
                fecha_final = '${eleccion.fecha_final}', 
                estado = 'planned',
                updatedAt = current_timestamp()
                WHERE id = ${eleccion.id}
            ;`
        );
        if (result.affectedRows > 0) {
            return res.status(201).json({ message: 'Proceso de elección actualizado correctamente.' });
        } else {
            return res.status(500).json({ message: 'Error interno del servidor' });
        }
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
};

eleccionesCtrl.remove = async function(req, res) {
    const { id } = JSON.parse(JSON.stringify(req.body));
    try {
        // Usar parámetros para evitar inyecciones SQL
        const result = await pool.query(`
            UPDATE ${db.database}.elecciones  
            SET deletedAt = current_timestamp()
            WHERE id = ${id};
        `);
        if (result.affectedRows > 0) {
            return res.status(204).send(); // No content response
        } else {
            return res.status(404).send('Usuario no encontrado');
        }
    } catch (err) {
        console.error('Error en la actualización:', err);
        return res.status(500).send('Ocurrió un error en el servidor');
    }
};

eleccionesCtrl.renderProgram = async function(req, res) {
    let { id } = req.params;
    // Eleccion, Inscritos, Moderadores, Frentes
    let result_eleccion = await eleccionesModel.findOnePlanned(id);
    let result_inscritos = await inscritosModel.findAll(id);
    let result_moderadores = await moderadoresModel.findAll(id);
    let result_frentes = await frentesModel.findAll(id);

    let eleccion = {};
    let inscritos, frentes, moderadores = [];
    //let inscritos, moderadores, frentes = [];
    if( result_eleccion.success && result_inscritos.success && result_frentes.success && result_moderadores.success){
        eleccion = result_eleccion.data;
        inscritos = result_inscritos.data;
        moderadores = result_moderadores.data;
        frentes = result_frentes.data;
    };
    await frentes.forEach((frente) => {
        frente.color = rgbIntToHex(frente.color);
    });
    res.render('admin/elecciones/program.hbs', { layout: 'admin.layout.hbs', eleccion, inscritos, moderadores, frentes });
}

eleccionesCtrl.finishProgram = async function(req, res) {
    let { id } = req.params;
    try {
        let eleccion = await eleccionesModel.findOnePlanned(id);
        // Validación de eleccion
        if(eleccion.success){
            const { success, message } = await eleccionesModel.validate(eleccion.data);
            if (!success) {
                return res.status(409).json({ message });
            }
            const result = await pool.query(
                `UPDATE ${db.database}.elecciones SET estado = 'scheduled' WHERE id=?;`,
                [id]
            );
            if (result.affectedRows > 0) {
                return res.status(201).send({ message: 'Proceso de elección registrado exitosamente' });
                //res.redirect('/administrar/elecciones');
            } else {
                return res.status(500).json({ message: 'Error interno del servidor' });
            }
        }
        else {
            return res.status(409).json({ message: 'El proceso electoral no se encuentra planificado' });
        }
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
}

eleccionesCtrl.updateProgram = async function(req, res) {
    let { id } = req.params;
    try {
        // Inserción del nuevo eleccion
        const result = await pool.query(
            `UPDATE ${db.database}.elecciones  SET estado = 'planned' WHERE id=${id};`
        );
        if (result.affectedRows > 0) {
            //return res.status(201).json({ message: 'Proceso de elección registrado exitosamente' });
            res.redirect('/administrar/elecciones');
        } else {
            return res.status(500).json({ message: 'Error interno del servidor' });
        }
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
}

eleccionesCtrl.executeProgram = async function(req, res) {
    let { id } = req.params;
    try {
        let eleccion = await eleccionesModel.findOneScheduled(id);
        // Validación de eleccion
        if(eleccion.success){
            const { success, message } = await eleccionesModel.validate(eleccion.data);
            if (!success) {
                return res.status(409).json({ message });
            }
            const result = await pool.query(
                `UPDATE ${db.database}.elecciones  SET estado = 'executed' WHERE id=?;`,
                [id]
            );
            if (result.affectedRows > 0) {
                return res.status(201).json({ message: 'Proceso de elección registrado exitosamente' });
                //res.redirect('/administrar/elecciones');
            } else {
                return res.status(500).json({ message: 'Error interno del servidor' });
            }
        }
        else {
            return res.status(409).json({ message: 'El proceso electoral no se encuentra programado' });
        }
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
}


eleccionesCtrl.renderElecciones = async function(req, res) {
    let elecciones = await eleccionesModel.getElecciones();
    for (let index = 0; index < elecciones.length; index++) {
        let votosPorCandidato = await eleccionesModel.getVotosPorCandidato(elecciones[index].id_votacion);
        //elecciones[index].votosPorCandidato = {};
        elecciones[index].votosPorCandidato = votosPorCandidato;
        let total = 0
        for (let i of votosPorCandidato.votos) total += i;
        elecciones[index].totalVotos = total;
    }
    res.render('elecciones.hbs', { elecciones });
};

export default eleccionesCtrl;