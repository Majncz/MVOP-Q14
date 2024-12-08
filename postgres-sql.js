// npm i body-parser express jsonwebtoken joi bcrypt cors pg dotenv

// CREATE TABLE "User" (
//     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//     username VARCHAR(255) NOT NULL UNIQUE,
//     userPasswordId UUID
// );

// CREATE TABLE "UserPassword" (
//     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//     password VARCHAR(255) NOT NULL,
//     userId UUID NOT NULL UNIQUE
// );

// CREATE TABLE "Post" (
//     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//     title VARCHAR(255) NOT NULL,
//     content TEXT NOT NULL,
//     createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//     authorId UUID NOT NULL
// );

// CREATE TABLE "PostUserLike" (
//     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//     userId UUID NOT NULL,
//     postId UUID NOT NULL
// );

import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import Joi from "joi";
import bcrypt from "bcrypt";
import cors from "cors";
import pg from "pg";

const app = express();
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = process.env.JWT_EXPIRATION;
const SQL_DATABASE_URL = process.env.SQL_DATABASE_URL;

const pool = new pg.Pool({ connectionString: SQL_DATABASE_URL });

app.use(bodyParser.json());
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
        const userExists = await pool.query(
            "SELECT * FROM \"User\" WHERE username = $1",
            [value.username]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(value.password, 10);
        const user = await pool.query(
            "INSERT INTO \"User\" (username) VALUES ($1) RETURNING id",
            [value.username]);
        const userPassword = await pool.query(
            "INSERT INTO \"UserPassword\" (password, userId) VALUES ($1, $2) RETURNING id",
            [hashedPassword, user.rows[0].id]);
        res.status(201).json({ token: generateToken(user.rows[0].id) });
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
        const user = await pool.query(
            `SELECT * FROM "User"
            JOIN "UserPassword" ON "User".id = "UserPassword".userId
            WHERE username = $1`,
            [value.username]);
        if (user.rows.length === 0) {
            return res.status(401).json({ error: "User not found" });
        }

        const passwordMatch = bcrypt.compare(value.password, user.rows[0].password);
        if (!passwordMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        res.status(200).json({ token: generateToken(user.rows[0].id) });
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
            user = await pool.query(
                "SELECT * FROM \"User\" WHERE id = $1",
                [tokenContent.userId]);
            if (user.rows.length === 0) return res.status(401).json({ error: "Invalid token" });
            req.user = user.rows[0];
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
        const posts = await pool.query(
            `SELECT 
                "Post".id,
                "Post".title,
                "Post".content,
                "Post".createdAt,
                "Post".authorId,
                "User".username,
                (SELECT COUNT(*) FROM "PostUserLike" WHERE "PostUserLike".postId = "Post".id) as "likeCount"
            FROM "Post"
            JOIN "User" ON "Post".authorId = "User".id
            ORDER BY "Post".createdAt DESC`);
        res.json(posts.rows);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/posts/liked", authenticateToken, async (req, res) => {
    try {
        const posts = await pool.query(
            `SELECT 
                "Post".id,
                "Post".title,
                "Post".content,
                "Post".createdAt,
                "Post".authorId,
                "User".username,
                (SELECT COUNT(*) FROM "PostUserLike" WHERE "PostUserLike".postId = "Post".id) as "likeCount"
            FROM "Post"
            JOIN "User" ON "Post".authorId = "User".id
            JOIN "PostUserLike" ON "Post".id = "PostUserLike".postId
            WHERE "PostUserLike".userId = $1
            ORDER BY "Post".createdAt DESC`,
            [req.user.id]);
        res.json(posts.rows);
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
        const post = await pool.query(
            "INSERT INTO \"Post\" (content, title, authorId) VALUES ($1, $2, $3) RETURNING *",
            [value.content, value.title, req.user.id]);
        res.status(201).json(post.rows[0]);
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
        const post = await pool.query(
            "SELECT * FROM \"Post\" WHERE id = $1",
            [req.params.id]);
        console.log("HEH", post.rows);
        if (post.rows.length === 0) return res.status(404).json({ error: "Post not found" });

        if (value.like) {
            await pool.query(
                "INSERT INTO \"PostUserLike\" (userId, postId) VALUES ($1, $2)",
                [req.user.id, req.params.id]);
        } else {
            await pool.query(
                "DELETE FROM \"PostUserLike\" WHERE userId = $1 AND postId = $2",
                [req.user.id, req.params.id]);
        }
        res.status(200).json({ message: "Post liked/unliked successfully" });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});