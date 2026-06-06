import { hasRequiredKeys } from "../../../lib/helpers.js";
import usuariosModel from "../../../models/usuarios/usuarios.model.js";
import departamentoModel from "../../../models/usuarios/departamento.model.js";
import pool from "../../../database.js";
import config from "../../../config.js";
import moment from 'moment';
import xlsx from 'xlsx';
import excelJS from 'exceljs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Para subir archivos al servidor
const storage = multer.diskStorage({
    destination: path.join(__dirname, "../../../tmp/uploads"),
    filename: (req, file, cb) => {
        let filename = `${uuidv4()}.${file.originalname.split('.').pop()}`;
        cb(null, filename)
    }
});
const uploadFile = multer({
    storage: storage,
    limits: { fileSize: 2000000 }
}).single('file');
const { db } = config;

const usuariosCtrl = {};
//<GET> Exportar datos a Excel
usuariosCtrl.exportToExcel = async (req, res) => {
    try {
        const usersData = await pool.query(
            `SELECT u.codigo, u.cedula, u.complemento, u.nombres, u.apellidos, u.email, u.telefono, u.genero, d.nombre as 'residencia'
            FROM ${db.database}.usuarios u
            LEFT JOIN ${db.database}.departamento d ON u.residencia = d.id
            WHERE deletedAt IS NULL;`
        );
        const workbook = new excelJS.Workbook();
        const worksheet = workbook.addWorksheet('Usuarios');
        // Definir las columnas del archivo Excel
        worksheet.columns = [
            { header: 'Código', key: 'codigo', width: 15 },
            { header: 'Cédula', key: 'cedula', width: 15 },
            { header: 'Complemento', key: 'complemento', width: 15 },
            { header: 'Apellidos', key: 'apellidos', width: 30 },
            { header: 'Nombres', key: 'nombres', width: 30 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Teléfono', key: 'telefono', width: 15 },
            { header: 'Género', key: 'genero', width: 10 },
            { header: 'Residencia', key: 'residencia', width: 20 },
        ];
        // Aplicar estilos a las cabeceras
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true }; // Poner la cabecera en negrita
        });

        // Añadir filas con los datos
        usersData.forEach((user) => {
            worksheet.addRow(user);
        });

        // Aplicar auto-filtro a las cabeceras
        worksheet.autoFilter = {
            from: 'A1', // Desde la primera celda (A1)
            to: 'I1',   // Hasta la última columna con cabecera (I1 en este caso)
        };
        // Configuración de respuesta para descargar el archivo
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        const filename = `Lista de usuarios ${moment().format('YYYYMMDDhhmmss')}`
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
        return workbook.xlsx.write(res).then(() => {
            res.status(200).end();
        });
    } catch (err) {
        console.error('Error al exportar los usuarios a Excel', err);
        return res.status(500).send('Error al generar el archivo Excel');
    }
};

//<POST> Importar datos de Excel
usuariosCtrl.importFromExcel = async (req, res) => {
    try {
        const departamento = await departamentoModel.findAll();
        // Subir Excel
        await new Promise((resolve, reject) => {
            uploadFile(req, res, (err) => {
                if (err) {
                    err.message = 'The file is too large for my service';
                    return reject(err);
                }
                resolve();
            });
        });
        // Leer el archivo Excel subido
        const file = req.file;
        const workbook = xlsx.readFile(file.path);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const users = xlsx.utils.sheet_to_json(worksheet, {
            header: ['codigo', 'cedula', 'complemento', 'apellidos', 'nombres', 'email', 'telefono', 'genero', 'residencia'],
            defval: '' // Valor por defecto para celdas vacías
        }).slice(1); // Omitir la primera fila (cabeceras) manualmente
        // Procesar cada usuario
        for (const usuario of users) {
            try {
                let regexCodigo = /^[1-9]\d{0,8}$/;
                let regexCedula = /^[1-9]\d{0,8}$/;
                if (regexCedula.test(`${usuario.cedula}`) && regexCodigo.test(`${usuario.codigo}`)) { 
                    const _residencia = departamento.find(dep => dep.nombre === usuario.residencia);
                    usuario.residencia = _residencia ? _residencia.id : null;
                    usuario.telefono = usuario.telefono===''? null:usuario.telefono;
                    usuario.email = usuario.email===''? null:usuario.email;
                    //console.log(usuario);
                    const result = await usuariosModel.create(usuario, true);
                    if (result.status !== 201 && result.status !== 200) {
                        console.error(result.message);
                    }
                }
                else{
                    //console.log(usuario)
                }
            } catch (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    console.error(`Entrada duplicada para usuario con cédula ${usuario.cedula}`);
                    return res.status(409).json({ message: `Error: Usuario con cédula ${usuario.cedula} ya existe.` });
                } else {
                    console.error('Error al crear/actualizar el usuario:', err);
                }
            }
        }
        // Eliminar usuarios ausentes en el archivo Excel
        try {
            const usersCedulas = users.map(u => [u.cedula, u.complemento]);
            await pool.query(
                `UPDATE ${db.database}.usuarios SET deletedAt = current_timestamp() 
                WHERE (cedula, complemento) NOT IN (?) AND deletedAt IS NULL`,
                [usersCedulas]
            );
        } catch (deleteError) {
            console.error("Error al eliminar usuarios no incluidos en el archivo:", deleteError);
        }
        return res.status(200).json({ message: 'Datos de usuarios procesados correctamente' });
    } catch (err) {
        console.error('Error al procesar el archivo Excel', err);
        return res.status(500).json({ message: 'Error al procesar el archivo Excel' });
    }
};

//<GET> Renderizado de la lista de usuarios
usuariosCtrl.renderList = async function (req, res) {
    try {
        let departamento = await departamentoModel.findAll();
        let usuarios = await usuariosModel.findAll();
        let metricas = usuariosModel.getMetrics(usuarios);
        res.render('admin/usuarios/list.hbs', { layout: 'admin.layout.hbs', departamento, usuarios, metricas });
    } catch (error) {
        console.error('Error al renderizar la lista de usuarios:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
};

//<GET> Renderizado de la página de creación de usuarios
usuariosCtrl.renderCreate = async function (req, res) {
    try {
        let departamento = await departamentoModel.findAll();
        res.render('admin/usuarios/create.hbs', { layout: 'admin.layout.hbs', departamento });
    } catch (error) {
        console.error('Error al renderizar la página de creación:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
};

//<POST> Creación de un nuevo usuario
usuariosCtrl.create = async function (req, res) {
    const usuario = req.body;
    usuario.id = 0;
    try {
        // Validación de usuario
        const { validate, message } = await usuariosModel.validate(usuario);
        if (!validate) {
            return res.status(409).json({ message });
        }
        //console.log(validate, message)
        let requiereKeys = hasRequiredKeys(usuario, ['cedula', 'complemento', 'codigo', 'email', 'telefono', 'residencia'])
       // console.log(requiereKeys);
        if (!requiereKeys) {
            return res.status(400).json({ message: 'Faltan claves requeridas' });
        }
        const result = await usuariosModel.create(usuario);
        return res.status(result.status).json({ message: result.message });
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
};

//<GET> Renderizado de la página de edición de usuarios
usuariosCtrl.renderUpdate = async function (req, res) {
    try {
        const { id } = req.query;
        let departamento = await departamentoModel.findAll();
        let usuario = await usuariosModel.findOne(id);
        res.render('admin/usuarios/edit.hbs', { layout: 'admin.layout.hbs', usuario, departamento });
    } catch (error) {
        console.error('Error al renderizar la página de edición:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

//<POST> Actualizar nuevo usuario
usuariosCtrl.update = async function (req, res) {
    var usuario = req.body;
    //console.log(usuario)
    try {
        let { validate, message } = await usuariosModel.validate(usuario);
        if (validate) {
            usuario.updatedBy = res.locals.user.id;
            let result = await usuariosModel.update(usuario);
            if (result.affectedRows > 0) return res.status(201).json({ message: 'Usuario actualizado exitosamente' });
            else return res.status(500).json({ message: 'Error interno del servidor' });
        } else
            return res.status(409).json({ message });
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
};

usuariosCtrl.reset = async function(req, res){
    try {
        const { id } = req.body;
        if (!id || isNaN(id))
            return res.status(400).send('ID inválido');
        let usuario = await usuariosModel.findOne(id);
        
        if(usuario){
            const result = await pool.query(`UPDATE ${db.database}.usuarios SET verifiedAt = NULL WHERE id = ?`, [id]);
            if (result.affectedRows > 0)
                res.status(204).send();
            else
                res.status(404).send('Usuario no encontrado');
            
            const query = `
                UPDATE ${db.database}.usuarios_login
                SET login_attempts = 0, lock_until = null, loginnedAt = null
                WHERE id_usuario = ?;
            `;
            await pool.query(query, [id]);
        }
        else
            return res.status(404).send('Usuario no encontrado');
    } catch (error) {
        console.error('Error al renderizar la página de edición:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
};

//<POST> Eliminar usuario
usuariosCtrl.remove = async function (req, res) {
    try {
        const { id } = req.body;
        if (!id || isNaN(id))
            return res.status(400).send('ID inválido');
        const query = `UPDATE ${db.database}.usuarios SET deletedAt = current_timestamp() WHERE id = ?`;
        const result = await pool.query(query, [id]);
        if (result.affectedRows > 0)
            res.status(204).send();
        else
            res.status(404).send('Usuario no encontrado');
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).send('Ocurrió un error en el servidor');
    }
};
export default usuariosCtrl;