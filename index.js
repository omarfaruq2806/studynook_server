const express = require("express");
const app = express();

require("dotenv").config();
const cors = require("cors");

const port = process.env.PORT || 8000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = process.env.MONGODB_URI;

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

async function run() {
  try {
    // deploy er time e etakle comment  kore  dite hobe
    await client.connect();
    const db = client.db("studynook");
    const roomsCollection = db.collection("rooms");

    // create room / add room
    app.post("/rooms", async (req, res) => {
      const roomData = req.body;
      const result = await roomsCollection.insertOne(roomData);
      res.send(result);
    });

    // all rooms
    app.get("/rooms", async (req, res) => {
      const result = await roomsCollection.find().toArray();
      res.send(result);
    });

    // latest rooms for home page
    app.get("/rooms/latest", async (req, res) => {
      const result = await roomsCollection
        .find()
        .sort({ createdAt: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });

    // single room / details room
    app.get("/rooms/:roomId", async (req, res) => {
      const { roomId } = req.params;
      const query = { _id: new ObjectId(roomId) };
      const result = await roomsCollection.findOne(query);
      res.send(result);
    });

    // for updating and editing room data
    app.patch("/rooms/:roomId", async (req, res) => {
      const { roomId } = req.params;
      const roomData = req.body;
      const query = { _id: new ObjectId(roomId) };
      const result = await roomsCollection.updateOne(query, { $set: roomData });
      res.send(result);
    });

    // for delete room
    app.delete("/rooms/:roomId", async (req, res) => {
      const { roomId } = req.params;
      const query = { _id: new ObjectId(roomId) };
      const result = await roomsCollection.deleteOne(query);
      res.send(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log("Server is running on port 8000");
});
