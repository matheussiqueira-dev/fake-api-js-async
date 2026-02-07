class RequestLogger {
  log(entry) {
    const payload = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'http_request',
      ...entry
    };

    console.log(JSON.stringify(payload));
  }

  error(entry) {
    const payload = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'http_error',
      ...entry
    };

    console.error(JSON.stringify(payload));
  }
}

module.exports = {
  RequestLogger
};