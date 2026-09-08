const {verifyToken} = require("../utils/jwt");
const apiError = require("../utils/apiErrors");

const requireAuth = (req, _res, next) => {
  try{
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      throw apiError.UnauthorizedError("No token provided");
    }
    const decoded = verifyToken(token);
    req.user = {id: decoded.id, email: decoded.email,name: decoded.name};
    next();
  } catch (error) {
    if(error.isapiError){
      next(error);
    }
    next(apiError.UnauthorizedError("Invalid token"));
  }
};

module.exports = requireAuth;