export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    res.status(400);
    const errorDetails = error.errors
      ? error.errors.map((err) => `${err.path.slice(1).join('.')} ${err.message}`).join(', ')
      : error.message;
    return next(new Error(errorDetails));
  }
};
