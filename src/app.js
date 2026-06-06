import express from "express";
import exphbs from "express-handlebars";
import config from "./config.js";
import routes from "./routes/index.js";
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import passport from "passport";

import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

import "./lib/passport.local.js";
import * as helpers from "./lib/handlebars.js";

// -> Sesiones
import session from "express-session";
import flash from "connect-flash";
import expressMySqlSession from "express-mysql-session";

const { db, port, secret } = config;

const app = express();

// Settings
app.set('port', port);
//Establece donde se encuentra la carpeta views
app.set("views", path.join(__dirname, "views")); 
app.engine(
    '.hbs',
    exphbs({
        defaultLayout: "main",
        layoutsDir: path.join(app.get("views"), "layouts"),
        partialsDir: path.join(app.get("views"), "partials"),
        extname: ".hbs",
        helpers: helpers,
    })
);
app.set('view engine', '.hbs');

// Middlewares

// -> Los datos recibidos son convertimos en objetos de javascript
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


// -> Manejo de sesiones de usuario
const MySQLStore = expressMySqlSession(session);
const sessionStore = new MySQLStore(db);

app.use(session({
    //key: 'connect.sid', // clave predeterminada de la cookie
    secret: secret, // Cambia esto a un secreto aleatorio para producción
    store: sessionStore,
    resave: false, // No guardar sesión si no se ha modificado
    saveUninitialized: false, // No crear sesión para visitantes no autenticados
    cookie: {
        //secure: true, // Cambiar a true si usas HTTPS
        maxAge: 60*60*1000 // Duración de la cookie en milisegundos
    }
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Middleware para pasar los mensajes flash a las vistas
app.use(function(req, res, next) {
    res.locals.user = req.isAuthenticated() ? req.user : null;
    res.locals.success = req.flash('success');
    res.locals.info = req.flash('info');
    res.locals.error = req.flash('error');
    next();
});

//Tratamiento de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Routes
app.use(routes);

// Static Files : Public
app.use(express.static(path.join(__dirname, "public")));

// Static Files :
app.use('/repositorio/imagenes', express.static(path.join(__dirname, './tmp/downloads')));
export default app;