import pool from "../../Backend/config/pg.js";
import { logSystemAction } from "../utils/logger.js"; 

export const executeEditorSql = async (projectId, sqlQuery) => {
    const client = await pool.connect(); 
    const startTimer = performance.now(); 
    let durationMs = 0;

    try {
        await client.query(`SET search_path TO "proj_${projectId}"`);
        
        const result = await client.query(sqlQuery);
        durationMs = (performance.now() - startTimer).toFixed(2);

        // Success: Log with metadata (command + rowCount)
        logSystemAction(
            projectId, 
            sqlQuery, 
            200, 
            durationMs, 
            null, 
            { command: result.command, rowCount: result.rowCount }
        );

        return {
            success: true,
            meta: {
                command: result.command, 
                rowCount: result.rowCount || 0,
                duration: `${durationMs}ms`,
                columns: result.fields ? result.fields.map(f => f.name) : [] 
            },
            data: result.rows || []
        };

    } catch (err) {
        durationMs = (performance.now() - startTimer).toFixed(2);

        // Error: Log with metadata (error position)
        logSystemAction(
            projectId, 
            sqlQuery, 
            500, 
            durationMs, 
            err.message, 
            { position: err.position }
        );

        return {
            success: false,
            message: err.message, 
            position: err.position 
        };
    } finally {
        await client.query(`SET search_path TO public`);
        client.release();
    }
};