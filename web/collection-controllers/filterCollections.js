import pool from "../config/pg.js";


export const filterCollections = async (req, res) => {
    // rawQuery is the string from the editor: "price > 100, status == 'active'"
    const { projectId, collectionName, rawQuery = "", limit = 20, offset = 0 } = req.body;

    if (!projectId || !collectionName) {
        return res.status(400).json({ success: false, message: "Missing projectId or collectionName" });
    }

    const schemaName = `proj_${projectId}`;
    const client = await pool.connect();

    try {
        let queryParams = [collectionName];
        let whereClauses = [];

        // --- INTERNAL PARSER LOGIC ---
        if (rawQuery.trim() !== "") {
            const segments = rawQuery.split(","); // Split by comma

            segments.forEach((segment) => {
                const regex = /([a-zA-Z0-9._]+)\s*(==|!=|>=|<=|>|<|array-contains)\s*(.*)/;
                const match = segment.trim().match(regex);

                if (match) {
                    let [_, field, operator, value] = match;
                    const path = `{${field.split('.').join(',')}}`;
                    
                    // Clean value and detect type
                    value = value.trim().replace(/['"]/g, "");
                    let typedValue = value;
                    if (!isNaN(value) && value !== "") typedValue = Number(value);
                    if (value === "true") typedValue = true;
                    if (value === "false") typedValue = false;

                    if (operator === "array-contains") {
                        const jsonValue = JSON.stringify([typedValue]);
                        queryParams.push(path, jsonValue);
                        whereClauses.push(`(d.data#>$${queryParams.length - 1}) @> $${queryParams.length}`);
                    } else {
                        queryParams.push(path, typedValue);
                        const sqlOp = getSqlOp(operator);
                        let cast = typeof typedValue === 'number' ? "::float" : 
                                   typeof typedValue === 'boolean' ? "::boolean" : "";
                        
                        whereClauses.push(`(d.data#>>$${queryParams.length - 1})${cast} ${sqlOp} $${queryParams.length}`);
                    }
                }
            });
        }

        const whereSql = whereClauses.length > 0 ? `AND ${whereClauses.join(' AND ')}` : '';

        // Execute queries
        const dataSql = `
            SELECT d.id, d.data, d.created_at
            FROM "${schemaName}"._ub_collection_data d
            JOIN "${schemaName}"._ub_collections c ON d.collection_id = c.id
            WHERE c.name = $1 ${whereSql}
            ORDER BY d.created_at DESC
            LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)};
        `;

        const countSql = `SELECT COUNT(*) FROM "${schemaName}"._ub_collection_data d JOIN "${schemaName}"._ub_collections c ON d.collection_id = c.id WHERE c.name = $1 ${whereSql};`;

        const [dataRes, countRes] = await Promise.all([
            client.query(dataSql, queryParams),
            client.query(countSql, queryParams)
        ]);

        res.json({
            success: true,
            data: dataRes.rows,
            total: parseInt(countRes.rows[0].count)
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
};

function getSqlOp(op) {
    const ops = { "==": "=", "!=": "!=", ">": ">", "<": "<", ">=": ">=", "<=": "<=" };
    return ops[op] || "=";
}