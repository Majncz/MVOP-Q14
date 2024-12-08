// npm i body-parser express jsonwebtoken prisma @prisma/client joi bcrypt cors
// npx prisma init
// npx prisma migrate dev --name init
// npx prisma migrate dev --name "user and post schemas"

import { PrismaClient } from "@prisma/client";
import express from "express";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import Joi from "joi";
import bcrypt from "bcrypt";
import cors from "cors";
const app = express();
const prisma = new PrismaClient();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = process.env.JWT_EXPIRATION;

app.use(bodyParser.json());
app.use(express.json());
app.use(cors());

const registerSchema = Joi.object({
    username: Joi.string().min(3).required().messages({
        "string.min": "Username must be at least 3 characters long"
    }),
    password: Joi.string().min(6).required().messages({
        "string.min": "Password must be at least 6 characters long"
    }),
}).required();

const loginSchema = Joi.object({
    username: Joi.string().required().messages({
        "string.empty": "Username is required"
    }),
    password: Joi.string().required().messages({
        "string.empty": "Password is required"
    }),
}).required();

const postSchema = Joi.object({
    title: Joi.string().min(3).required().messages({
        "string.min": "Title must be at least 3 characters long"
    }),
    content: Joi.string().min(10).required().messages({
        "string.min": "Content must be at least 10 characters long"
    }),
}).required();

const likeSchema = Joi.object({
    like: Joi.boolean().required(),
}).required();

function generateToken(userId) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
}

app.post("/register", async (req, res) => {
    const { value, error } = registerSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    try {
        const userExists = await prisma.user.findUnique({ where: { username: value.username } });
        if (userExists) {
            return res.status(400).json({ error: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(value.password, 10);
        const user = await prisma.user.create({
            data: {
                username: value.username,
                password: { create: { password: hashedPassword } }
            }
        });
        res.status(201).json({ token: generateToken(user.id) });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.post("/login", async (req, res) => {
    const { value, error } = loginSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { username: value.username },
            include: { password: true }
        });
        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }

        const passwordMatch = bcrypt.compare(value.password, user.password.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        res.status(200).json({ token: generateToken(user.id) });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

async function authenticateToken(req, res, next) {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ error: "Invalid token" });
    }

    jwt.verify(token, JWT_SECRET, async (err, tokenContent) => {
        if (err) return res.status(401).json({ error: "Invalid token" });
        let user;
        try {
            user = await prisma.user.findUnique({ where: { id: tokenContent.userId } });
            if (!user) return res.status(401).json({ error: "Invalid token" });
            req.user = user;
            next();
        } catch (error) {
            console.log(error);
            return res.status(500).json({ error: "Internal server error" });
        }
    });
}

app.get("/user", authenticateToken, async (req, res) => {
    res.status(200).json(req.user);
});

app.get("/posts", authenticateToken, async (req, res) => {
    try {
        const posts = await prisma.post.findMany({
            include: {
                author: true,
                _count: {
                    select: {
                        likedBy: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/posts/liked", authenticateToken, async (req, res) => {
    try {
        const posts = await prisma.post.findMany({
            where: {
                likedBy: {
                    some: {
                        id: req.user.id
                    }
                }
            },
            include: {
                author: true,
                _count: {
                    select: {
                        likedBy: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

app.post("/posts", authenticateToken, async (req, res) => {
    const { value, error } = postSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    try {
        const post = await prisma.post.create({
            data: { content: value.content, title: value.title, authorId: req.user.id }
        });
        res.status(201).json(post);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

app.patch("/posts/:id/like", authenticateToken, async (req, res) => {
    const { value, error } = likeSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    try {
        const post = await prisma.post.findUnique({ where: { id: req.params.id } });
        if (!post) return res.status(404).json({ error: "Post not found" });

        if (value.like) {
            await prisma.post.update({ where: { id: req.params.id }, data: { likedBy: { connect: { id: req.user.id } } } });
        } else {
            await prisma.post.update({ where: { id: req.params.id }, data: { likedBy: { disconnect: { id: req.user.id } } } });
        }
        res.status(200).json({ message: "Post liked/unliked successfully" });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
