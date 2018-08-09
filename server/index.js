const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const session = require("express-session");
const db = require("./data/db.js");

const server = express();
const secret = "Hello World!";

server.use(express.json());
server.use(helmet());
server.use(cors({}));
server.use(
  session({
    name: "notsession", // default is connect.sid
    secret: secret,
    cookie: {
      maxAge: 1 * 24 * 60 * 60 * 1000,
      secure: false // only set cookies over https. Server will not send back a cookie over http.
    }, // 1 day in milliseconds
    httpOnly: true, // don't let JS code access cookies. Browser extensions run JS code on your browser!
    resave: false,
    saveUninitialized: true
  })
);

function generateToken(user) {
  const payload = {
    username: user.username
  };

  const options = {
    expiresIn: "1h",
    jwtid: "BADA55"
  };

  return jwt.sign(payload, secret, options);
}

function protected(req, res, next) {
  const token = req.headers.authorization;
  if (token) {
    jwt.verify(token, secret, (err, decodedToken) => {
      if (err) {
        return res.status(401).json({ message: "you shall not pass!" });
      }
      req.jwtToken = decodedToken;
      next();
    });
  } else {
    return res.status(401).json({ message: "you shall not pass!" });
  }
}

server.get("/", (req, res) => res.send("Hello World!"));

server.post("/api/register", function(req, res) {
  const user = req.body;

  // hashes password
  const hash = bcrypt.hashSync(user.password, 14);
  user.password = hash;

  db("users")
    .insert(user)
    .then(function(ids) {
      db("users")
        .where({ id: ids[0] })
        .first()
        .then(user => {
          // generates the token
          const token = generateToken(user);

          // attaches the token to the response
          //res.status(201).json(token);
          res.status(201).json();
        });
    })
    .catch(function(error) {
      res.status(500).json({ error });
    });
});

server.post("/api/login", function(req, res) {
  const credentials = req.body;

  db("users")
    .where({ username: credentials.username })
    .first()
    .then(function(user) {
      if (user && bcrypt.compareSync(credentials.password, user.password)) {
        // generate the token
        const token = generateToken(user);

        // attaches token to the response
        res.send(token);
      } else {
        return res.status(401).json({ message: "You shall not pass!" });
      }
    })
    .catch(function(error) {
      res.status(500).json({ error });
    });
});

server.get("/api/users", protected, (req, res) => {
  console.log("token", req.jwtToken);

  db("users")
    .then(users => {
      res.json(users);
    })
    .catch(err => res.send(err));
});

server.listen(8000, () => console.log("\n=== API running... ===\n"));
