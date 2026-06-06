import pool from "../../database.js";
import departamentoModel from "./departamento.model.js";
import { formatDateinArray, lastUpdatedAt, timeago } from "../../lib/helpers.js";
import config from "../../config.js";
const { db } = config;

const usuariosModel = {};

// Obtener todos los usuarios
usuariosModel.findAll = async function () {
    try {
        const departamento = await departamentoModel.findAll();
        const result = await pool.query(
            `
            SELECT
                u.id, u.cedula, u.complemento, u.nombres, u.apellidos, u.codigo,
                u.email, u.telefono, u.genero, u.residencia, 
                u.verifiedAt, u.createdAt, u.updatedAt, u .updatedBy, u.deletedAt,
                ul.login_attempts, ul.lock_until, ul.loginnedAt
            FROM ${db.database}.usuarios u
            LEFT JOIN ${db.database}.usuarios_login ul ON ul.id_usuario  = u.id
            WHERE u.deletedAt IS NULL
            ORDER BY u.updatedAt DESC;
            `
        );
        let usuarios = JSON.parse(JSON.stringify(result));
        const formatFields = ['createdAt', 'updatedAt', 'deletedAt', 'loginnedAt'];
        formatFields.forEach((field) => formatDateinArray(usuarios, field, field === 'nacimiento' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm:ss'));

        usuarios = usuarios.map((usuario) => {
            if (usuario.cedula) {
                const complemento = usuario.complemento ? `-${usuario.complemento}` : '';
                const residencia = departamento.find((x) => x.id === usuario.residencia)?.nombre.toUpperCase() || '';
                
                // Lista de propiedades a verificar
                let observaciones='';
                const loginCheck = ['loginnedAt'];
                const verifyCheck = ['verifiedAt'];
                const registerCheck = ['nombres', 'apellidos', 'genero', 'email', 'telefono', 'residencia'];
                const completeCheck = ['nombres', 'apellidos', 'genero', 'email', 'telefono', 'residencia', 'loginnedAt', 'verifiedAt'];
                if(loginCheck.some(key => usuario[key] === null)) observaciones = 'SIN CONTRASEÑA';
                if(verifyCheck.some(key => usuario[key] === null)) observaciones = 'EMAIL SIN VERIFICAR';
                
                if(registerCheck.some(key => usuario[key] === null)) observaciones = 'DATOS INCOMPLETOS';
                if(completeCheck.every(key => usuario[key] !== null)) observaciones = 'REGISTRO COMPLETO';
                
                if(new Date(usuario.lock_until) > Date.now()) observaciones = 'CUENTA BLOQUEADA';
                return {
                    ...usuario,
                    ci: `${usuario.cedula}${complemento}`,
                    residencia,
                    observaciones
                };
            }
            return usuario;
        });

        return usuarios;
    } catch (error) {
        console.error("Error en findAll:", error);
        throw error;
    }
};

usuariosModel.findOne = async function (id) {
    try {
        //const query = `SELECT * FROM ${db.database}.usuarios WHERE id = ? AND deletedAt IS NULL;`;
        const query = `
            SELECT
                u.id, u.cedula, u.complemento, u.nombres, u.apellidos, u.codigo,
                u.email, u.telefono, u.genero, u.residencia, 
                u.verifiedAt, u.createdAt, u.updatedAt, u .updatedBy, u.deletedAt,
                ul.login_attempts, ul.lock_until, ul.loginnedAt
            FROM ${db.database}.usuarios u
            LEFT JOIN ${db.database}.usuarios_login ul ON ul.id_usuario  = u.id
            WHERE id = ? AND u.deletedAt IS NULL;
        `;
        const result = await pool.query(query, [id]); // Usar el id como parámetro para prevenir inyección SQL
        const usuario = JSON.parse(JSON.stringify(result))[0]; // Obtener directamente el primer resultado
        if (!usuario) {
            return null; // Si no hay usuario, retornar null
        }
        // Formatear las fechas necesarias
        const formatFields = ['createdAt', 'updatedAt', 'deletedAt'];
        formatFields.forEach((field) => formatDateinArray([usuario], field, 'YYYY-MM-DD HH:mm:ss'));
        return usuario;
    } catch (error) {
        console.error(`Error en findOne: ${error}`);
        throw error; // Re-lanzar el error para que se maneje a nivel superior
    }
};

usuariosModel.getMetrics = function(usuarios) {
    const data = {};
    data.total = usuarios.length;
    const actualizado = lastUpdatedAt(usuarios);
    data.actualizado = actualizado ? `Actualizado ${timeago(actualizado)}.`:'';
    
    let completados = usuarios.filter(
        ({ nombres, apellidos, genero, email, telefono, residencia, loginnedAt, verifiedAt }) =>
            [nombres, apellidos, genero, email, telefono, residencia, loginnedAt, verifiedAt].every(campo => campo !== null)
    ).length;
    let incompletos = usuarios.filter(
        ({ nombres, apellidos, genero, email, telefono, residencia, loginnedAt, verifiedAt }) => 
        [nombres, apellidos, genero, email, telefono, residencia, loginnedAt, verifiedAt].some(campo => campo === null)
    ).length;
    let bloqueados = usuarios.filter(
        ({lock_until, login_attempts}) => 
            new Date(lock_until) > Date.now()
        ).length
    data.completados ={ 
        total: completados, 
        porcentaje: (completados * 100 / data.total).toFixed(2) + "%"
    };
    data.incompletos ={ 
        total: incompletos, 
        porcentaje: (incompletos * 100 / data.total).toFixed(2) + "%"
    };
    data.bloqueados ={ 
        total: bloqueados, 
        porcentaje: (bloqueados * 100 / data.total).toFixed(2) + "%"
    };
    
    // Preparar los datos para Distribución por Residencia
    data.por_residencia = {};
    usuarios.forEach(usuario => {
        const residencia = usuario['residencia'];
        data.por_residencia[residencia] = (data.por_residencia[residencia] || 0) + 1;
    });
    
    // Preparar los datos para Distribución por Género
    data.por_genero = {
        total:{ 'M': 0, 'F': 0},
        porcentaje :{ 'M': 0, 'F': 0}
    };
    usuarios.forEach(usuario => {
        data.por_genero.total[usuario['genero']]++;
    });
    data.por_genero.porcentaje['M'] = (data.por_genero.total['M'] * 100 / data.total).toFixed(2) + "%";
    data.por_genero.porcentaje['F'] = (data.por_genero.total['F'] * 100 / data.total).toFixed(2) + "%";
    // Preparar los datos para Distribución por Residencia y Género
    data.por_residencia_genero = {};
    data.por_residencia_genero.residencias = [];
    data.por_residencia_genero.hombres = [];
    data.por_residencia_genero.mujeres = [];
    
    data.por_residencia_genero.total={};
    usuarios.forEach(usuario => {
        const residencia = usuario['residencia'];
        const gender = usuario['genero'];

        if (!data.por_residencia_genero.total[residencia]) {
            data.por_residencia_genero.total[residencia] = { 'M': 0, 'F': 0 };
        }
        data.por_residencia_genero.total[residencia][gender]++;
    });

    for (const residencia in data.por_residencia_genero.total) {
        data.por_residencia_genero.residencias.push(residencia);
        data.por_residencia_genero.hombres.push(data.por_residencia_genero.total[residencia]['M']);
        data.por_residencia_genero.mujeres.push(data.por_residencia_genero.total[residencia]['F']);
    }

    return data;
};

usuariosModel.create = async function (usuario, force_update = false) {
    try {
        // Comprobar si el usuario ya existe
        const resultCedula = await pool.query(
            `SELECT id, deletedAt FROM ${db.database}.usuarios WHERE cedula=? AND complemento=?;`,
            [usuario.cedula, usuario.complemento]
        );

        if (resultCedula.length > 0) {
            // Si el usuario existe y ha sido eliminado (deletedAt no es null)
            if (resultCedula[0].deletedAt !== null) {
                // Restaurar y actualizar el usuario si ha sido eliminado
                let result = await pool.query(
                    `UPDATE ${db.database}.usuarios SET nombres = ?, apellidos = ?, email = ?, telefono = ?, codigo = ?, residencia = ?, deletedAt = NULL WHERE id = ?`,
                    [usuario.nombres, usuario.apellidos, usuario.email, usuario.telefono, usuario.codigo, usuario.residencia, resultCedula[0].id]
                );
                if (result.affectedRows > 0)
                    return { message: 'Usuario restaurado y actualizado.', status: 200 };
                else
                    return { message: 'Error interno del servidor,', status: 500 };
            } else {
                // Si el usuario existe y no ha sido eliminado
                if (force_update) {
                    // Actualizar el usuario si ya existe y no está eliminado
                    let result = await pool.query(
                        `UPDATE ${db.database}.usuarios SET nombres = ?, apellidos = ?, email = ?, telefono = ?, codigo = ?, residencia = ? WHERE id = ?`,
                        [usuario.nombres, usuario.apellidos, usuario.email, usuario.telefono, usuario.codigo, usuario.residencia, resultCedula[0].id]
                    );
                    if (result.affectedRows > 0)
                        return { message: 'Usuario actualizado exitosamente', status: 200 };
                    else
                        return { message: 'Error interno del servidor,', status: 500 };
                } else {
                    return { message: 'Cédula de identidad existente.', status: 409 };
                }
            }
        } else {
            //Si no existe verificamos si los datos ingresado no son repetidos (código, email, teléfono).
            const [resultCodigo, resultEmail, resultTelefono] = await Promise.all([
                pool.query(`SELECT id FROM ${db.database}.usuarios WHERE codigo=?`, [usuario.codigo]),
                pool.query(`SELECT id FROM ${db.database}.usuarios WHERE email=?`, [usuario.email]),
                pool.query(`SELECT id FROM ${db.database}.usuarios WHERE telefono=?`, [usuario.telefono]),
            ]);
            //console.log([resultCodigo, resultEmail, resultTelefono]);
            if (resultCodigo.length > 0) return { message: 'Código existente.', status: 409 };
            if (resultEmail.length > 0) return { message: 'Correo electrónico existente.', status: 409 };
            if (resultTelefono.length > 0) return { message: 'Teléfono existente.', status: 409 };

            // Insertar nuevo usuario si no existe y no hay conflictos.
            let result = await pool.query(
                `INSERT INTO ${db.database}.usuarios (cedula, complemento, nombres, apellidos, email, telefono, codigo, genero, residencia) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [usuario.cedula, usuario.complemento, usuario.nombres, usuario.apellidos, usuario.email, usuario.telefono, usuario.codigo, usuario.genero, usuario.residencia]
            );
            if (result.affectedRows > 0)
                return { message: 'Usuario creado exitosamente.', status: 201 };
            else
                return { message: 'Error interno del servidor,', status: 500 };
        }
    }
    catch (err) {
        console.error(`Error en create: ${err}`);
        throw err; // Re-lanzar el error para que se maneje a nivel superior
    }
};

usuariosModel.update = async function (usuario) {
    try{
        const result = await pool.query(
            `UPDATE ${db.database}.usuarios SET cedula = ?, complemento = ?, nombres = ?, apellidos = ?, email = ?, telefono = ?, codigo = ?, genero = ?, residencia = ?, updatedBy =?  WHERE id = ?`,
            [usuario.cedula, usuario.complemento, usuario.nombres, usuario.apellidos, usuario.email, usuario.telefono, usuario.codigo, usuario.genero, usuario.residencia, usuario.updatedBy, usuario.id]
        );
        //console.log(result);
        return result;
    }
    catch (error) {
        console.error(`Error en update: ${error}`);
        throw error; // Re-lanzar el error para que se maneje a nivel superior
    }
};

usuariosModel.remove = async function () {

};

usuariosModel.validate = async function (usuario) {
    let regexId = /\d/;
    let regexCedula = /^[1-9]\d{0,8}$/;
    let regexComplemento = /^(\d[A-Z])?$/;
    let regexNombresApellidos = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]{2,}$/;
    let regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    let regexTelefono = /^\d{8}$/;
    let regexCodigo = /^[1-9]\d{0,8}$/;
    //let regexNacimiento = /^(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
    let regexGenero = /^[MF]$/;

    if (!regexId.test(`${usuario.id}`)) return { message: 'Id Inválido.', validate: false };
    if (!regexCedula.test(`${usuario.cedula}`)) return { message: 'Cédula Inválida.', validate: false };
    if (!regexComplemento.test(`${usuario.complemento}`)) return { message: 'Complemento Inválido.', validate: false };
    if (!regexNombresApellidos.test(`${usuario.nombres}`)) return { message: 'Nombres Inválidos.', validate: false };
    if (!regexNombresApellidos.test(`${usuario.apellidos}`)) return { message: 'Apellidos Inválidos.', validate: false };
    if (!regexEmail.test(`${usuario.email}`)) return { message: 'Email Inválido.', validate: false };
    if (!regexTelefono.test(`${usuario.telefono}`)) return { message: 'Teléfono Inválido.', validate: false };
    if (!regexCodigo.test(`${usuario.codigo}`)) return { message: 'Código Inválido.', validate: false };
    //if (!regexNacimiento.test(`${usuario.nacimiento}`)) return { message: 'Fecha de nacimiento Inválido.', validate: false };
    if (!regexGenero.test(`${usuario.genero}`)) return { message: 'Genero Inválido.', validate: false };
    return { message: 'Datos correctos.', validate: true };
}
export default usuariosModel;