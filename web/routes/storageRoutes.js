import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadFileLocal } from '../storage-controllers/uploadLocal.js';
import { listProjectFiles } from '../storage-controllers/listFiles.js';



const router = express.Router();

// 1. Configure Disk Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { projectId } = req.body;
        const dir = `uploads/${projectId}`;

        // Create folder if it doesn't exist
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const customName = req.body.customFileName || "file";
        const cleanName = customName.replace(/\s+/g, '-').toLowerCase();
        
        // Internal Suffix: Timestamp + Random String
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E4);
        cb(null, `${cleanName}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } 
});

// 2. The POST Route
router.post('/storage/upload', upload.single('file'), uploadFileLocal);

// GET all files for a project
router.get('/list', listProjectFiles);

export default router;