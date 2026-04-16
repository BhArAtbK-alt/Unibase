import pool from "../config/pg.js";
import { getSchemaId } from "../utils/getSchemaId.js";

export const deleteRelationship = async (api_key, payload) => {
    let schemaName;

    try {
        const schemaId = await getSchemaId(api_key);
        schemaName = "proj_" + schemaId;
    } catch (e) {
        return { success: false, message: "Invalid API Key", data: null };
    }

    const { from_node, to_node, relationship } = payload;

    if (!from_node || !to_node || !relationship) {
        return { success: false, message: "Missing from_node, to_node, or relationship type.", data: null };
    }

    // SQL: Find the UUIDs for both node names and delete the matching edge
    const query = `
        DELETE FROM "${schemaName}"._ub_graph_edges
        WHERE source_node_id = (SELECT id FROM "${schemaName}"._ub_graph_nodes WHERE type = $1 LIMIT 1)
          AND target_node_id = (SELECT id FROM "${schemaName}"._ub_graph_nodes WHERE type = $2 LIMIT 1)
          AND relation_type = $3
        RETURNING id;
    `;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const result = await client.query(query, [from_node, to_node, relationship]);
        await client.query('COMMIT');

        // Check if a row was actually deleted
        if (result.rowCount === 0) {
            return {
                success: true,
                message: "No such relationship found to delete.",
                data: null
            };
        }

        return {
            success: true,
            message: "Relationship deleted successfully.",
            data: { edge_id: result.rows[0].id }
        };

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Delete Relationship Error:", err);
        return {
            success: false,
            message: `Database Error: ${err.message}`,
            data: null
        };
    } finally {
        client.release();
    }
};