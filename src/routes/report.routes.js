import { Router } from "express";
const router = Router();
import { isLoggedIn, isNotLoggedIn } from '../middlewares/authentication.js';

import report from "../controllers/report.controller.js";
//import index from "../controllers/index.controller.js";

router.get("/reportes/elecciones/resultados/:id", report.elecciones);

export default router;