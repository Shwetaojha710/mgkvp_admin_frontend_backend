const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

async function findByUsernameOrEmail(login) {
  const result = await query(
    `SELECT Id, Username, Email, PasswordHash, FullName, Role, IsActive
     FROM dbo.Administrators
     WHERE (Username = @login OR Email = @login) AND IsActive = 1`,
    { login }
  );
  return result.recordset[0] || null;
}

async function findById(id) {
  const result = await query(
    `SELECT Id, Username, Email, FullName, Role, IsActive, CreatedAt
     FROM dbo.Administrators
     WHERE Id = @id AND IsActive = 1`,
    { id }
  );
  return result.recordset[0] || null;
}

async function login(loginId, password) {
  const user = await findByUsernameOrEmail(loginId);
  if (!user) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  const match = await bcrypt.compare(password, user.PasswordHash);
  if (!match) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  const payload = {
    id: user.Id,
    username: user.Username,
    email: user.Email,
    role: user.Role,
    fullName: user.FullName,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });

  return {
    token,
    user: {
      id: user.Id,
      username: user.Username,
      email: user.Email,
      fullName: user.FullName,
      role: user.Role,
    },
  };
}

module.exports = {
  login,
  findById,
  findByUsernameOrEmail,
};
