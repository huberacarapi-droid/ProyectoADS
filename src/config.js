/**
 * Reading Environment Variables
 */
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Necesitas estos dos para usar __dirname en módulos ES6
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar dotenv con la ruta al archivo .env
config({ path: path.join(__dirname, '..', '.env') });

//import { config } from "dotenv";
//config();

export default {
    domain: process.env.DOMAIN,

    db: {
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
    },
    port: process.env.PORT || 4000,
    secret: process.env.SECRET
};