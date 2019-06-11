import { compare, hash } from "bcrypt";
import express, { Response } from "express";

import { isNone, None } from "../helpers/types";
import { Message, User } from "../models/models";
import { Room } from "../models/room";

const MIN_PASS_LENGTH = 8;
const SALT_ROUNDS = 15;

export const router = express.Router();

function error(res: Response, path: string, msg: string): void {
  res.render(path, { error: msg });
}

router.get("/", async (req, res) => {
  if (req.session && req.session.user_id) {
    const user = await User.findById(req.session!.user_id);

    if (user) {
      res.send(`Welcome ${user.id}`);
    } else {
      req.session.user_id = undefined;
      res.redirect("/login");
    }
  } else {
    res.redirect("/login");
  }
});

router.get("/login", (_req, res) => res.render("login", { error: undefined }));

router.post("/login", async (req, res) => {
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
      req.session!.user_id = user.id;
      res.redirect("/");
    } else {
      error(res, "login", "Invalid username/password combination");
    }
  }
});

router.get("/signup", (_req, res) => res.render("signup", { error: undefined }));

router.post("/signup", async (req, res) => {
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
});
