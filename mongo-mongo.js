// npm i body-parser express jsonwebtoken joi bcrypt cors mongodb dotenv

import dotenv from "dotenv";
dotenv.config();
import express from "express";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import Joi from "joi";
import bcrypt from "bcrypt";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";

const app = express();
const PORT = 3002;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = process.env.JWT_EXPIRATION;
const MONGO_DATABASE_URL = process.env.MONGO_DATABASE_URL;
const DB_NAME = "mongotest";

let db;
async function connectToDb() {
    try {
        const client = new MongoClient(MONGO_DATABASE_URL);
        await client.connect();
        db = client.db(DB_NAME);
        console.log("Connected to MongoDB successfully");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
}

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
        const userExists = await db.collection("users").findOne({ username: value.username });
        if (userExists) {
            return res.status(400).json({ error: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(value.password, 10);
        const user = await db.collection("users").insertOne({
            username: value.username,
            password: hashedPassword
        });

        res.status(201).json({ token: generateToken(user.insertedId.toString()) });
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
        const user = await db.collection("users").findOne({ username: value.username });
        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }

        const passwordMatch = bcrypt.compare(value.password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        res.status(200).json({ token: generateToken(user._id.toString()) });
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
            user = await db.collection("users").findOne({ _id: new ObjectId(tokenContent.userId) }, { projection: { password: 0 } });
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
        const posts = await db.collection("posts").aggregate([
            {
                $lookup: {
                    from: "users",
                    localField: "authorId",
                    foreignField: "_id",
                    as: "author"
                }
            }, {
                $unwind: "$author"
            }, {
                $addFields: {
                    _count: {
                        $size: "$likedBy"
                    }
                }
            }, {
                $sort: {
                    createdAt: -1
                },
            }, {
                $project: {
                    "author.password": 0
                }
            }
        ]).toArray();

        // const posts = await prisma.post.findMany({
        //     include: {
        //         author: true,
        //         _count: {
        //             select: {
        //                 likedBy: true
        //             }
        //         }
        //     },
        //     orderBy: {
        //         createdAt: "desc"
        //     }
        // });
        res.json(posts);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/posts/liked", authenticateToken, async (req, res) => {
    try {
        const posts = await db.collection("posts").aggregate([
            {
                $match: {
                    likedBy: { $in: [req.user._id] }
                }
            }, {
                $lookup: {
                    from: "users",
                    localField: "authorId",
                    foreignField: "_id",
                    as: "author"
                }
            }, {
                $unwind: "$author"
            }, {
                $addFields: {
                    _count: {
                        $size: "$likedBy"
                    }
                }
            }, {
                $sort: {
                    createdAt: -1
                },
            }, {
                $project: {
                    "author.password": 0
                }
            }
        ]).toArray();
        res.json(posts);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.post("/posts", authenticateToken, async (req, res) => {
    const { value, error } = postSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    try {
        const post = await db.collection("posts").insertOne({
            content: value.content,
            title: value.title,
            authorId: req.user._id,
            createdAt: new Date(),
            likedBy: []
        });

        const createdPost = await db.collection("posts").aggregate([
            {
                $match: { _id: post.insertedId }
            }, {
                $lookup: {
                    from: "users",
                    localField: "authorId",
                    foreignField: "_id",
                    as: "author"
                }
            }, {
                $unwind: "$author"
            }, {
                $addFields: {
                    _count: {
                        $size: "$likedBy"
                    }
                }
            }, {
                $project: {
                    "author.password": 0
                }
            }
        ]).toArray();
        res.status(201).json(createdPost[0]);
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
        const post = await db.collection("posts").findOne({ _id: new ObjectId(req.params.id) });
        if (!post) return res.status(404).json({ error: "Post not found" });

        if (value.like) {
            await db.collection("posts").updateOne({ _id: new ObjectId(req.params.id) }, { $addToSet: { likedBy: req.user._id } });
        } else {
            await db.collection("posts").updateOne({ _id: new ObjectId(req.params.id) }, { $pull: { likedBy: req.user._id } });
        }
        res.status(200).json({ message: "Post liked/unliked successfully" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Initialize server only after DB connection
connectToDb().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});