import { Router, type IRouter } from 'express';
import healthRouter from './health';
import diagnoseRouter from './diagnose';
import notificationsRouter from './notifications';
import favoritesRouter from "./favorites";
import contentRouter from "./content";
import profileRouter from "./profile";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(diagnoseRouter);
router.use(notificationsRouter);
router.use(favoritesRouter);
router.use(contentRouter);
  router.use(profileRouter);
  router.use(storageRouter);

export default router;
