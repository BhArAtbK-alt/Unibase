import express from "express";
// Assuming these are your utility functions for the NoSQL layer
import { getAllDocs } from "../utils-docs/getAllDocs.js";
import { queryDocs } from "../utils-docs/queryDocs.js";
//import { getDocById } from "../utils-docs/getDocById.js";
import { addDoc } from "../utils-docs/addDoc.js";
import { updateDoc } from "../utils-docs/updateDoc.js";
import { deleteDoc } from "../utils-docs/deleteDoc.js";


const router = express.Router();

router.post("/collections", async (req, res) => {
    console.log('df');
    
    const payload = req.body;
    const api_key = req.headers['ub-api-key'];
    console.log(api_key);
    
    const action = payload.action;

    // Basic validation
    if (!payload.collection) {
        return res.status(400).json({ success: false, message: "Collection name is required" });
    }

    try {
        let response;
        switch (action) {
            case "get_all_docs":
                response = await getAllDocs(api_key, payload);
                return res.status(response.success ? 200 : 400).json(response);

            case "query_docs":
                // Handles get(field, operator, value) logic
                response = await queryDocs(api_key, payload);
                return res.status(response.success ? 200 : 400).json(response);

            case "get_doc_by_id":
                response = await getDocById(api_key, payload);
                return res.status(response.success ? 200 : 404).json(response);

            case "add_doc":
                response = await addDoc(api_key, payload);
                return res.status(response.success ? 201 : 400).json(response);

            case "delete_doc":
                response = await deleteDoc(api_key, payload);
                return res.status(response.success ? 200 : 400).json(response);

            case "update_doc":
                response = await updateDoc(api_key, payload);
                return res.status(response.success ? 200 : 400).json(response);

            default:
                return res.status(400).json({ success: false, message: "Invalid Collection Action" });
        }
    } catch (err) {
        console.error("Collection Route Error:", err);
        res.status(500).json({ success: false, message: "Internal Collection Error" });
    }
});

export default router;