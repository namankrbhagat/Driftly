const errorHandler = (err, _req, res, _next) => {
  const status = err.statusCode || 500;

  if(status >= 500){
    console.log("Server Error:", err);
  }

  if(err.code === '23505'){
    return res.status(409).json({ message: "Resource already exists" });
  }

  res.status(status).json({
    error: status >= 500 ? "Internal Server Error" : err.message,
  });
};

const notFoundHandler = (_req, res) => {
  res.status(404).json({ error: "Not Found" });
}

module.exports = { errorHandler, notFoundHandler }; 