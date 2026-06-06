import usuariosModel from "../models/usuarios/usuarios.model.js";

// El correo electronico esta Verificado.
export const isVerified = async (req, res, next) => {
    const {id} = res.locals.user;
    const usuario = await usuariosModel.findOne(id);

    if(usuario.verifiedAt === null){
        req.flash('info', 'Por favor, actualiza tu correo electrónico para continuar.');
        return res.redirect('/verify/email');
    }
    return next();
};

// El correo electronico NO esta Verificado.
export const isNotVerified = async (req, res, next) => {
    const {id} = res.locals.user;
    const usuario = await usuariosModel.findOne(id);
    if(usuario.verifiedAt !== null) return res.redirect('/inicio');
    return next();
};


// El password esta actualizado?.
export const isPasswordUpdatedIn = async (req, res, next) => {
    const {id} = res.locals.user;
    const usuario = await usuariosModel.findOne(id);
    if(usuario.loginnedAt === null){
        req.flash('info', 'Por favor, actualiza tu contraseña para continuar.');
        return res.redirect('/update/password');
    }
    return next();
};

export const isNotPasswordUpdatedIn = async (req, res, next) => {
    const {id} = res.locals.user;
    const usuario = await usuariosModel.findOne(id);
    if(usuario.loginnedAt !== null){
        return res.redirect('/perfil');
    }
    return next();
};

export const isRegistred = async (req, res, next) => {
    const {id} = res.locals.user;
    const usuario = await usuariosModel.findOne(id);
    let isCompleted = [usuario.nombres, usuario.apellidos, usuario.genero, usuario.email, usuario.telefono, usuario.residencia, usuario.loginnedAt, usuario.verifiedAt].every(campo => campo !== null);
    //console.log(usuario);
    if(!isCompleted) {
        req.flash('info', 'Por favor, llena tus datos personales para continuar.');
        return res.redirect('/perfil');
    }
    return next();
};
