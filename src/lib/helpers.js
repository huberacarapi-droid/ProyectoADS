//-------------------------------------------------
// Format timeago
//-------------------------------------------------
import { format, register } from "timeago.js";

register('es_ES', (number, index, total_sec) => [
    ['justo ahora', 'ahora mismo'],
    ['hace %s segundos', 'en %s segundos'],
    ['hace 1 minuto', 'en 1 minuto'],
    ['hace %s minutos', 'en %s minutos'],
    ['hace 1 hora', 'en 1 hora'],
    ['hace %s horas', 'in %s horas'],
    ['hace 1 dia', 'en 1 dia'],
    ['hace %s dias', 'en %s dias'],
    ['hace 1 semana', 'en 1 semana'],
    ['hace %s semanas', 'en %s semanas'],
    ['1 mes', 'en 1 mes'],
    ['hace %s meses', 'en %s meses'],
    ['hace 1 año', 'en 1 año'],
    ['hace %s años', 'en %s años']
][index]);

export const timeago = function(savedTimestamp) {
    //return format(savedTimestamp);
    return format(savedTimestamp, 'es_ES');
};

export const lastUpdatedAt = function (registers) {
    if (!Array.isArray(registers) || registers.length === 0) {
        return null; // Retorna null si no hay registers o la lista es inválida
    }

    // Usamos reduce para encontrar el register con la fecha más reciente
    const lastDate = registers.reduce((last, register) => {
        const currentDate = new Date(register.updatedAt);
        return currentDate > last ? currentDate : last;
    }, new Date(0)); // Inicializamos con la fecha mínima posible

    return lastDate;
};

export const hasRequiredKeys = function(obj, keys) {
    //return keys.every(key => obj.hasOwnProperty(key));
    //return keys.every(key => Object.prototype.hasOwnProperty.call(obj, key));
    if (typeof obj.hasOwnProperty === 'function') {
        // Si el objeto tiene el método hasOwnProperty, usamos el de obj
        return keys.every(key => obj.hasOwnProperty(key));
    } else {
        // Si el objeto no tiene hasOwnProperty, usamos Object.prototype.hasOwnProperty
        return keys.every(key => Object.prototype.hasOwnProperty.call(obj, key));
    }
};
import moment from "moment";

export const formatDateinArray = (array, key, format) => {
    array.forEach(item => {
        if (item[key]) {
            item[key] = moment(item[key]).format(format);
        }
    });
};

export const hexToRgbInt = function(hex) {
    // Remover el símbolo '#'
    hex = hex.replace('#', '');
    // Convertir a entero
    let rgbInt = parseInt(hex, 16);
    return rgbInt;
};

// Función para convertir un entero de 3 bytes (RGB) a un color hexadecimal
export const rgbIntToHex = function(rgbInt) {
    // Extraer componentes de color
    let red = (rgbInt >> 16) & 0xFF;
    let green = (rgbInt >> 8) & 0xFF;
    let blue = rgbInt & 0xFF;

    // Convertir a formato hexadecimal
    let hex = '#' +
        red.toString(16).padStart(2, '0') +
        green.toString(16).padStart(2, '0') +
        blue.toString(16).padStart(2, '0');

    return hex.toLocaleUpperCase();
};

export const isValidId = function (value) {
    let id = parseInt(value, 10);
    return typeof id === 'number' && Number.isInteger(id) && !isNaN(id) && id >= 0;
}

// Función corregida para convertir número serial de Excel a fecha en formato YYYY-MM-DD
export const convertDateExcel = (dateExcel) => {
    return moment('1900-01-01').add(dateExcel - 2, 'days').format('YYYY-MM-DD');
};

import pool from "../database.js";
export const queryDatabase = async function (query, params) {
    try {
        const result = await pool.query(query, params);
        return { success: true, data: JSON.parse(JSON.stringify(result)) };
    } catch (error) {
        console.error(`Database query failed: ${query}`, error);
        return { success: false, error: error.message };
    }
}

import bcrypt from "bcryptjs";

export const encryptPassword = async(password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

export const matchPassword = async(password, savedPassword) =>
    await bcrypt.compare(password, savedPassword);