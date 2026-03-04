import { Router } from "express";
import authAdminRouter from "./authAdmin";
import adminRouter from "./admin";
import publicRouter from "./public";

const router = Router();

router.use(authAdminRouter);
router.use(adminRouter);
router.use(publicRouter);

export default router;
