import express, { Request, Response } from "express";
import { validateInput } from "./middleware";
import { ContactSchema, IdentityInput, IdentityReturnType } from "./types";
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
      if (!body.email && !body.phoneNumber)
        return res.status(400).json({ success: false, error: "invalid input" });
      const existingContact = await db.getContact(body);
      if (!existingContact) {
        const newContact = await db.addContact(body);
        const contactData = ContactSchema.safeParse(newContact);
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
              ? [Number(contactData.data.phone_number)]
              : [],
            secondaryContactIds: [],
          },
        };
        return res.status(200).json({ success: true, data: result });
      }
      const contacts = ContactSchema.safeParse(existingContact);
      if (!contacts.success)
        return res.status(400).json({ error: "invalid input" });
      return res.status(200).json({ success: true, data: "todo" });
    }
  );

  app.listen(PORT, () => {
    console.log("Server listening on port : ", PORT);
  });
}

setupServer().catch((e) => console.error(e));
