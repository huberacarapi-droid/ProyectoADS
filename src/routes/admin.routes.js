import { Router } from "express";
import { isLoggedIn, isNotLoggedIn, isAdmin } from '../middlewares/authentication.js';

const router = Router();

import admin from "../controllers/admin/admin.controller.js";

/**
 *  Routes Administrador
 */
router.get("/administrar", isLoggedIn, isAdmin, admin.rendexIndex)

/**
 *  Routes Administrador - Usuarios
 */
import usuarios from "../controllers/admin/usuarios/usuarios.controller.js";
router.get("/administrar/usuarios", isLoggedIn, isAdmin, usuarios.renderList);
router.get("/administrar/usuarios/nuevo", isLoggedIn, isAdmin, usuarios.renderCreate);
router.post("/administrar/usuarios/nuevo", isLoggedIn, isAdmin, usuarios.create);
router.get("/administrar/usuarios/editar", isLoggedIn, isAdmin, usuarios.renderUpdate);
router.post("/administrar/usuarios/editar", isLoggedIn, isAdmin, usuarios.update);
router.post("/administrar/usuarios/resetear", isLoggedIn, isAdmin, usuarios.reset);
router.post("/administrar/usuarios/eliminar", isLoggedIn, isAdmin, usuarios.remove);
router.get("/administrar/usuarios/exportar", isLoggedIn, isAdmin, usuarios.exportToExcel);
router.post("/administrar/usuarios/importar", isLoggedIn, isAdmin, usuarios.importFromExcel);

/**
 *  Routes Administrador - Elecciones
 */
import elecciones from "../controllers/admin/elecciones/elecciones.controller.js";

router.get("/administrar/elecciones", isLoggedIn, isAdmin, elecciones.renderList);
router.get("/administrar/elecciones/nuevo", isLoggedIn, isAdmin, elecciones.renderCreate);
router.post("/administrar/elecciones/nuevo", isLoggedIn, isAdmin, elecciones.create);
router.get("/administrar/elecciones/editar/:id", isLoggedIn, isAdmin, elecciones.renderUpdate);
router.post("/administrar/elecciones/editar/:id", isLoggedIn, isAdmin, elecciones.update);
router.post("/administrar/elecciones/eliminar/:id", isLoggedIn, isAdmin, elecciones.remove);

router.get("/administrar/elecciones/programar/:id", isLoggedIn, isAdmin, elecciones.renderProgram);
router.post("/administrar/elecciones/programar/finalizar/:id", isLoggedIn, isAdmin, elecciones.finishProgram);
router.get("/administrar/elecciones/programar/actualizar/:id", isLoggedIn, isAdmin, elecciones.updateProgram);
router.post("/administrar/elecciones/programar/ejecutar/:id", isLoggedIn, isAdmin, elecciones.executeProgram);

import elecciones_inscritos from "../controllers/admin/elecciones/elecciones.inscritos.controller.js";
router.get("/administrar/elecciones/programar/inscritos/:id", isLoggedIn, elecciones_inscritos.renderList);
router.post("/administrar/elecciones/programar/inscritos/adicionar/:id_eleccion/:id_usuario", isLoggedIn, isAdmin, elecciones_inscritos.add);
router.post("/administrar/elecciones/programar/inscritos/eliminar/:id_eleccion/:id_usuario", isLoggedIn, isAdmin, elecciones_inscritos.remove);
router.post("/administrar/elecciones/programar/inscritos/llenar/:id_eleccion", isLoggedIn, isAdmin, elecciones_inscritos.addAll);
router.post("/administrar/elecciones/programar/inscritos/vaciar/:id_eleccion", isLoggedIn, isAdmin, elecciones_inscritos.removeAll);

import elecciones_moderadores from "../controllers/admin/elecciones/elecciones.moderadores.controller.js";
router.get("/administrar/elecciones/programar/moderadores/:id", isLoggedIn, elecciones_moderadores.renderList);
router.post("/administrar/elecciones/programar/moderadores/adicionar/:id_eleccion/:id_usuario", isLoggedIn, isAdmin, elecciones_moderadores.add);
router.post("/administrar/elecciones/programar/moderadores/eliminar/:id_eleccion/:id_usuario", isLoggedIn, isAdmin, elecciones_moderadores.remove);
router.post("/administrar/elecciones/programar/moderadores/llenar/:id_eleccion", isLoggedIn, isAdmin, elecciones_moderadores.addAll);
router.post("/administrar/elecciones/programar/moderadores/vaciar/:id_eleccion", isLoggedIn, isAdmin, elecciones_moderadores.removeAll);

import elecciones_frentes from "../controllers/admin/elecciones/elecciones.frentes.controller.js";
router.get("/administrar/elecciones/programar/frentes/:id", isLoggedIn, isAdmin, elecciones_frentes.renderList);
router.get("/administrar/elecciones/programar/frentes/nuevo/:id", isLoggedIn, isAdmin, elecciones_frentes.renderCreate);
router.post("/administrar/elecciones/programar/frentes/nuevo/:id", isLoggedIn, isAdmin, elecciones_frentes.create);
router.get("/administrar/elecciones/programar/frentes/editar/:id_eleccion/:id_frente", isLoggedIn, isAdmin, elecciones_frentes.renderUpdate);
router.post("/administrar/elecciones/programar/frentes/editar/:id_eleccion/:id_frente", isLoggedIn, isAdmin, elecciones_frentes.update);
router.post("/administrar/elecciones/programar/frentes/eliminar/:id_eleccion/:id_frente", isLoggedIn, isAdmin, elecciones_frentes.remove);

export default router;