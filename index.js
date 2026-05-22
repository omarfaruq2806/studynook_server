const express = require("express");
const app = express();
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
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

const JWKS = createRemoteJWKSet(new URL("http://localhost:3000/api/auth/jwks"));

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  try {
    const { payload } = await jwtVerify(token, JWKS);
    next();
  } catch (error) {
    return res.status(401).send({ message: "unauthorized access" });
  }
};

async function run() {
  try {
    // deploy er time e etakle comment  kore  dite hobe
    await client.connect();
    const db = client.db("studynook");
    const roomsCollection = db.collection("rooms");
    const bookingCollection = db.collection("bookings");

    // create room / add room
    app.post("/rooms", verifyToken, async (req, res) => {
      const roomData = req.body;
      const result = await roomsCollection.insertOne(roomData);
      res.send(result);
    });

    // all rooms
    app.get("/rooms", async (req, res) => {
      const { search } = req.query;
      console.log(req.query, search);
      let cursor;
      if (search) {
        cursor = await roomsCollection
          .find({ name: { $regex: search, $options: "i" } })
          .toArray();
        res.send(cursor);
        return;
      }
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
    app.patch("/rooms/:roomId", verifyToken, async (req, res) => {
      const { roomId } = req.params;
      const roomData = req.body;
      const query = { _id: new ObjectId(roomId) };
      console.log(query);
      const result = await roomsCollection.updateOne(query, { $set: roomData });
      res.send(result);
    });

    // for delete room
    app.delete("/rooms/:roomId", verifyToken, async (req, res) => {
      const { roomId } = req.params;
      const query = { _id: new ObjectId(roomId) };
      const result = await roomsCollection.deleteOne(query);
      res.send(result);
    });

    // get all rooms for a user , that he added
    app.get("/myListings/:userId", varifyToken, async (req, res) => {
      const { userId } = req.params;
      const query = { "creator.id": userId };
      const result = await roomsCollection.find(query).toArray();
      res.send(result);
    });

    // handle booking data
    app.post("/bookings", verifyToken, async (req, res) => {
      const booking = req.body;
      const conflict = await bookingCollection.findOne({
        roomId: booking.roomId,
        bookingDate: booking.bookingDate,
        status: "confirmed",
        startTime: { $lt: booking.endTime },
        endTime: { $gt: booking.startTime },
      });
      if (conflict) {
        return res.send({
          conflict: true,
          message: "This room is already booked for this time slot !!",
        });
      }
      await roomsCollection.updateOne(
        {
          _id: new ObjectId(booking.roomId),
        },
        {
          $inc: { total: 1 },
        },
      );
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    // get all bookings info for a user
    app.get("/bookings/:userId", verifyToken, async (req, res) => {
      const { userId } = req.params;
      const query = { "user.id": userId };
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    // for cancelling booking and update total in rooms collection
    app.patch("/bookings/:bookingId", verifyToken, async (req, res) => {
      const { bookingId } = req.params;
      const bookingData = req.body;
      const query = { _id: new ObjectId(bookingId) };
      await roomsCollection.updateOne(
        {
          _id: new ObjectId(bookingData.roomId),
        },
        {
          $inc: { total: -1 },
        },
      );
      const result = await bookingCollection.updateOne(query, {
        $set: { status: "cancelled" },
      });
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
