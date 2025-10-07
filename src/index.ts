import express, { Request, Response } from "express";
import { validateInput } from "./middleware";
import {
  ContactSchema,
  ContactsSchema,
  IdentityInput,
  IdentityReturnType,
} from "./types";
import dotenv from "dotenv";
dotenv.config();
import { DB } from "./db";
import swaggerUi from "swagger-ui-express";
import { specs } from "./swagger";

const PORT = process.env.PORT || 3000;

async function setupServer() {
  const app = express();
  app.use(express.json());

  const db = DB.getInstance();

  await db.initDB();

  /**
   * @swagger
   * /identify:
   *   post:
   *     summary: Identify or create a customer contact based on email or phone number
   *     description:
   *       This endpoint retrieves or creates a contact record based on the provided email or phone number.
   *       - If no existing contact is found, a new primary contact is created.
   *       - If one contact exists, a secondary contact is created and linked to the primary.
   *       - If multiple contacts exist, precedence is updated and all related data is returned.
   *     tags:
   *       - Contacts
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 nullable: true
   *                 example: "john.doe@example.com"
   *               phoneNumber:
   *                 type: number
   *                 nullable: true
   *                 example: 4155552671
   *     responses:
   *       200:
   *         description: Successfully identified or created a contact
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     contact:
   *                       type: object
   *                       properties:
   *                         primaryContactId:
   *                           type: integer
   *                           example: 101
   *                         emails:
   *                           type: array
   *                           items:
   *                             type: string
   *                             format: email
   *                           example: ["john.doe@example.com", "doe.john@company.com"]
   *                         phoneNumbers:
   *                           type: array
   *                           items:
   *                             type: string
   *                           example: ["+14155552671", "+14155552672"]
   *                         secondaryContactIds:
   *                           type: array
   *                           items:
   *                             type: integer
   *                           nullable: true
   *                           example: [102]
   *       400:
   *         description: Invalid input data
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 error:
   *                   type: string
   *                   example: "invalid input"
   *       500:
   *         description: Internal server or database error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 error:
   *                   type: string
   *                   example: "internal server error"
   */

  app.post("/identify", validateInput, async (req: Request, res: Response) => {
    try {
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
          console.log("db schema doesn't match contact schema");
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

      // if there is only 1 record with same email or password
      if (contacts.data.length === 1) {
        // if the record has same email and password as request body
        if (
          contacts.data[0].email === body.email &&
          contacts.data[0].phone_number === String(body.phoneNumber)
        ) {
          const result: IdentityReturnType = {
            contact: {
              primaryContactId: contacts.data[0].id,
              emails: contacts.data[0].email ? [contacts.data[0].email] : [],
              phoneNumbers: contacts.data[0].phone_number
                ? [contacts.data[0].phone_number]
                : [],
              secondaryContactIds: [],
            },
          };
          return res.status(200).json({ success: true, data: result });
        }
        const newContact = await db.addContact(
          body,
          "secondary",
          contacts.data[0].id
        );
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

      // check if record with same email and phone number exists
      const recordExists = contacts.data.find(
        (c) =>
          c.email === body.email && c.phone_number === String(body.phoneNumber)
      );
      // create record if not exits
      if (!recordExists) {
        const newSecondaryData = await db.addContact(
          body,
          "secondary",
          contacts.data[0].id
        );

        const contactData = ContactSchema.safeParse(newSecondaryData);

        // db result doesnt match contact schema
        if (!contactData.success) {
          console.log(contactData.error);
          return res
            .status(500)
            .json({ error: "db schema doesn't match contact schema" });
        }
      }

      const secondaryRecords = contacts.data.slice(1);

      // check if other records has link precendence set to primary
      const primaryPrecendene = secondaryRecords
        .filter((r) => r.link_precedence === "primary")
        .map((r) => r.id);

      // update link precendence if any records with primary link precedence exists
      if (primaryPrecendene.length != 0) {
        const data = await db.updatePrecedence(
          primaryPrecendene,
          contacts.data[0].id
        );
        if (!data)
          return res
            .status(404)
            .json({ success: false, error: "contact not found" });
      }

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
      console.log("error identifying customer : ", e);
      res.status(500).json({ success: false, error: "internal server error" });
    }
  });

  /**
   * @swagger
   * /identify/{id}:
   *   delete:
   *     summary: Delete a contact by ID
   *     description: Deletes a contact record from the database using its unique ID.
   *     tags:
   *       - Contacts
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *           example: 101
   *         description: The unique ID of the contact to delete.
   *     responses:
   *       200:
   *         description: Contact deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: string
   *                   example: "Contact deleted successfully"
   *       400:
   *         description: Invalid contact ID
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 error:
   *                   type: string
   *                   example: "Invalid contact ID"
   *       404:
   *         description: Contact not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 error:
   *                   type: string
   *                   example: "Contact not found"
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 error:
   *                   type: string
   *                   example: "Internal server error"
   */

  app.delete("/identify/:id", async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      if (!id)
        return res.status(400).json({ success: false, error: "invalid input" });
      const data = await db.deleteContact(Number(id));
      if (!data)
        return res
          .status(404)
          .json({ success: false, error: "Contact not found" });
      return res
        .status(200)
        .json({ success: true, data: "contact deleted successfully" });
    } catch (e: any) {
      console.log("Error deleting contact ", e);
      return res
        .status(500)
        .json({ success: false, error: "internal server error " });
    }
  });

  app.get("/health", (req, res) => {
    return res.status(200).json({ success: true, data: "Server is healthy" });
  });

  app.use("/", swaggerUi.serve, swaggerUi.setup(specs));

  app.listen(PORT, () => {
    console.log("Server listening on port : ", PORT);
  });
}

setupServer().catch((e) => console.error(e));
