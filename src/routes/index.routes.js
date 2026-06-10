import { Router } from "express";
const router = Router();
import { isLoggedIn, isNotLoggedIn } from '../middlewares/authentication.js';

import index from "../controllers/index.controller.js";

router.get("/", isNotLoggedIn, index.renderIndex);

router.get("/marco-teorico", isNotLoggedIn, index.renderMarcoTeorico);
router.get("/analisis-estructurado", isNotLoggedIn, index.renderAnalisisEstructurado);
router.get("/analisis-estructurado/modelo-ambiental", isNotLoggedIn, index.renderModeloAmbiental);
router.get("/analisis-estructurado/modelo-comportamiento", isNotLoggedIn, index.renderModeloComportamiento);
router.get("/analisis-estructurado", isNotLoggedIn, index.renderAnalisisEstructurado);
router.get("/orientado-objetos", isNotLoggedIn, index.renderOrientadoObjetos);
router.get("/uml", isNotLoggedIn, index.renderUML); 
router.get("/videos", isNotLoggedIn, index.renderVideos);

export default router;