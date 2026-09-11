import { Router, type IRouter } from 'express';
import healthRouter from './health';
import diagnoseRouter from './diagnose';
import notificationsRouter from './notifications';
import favoritesRouter from "./favorites";
import contentRouter from "./content";

const router: IRouter = Router();

router.use(healthRouter);
router.use(diagnoseRouter);
router.use(notificationsRouter);
router.use(favoritesRouter);
router.use(contentRouter);

export default router;
