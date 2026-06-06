import axios from "axios";
import config from "../config.js";
const { captcha } = config;

export const reCaptchaV3 = async function(req, res, next) {
    // Obtener el token de reCAPTCHA desde el cuerpo de la solicitud
    const recaptchaToken = req.body.recaptcha_token;
    // Verificar el token de reCAPTCHA con Google
    try {
        const response = await axios.post(`https://www.google.com/recaptcha/api/siteverify`, null, {
            params: {
                secret: captcha.v3.private, // Reemplaza con tu clave secreta de reCAPTCHA
                response: recaptchaToken,
            },
        });
        const data = response.data;
        //console.log(data)
        // Si la verificación es exitosa y el puntaje de reCAPTCHA es suficiente
        if (!data.success || data.score < 0.4) {
            req.flash('error', 'Error en la verificación reCAPTCHA. Por favor, inténtelo de nuevo.');
            res.redirect('/login');
        } 
        // Si el captcha es válido, continuar con el siguiente middleware
        next();
    } catch (error) {
        console.error('Error verifying reCAPTCHA:', error);
        req.flash('error', 'Se ha producido un error con la verificación reCAPTCHA.');
        res.redirect('/login');
    }
};