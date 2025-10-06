import express, { Request, Response } from "express";
import { validateInput } from "./middleware";
import { IdentityInput } from "./types";
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

  route.post("/identify", validateInput, (req: Request, res: Response) => {
    const body: IdentityInput = req.body;
    if (!body.email && !body.phoneNumber)
      return res.status(400).json({ error: "invalid input" });
    return res.status(200).json({});
  });

  app.listen(PORT, () => {
    console.log("Server listening on port : ", PORT);
  });
}

setupServer().catch((e) => console.error(e));
