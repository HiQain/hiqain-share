import { Router, type IRouter } from "express";
import healthRouter from "./health";
import boardRouter from "./board";
import blogsRouter from "./blogs";
import screenShareRouter from "./screen-share";
import chatRouter from "./chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use(boardRouter);
router.use(blogsRouter);
router.use(screenShareRouter);
router.use(chatRouter);

export default router;
