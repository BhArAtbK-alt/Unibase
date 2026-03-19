import pool from "../config/pg.js";

export const listProjectFiles = async (req, res) => {
    const { projectId } = req.query;

    if (!projectId) {
        return res.status(400).json({ success: false, message: "Project ID is required" });
    }

    const schemaName = `proj_${projectId}`;

    try {
        // Query the storage table within the specific project schema
        const query = `
            SELECT id, file_name, file_type, size, url, created_at 
            FROM "${schemaName}"._ub_storage 
            ORDER BY created_at DESC;
        `;
        
        const result = await pool.query(query);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (err) {
        console.error("Fetch Files Error:", err);
        
        // If the table doesn't exist yet, return an empty array instead of crashing
        if (err.code === '42P01') { 
            return res.json({ success: true, data: [] });
        }

        res.status(500).json({ success: false, message: "Could not retrieve files" });
    }
};