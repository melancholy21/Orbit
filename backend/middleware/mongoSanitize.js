const sanitizeObject = (obj) => {
  if (obj && typeof obj === 'object') {
    for (const key in obj) {
      if (key.startsWith('$') || key.startsWith('.')) {
        delete obj[key];
      } else {
        sanitizeObject(obj[key]);
      }
    }
  }
};

export const mongoSanitize = (req, res, next) => {
  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);
  next();
};
