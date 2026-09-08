require("dotenv").config();
const express = require("express");
const cors = require("cors");
const apiRoutes = require("./src/routes");
const {errorHandler,notFoundHandler} = require("./src/middleware/errorHandler");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
)
app.use(express.json({limit: "1mb"}));

app.get("/", (_req, res) => {
  res.json({ message: "Welcome to the Driftly API" });
});
app.use("/api", apiRoutes);
app.use(errorHandler);
app.use(notFoundHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;