import { Router, type IRouter } from "express";
import healthRouter from "./health";
import vendorsRouter from "./vendors";
import productsRouter from "./products";
import discoveryRouter from "./discovery";
import emailVerificationRouter from "./email-verification";

const router: IRouter = Router();

router.use(healthRouter);
router.use(vendorsRouter);
router.use(productsRouter);
router.use(discoveryRouter);
router.use(emailVerificationRouter);

export default router;
