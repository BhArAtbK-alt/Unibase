import pool from "../config/pg.js";
import { getSchemaId } from "../utils/getSchemaId.js";

export const addDoc = async (api_key, payload) => {
    let schemaName;
    try {
        const schemaId = await getSchemaId(api_key);
        if (!schemaId) return { success: false, message: "Invalid API Key" };
        schemaName = "proj_" + schemaId;
    } catch (e) {
        return { success: false, message: "Server Error during schema resolution" };
    }

    const { collection, data } = payload;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const collQuery = `SELECT id FROM "${schemaName}"._ub_collections WHERE name = $1`;
        const collRes = await client.query(collQuery, [collection]);

        if (collRes.rowCount === 0) {
            throw new Error(`Collection '${collection}' not found. Please create it first.`);
        }

        const collectionId = collRes.rows[0].id;

        const insertQuery = `
            INSERT INTO "${schemaName}"._ub_collection_data (collection_id, data)
            VALUES ($1, $2)
            RETURNING id, data, created_at;
        `;

        const result = await client.query(insertQuery, [collectionId, data]);

        await client.query('COMMIT');

        return {
            success: true,
            message: "Document added successfully",
            data: result.rows[0]
        };

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("AddDoc Error:", err.message);
        return { success: false, message: err.message };
    } finally {
        client.release();
    }
};