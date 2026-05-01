import pg from "../config/pg.js";
import { getSchemaId } from "../utils/getSchemaId.js";
import { logSystemAction } from "../utils/logger.js"; // Your logging helper

export const executeSql = async (api_key, payload) => {
    const { sql, params } = payload;
    let schemaId; // We need this for the logs
    console.log("hot")
    try {
        schemaId = await getSchemaId(api_key);
    } catch (e) {
        return { success: false, message: "Invalid API Key", data: null };
    }

    const client = await pg.connect();
    const startTimer = performance.now();
    const schemaName = `proj_${schemaId}`;

    try {
        await client.query('BEGIN');
        await client.query(`SET search_path TO "${schemaName}"`);

        const response = await client.query(sql, params);

        const durationMs = Math.round(performance.now() - startTimer);
        
        // Log Success
        logSystemAction(schemaId, sql, 200, durationMs, null, { rowCount: response.rowCount });

        await client.query('COMMIT');

        return {
            success: true,
            message: "Query executed successfully.",
            data: response.rows,
            meta: { duration: `${durationMs}ms` }
        };

    } catch (err) {
        await client.query('ROLLBACK');
        const durationMs = Math.round(performance.now() - startTimer);
        
        
        // Log Failure
        logSystemAction(schemaId, sql, 500, durationMs, err.message);

        return {
            success: false,
            message: `Database Error: ${err.message}`,
            data: null
        };

    } finally {
        // SECURITY CRITICAL: Always reset the search path before releasing
        try {
            await client.query(`SET search_path TO public`);
        } catch (resetErr) {
            console.error("Failed to reset search_path:", resetErr);
        }
        client.release();
    }
};