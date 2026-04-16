import express from "express";
import cors from "cors";

//Backend Routes
import sendSqlReqRoute from './Backend/sqlRoute/sendSqlReq.js';
import sendSdkReqRoute from './Backend/sdkRoute/sendSdkReq.js';
import queryReq from './Backend/sdkRoute/query.js';
import authReq from './Backend/sdkRoute/auth.js';
import collectionReq from './Backend/sdkRoute/collection.js';
import sendStorageReq from './Backend/sdkRoute/storageRoutes.js';
import graphReq from './Backend/sdkRoute/graph.js';
import "dotenv/config";





const PORT = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static('uploads'));

app.use(express.json());


//app.use('/api', sendSdkReqRoute)
//app.use('/api', sendSqlReqRoute);
app.use('/api', queryReq)
app.use('/api', authReq);
app.use('/api', collectionReq);
app.use('/api', sendStorageReq);
app.use('/api', graphReq);


app.get("/health", (req, res) => {
    res.status(200).json({ status: "Engine is alive", timestamp: new Date() });
});

// Web routes
import authRoutes from './web/routes/authRoutes.js';
import projectRoutes from './web/routes/projectRoutes.js';
import collectionRoutes from './web/routes/collectionRoutes.js';
import storageRoutes from './web/routes/storageRoutes.js';
import graphRoutes from './web/routes/graphRoutes.js';

app.use('/api/internal', authRoutes);
app.use('/api/internal', projectRoutes);
app.use('/api/internal', collectionRoutes);
app.use('/api/internal', storageRoutes);
app.use('/api/internal', graphRoutes);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

