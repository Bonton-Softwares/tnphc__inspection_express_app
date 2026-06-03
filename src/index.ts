import dotenv from "dotenv";   // ✅ ADD THIS
dotenv.config();       

import express from "express";
import cors from "cors";
import routes from "./routes";

const app = express();
const PORT = 3000;

// ✅ ALWAYS FIRST
app.use(cors());
app.use(express.json());

// ✅ THEN ROUTES
app.use("/v1", routes);

app.get("/", (req, res) => {
 
    res.status(200).json({
 
        success: true,
 
        message: "API Server Running"
 
    });
 
});




app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});