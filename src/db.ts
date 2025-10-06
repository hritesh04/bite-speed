import { Client } from "pg";
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
}
