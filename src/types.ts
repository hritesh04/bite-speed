import z from "zod";

export const IdentityInputSchema = z.object({
  email: z.email().nullable(),
  phoneNumber: z.int().nullable(),
});

export const IdentityReturnTypeSchema = z.object({
  contact: z.object({
    primaryContactId: z.int(),
    emails: z.array(z.email()),
    phoneNumbers: z.array(z.int()),
    secondaryContactIds: z.array(z.int()),
  }),
});

export const precedene = z.enum(["primary", "secondary"]);

export const ContactSchema = z.object({
  id: z.int(),
  phoneNumber: z.string().nullable(),
  email: z.string().nullable(),
  linkedId: z.int(),
  linkPrecedence: precedene,
  createdAt: z.iso.time(), // TODO: check datatime type after db setup
  udpdatedAt: z.iso.time(),
  deletedAt: z.iso.time().nullable(),
});

export type IdentityInput = z.infer<typeof IdentityInputSchema>;
export type IdentityReturnType = z.infer<typeof IdentityReturnTypeSchema>;
export type Contact = z.infer<typeof ContactSchema>;
