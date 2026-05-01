import pool from "../config/pg.js";
import { getSchemaId } from "../utils/getSchemaId.js";
import { logSystemAction } from "../utils/logger.js";

export const updateDoc = async (api_key, payload) => {
    const startTimer = performance.now();
    const { filters, data, collection } = payload;
    let schemaId, schemaName;

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
        await client.query('BEGIN');

        // 2. Resolve Collection ID
        const collRes = await client.query(`SELECT id FROM "${schemaName}"._ub_collections WHERE name = $1`, [collection]);
        if (collRes.rowCount === 0) throw new Error("Collection not found");
        const collectionId = collRes.rows[0].id;

        // 3. Build Dynamic Query
        let queryParams = [JSON.stringify(data), collectionId];
        let whereClauses = [];
        
        filters.forEach((f) => {
            queryParams.push(f.value);
            // Handle nested paths (e.g., 'user.profile.name' -> 'user', 'profile', 'name')
            const pathParts = f.field.split('.');
            const pathSql = pathParts.map(p => `'${p}'`).join(', ');
            
            whereClauses.push(`jsonb_extract_path_text(d.data, ${pathSql}) = $${queryParams.length}`);
        });

        // 4. Update Query (|| merges the existing JSONB data with new data)
        const updateQuery = `
            UPDATE "${schemaName}"._ub_collection_data d
            SET data = data || $1
            WHERE d.collection_id = $2
            AND ${whereClauses.join(' AND ')};
        `;

        const result = await client.query(updateQuery, queryParams);
        await client.query('COMMIT');

        // 5. Log Success
        const durationMs = (performance.now() - startTimer).toFixed(2);
        logSystemAction(schemaId, `UPDATE_DOC: ${collection}`, 200, durationMs, null, { updatedCount: result.rowCount });

        return { success: true, message: `Updated ${result.rowCount} docs.` };

    } catch (err) {
        await client.query('ROLLBACK');
        const durationMs = (performance.now() - startTimer).toFixed(2);
        
        logSystemAction(schemaId, `UPDATE_DOC: ${collection}`, 500, durationMs, err.message);
        
        console.error("UpdateDoc Error:", err.message);
        return { success: false, message: err.message };
    } finally {
        client.release();
    }
};