const { z } = require('zod');

const credentialSchema = z.object({
  id: z.string().min(1),
  rawId: z.string().optional(),
  type: z.string().optional(),
  response: z.record(z.any()).optional()
});

const startLoginSchema = z.object({ body: z.object({}).passthrough() });

const completeRegistrationSchema = z.object({
  body: z.object({
    credential: credentialSchema,
    pk_nomb: z.string().min(1).max(60).optional()
  })
});

const completeLoginSchema = z.object({
  body: z.object({
    credential: credentialSchema
  })
});

module.exports = {
  completeRegistrationSchema,
  completeLoginSchema,
  startLoginSchema
};