import { Router, type IRouter } from "express";
import healthRouter from "./health";
import vendorsRouter from "./vendors";
import productsRouter from "./products";
import discoveryRouter from "./discovery";
import emailVerificationRouter from "./email-verification";
import establishmentsRouter from "./establishments";
import listingsRouter from "./listings";
import eventsRouter from "./events";
import insightsRouter from "./insights";
import authRouter from "./auth";
import billingRouter from "./billing";
import adminRouter from "./admin";
import rewardsRouter from "./rewards";
import analyticsRouter from "./analytics";
import webhooksRouter from "./webhooks";
import onboardingRouter from "./onboarding";

const router: IRouter = Router();

router.use(healthRouter);
router.use(vendorsRouter);
router.use(productsRouter);
router.use(discoveryRouter);
router.use(emailVerificationRouter);
router.use(establishmentsRouter);
router.use(listingsRouter);
router.use(eventsRouter);
router.use(insightsRouter);
router.use(authRouter);
router.use(billingRouter);
router.use(adminRouter);
router.use(rewardsRouter);
router.use(analyticsRouter);
router.use(webhooksRouter);
router.use(onboardingRouter);

export default router;
