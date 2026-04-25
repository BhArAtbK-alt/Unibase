import express from "express";
import {createNode} from '../utils-graph/createNode.js';
import { createRelationship } from "../utils-graph/createRelationship.js";
import { deleteRelationship } from "../utils-graph/deleteRelationship.js";
import { getNeighbors } from "../utils-graph/getNeighbors.js";




const router = express.Router();

router.post("/graph", async (req, res) => {
    const api_key = req.headers['ub-api-key'];
    const { action } = req.body;

    // 1. Initialize with null to avoid the "access before initialization" error
    let result = null; 

    try {
        switch (action) {
            case "CREATE_NODE":
                result = await createNode(api_key, {
                    node_name: req.body.node_name,
                    properties: req.body.properties
                });
                break;

            case "CREATE_RELATIONSHIP":
                result = await createRelationship(api_key, {
                    from_node: req.body.from_node,
                    to_node: req.body.to_node,
                    relationship: req.body.relationship,
                    properties: req.body.properties
                });
                break;

            case "DELETE_RELATIONSHIP": 
                result = await deleteRelationship(api_key, {
                    from_node: req.body.from_node,
                    to_node: req.body.to_node,
                    relationship: req.body.relationship
                });
                break;


            case "GET_NEIGHBORS":
                result = await getNeighbors(api_key, req.body);
                break;

            default:
                return res.status(400).json({ success: false, message: "Unknown action" });
        }

        // 2. Check if result exists before sending
        if (result) {
            return res.status(result.success ? 200 : 400).json(result);
        } else {
            throw new Error("No result returned from graph operation");
        }

    } catch (err) {
        console.error("Graph Error:", err.message);
        // 3. This catch block now handles errors without crashing on an uninitialized variable
        res.status(500).json({ success: false, message: err.message });
    }
});

export default router;