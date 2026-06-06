import { Router } from "express";
import { isLoggedIn, isNotLoggedIn } from '../middlewares/authentication.js';
import { isPasswordUpdatedIn, isRegistred, isVerified } from "../middlewares/verify.js";

const router = Router();

import home from "../controllers/home/home.controller.js";
import elecciones from "../controllers/home/elecciones.controller.js";
import homeCtrl from "../controllers/home/home.controller.js";

router.get("/inicio", isLoggedIn, isPasswordUpdatedIn, home.renderHome);
router.get("/perfil", isLoggedIn, home.renderProfile);

router.post("/perfil/actualizar", isLoggedIn, home.updateProfile);
router.get("/notificaciones", isLoggedIn, home.renderNotifications);

router.get("/inicio/elecciones", isLoggedIn, isPasswordUpdatedIn, elecciones.renderList);
router.get("/inicio/elecciones/voto/:id", isLoggedIn, isPasswordUpdatedIn, elecciones.renderVote);
router.post("/inicio/elecciones/voto/:id", isLoggedIn, isPasswordUpdatedIn, elecciones.vote);
router.get("/inicio/elecciones/resultado/:id", isLoggedIn, isPasswordUpdatedIn, elecciones.renderResult);

export default router;