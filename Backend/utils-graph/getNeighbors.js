import pool from "../config/pg.js";
import { getSchemaId } from "../utils/getSchemaId.js";

export const getNeighbors = async (api_key, payload) => {
    const { node_name, relationship } = payload;
    const schemaId = await getSchemaId(api_key);
    const schemaName = `proj_${schemaId}`;

    // This query finds the node and joins it with all its targets
    let query = `
        SELECT 
            n2.type AS target_node, 
            e.relation_type, 
            e.properties AS edge_properties,
            n2.properties AS node_properties
        FROM "${schemaName}"._ub_graph_nodes n1
        JOIN "${schemaName}"._ub_graph_edges e ON n1.id = e.source_node_id
        JOIN "${schemaName}"._ub_graph_nodes n2 ON e.target_node_id = n2.id
        WHERE n1.type = $1
    `;

    const vals = [node_name];

    // Optional: Filter by a specific relationship (e.g., only 'FOLLOWS')
    if (relationship) {
        query += ` AND e.relation_type = $2`;
        vals.push(relationship);
    }

    const result = await pool.query(query, vals);
    return { success: true, data: result.rows };
};