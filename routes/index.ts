import { compare, hash } from "bcrypt";
import express, { NextFunction, Request , Response } from "express";

import { idIsAdmin } from "../helpers/base";
import { isNone, None } from "../helpers/types";
import { User } from "../models/models";

const MIN_PASS_LENGTH = 8;
const SALT_ROUNDS = 15;

type Handler = (req: Request, res: Response, next: NextFunction) => void;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const wrapper = (fn: Handler) => (req: Request, res: Response, next: NextFunction): void => {
  Promise.resolve(fn(req, res, next))
    .catch(next);
};

export const router = express.Router();

function error(res: Response, path: string, msg: string): void {
  res.render(path, { error: msg });
}

function requireLogin(req: Request, res: Response, next: NextFunction): void {
  if (req.session && req.session.userId) {
    req.session.touch();
    next();
  } else {
    res.redirect("/login");
  }
}

router.get("/", requireLogin, wrapper(async (req, res, _next) => {
  const user = await User.findOne({
    attributes: ["discordName", "id", "name"],
    where: {
      id: req.session!.userId
    }
  });

  if (user) {
    res.render("main", { name: `${user.discordName} (${user.name})` });
  } else {
    req.session!.userId = undefined;
    res.redirect("/login");
  }
}));

router.get("/login", (_req, res) => res.render("login", { error: undefined }));

router.post("/login", wrapper(async (req, res) => {
  const user = await User.findOne({
    attributes: ["id", "name", "password"],
    where: {
      name: req.body.username
    }
  });

  if (!user) {
    error(res, "login", "Invalid username/password combination");

    return;
  }

  if (isNone(user.password)) {
    res.redirect("/signup");
  } else {
    const match = await compare(req.body.password, user.password);

    if (match) {
      req.session!.userId = user.id;
      req.session!.loginTime = new Date();
      res.redirect("/");
    } else {
      error(res, "login", "Invalid username/password combination");
    }
  }
}));

router.get("/signup", (_req, res) => res.render("signup", { error: undefined }));

router.post("/signup", wrapper(async (req, res) => {
  const username = req.body.username,
    confirmation = req.body.confirm,
    password: None<Object> = req.body.password;

  if (isNone(username) || isNone(password)) {
    error(res, "signup", "Empty username and/or password"); return;
  } else if (password !== confirmation) {
    error(res, "signup", "Password and confirmation do not match"); return;
  } else if (password.toString().length < MIN_PASS_LENGTH) {
    error(res, "signup", "Password must be at least 8 characters"); return;
  }

  const user = await User.findOne({
    attributes: ["id", "name", "password"],
    where: {
      name: username
    }
  });

  if (isNone(user)) {
    error(res, "signup", "Could not find user"); return;
  } else if (!isNone(user.password)) {
    error(res, "signup", "You are already signed up"); return;
  }

  const passHash = await hash(password.toString(), SALT_ROUNDS);
  await user.update({ password: passHash });

  res.redirect("/login");
}));

router.get("/logout", requireLogin, (req, res) => {
  req.session!.destroy(_err => res.redirect("/login"));
});

router.get("/button", requireLogin, wrapper(async (req, res) => {
  const user = await User.findOne({
    attributes: ["discordName", "id"],
    where: {
      id: req.session!.userId
    }
  });

  if (!user) {
    res.redirect("/login");
    return;
  }

  res.render("button", {
    admin: idIsAdmin(user.id),
    user: user.discordName
  });
}));

router.get("/button/admin", requireLogin, (req, res) => {
  if (!idIsAdmin(req.session!.userId)) {
    res.redirect("/button");
    return;
  }

  res.render("button-admin");
});

const robotsRule = `
User-agent: *
Disallow: /
`;

router.get("/robots.txt", (_req, res) => {
  res.send(robotsRule);
});
