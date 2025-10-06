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
      try {
        const body: IdentityInput = req.body;

        // empty body
        if (!body.email && !body.phoneNumber)
          return res
            .status(400)
            .json({ success: false, error: "invalid input" });
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
          const primary = contacts.data[0];
          const secondary = contactData.data;

          const emails = contacts.data
            .map((d) => d.email)
            .filter((e): e is string => !!e);

          const phoneNumbers = contacts.data
            .map((d) => d.phone_number)
            .filter((n): n is string => !!n);

          const result: IdentityReturnType = {
            contact: {
              primaryContactId: primary.id,
              emails: secondary.email
                ? [...new Set([...emails, secondary.email])]
                : emails,
              phoneNumbers: secondary.phone_number
                ? [...new Set([...phoneNumbers, secondary.phone_number])]
                : phoneNumbers,
              secondaryContactIds: [secondary.id],
            },
          };
          return res.status(200).json({ success: true, data: result });
        }

        const data = await db.updatePrecedence(contacts.data[1].id);
        if (!data) res.status(500).json({ success: false, error: "db error" });

        const emails = [
          ...new Set(
            contacts.data.map((d) => d.email).filter((e): e is string => !!e)
          ),
        ];

        const phoneNumbers = [
          ...new Set(
            contacts.data
              .map((d) => d.phone_number)
              .filter((n): n is string => !!n)
          ),
        ];

        const result: IdentityReturnType = {
          contact: {
            primaryContactId: contacts.data[0].id,
            emails: emails,
            phoneNumbers: phoneNumbers,
            secondaryContactIds: [contacts.data[1].id],
          },
        };
        return res.status(200).json({ success: true, data: result });
      } catch (e: any) {
        res
          .status(500)
          .json({ success: false, error: "internal server error : ", e });
      }
    }
  );

  app.listen(PORT, () => {
    console.log("Server listening on port : ", PORT);
  });
}

setupServer().catch((e) => console.error(e));
