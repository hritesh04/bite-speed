import swaggerJsdoc from "swagger-jsdoc";

const options = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Bite Speed Customer Identity API",
      version: "1.0.0",
      description:
        "Service to indentify a customer's identity across multiple purchases.",
    },
    servers: [
      {
        url: process.env.RENDER_URL,
      },
      {
        url: "http://localhost:3000",
      },
    ],
  },
  apis: ["src/*.ts"],
};

export const specs = swaggerJsdoc(options);
