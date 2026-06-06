export const isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) return res.redirect("/login");
    return next();
};

export const isNotLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) return res.redirect("/inicio");
    return next();
};

export const isAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.isAdmin) {
        return next();
    }
    req.flash('message', 'No tienes permisos para acceder a esta página.');
    return res.redirect("/inicio");
};