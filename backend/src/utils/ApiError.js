class ApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isApiError = true;
  }

  static badRequest(message) {
    return new ApiError(message, 400);
  }
  static unauthorized(message = "Unauthorized") {
    return new ApiError(message, 401);
  }
  static forbidden(message = "Forbidden") {
    return new ApiError(message, 403);
  }
  static notFound(message = "Not Found") {
    return new ApiError(message, 404);
  }
  static conflict(message) {
    return new ApiError(message, 409);
  }
}

module.exports = ApiError;