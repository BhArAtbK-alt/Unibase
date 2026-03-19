import pool from "../config/pg.js";
import { getSchemaId } from "../utils/getSchemaId.js";
import fs from 'fs';
import path from 'path';

export const uploadFileLocal = async (req, res) => {
    const apiKey = req.headers['ub-api-key'];
    const file = req.file;
    const { customFileName } = req.body;

    if (!file) return res.status(400).json({ success: false, message: "No file provided" });

    try {
        // 1. Resolve the ID (using your existing helper)
        const schemaId = await getSchemaId(apiKey);
        
        // 2. Define our paths using the 'proj_' prefix you mentioned
        const folderName = `proj_${schemaId}`;
        const targetDir = path.join(process.cwd(), 'uploads', folderName);
        const schemaName = folderName; // For the SQL query

        // 3. Create the directory if it doesn't exist
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // 4. Handle filename (sanitize custom name or use original)
        const extension = path.extname(file.originalname);
        const timestamp = Date.now();
        const safeName = customFileName 
            ? `${customFileName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${timestamp}${extension}`
            : `${path.parse(file.originalname).name}-${timestamp}${extension}`;

        const finalPath = path.join(targetDir, safeName);

        // 5. Move the file from the temp location to the project folder
        fs.renameSync(file.path, finalPath);

        // 6. DB entry - using your dynamic schema name
        const publicUrl = `/uploads/${folderName}/${safeName}`;
        const query = `
            INSERT INTO "${schemaName}"._ub_storage (file_name, file_type, size, url)
            VALUES ($1, $2, $3, $4) RETURNING *;
        `;
        
        const result = await pool.query(query, [safeName, file.mimetype, file.size, publicUrl]);

        res.json({
            success: true,
            message: "File uploaded to project storage",
            data: result.rows[0]
        });

    } catch (err) {
        // Cleanup: remove temp file if it exists and move failed
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        
        console.error("Upload Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};