import { Router } from "express";

import { isLoggedIn, isNotLoggedIn } from '../middlewares/authentication.js';
import { isVerified, isNotVerified, isPasswordUpdatedIn,  isNotPasswordUpdatedIn } from '../middlewares/verify.js';
import { reCaptchaV3 } from '../middlewares/recaptcha.js';
import authentication from "../controllers/authentication.controller.js";

const router = Router();

router.get('/login', isNotLoggedIn, authentication.renderLogin);
//router.post('/login', isNotLoggedIn, reCaptchaV3, authentication.login);
router.post('/login', isNotLoggedIn, authentication.login);

router.get('/forgot', isNotLoggedIn, authentication.renderForgot);
router.post('/forgot', isNotLoggedIn, authentication.forgot);

router.get('/reset/:token', isNotLoggedIn, authentication.renderReset);
router.post('/reset/:token', isNotLoggedIn, authentication.reset);

router.get("/update/password", isLoggedIn, authentication.renderUpdatePassword);
router.post("/update/password/token", isLoggedIn, authentication.updatePassword); 

router.get('/logout', isLoggedIn, authentication.Logout);

export default router;