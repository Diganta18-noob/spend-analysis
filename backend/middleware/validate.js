/**
 * Express middleware factory that validates req.body against a Zod schema.
 * Uses .strict() so unknown fields cause a 400.
 *
 * Usage:
 *   app.post("/api/foo", validate(mySchema), handler);
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));
      return res.status(400).json({ error: "Validation error", details });
    }
    // Replace body with the parsed (and stripped) value
    req.body = result.data;
    next();
  };
}
