import pool from "../config/pg.js";
import { getSchemaId } from "../utils/getSchemaId.js";

export const queryDocs = async (api_key, payload) => {

    const { collection, filters } = payload; 
    const client = await pool.connect();

    let schemaName;
    try {
        const schemaId = await getSchemaId(api_key);
        schemaName = "proj_" + schemaId;
        
    } catch (e) {
        return { success: false, message: "Invalid API Key", data: null };
    }

    try {
        let queryParams = [collection];
        let whereClauses = [];

        filters.forEach((f, index) => {
            const { field, operator, value } = f;
            
            const path = `{${field.split('.').join(',')}}`;

            const pathIdx = queryParams.length + 1;
            const valIdx = queryParams.length + 2;
            
            queryParams.push(path, value);

            let castType = "";
            if (typeof value === 'number') castType = "::float";
            if (typeof value === 'boolean') castType = "::boolean";

            const sqlOp = getSqlOp(operator);
            whereClauses.push(`(d.data#>>$${pathIdx})${castType} ${sqlOp} $${valIdx}`);
        });

        const query = `
            SELECT d.id, d.data, d.created_at
            FROM "${schemaName}"._ub_collection_data d
            JOIN "${schemaName}"._ub_collections c ON d.collection_id = c.id
            WHERE c.name = $1 
            ${whereClauses.length > 0 ? 'AND ' + whereClauses.join(' AND ') : ''}
            ORDER BY d.created_at DESC;
        `;

        const result = await client.query(query, queryParams);
        return { success: true, data: result.rows };

    } catch (err) {
        console.error(err);
        return { success: false, message: err.message };
    } finally {
        client.release();
    }
};

function getSqlOp(op) {
    const ops = { "==": "=", "!=": "!=", ">": ">", "<": "<", ">=": ">=", "<=": "<=" };
    return ops[op] || "=";
}