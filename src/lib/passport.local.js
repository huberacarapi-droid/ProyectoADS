import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import pool from "../database.js";
import * as crypto from "./crypto.js";
import moment from "moment";
import config from "../config.js";
import { timeago} from "./helpers.js";

const { db } = config;

// Función genérica para obtener usuarios por cualquier criterio
async function findUser(condition, value) {
    const query = `
        SELECT u.id, u.email, CONCAT(u.apellidos, ', ', u.nombres) as name, ul.hashed_password as password, ul.login_attempts, ul.lock_until, ul.updatedAt, ul.loginnedAt, u.verifiedAt, concat(u.cedula,IF(u.complemento<>'', concat('-',u.complemento), '')) as cedula, u.codigo
        FROM ${db.database}.usuarios u
        LEFT JOIN ${db.database}.usuarios_login ul ON ul.id_usuario = u.id
        WHERE u.${condition} = ? AND u.deletedAt IS NULL;
    `;
    try {
        const result = await pool.query(query, [value]);
        const users = JSON.parse(JSON.stringify(result));
        return users.length > 0 ? users[0] : null;
    } catch (error) {
        console.error(`Error al buscar el usuario por ${condition}:`, error);
        throw error;
    }
}

// Función para buscar un usuario por correo electrónico
async function findUserByEmail(email) {
    return findUser('email', email);
}

// Función para buscar un usuario por cedula
async function findUserByCedula(cedula) {
    return findUser('cedula', cedula);
}

// Función para encontrar un usuario por ID
async function findUserById(id) {
    return findUser('id', id);
}

function isEmail(valor) {
    // Expresión regular para validar email
    const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return regexEmail.test(valor);
}

function isCedula(valor){
    // Expresión regular para validar cédula
    const regexCedula = /^\d+(-\d[A-Z])?$/;
    return regexCedula.test(valor);
}

function formatAttemptNumber(attempt) {
    switch (attempt) {
        case 1:
        return `${attempt}er`;
        case 2:
        return `${attempt}do`;
        case 3:
        return `${attempt}er`;
        default:
        return `${attempt}to`; // Para otros intentos como "4to", "5to", etc.
    }
}

// Función para verificar si el usuario es Admin
async function isAdmin(id) {
    const query = `SELECT id_usuario FROM ${db.database}.administradores WHERE id_usuario = ? AND deletedAt IS NULL;`;
    try {
        const result = await pool.query(query, [id]);
        return result.length > 0;
    } catch (error) {
        console.error("Error al verificar si el usuario es administrador:", error);
        return false;
    }
}

// Función para manejar intentos de inicio de sesión fallidos
async function handleFailedLogin(user) {
    // Incrementar el número de intentos fallidos
    user.login_attempts += 1;
    // Bloquear la cuenta por LOCK_TIME minutos
    if (user.login_attempts >= 3) {
        user.lock_until = moment().add(5, 'minutes').format('YYYY-MM-DD HH:mm:ss');
    }
    updateLogin(user);
}

// Función para restablecer intentos fallidos tras un inicio de sesión exitoso
async function resetLoginAttempts(user) {
    user.login_attempts = 0;
    user.lock_until = null;
    updateLogin(user);
}

async function updateLogin(user){
    const query = `
        UPDATE ${db.database}.usuarios_login
        SET login_attempts = ?, lock_until= ?
        WHERE id_usuario = ?;
    `;
    try {
        pool.query(query, [user.login_attempts, user.lock_until, user.id]);
    } catch (error) {
        console.error("Error al actualizar los intentos de inicio de sesión:", error);
        throw error;
    }
}

// Estrategia de Passport para iniciar sesión
passport.use(
    'local.signin',
    new LocalStrategy(
        {
            usernameField: 'email',
            passwordField: 'password',
            passReqToCallback: true,
        },
        async(req, email, password, done) => {
            
            try {
                let user = null;
                if(isEmail(email)){
                    user = await findUserByEmail(email);
                }
                else if(isCedula(email)){
                    user = await findUserByCedula(email);
                }
                
                if (!user) {
                    console.error('Tu correo electrónico no existe o es incorrecto. Inténtalo nuevamente.');
                    return done(null, false, req.flash('error', 'Tu correo electrónico no existe o es incorrecto. Inténtalo nuevamente.'));
                }
                
                // Verificar si la cuenta está registrada
                var matchPassword = matchPassword = user.password;
                
                if(user.verifiedAt===null || user.loginnedAt===null){
                    matchPassword = await crypto.encryptPassword(`Umsa.2026`);
                }
                // Verificar si la cuenta está bloqueada
                if (user.lock_until && new Date(user.lock_until) > Date.now()) {
                    return done(null, false, req.flash('error', `Su cuenta esta bloqueada. Inténtalo más tarde ${timeago(user.lock_until)}.`));
                }
                // Verificamos si transcurrieron 30 minutos desde el ultimo intento.
                if (moment(user.updatedAt).add(30, 'minutes').isBefore(moment())) {
                    user.login_attempts = 0;
                    resetLoginAttempts(user);
                }
                const isPasswordCorrect = await crypto.matchPassword(password, matchPassword);
                
                if (isPasswordCorrect) {
                    
                    // Restablecer intentos fallidos si el inicio de sesión es exitoso
                    resetLoginAttempts(user);
                    
                    return done(null, user, req.flash('info', `Bienvenido  ${user.email}`));
                } else {
                    
                    // Si el intento de inicio de sesión falló
                    handleFailedLogin(user); // Función para manejar el intento fallido
                    return done(null, false, req.flash('error', `Tu correo electrónico o contraseña es incorrecta. Inténtalo nuevamente. ${user.verifiedAt?`${formatAttemptNumber(user.login_attempts)} intento.`:''}`));
                }
            } catch (error) {
                console.error("Error during authentication:", error);
                return done(error);
            }
        }
    )
);

// Serializar usuario
passport.serializeUser((user, done) => {
    done(null, user.id); // Guarda el ID del usuario en la sesión
});

// Deserializar usuario
passport.deserializeUser(async (id, done) => {
    try {
        const user = await findUserById(id); // Recupera el usuario de la base de datos
        if (user) {
            user.isAdmin = await isAdmin(user.id);
            done(null, user);
        } else {
            done(new Error("Usuario no encontrado durante la deserialización"), null);
        }
    } catch (error) {
        console.error("Error durante la deserialización del usuario:", error);
        done(error, null);
    }
});