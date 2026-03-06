import pool from "../config/pg.js";
import { getSchemaId } from "../utils/getSchemaId.js";

export const getAllDocs = async (api_key, payload) => {
    
    let schemaName;
    try {
        const schemaId = await getSchemaId(api_key);
        schemaName = "proj_" + schemaId;

        
    } catch (e) {
        return { success: false, message: "Invalid API Key", data: null };
    }

    const { collection } = payload;
    const client = await pool.connect();

    try {
        const query = `
            SELECT 
                d.id, 
                d.data, 
                d.created_at, 
                d.updated_at
            FROM "${schemaName}"._ub_collection_data d
            JOIN "${schemaName}"._ub_collections c ON d.collection_id = c.id
            WHERE c.name = $1
            ORDER BY d.created_at DESC;
        `;

        const result = await client.query(query, [collection]);

        return {
            success: true,
            message: "Documents retrieved successfully.",
            data: result.rows 
        };

    } catch (err) {
        console.error("Error fetching documents:", err);
        return {
            success: false,
            message: `Database Error: ${err.message}`,
            data: null
        };
    } finally {
        client.release();
    }
};