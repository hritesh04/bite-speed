import { NextFunction, Request, Response } from "express";
import { IdentityInputSchema } from "./types";

export const validateInput = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const body = req.body;
  if (!body)
    return res.status(400).json({ success: false, error: "invalid input" });
  const valid = IdentityInputSchema.safeParse(body);
  if (!valid.success)
    return res.status(400).json({ success: false, error: "invalid input" });
  next();
};
