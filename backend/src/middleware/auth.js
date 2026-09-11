const {verifyToken} = require("../utils/jwt");
const ApiError = require("../utils/ApiErrors");

const requireAuth = (req, _res, next) => {
  try{
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      throw ApiError.unauthorized("No token provided");
    }
    const decoded = verifyToken(token);
    req.user = {id: decoded.id, email: decoded.email,name: decoded.name};
    next();
  } catch (error) {
    if(error.isApiError){
      next(error);
    }
    next(ApiError.unauthorized("Invalid token"));
  }
};

module.exports = requireAuth;