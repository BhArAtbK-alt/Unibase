import pool from "../config/pg.js";

export const uploadFileLocal = async (req, res) => {
    const { projectId } = req.body;
    const file = req.file;

    if (!file || !projectId) {
        return res.status(400).json({ success: false, message: "Missing data" });
    }

    const schemaName = `proj_${projectId}`;
    const publicUrl = `/uploads/${projectId}/${file.filename}`;

    try {
        // We use the system table _ub_storage within the project's schema
        const query = `
            INSERT INTO "${schemaName}"._ub_storage (file_name, file_type, size, url)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        
        const values = [file.filename, file.mimetype, file.size, publicUrl];
        const result = await pool.query(query, values);

        res.status(201).json({
            success: true,
            message: "File uploaded and registered",
            data: result.rows[0]
        });
    } catch (err) {
        console.error("Storage DB Error:", err);
        res.status(500).json({ success: false, message: "Database error during registration" });
    }
};