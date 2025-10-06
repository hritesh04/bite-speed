import express from "express";

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

const route = express.Router();

app.use("/api/v1", route);

route.get("", (req, res) => {
  res.status(200).json({ success: true });
});

app.listen(PORT, () => {
  console.log("Server listening on port : ", PORT);
});
