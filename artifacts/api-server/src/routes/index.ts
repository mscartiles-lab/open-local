import { Router, type IRouter } from "express";
import healthRouter from "./health";
import vendorsRouter from "./vendors";
import productsRouter from "./products";
import discoveryRouter from "./discovery";

const router: IRouter = Router();

router.use(healthRouter);
router.use(vendorsRouter);
router.use(productsRouter);
router.use(discoveryRouter);

export default router;
