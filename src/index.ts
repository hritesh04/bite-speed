import express, { Request, Response } from "express";
import { validateInput } from "./middleware";
import {
  ContactSchema,
  ContactsSchema,
  IdentityInput,
  IdentityReturnType,
} from "./types";
import { DB } from "./db";
import dotenv from "dotenv";
import { success } from "zod";

dotenv.config();

const PORT = process.env.PORT || 3000;

async function setupServer() {
  const app = express();
  app.use(express.json());

  const db = DB.getInstance();

  await db.initDB();

  const route = express.Router();

  app.use("/api/v1", route);

  route.post(
    "/identify",
    validateInput,
    async (req: Request, res: Response) => {
      const body: IdentityInput = req.body;

      // empty body
      if (!body.email && !body.phoneNumber)
        return res.status(400).json({ success: false, error: "invalid input" });
      const existingContact = await db.getContact(body);

      // new contact since there is no exisiting contact
      if (!existingContact) {
        const newContact = await db.addContact(body);
        const contactData = ContactSchema.safeParse(newContact);

        // db result doesnt match contact schema
        if (!contactData.success) {
          console.log(contactData.error);
          return res
            .status(500)
            .json({ error: "db schema doesn't match contact schema" });
        }

        const result: IdentityReturnType = {
          contact: {
            primaryContactId: contactData.data.id,
            emails: contactData.data.email ? [contactData.data.email] : [],
            phoneNumbers: contactData.data.phone_number
              ? [contactData.data.phone_number]
              : [],
            secondaryContactIds: [],
          },
        };
        return res.status(200).json({ success: true, data: result });
      }

      const contacts = ContactsSchema.safeParse(existingContact);

      // db result doesnt match contact schema
      if (!contacts.success)
        return res.status(400).json({ error: "invalid input" });

      if (contacts.data.length === 1) {
        const newContact = await db.addContact(body, "secondary");
        const contactData = ContactSchema.safeParse(newContact);

        // db result doesnt match contact schema
        if (!contactData.success) {
          console.log(contactData.error);
          return res
            .status(500)
            .json({ error: "db schema doesn't match contact schema" });
        }

        // TODO : better if/else handling
        const result: IdentityReturnType = {
          contact: {
            primaryContactId: contacts.data[0].id,
            emails: contactData.data.email
              ? contacts.data[0].email
                ? [contacts.data[0].email, contactData.data.email]
                : [contactData.data.email]
              : contacts.data[0].email
              ? [contacts.data[0].email]
              : [],
            phoneNumbers: contactData.data.phone_number
              ? contacts.data[0].phone_number
                ? [contacts.data[0].phone_number, contactData.data.phone_number]
                : [contactData.data.phone_number]
              : contacts.data[0].phone_number
              ? [contacts.data[0].phone_number]
              : [],
            secondaryContactIds: [contactData.data.id],
          },
        };
        return res.status(200).json({ success: true, data: result });
      }

      if (contacts.data)
        return res.status(200).json({ success: true, data: "todo" });
    }
  );

  app.listen(PORT, () => {
    console.log("Server listening on port : ", PORT);
  });
}

setupServer().catch((e) => console.error(e));
