import { format } from "timeago.js";

export const timeago = function(savedTimestamp) {
    //return format(savedTimestamp);
    return format(savedTimestamp, 'es_ES');
};

export const json = function(context) {
    return JSON.stringify(context);
};

export const select = function(selected, options) {
    return options.fn(this).replace(
        new RegExp(' value=\"' + selected + '\"'),
        '$& selected="selected"'
    );
};
export const radio = function(currentOption, options) {
    return options.fn(this).replace(
        new RegExp(' value=\"' + currentOption + '\"'),
        '$& checked="checked"'
    );
};
export const count = function(context) {
    //return context.length;
    if (Array.isArray(context)) {
        return context.length;
    } else {
        return 0; // O cualquier valor por defecto que prefieras
    }
};
export const equal = function(val1, val2, options) {
    if (val1 == val2) { // Uso de == para comparación de igualdad
        return options.fn(this); // Renderiza el bloque si son iguales
    } else {
        return options.inverse(this); // Renderiza el bloque alternativo si no son iguales
    }
};