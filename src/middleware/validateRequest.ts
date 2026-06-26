import { Request, Response, NextFunction } from "express";
import { ObjectSchema } from "joi";

export const validateRequest = (
  schema: ObjectSchema,
  property: "body" | "query" | "params" = "body"
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.query["$schema"] === "true") {
      return res.status(200).send({
        statusCode: 200,
        message: "Schema Description",
        data: { $schema: schema.describe() },
      });
    }

    // ✅ Parse JSON fields from multipart/form-data
    if (property === "body") {
      Object.keys(req.body).forEach((key) => {
        const value = req.body[key];

        if (
          typeof value === "string" &&
          (value.startsWith("{") || value.startsWith("["))
        ) {
          try {
            req.body[key] = JSON.parse(value);
          } catch {
            // Ignore if it's not valid JSON
          }
        }
      });
    }

    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      allowUnknown: true,
      convert: true,
    });

    if (error) {
      return res.status(400).send({
        statusCode: 400,
        error: error.details.map((err) => err.message),
        message: "Validation Error",
      });
    }

    // ✅ Assign converted/parsed values back
    (req as any)[property] = value;

    next();
  };
};