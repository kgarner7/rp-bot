import bodyParser from "body-parser";
import compression from "compression";
import connectRedis from "connect-redis";
import cookieParser from "cookie-parser";
import { randomBytes } from "crypto";
import express, { NextFunction, Request, Response } from "express";
import session from "express-session";
import helmet from "helmet";
import { createServer } from "http";
import { createClient } from "redis";

import { client } from "./client";
import { config } from "./config/config";
import { handleSave } from "./listeners/state";
import { initDB, sequelize } from "./models/models";
import { router } from "./routes/index";
import { socket } from "./socket/socket";

const RedisStore = connectRedis(session);

// tslint:disable:no-magic-numbers
const MAX_AGE = 1000 * 3600;
const PORT = process.env.PORT || 443;
// tslint:enable:no-magic-numbers

const DEFAULT_ERROR_CODE = 500;
const SECRET_LENGTH = 100;

const redisClient = createClient();

const sessionMiddleware = session({
  cookie: {
    httpOnly: true,
    maxAge: MAX_AGE,
    secure: true
  },
  resave: true,
  rolling: true,
  saveUninitialized: false,
  secret: randomBytes(SECRET_LENGTH)
    .toString("binary"),
  store: new RedisStore({
    client: redisClient
  })
});

const options = {
  cacheControl: true,
  maxAge: "30d"
};

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("./frontend/scripts", options));
app.use(express.static("./frontend/styles", options));
app.use(compression());
app.use(cookieParser());
app.use(sessionMiddleware);
app.set("view engine", "ejs");
app.set("views", "./frontend/views");

app.use(helmet({
  dnsPrefetchControl: { allow: false },
  frameguard: true,
  hidePoweredBy: {
    setTo: ""
  },
  referrerPolicy: { policy: "no-referrer" }
}));

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use("/", router);

const server = createServer(app);

const io = socket(server);

io.use((sock, next) => {
  sessionMiddleware(sock.request, sock.request.res, next);
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(DEFAULT_ERROR_CODE)
    .send("Something went wrong inside");
});

initDB()
  .then(async () => {
    try {
      await sequelize.sync();
      await client.login(config.botToken);

      server.listen(PORT, () => {
        console.error("started server");
      });
    } catch (err) {
      console.error((err as Error).stack);
      process.exit(0);
    }
  })
  .catch((err: Error) => {
    console.error(err);
    process.exit(0);
  });

async function handleExit(): Promise<void> {
  try {
    await handleSave();
  } finally {
    process.exit(0);
  }
}

process.on("exit", handleExit);
process.on("SIGINT", handleExit);
process.on("SIGUSR1", handleExit);
process.on("SIGUSR2", handleExit);
