import pool from "../config/pg.js";
import { getSchemaId } from "../utils/getSchemaId.js";


export const updateDoc = async (api_key, payload) => {
    let schemaName;
    try {
        const schemaId = await getSchemaId(api_key);
        if (!schemaId) return { success: false, message: "Invalid API Key" };
        schemaName = "proj_" + schemaId;
    } catch (e) { return { success: false, message: "Server Error" }; }

    const { id, filters, data, collection } = payload;
    const client = await pool.connect();

    try {
        if (!id && (!filters || filters.length === 0)) {
            return { success: false, message: "Update rejected: No ID or filters provided." };
        }

        let queryParams = [];
        let whereClauses = [];

        if (id) {
            queryParams.push(id);
            whereClauses.push(`d.id = $${queryParams.length}`);
        } else {
            filters.forEach((f) => {
                const path = `{${f.field.split('.').join(',')}}`;
                queryParams.push(path, f.value);
                const cast = typeof f.value === 'number' ? '::float' : '';
                whereClauses.push(`(d.data#>>$${queryParams.length - 1})${cast} = $${queryParams.length}`);
            });
        }


        let updateExpression = "d.data";
        
        for (const [key, value] of Object.entries(data)) {
            const path = `{${key.split('.').join(',')}}`;
            queryParams.push(path, JSON.stringify(value));
            updateExpression = `jsonb_set(${updateExpression}, $${queryParams.length - 1}, $${queryParams.length}, true)`;
        }

        queryParams.push(collection);
        const collectionIdx = queryParams.length;

        const query = `
            UPDATE "${schemaName}"._ub_collection_data d
            SET 
                data = ${updateExpression},
                updated_at = NOW()
            FROM "${schemaName}"._ub_collections c
            WHERE d.collection_id = c.id 
            AND c.name = $${collectionIdx}
            AND ${whereClauses.join(' AND ')}
            RETURNING d.id, d.data;
        `;

        const result = await client.query(query, queryParams);

        return {
            success: true,
            count: result.rowCount,
            message: `Updated ${result.rowCount} documents.`,
            data: result.rows
        };

    } catch (err) {
        console.error("Update error:", err);
        return { success: false, message: err.message };
    } finally {
        client.release();
    }
};