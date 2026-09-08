class apiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isApiError = true;
  }

  static badRequest(message) {
    return new apiError(message, 400);
  }
  static unauthorized(message = "Unauthorized") {
    return new apiError(message, 401);
  }
  static forbidden(message = "Forbidden") {
    return new apiError(message, 403);
  }
  static notFound(message = "Not Found") {
    return new apiError(message, 404);
  }
  static conflict(message) {
    return new apiError(message, 409);
  }
}

module.exports = apiError;