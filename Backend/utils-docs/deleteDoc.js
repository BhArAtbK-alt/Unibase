import pool from "../config/pg.js";
import { getSchemaId } from "../utils/getSchemaId.js";
import { logSystemAction } from "../utils/logger.js";

export const deleteDoc = async (api_key, payload) => {
    const { id, filters, collection } = payload;
    const startTimer = performance.now();
    let schemaId;
    let schemaName;

    // 1. Resolve Schema
    try {
        schemaId = await getSchemaId(api_key);
        if (!schemaId) return { success: false, message: "Invalid API Key" };
        schemaName = `proj_${schemaId}`;
    } catch (e) {
        return { success: false, message: "Server Error during schema resolution" };
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // Start Transaction

        let queryParams = [];
        let whereClauses = [];

        // 2. Build Query
        if (id) {
            queryParams.push(id);
            whereClauses.push(`d.id = $1`);
        } else if (filters?.length > 0) {
            // Fix: Use jsonb_extract_path_text to handle dynamic paths safely
            filters.forEach((f, index) => {
                const pathParts = f.field.split('.'); // Handle nested JSON like 'user.name'
                queryParams.push(f.value);
                const paramIdx = queryParams.length;
                whereClauses.push(`jsonb_extract_path_text(d.data, ${pathParts.map(p => `'${p}'`).join(',')}) = $${paramIdx}`);
            });
        } else {
            throw new Error("Delete requires an ID or Filters.");
        }

        // Add collection name as the last parameter
        queryParams.push(collection);
        const colIdx = queryParams.length;

        const query = `
            DELETE FROM "${schemaName}"._ub_collection_data d
            USING "${schemaName}"._ub_collections c
            WHERE d.collection_id = c.id 
            AND c.name = $${colIdx}
            AND ${whereClauses.join(' AND ')};
        `;

        const result = await client.query(query, queryParams);
        await client.query('COMMIT'); // Commit Transaction

        // 3. Log Success
        const durationMs = Math.round(performance.now() - startTimer);
        logSystemAction(schemaId, `DELETE_DOC: ${collection}`, 200, durationMs, null, { deletedCount: result.rowCount });

        return { success: true, message: `Deleted ${result.rowCount} docs.` };

    } catch (err) {
        await client.query('ROLLBACK'); // Rollback on any failure
        const durationMs = Math.round(performance.now() - startTimer);
        
        // 4. Log Failure
        logSystemAction(schemaId, `DELETE_DOC: ${collection}`, 500, durationMs, err.message);
        
        console.error("DeleteDoc Error:", err.message);
        return { success: false, message: err.message };
    } finally {
        client.release();
    }
};