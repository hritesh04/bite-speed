import { Client } from "pg";
import { IdentityInput, Precedence, precedene } from "./types";
export class DB {
  private static db: DB;
  private client: Client | null = null;
  private constructor() {}

  static getInstance() {
    if (!this.db) this.db = new DB();
    return this.db;
  }

  private async getConnection() {
    if (this.client) return this.client;
    const url = process.env.DB_URL;
    if (!url) throw new Error("DB URL not provided");
    const client = new Client(url);
    await client.connect();
    console.log("Connected to DB");
    this.client = client;
    return this.client;
  }

  async initDB() {
    try {
      const client = await this.getConnection();
      await client.query(
        `DO $$ BEGIN
            CREATE TYPE precedence AS ENUM ('secondary', 'primary');
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;    
          
          CREATE TABLE IF NOT EXISTS contact(
            id SERIAL PRIMARY KEY NOT NULL,
            phone_number TEXT,
            email TEXT,
            linked_id INTEGER,
            link_precedence PRECEDENCE NOT NULL DEFAULT 'primary',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            deleted_at TIMESTAMP
            );`
      );
      console.log("DB initalized");
    } catch (e: any) {
      console.log("DB initalization failed");
      throw e;
    }
  }

  async getContact(input: IdentityInput) {
    try {
      const client = await this.getConnection();
      const result = await client.query(
        `SELECT * FROM contact WHERE phone_number = $1 OR email = $2 ORDER BY created_at ASC;`,
        [String(input.phoneNumber), input.email]
      );
      if (result.rows.length === 0) return null;
      return result.rows;
    } catch (e: any) {
      console.log("Error getting contact info ", e);
      throw e;
    }
  }

  async addContact(input: IdentityInput, precedence: Precedence = "primary") {
    try {
      const client = await this.getConnection();
      const result = await client.query(
        `INSERT INTO contact(phone_number,email,link_precedence) VALUES($1,$2) RETURNING *;`,
        [String(input.phoneNumber), input.email, precedence]
      );
      console.log(result.rows[0]);
      return result.rows[0];
    } catch (e: any) {
      console.log("Error getting contact info ", e);
      throw e;
    }
  }
}
