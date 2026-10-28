const authService = require('../services/authService');
const { success, fail } = require('../utils/response');

async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return fail(res, 'Username/email and password are required', 400);
    }

    const result = await authService.login(String(username).trim(), password);

    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000,
    });

    return success(res, result, 'Login successful');
  } catch (err) {
    return next(err);
  }
}

async function logout(req, res) {
  res.clearCookie('token');
  return success(res, null, 'Logged out successfully');
}

async function me(req, res, next) {
  try {
    const user = await authService.findById(req.user.id);
    if (!user) {
      return fail(res, 'User not found', 404);
    }
    return success(res, {
      id: user.Id,
      username: user.Username,
      email: user.Email,
      fullName: user.FullName,
      role: user.Role,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { login, logout, me };
