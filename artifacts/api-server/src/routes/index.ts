import { Router, type IRouter } from "express";
import healthRouter from "./health";
import boardRouter from "./board";
import blogsRouter from "./blogs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(boardRouter);
router.use(blogsRouter);

export default router;
