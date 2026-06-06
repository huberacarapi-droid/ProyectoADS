import pool from "../database.js";
import passport from "passport";
import config from "../config.js";
import { timeago } from "../lib/helpers.js";

import { encryptPassword } from "../lib/crypto.js";
import crypto from "crypto"; // Para generar el token
import moment from "moment";
import axios from "axios";

const { domain, db } = config;

// Expresión regular para validar la contraseña
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

const authenticationCtrl = {};

//<GET> Renderiza el Inicio de Sesión 
authenticationCtrl.renderLogin = function (req, res, next) {
    res.render('authentication/login.hbs', { layout: 'authentication.layout.hbs' });
};

//<POST> Proceso de login
authenticationCtrl.login = passport.authenticate('local.signin', {
    successRedirect: '/inicio',
    failureRedirect: '/login',
    failureFlash: true,
    successFlash: true,
});

//<POST> Cierre de sesión
authenticationCtrl.Logout = function (req, res, next) {
    req.logout(function (err) {
        if (err) return next(err);
        req.flash("success", "Se ha cerrado sesión correctamente.");
        res.redirect("/login");
    });
}

// <GET> Renderiza el formulario de "Olvidé mi contraseña"
authenticationCtrl.renderForgot = function (req, res) {
    res.render('authentication/forgot.hbs', { layout: 'authentication.layout.hbs'});
}

// <POST> Maneja la solicitud de "Olvidé mi contraseña"
authenticationCtrl.forgot = async function (req, res) {
    const { email } = req.body;
    //console.log(email);

    try {
        // Verifica si el usuario existe
        const [user] = await pool.query(`SELECT * FROM ${db.database}.usuarios WHERE email = ?`, [email]);
        if (!user) {
            //req.flash("error", "El correo electrónico no está registrado.");
            //return res.redirect('/forgot'); // Redirige al formulario
            return res.status(401).render('error/4xx.hbs', {
                layout: 'error.layout.hbs',
                title: 'Correo inválido o no encontrado.',
                message: 'El correo electrónico no está registrado.',
                redirect: '/login'
            });
        }

        const id_usuario = user.id;

        // Verificamos si la cuenta está bloqueada
        const [user_login] = await pool.query(
            `SELECT * FROM ${db.database}.usuarios_login WHERE id_usuario = ?`,
            [id_usuario]
        );

        if (user_login && user_login.lock_until && new Date(user_login.lock_until) > Date.now()) {
            req.flash('error', 'Cuenta bloqueada. Inténtalo más tarde.')
            return res.redirect('/login');
        }

        // Generar un nuevo token de 64 caracteres y una fecha de expiración
        const token = crypto.randomBytes(32).toString('hex');
        const expiration = moment().add(15, 'minutes').format('YYYY-MM-DD HH:mm:ss'); // 15 minutos de expiración

        // Envía el correo electrónico
        const resetUrl = `${domain}/reset/${token}`;
        const message = `Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para restablecerla: ${resetUrl}`;
        

        req.flash("success", "Se ha enviado un enlace para restablecer la contraseña a tu correo electrónico.");
        res.redirect('/login');
    } catch (error) {
        console.error("Error en forgot:", error);
        res.status(500).send("Error interno del servidor");
    }
};

// <GET> Renderiza el formulario de restablecimiento de contraseña
authenticationCtrl.renderReset = async function (req, res) {
    const { token } = req.params;

    try {
        // Si el token es válido, renderiza la página de reset
        res.render('authentication/reset.hbs', { layout: 'authentication.layout.hbs', token });
    } catch (error) {
        console.error('Error verificando el token:', error);
        return res.status(401).render('error/4xx.hbs', {
            layout: 'error.layout.hbs',
            title: 'Error.',
            message: 'Ha ocurrido un error. Intenta de nuevo.',
            redirect: '/login'
        });
    }
};

//<POST> Maneja el restablecimiento de contraseña
authenticationCtrl.reset = async function (req, res) {
    const { token } = req.params;
    const { password } = req.body;

    try {
        // Validar la seguridad de la contraseña
        if (!passwordRegex.test(password)) {
            req.flash("error", "La contraseña debe contener al menos 8 caracteres, incluyendo una mayúscula, una minúscula, un dígito y un signo.");
            return res.redirect(`/reset/${token}`);
        }

        // Si la contraseña es válida, procede a cifrarla y actualizarla
        const hashedPassword = await encryptPassword(password);

        await pool.query(
            `UPDATE ${db.database}.usuarios_login SET hashed_password = ?, loginnedAt = current_timestamp() WHERE id_usuario = ?`,
            [hashedPassword, user_token.id_usuario]
        );

        req.flash("success", "Tu contraseña ha sido actualizada.");
        res.redirect('/login');
    } catch (error) {
        console.error('Error al restablecer contraseña:', error);
        res.status(500).send("Error interno del servidor");
    }
};

function generarVerificacion() {
    return Math.floor(100000 + Math.random() * 900000); // Genera un número de 4 dígitos
}

authenticationCtrl.renderUpdatePassword = async function(req, res, next) {
    const query = `SELECT id_usuario, login_attempts, lock_until, hashed_password, updatedAt  FROM ${db.database}.usuarios_login WHERE id_usuario = ?;`;
    const {id} = res.locals.user;
    const [user] = await pool.query(query, [id]);
    res.render('authentication/verify/password.update.view.hbs', {layout: 'authentication.layout.hbs', user});

};

authenticationCtrl.updatePassword = async function(req, res, next) {
    const query = `SELECT id_usuario, email, token, token_expiration FROM ${db.database}.usuarios_token_verify WHERE id_usuario = ?;`;
    const {id} = res.locals.user;
    //console.log(id);
    const {password, confirm_password} = req.body;
    //console.log(password, password !== confirm_password ,!passwordRegex.test(password));
    if( password !== confirm_password ){
        req.flash("error", "Las contraseñas no coinciden.");
        return res.redirect('/update/password');
    }
    // Validar la seguridad de la contraseña
    if (!passwordRegex.test(password)) {
        req.flash("error", "La contraseña debe contener al menos 8 caracteres, incluyendo una mayúscula, una minúscula, un dígito y un signo.");
        return res.redirect('/update/password');
    }

    // Si la contraseña es válida, procede a cifrarla y actualizarla
    const hashedPassword = await encryptPassword(password);

    const result = await pool.query(
        `REPLACE INTO ${db.database}.usuarios_login (id_usuario, hashed_password, loginnedAt) VALUES(?, ?, current_timestamp())`,
        [ id, hashedPassword]
    );

    await pool.query(
        `UPDATE ${db.database}.usuarios SET verifiedAt = CURRENT_TIMESTAMP() WHERE id = ?`,
        [id]
    );
    //console.log(result)
    req.flash("success", "Tu contraseña ha sido actualizada.");
    res.redirect('/inicio');
};


export default authenticationCtrl;