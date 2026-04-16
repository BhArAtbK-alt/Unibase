import express from "express";
import { getGraphNodes, getGraphEdges } from "../controllers/getGraph.js";

const router = express.Router();

router.get("/graph/nodes", getGraphNodes);
router.get("/graph/edges", getGraphEdges);

export default router;