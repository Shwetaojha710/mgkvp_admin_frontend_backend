function success(res, data = null, message = 'Success', status = 200) {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
}

function fail(res, message = 'Error', status = 400, errors = null) {
  return res.status(status).json({
    success: false,
    message,
    errors,
  });
}

module.exports = { success, fail };
