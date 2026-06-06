import crypto from "crypto"; // Para generar el token
import moment from "moment";

import usuariosModel from "../../models/usuarios/usuarios.model.js";
import departamentoModel from "../../models/usuarios/departamento.model.js";
import { hasRequiredKeys } from "../../lib/helpers.js";
import { encryptPassword } from "../../lib/crypto.js";

import pool from "../../database.js";
import config from "../../config.js";

const { db, domain} = config;

const homeCtrl = {};
//var count=0;
homeCtrl.renderHome = function (req, res) {
    //count++;
    //console.log(count)
    res.render('home/home.view.hbs', { layout: 'home.layout.hbs', user:req.user });
};

//GET
homeCtrl.renderProfile = async function (req, res, next) {
    if (req.user && req.user.id) {
        const usuario = await usuariosModel.findOne(req.user.id);
        usuario.ci = `${usuario.cedula}${usuario.complemento == '' ? '' : `-${usuario.complemento}`}`;
        const departamento = await departamentoModel.findAll();
        res.render('home/profile.view.hbs', { layout: 'home.layout.hbs', usuario, departamento })
    }
};
//POST
homeCtrl.updateProfile = async function (req, res, next) {
    try {
        // Extrae los datos del cuerpo de la solicitud
        const { id, nombres, apellidos, genero, residencia, email, telefono, password } = req.body;
        // Verifica si el usuario existe
        const [user_exist] = await pool.query(
            `SELECT * FROM ${db.database}.usuarios WHERE id=?`,
            [id]
        );
        if (!user_exist) {
            req.flash("error", "El usuario no existe.");
            return res.redirect('/inicio');
            //return res.status(409).json({message:"El usuario no existe."});
        }
        //Verificar si esta registrado para inicio de sesión
        let [existLogin] = await pool.query(`SELECT * FROM ${db.database}.usuarios_login WHERE id_usuario=?`, [id]);
        if(!existLogin && !(password && password !==''))
            return res.status(409).json({ message: "Debe actualizar su contraseña para actualizar su registro en el sistema." });
        //Verificar si tiene email registrado
        if(!user_exist.email && ! (email && email!==''))
            return res.status(409).json({ message: "Debe ingresar un correo electrónico para actualizar su registro en el sistema." });
        //Si no existe verificamos si los datos ingresado no son repetidos (código, email, teléfono).
        const [resultEmail, resultTelefono] = await Promise.all([
            pool.query(`SELECT id FROM ${db.database}.usuarios WHERE email=?`, [email]),
            pool.query(`SELECT id FROM ${db.database}.usuarios WHERE telefono=?`, [telefono]),
        ]);
        //console.log([resultCodigo, resultEmail, resultTelefono]);
        if (user_exist.email !== email && resultEmail.length > 0) return res.status(409).json({ message: 'Correo electrónico existente.'});
        if (user_exist.telefono != telefono && resultTelefono.length > 0) return res.status(409).json({ message: 'Teléfono existente.'});

        // Verificar si los campos requeridos están presentes
        const requiredFields = ['nombres', 'apellidos', 'genero', 'residencia'];
        const hasAllFields = requiredFields.every(field => req.body[field]);

        if (!hasAllFields) {
            return res.status(400).json({ message: 'Faltan claves requeridas' });
        }
        // Actualizar solo los campos que han cambiado
        let fieldsToUpdate = {};

        if (nombres && nombres !== user_exist.nombres) fieldsToUpdate.nombres = nombres;
        if (apellidos && apellidos !== user_exist.apellidos) fieldsToUpdate.apellidos = apellidos;
        if (genero && genero !== user_exist.genero) fieldsToUpdate.genero = genero;
        if (residencia && residencia !== user_exist.residencia) fieldsToUpdate.residencia = residencia;
        
        // Si hay campos que actualizar, procede con la actualización
        if (Object.keys(fieldsToUpdate).length > 0) {
            fieldsToUpdate.updatedBy = id;
            const result = await pool.query(
                `UPDATE ${db.database}.usuarios SET ? WHERE id=?`,
                [fieldsToUpdate, id]
            );
            if (result.affectedRows > 0)
                req.flash("success", "Tu perfil ha sido actualizado.");
        }
        var redirect = '/inicio';
        var message = '';
        // Verificar y actualizar el teléfono si es diferente
        if (telefono && telefono !== user_exist.telefono) {
            await pool.query(
                `UPDATE ${db.database}.usuarios SET telefono = ? WHERE id = ?`,
                [telefono, id]
            );
        }

        // Verificar y actualizar el email si es diferente
        if (email && email !== user_exist.email) {
            // Generar un nuevo token de 64 caracteres y una fecha de expiración
            const token = crypto.randomBytes(32).toString('hex');
            const expiration = moment().add(15, 'minutes').format('YYYY-MM-DD HH:mm:ss'); // 15 minutos de expiración

            // Envía el correo electrónico
            const updateUrl = `${domain}/perfil/actualizar/correo/${email}/${token}`;
            const messageEmail = `Has solicitado la actualización de tu correo electrónico. Haz clic en el siguiente enlace para confirmar tu nuevo correo: ${updateUrl}`;

            req.flash("info", `Se ha enviado un enlace para confirmar tu nuevo correo electrónico. Revisa tu bandeja de entrada ${email} y haz click en el enlace para confirmar la actualización de tu correo electrónico.`);
            message +=  `Se ha enviado un enlace para confirmar tu nuevo correo electrónico. Revisa tu bandeja de entrada ${email} y haz click en el enlace para confirmar la actualización de tu correo electrónico.`;
            redirect = '/logout';
        }

        // Verificar y actualizar la contraseña si se ha proporcionado
        if (password && password !=='') {
            //console.log("Actualizar Contraseña")
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
            if (!passwordRegex.test(password)) {
                return res.status(409).json({ message: "La contraseña debe contener al menos 8 caracteres, incluyendo una mayúscula, una minúscula, un dígito y un signo." });
            }
            const hashedPassword = await encryptPassword(password);
            /*await pool.query(
                `UPDATE ${db.database}.usuarios_login SET hashed_password = ? WHERE id_usuario = ?`,
                [hashedPassword, id]
            );*/
            await pool.query(
                `REPLACE INTO ${db.database}.usuarios_login(id_usuario, hashed_password) VALUES (?,?)`,
                [ id, hashedPassword ]
            );
            
            // Verificar los datos.
            await pool.query(
                `UPDATE ${db.database}.usuarios SET verifiedAt = CURRENT_TIMESTAMP() WHERE id = ?`,
                [id]
            );
            await pool.query(
                `UPDATE ${db.database}.usuarios_login SET loginnedAt = CURRENT_TIMESTAMP() WHERE id_usuario = ?`,
                [id]
            );
            req.flash("success", "Tu contraseña ha sido actualizada.");
            redirect = '/logout';
        }
        res.status(200).send({message, redirect});
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).send("Error interno del servidor");
    }
};


homeCtrl.renderNotifications = async function (req, res, next) {
    if (req.user && req.user.id) {
        const usuario = await usuariosModel.findOne(req.user.id);
        //console.log(usuario)
        const departamento = await departamentoModel.findAll();
        res.render('home/notifications.view.hbs', { layout: 'home.layout.hbs', usuario })
    }
};


export default homeCtrl;