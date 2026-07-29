import { Router, type IRouter } from "express";
import healthRouter from "./health";
import boardRouter from "./board";
import blogsRouter from "./blogs";
import screenShareRouter from "./screen-share";

const router: IRouter = Router();

router.use(healthRouter);
router.use(boardRouter);
router.use(blogsRouter);
router.use(screenShareRouter);

export default router;
