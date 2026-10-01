const errorHandler = (err, _req, res, _next) => {
  const status = err.statusCode || 500;

  if(status >= 500){
    console.error("Server Error:", err);
  }

  if(err.code === '23505'){
    return res.status(409).json({ message: "Resource already exists" });
  }

  const message = err.isApiError ? err.message : (status >= 500 ? "Internal Server Error" : err.message);

  res.status(status).json({
    error: message,
    message: message
  });
};

const notFoundHandler = (_req, res) => {
  res.status(404).json({ error: "Not Found" });
}

module.exports = { errorHandler, notFoundHandler }; 