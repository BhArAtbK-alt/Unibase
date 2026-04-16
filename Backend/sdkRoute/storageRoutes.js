import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadFileLocal } from '../utils-storage/storageLocal.js';

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // We temporarily put it in 'uploads/temp' 
        // because we haven't resolved the API Key yet.
        // OR we can just use 'uploads/'
        const dir = `./uploads`;
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// The route: 
// 1. Multer catches the file first
// 2. Controller handles the API Key and moves the file to the right folder
router.post('/storage/upload', upload.single('file'), uploadFileLocal);

export default router;