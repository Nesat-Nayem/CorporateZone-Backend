const express = require("express");
const cors = require("cors");
const pdf = require("html-pdf");
const dotenv = require("dotenv");
const http = require("http");
const { connectDB } = require("./config/connect");
dotenv.config();
const port = process.env.PORT || 4030;

const pdfTemplate = require("./template");

const app = express();

const stripe = require('stripe')('sk_test_51Jwcx4JFSgBrd6IPkLrdWEQaSMWHZcVthlHI7WxP3kiiuzBJpx3OGE5vG43tSWgmVeFf8it2jH2YM76jpP0Q4I1100cQEIaKK2');

const server = http.createServer(app);

// all routes
const users = require("./routes/users");
const jobs = require("./routes/jobs");
const appliedJobs = require("./routes/appliedJobs");
const chats = require("./routes/chats");
const messages = require("./routes/messages");
const skill = require("./routes/skill");
const payment = require("./routes/payment");

// connect with database
connectDB();

// middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use("/users", users);
app.use("/jobs", jobs);
app.use("/appliedJobs", appliedJobs);
app.use("/chats", chats);
app.use("/messages", messages);
app.use("/skill", skill);
app.use("/payment", payment);

// error handling middleware
const errorHandler = (err, req, res, next) =>
{
  if (err.headerSent) {
    return next();
  }
  res.status(500).json(err.message);
};

app.use(errorHandler);

app.get("/", (req, res) =>
{
  res.json("CorporateZone - where meet Professionals");
});

const io = require("socket.io")(server, {
  pingTimeout: 6000,
  cors: {
    origin: "https://corporate-zone-clitent.vercel.app/",
  },
});

io.on("connection", (socket) =>
{
  console.log(`Connected to socket.io`);

  socket.on("setup", (userData) =>
  {
    socket.join(userData._id);
    socket.emit("connected");
  });

  socket.on("join chat", (room) =>
  {
    socket.join(room);
    console.log("User joined room", room);
  });

  socket.on("new message", (newMessageReceived) =>
  {
    var chat = newMessageReceived.chat;

    if (!chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user) =>
    {
      if (user._id === newMessageReceived.sender._id) return;

      socket.in(user._id).emait("message received", newMessageReceived);
    });
  });
});

app.post("/create-pdf", (req, res) =>
{
  pdf.create(pdfTemplate(req.body), {}).toFile("result.pdf", (err) =>
  {
    if (err) {
      res.send(Promise.reject());
    }
    res.send(Promise.resolve());
  });
});

app.get("/fetch-pdf", (req, res) =>
{
  res.sendFile(`${__dirname}/result.pdf`);
});

app.get('/order/success/:session_id', async (req, res) =>
{
  const session_id = req.params.session_id;
  const session = await stripe.checkout.sessions.retrieve(session_id);
  res.send(session);
});

app.listen(port, () =>
{
  console.log(`Server running on port: http://localhost:${port}`);
});