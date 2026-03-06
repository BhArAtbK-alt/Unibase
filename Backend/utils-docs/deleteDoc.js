import pool from "../config/pg.js";
import { getSchemaId } from "../utils/getSchemaId.js";



export const deleteDoc = async (api_key, payload) => {
    const { id, filters, collection } = payload;
    const client = await pool.connect();

    try {
        let queryParams = [];
        let whereClauses = [];

        if (id) {
            queryParams.push(id);
            whereClauses.push(`d.id = $1`);
        } else if (filters?.length > 0) {
            filters.forEach((f) => {
                const path = `{${f.field.split('.').join(',')}}`;
                queryParams.push(path, f.value);
                whereClauses.push(`(d.data#>>$${queryParams.length - 1}) = $${queryParams.length}`);
            });
        } else {
            return { success: false, message: "Delete requires an ID or Filters." };
        }

        const query = `
            DELETE FROM "${schemaName}"._ub_collection_data d
            USING "${schemaName}"._ub_collections c
            WHERE d.collection_id = c.id 
            AND c.name = $${queryParams.length + 1}
            AND ${whereClauses.join(' AND ')};
        `;
        
        queryParams.push(collection);
        const result = await client.query(query, queryParams);

        return { success: true, message: `Deleted ${result.rowCount} docs.` };
    } finally {
        client.release();
    }
};