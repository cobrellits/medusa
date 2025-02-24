import { NextFunction } from "express"
import { z } from "zod"
import { MedusaRequest, MedusaResponse } from "../../types/routing"
import { zodValidator } from "./zod-helper"

export function validateAndTransformBody(
  zodSchema:
    | z.ZodObject<any, any>
    | ((
        customSchema?: z.ZodObject<any, any>
      ) => z.ZodObject<any, any> | z.ZodEffects<any, any>)
): (
  req: MedusaRequest,
  res: MedusaResponse,
  next: NextFunction
) => Promise<void> {
  return async (req: MedusaRequest, _: MedusaResponse, next: NextFunction) => {
    try {
      let schema: z.ZodObject<any, any> | z.ZodEffects<any, any>
      const { body: bodyValidatorToMerge } = req.extendedValidators ?? {}

      if (typeof zodSchema === "function") {
        schema = zodSchema(bodyValidatorToMerge)
      } else if (bodyValidatorToMerge) {
        schema = zodSchema.merge(bodyValidatorToMerge)
      } else {
        schema = zodSchema
      }

      req.validatedBody = await zodValidator(schema, req.body)
      next()
    } catch (e) {
      next(e)
    }
  }
}
