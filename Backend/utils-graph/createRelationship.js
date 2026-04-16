import pool from "../config/pg.js";
import { getSchemaId } from "../utils/getSchemaId.js";

export const createRelationship = async (api_key, payload) => {
    let schemaName;

    try {
        const schemaId = await getSchemaId(api_key);
        schemaName = "proj_" + schemaId;
    } catch (e) {
        return { success: false, message: "Invalid API Key", data: null };
    }

    const { from_node, to_node, relationship, properties } = payload;

    if (!from_node || !to_node || !relationship) {
        return { success: false, message: "Missing required fields: from_node, to_node, or relationship.", data: null };
    }

    // SQL using subqueries to find UUIDs by the 'type' name
    // ON CONFLICT prevents duplicates based on your unique constraint
    const query = `
        INSERT INTO "${schemaName}"._ub_graph_edges (source_node_id, target_node_id, relation_type, properties)
        VALUES (
            (SELECT id FROM "${schemaName}"._ub_graph_nodes WHERE type = $1 LIMIT 1),
            (SELECT id FROM "${schemaName}"._ub_graph_nodes WHERE type = $2 LIMIT 1),
            $3, 
            $4
        )
        ON CONFLICT (source_node_id, target_node_id, relation_type) DO NOTHING
        RETURNING id, source_node_id, target_node_id, relation_type, properties;
    `;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        
        const result = await client.query(query, [from_node, to_node, relationship, properties || {}]);
        
        await client.query('COMMIT');

        // Check if nodes existed (if subquery returned NULL, source_node_id will be NULL/error)
        // If rowCount is 0, the relationship already existed
        if (result.rowCount === 0) {
            return {
                success: true,
                message: "Relationship already exists or one of the nodes was not found.",
                data: null
            };
        }

        return {
            success: true,
            message: "Relationship created successfully.",
            data: result.rows[0]
        };

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Create Relationship Error:", err);

        // Handle case where nodes don't exist (violates NOT NULL on source/target IDs)
        if (err.code === '23502') {
            return {
                success: false,
                message: "Failed to create relationship: One or both nodes do not exist.",
                data: null
            };
        }

        return {
            success: false,
            message: `Database Error: ${err.message}`,
            data: null
        };

    } finally {
        client.release();
    }
};