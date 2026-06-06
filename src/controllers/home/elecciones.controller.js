import moment from "moment";
import app from "../../app.js";
import pool from "../../database.js";
import frentesModel from "../../models/elecciones/elecciones.frentes.model.js";
import inscritosModel from "../../models/elecciones/elecciones.inscritos.model.js";
import eleccionesModel from "../../models/elecciones/elecciones.model.js";
import { rgbIntToHex, hexToRgbInt, isValidId } from "../../lib/helpers.js";
import config from "../../config.js";
import moderadoresModel from "../../models/elecciones/elecciones.moderadores.model.js";
const { db } = config;

async function indicator(id) {
    //Calcular Indicadores
    const indicador = {};
    const inscritos = await inscritosModel.findAll(id);
    const votos = await eleccionesModel.findAllVotes(id);
    // Total Inscritos
    indicador.total = inscritos.success?inscritos.data.length:0;
    // Contar votos donde id_frente es null
    indicador.blancos = votos.success?votos.data.filter(voto => voto.id_frente === null).length:0;
    // Contar votos donde id_frente no es null
    indicador.validos = votos.success?votos.data.filter(voto => voto.id_frente !== null).length:0;
    // Total votos emitidos
    indicador.emitidos = indicador.blancos + indicador.validos;
    // Total votos pendientes
    indicador.pendientes = indicador.total - indicador.emitidos;
    // % de participacion
    indicador.p_participacion = ((indicador.total !== 0 ? indicador.emitidos / indicador.total : 0) * 100).toFixed(2);
    indicador.p_blancos = ((indicador.total !== 0 ? indicador.blancos / indicador.total : 0) * 100).toFixed(2);
    indicador.p_validos = ((indicador.total !== 0 ? indicador.validos / indicador.total : 0) * 100).toFixed(2);
    return indicador;
};

const eleccionesCtrl = {};

eleccionesCtrl.renderList = async function(req, res) {
    const id_usuario = parseInt(req.user.id, 10);
    if(!isValidId(id_usuario)){
        return res.status(400).render("error/4xx.hbs", {layout:"error.layout.hbs", code: 400, title: "Solicitud incorrecta", message: "ID inválido.", redirect: "/inicio" });
    }
    let ejecutadas = await eleccionesModel.findAllExecuted();
    let inscrito = await inscritosModel.findAllByUser(id_usuario);
    let elecciones = [];
    if(ejecutadas.success && inscrito.success){
        elecciones = ejecutadas.data.filter(eleccion => 
            inscrito.data.some(i => i.id_usuario === id_usuario && i.id_eleccion === eleccion.id)
        );
    }
    res.render('home/elecciones/list.hbs', { layout: 'home.layout.hbs', ejecutadas:elecciones });
};

eleccionesCtrl.renderVote = async function(req, res) {
    const { id } = req.params;
    const id_usuario = parseInt(req.user.id, 10);
    const id_eleccion = parseInt(id, 10);
    if(!isValidId(id) && !isValidId(id_usuario)){
        return res.status(400).render("error/4xx.hbs", {layout:"error.layout.hbs", code: 400, title: "Solicitud incorrecta", message: "ID inválido.", redirect: "/inicio" });
    }
    let ejecutada = await eleccionesModel.findOneExecuted(id);
    if(ejecutada.success){
        // Verificar si la hora actual es menor que la hora de inicio
        const startDate = moment(ejecutada.data.fecha_inicio, 'YYYY-MM-DD HH:mm', true);
        const endDate = moment(ejecutada.data.fecha_final, 'YYYY-MM-DD HH:mm', true);

        if (moment().isBefore(startDate)) 
            return res.render('home/elecciones/wait.hbs', { 
                layout: 'home.layout.hbs', 
                message: 'Las elecciones aún no han comenzado. Por favor, vuelve más tarde.',
                ejecutada:ejecutada.data
            });
        if (moment().isAfter(endDate))
            return res.render('home/elecciones/closed.hbs', { 
                layout: 'home.layout.hbs', 
                message: 'Las elecciones ya han finalizado.',
                ejecutada:ejecutada.data
            });
        const inscrito = await inscritosModel.findOne(id_usuario, id_eleccion);
        if(inscrito.success){
            const voto = await eleccionesModel.findOneVoteByUser(id_usuario, id_eleccion);
            let frentes = await frentesModel.findAll(id);
            if(frentes.success){
                await frentes.data.forEach((frente) => {
                    frente.color = rgbIntToHex(frente.color);
                    //frente.logo = Buffer.from(frente.logo.data).toString('utf8');
                });
            }
            
            if (voto.success) {
                voto.data.frente = frentes.data.find((frente) => frente.id_frente === voto.data.id_frente);
            }
            //console.log(voto);
            res.render('home/elecciones/vote.hbs', {
                layout: 'home.layout.hbs', 
                inscrito:inscrito.data,
                ejecutada:ejecutada.data,
                frentes:frentes.data,
                voto:voto.data });
        }
    }
};

eleccionesCtrl.vote = async function(req, res) {
    const { id } = req.params;
    const { id_eleccion, id_frente, id_usuario } = req.body;
    if (!isValidId(id) || !isValidId(id_eleccion) || !isValidId(id_frente) || !isValidId(id_usuario)) {
        return res.status(400).render("error/4xx.hbs", {
            layout: "error.layout.hbs",
            code: 400,
            title: "Solicitud incorrecta",
            message: "ID inválido.",
            redirect: "/inicio"
        });
    }
    // Convertir las variables a enteros
    const id_int = parseInt(id, 10);
    const id_eleccion_int = parseInt(id_eleccion, 10);
    const id_frente_int = parseInt(id_frente, 10);
    const id_usuario_int = parseInt(id_usuario, 10);

    // Verificar si la conversión fue exitosa
    if (!isNaN(id_int) && !isNaN(id_eleccion_int) && !isNaN(id_frente_int) && !isNaN(id_usuario_int)
    ) {
        try {
            const result = await pool.query(
                `INSERT INTO ${db.database}.elecciones_votos (id_eleccion, id_usuario, id_frente)
                VALUES (?, ?, ?);`,
                [id_eleccion_int, id_usuario_int, id_frente_int===0?null:id_frente_int]
            );
            if (result.affectedRows > 0) {
                const result_frentes = await frentesModel.findAll(id);
                const result_score = await eleccionesModel.score(id);
                const indicador = await indicator(id);
                if (result_frentes.success && result_score.success) {
                    let frentes = result_frentes.data || [];
                    let score = result_score.data || [];
                    const data = {
                        labels: [],
                        datasets: [{
                            label: 'Votos',
                            data: [],
                            backgroundColor: []
                        }]
                    };
                    for (const frente of frentes) {
                        frente.color = rgbIntToHex(frente.color);
                        data.labels.push(frente.sigla);
                        const resultado = score.find(item => item.sigla === frente.sigla);
                        const votos = resultado ? resultado.total : 0;
                        data.datasets[0].data.push(votos);
                        frente.votos = votos;
                        frente.porcentaje = indicador.validos !== 0 ? (frente.votos * 100 / indicador.validos).toFixed(2) : '0.00';
                        data.datasets[0].backgroundColor.push(frente.color);
                    }
                    app.get('io').emit('elecciones:indicador', indicador);
                    app.get('io').emit('elecciones:data', data);
                    app.get('io').emit('elecciones:frentes', frentes);
                    return res.status(201).json({ message: 'Su Voto fue registrado exitosamente.' });
                } else {
                    return res.status(500).json({ message: 'Error interno del servidor' });
                }
            }
            else {
                return res.status(500).json({ message: 'Error interno del servidor' });
            }
        } catch (error) {
            console.error('Error al procesar la solicitud:', error);
            return res.status(500).json({ message: 'Error interno del servidor' });
        }
    } else {
        console.error("Error: Uno o más valores no son números válidos.");
        return res.status(400).json({ message: 'Faltan claves requeridas' });
    }
};

eleccionesCtrl.renderResult = async function(req, res) {
    const { id } = req.params;
    const id_usuario = req.user.id;
    if (!isValidId(id) || !isValidId(id_usuario)) {
        return res.status(400).render("error/4xx.hbs", {
            layout: "error.layout.hbs",
            code: 400,
            title: "Solicitud incorrecta",
            message: "ID inválido.",
            redirect: "/inicio"
        });
    }
    
    try {
        const moderador = await moderadoresModel.findOne(id_usuario, id);
        const result_ejecutada = await eleccionesModel.findOneExecuted(id);
        const result_frentes = await frentesModel.findAll(id);
        const result_score = await eleccionesModel.score(id);
        const indicador = await indicator(id);
        //console.log(moderador);
        // Es Moderador?
        let isModerador = (moderador.success && moderador.data && moderador.data.id_usuario===id_usuario);
        if (result_ejecutada.success && result_frentes.success && result_score.success) {
            let frentes = result_frentes.data || [];
            let ejecutada = result_ejecutada.data || {};
            const endDate = moment(ejecutada.fecha_final, 'YYYY-MM-DD HH:mm', true);
            if (moment().isAfter(endDate) || isModerador){
                let score = result_score.data || [];
                const data = {
                    labels: [],
                    datasets: [{
                        label: 'Votos',
                        data: [],
                        backgroundColor: []
                    }]
                };
                for (const frente of frentes) {
                    frente.color = rgbIntToHex(frente.color);
                    data.labels.push(frente.sigla);
                    const resultado = score.find(item => item.sigla === frente.sigla);
                    const votos = resultado ? resultado.total : 0;
                    data.datasets[0].data.push(votos);
                    frente.votos = votos;
                    frente.porcentaje = indicador.validos !== 0 ? (frente.votos * 100 / indicador.validos).toFixed(2) : '0.00';
                    data.datasets[0].backgroundColor.push(frente.color);
                }
                res.render('home/elecciones/result.hbs', {
                    layout: 'home.layout.hbs',
                    data,
                    ejecutada,
                    frentes,
                    indicador
                });
            } else {
                res.render('home/elecciones/no_result.hbs', {
                    layout: 'home.layout.hbs',
                    ejecutada,
                });
            }
        } else {
            res.status(500).render("error/5xx.hbs", {
                layout: "error.layout.hbs",
                code: 500,
                title: "Error interno",
                message: "No se pudieron obtener los resultados de las elecciones.",
                redirect: "/inicio"
            });
        }
    } catch (error) {
        console.error("Error al renderizar resultados:", error);
        res.status(500).render("error/5xx.hbs", {
            layout: "error.layout.hbs",
            code: 500,
            title: "Error interno",
            message: "Ocurrió un error inesperado.",
            redirect: "/inicio"
        });
    }
};
export default eleccionesCtrl;