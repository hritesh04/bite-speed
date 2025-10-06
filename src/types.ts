import z from "zod";

export const IdentityInputSchema = z.object({
  email: z.email().nullable(),
  phoneNumber: z.int().nullable(),
});

export const IdentityReturnTypeSchema = z.object({
  contact: z.object({
    primaryContactId: z.int(),
    emails: z.array(z.email()),
    phoneNumbers: z.array(z.string()),
    secondaryContactIds: z.array(z.int()).nullable(),
  }),
});

export const precedene = z.enum(["primary", "secondary"]);

export const ContactSchema = z.object({
  id: z.int(),
  phone_number: z.string().nullable(),
  email: z.string().nullable(),
  linked_id: z.int().nullable(),
  link_precedence: precedene,
  created_at: z.date(),
  updated_at: z.date(),
  deleted_at: z.date().nullable(),
});

export const ContactsSchema = z.array(ContactSchema);

export type IdentityInput = z.infer<typeof IdentityInputSchema>;
export type IdentityReturnType = z.infer<typeof IdentityReturnTypeSchema>;
export type Contact = z.infer<typeof ContactSchema>;
export type Precedence = z.infer<typeof precedene>;
