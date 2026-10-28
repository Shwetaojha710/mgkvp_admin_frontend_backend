const jwt = require('jsonwebtoken');
const { fail } = require('../utils/response');

function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const tokenFromHeader = header.startsWith('Bearer ') ? header.slice(7) : null;
    const token = tokenFromHeader || req.cookies?.token;

    if (!token) {
      return fail(res, 'Authentication required', 401);
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: payload.id,
      username: payload.username,
      email: payload.email,
      role: payload.role,
      fullName: payload.fullName,
    };
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return fail(res, 'Session expired. Please log in again.', 401);
    }
    return fail(res, 'Invalid or unauthorized token', 401);
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, 'Authentication required', 401);
    }
    if (roles.length && !roles.includes(req.user.role)) {
      return fail(res, 'Forbidden', 403);
    }
    return next();
  };
}

/** Admin panel operators: Admin + Webmaster + Faculty + Head portals */
const authorizeStaff = authorize('admin', 'webmaster', 'faculty', 'head');

module.exports = { authenticate, authorize, authorizeStaff };
