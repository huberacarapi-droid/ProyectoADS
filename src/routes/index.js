import { Router } from "express";

import index from "./index.routes.js"
import home from "./home.routes.js";
import admin from "./admin.routes.js"
import report from "./report.routes.js";

import authentication from "./authentication.routes.js";

const router = Router();
router.use(index);
router.use(home);
router.use(admin);
router.use(authentication);
router.use(report)
// Middleware para redirigir rutas no existentes
/*router.use((req, res) => {
    res.redirect("/inicio");
});*/
export default router;