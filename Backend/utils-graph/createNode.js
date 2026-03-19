import pool from "../config/pg.js";
import { getSchemaId } from "../utils/getSchemaId.js";

export const createNode = async (api_key, payload) => {
    let schemaName;

    try {
        const schemaId = await getSchemaId(api_key);
        schemaName = "proj_" + schemaId;
    } catch (e) {
        return { success: false, message: "Invalid API Key", data: null };
    }

    const { node_name, properties } = payload;

    if (!node_name) {
        return { success: false, message: "Node name is required.", data: null };
    }

    // SQL with ON CONFLICT DO NOTHING
    // This prevents the unique constraint error from firing
    const query = `
        INSERT INTO "${schemaName}"._ub_graph_nodes (type, properties)
        VALUES ($1, $2)
        ON CONFLICT (type) DO NOTHING
        RETURNING id, type, properties;
    `;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        
        const result = await client.query(query, [node_name, properties || {}]);
        
        await client.query('COMMIT');

        // If rowCount is 0, it means the ON CONFLICT was triggered
        if (result.rowCount === 0) {
            return {
                success: true,
                message: "Node already exists.",
                data: null
            };
        }

        return {
            success: true,
            message: "Node created successfully.",
            data: result.rows[0]
        };

    } catch (err) {
        // Keeping your error handling exactly as it was
        await client.query('ROLLBACK');
        console.error("Create Node Error:", err);

        return {
            success: false,
            message: `Database Error: ${err.message}`,
            data: null
        };

    } finally {
        client.release();
    }
};