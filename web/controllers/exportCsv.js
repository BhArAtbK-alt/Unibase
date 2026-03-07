import { Parser } from 'json2csv';
import pool from '../config/pg.js';
// Import your DB manager or config here
// import { getProjectDbClient } from './dbManager';

export const exportCsv = async (req, res) => {
  const { projectId, tableName } = req.body;

  if (!projectId || !tableName) {
    return res.status(400).json({ success: false, message: "Missing projectId or tableName" });
  }

  let schemaName = "proj_" + projectId;

  try {
    

    // 2. Fetch the data from the requested table
    // Using raw query to be flexible with different table schemas
    const result = await pool.query(`SELECT * FROM "${schemaName}"."${tableName}"`);
    const rows = result.rows;

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: "No data found in table" });
    }

    // 3. Convert JSON to CSV
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(rows);

    // 4. Set Headers for File Download
    const fileName = `${tableName}_export_${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    // 5. Send the CSV data
    return res.status(200).send(csv);

  } catch (error) {
    console.error("Export CSV Error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to export CSV", 
      error: error.message 
    });
  }
};