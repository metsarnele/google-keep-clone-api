import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { v4 as uuidv4 } from "uuid";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const SECRET_KEY = "your_secret_key";

app.use(cors());
app.use(bodyParser.json());

const swaggerDocument = JSON.parse(fs.readFileSync(path.join(__dirname, "openapi.json"), "utf8"));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

let users = [];
let notes = [];
let tags = [];

const authenticateToken = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(401).json({ message: "Access denied" });

    jwt.verify(token.replace("Bearer ", ""), SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ message: "Invalid token" });
        req.user = user;
        next();
    });
};

// User routes
app.post("/users", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Username and password are required" });

    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ id: uuidv4(), username, password: hashedPassword });
    res.status(201).json({ message: "User registered successfully" });
});

app.patch("/users/:id", authenticateToken, async (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (req.body.password) user.password = await bcrypt.hash(req.body.password, 10);
    if (req.body.username) user.username = req.body.username;

    res.status(200).json({ message: "User updated successfully" });
});

app.delete("/users/:id", authenticateToken, (req, res) => {
    users = users.filter(u => u.id !== req.params.id);
    res.status(204).send();
});

// Session routes
app.post("/sessions", async (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: "1h" });
    res.status(200).json({ token });
});

app.delete("/sessions", authenticateToken, (req, res) => {
    res.status(204).send();
});

// Notes routes
app.get("/notes", authenticateToken, (req, res) => res.status(200).json(notes));

app.post("/notes", authenticateToken, (req, res) => {
    const { title, content, tags: noteTags, reminder } = req.body;
    if (!title || !content) return res.status(400).json({ message: "Title and content are required" });

    const newNote = { id: uuidv4(), title, content, tags: noteTags || [], reminder };
    notes.push(newNote);
    res.status(201).json({ message: "Note created successfully", note: newNote });
});

app.patch("/notes/:id", authenticateToken, (req, res) => {
    const note = notes.find(n => n.id === req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found" });

    Object.assign(note, req.body);
    res.status(200).json({ message: "Note updated successfully" });
});

app.delete("/notes/:id", authenticateToken, (req, res) => {
    notes = notes.filter(n => n.id !== req.params.id);
    res.status(204).send();
});

// Tags routes
app.get("/tags", authenticateToken, (req, res) => res.status(200).json(tags));

app.post("/tags", authenticateToken, (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Tag name is required" });

    const newTag = { id: uuidv4(), name };
    tags.push(newTag);
    res.status(201).json({ message: "Tag created successfully", tag: newTag });
});

app.patch("/tags/:id", authenticateToken, (req, res) => {
    const tag = tags.find(t => t.id === req.params.id);
    if (!tag) return res.status(404).json({ message: "Tag not found" });

    tag.name = req.body.name || tag.name;
    res.status(200).json({ message: "Tag updated successfully" });
});

app.delete("/tags/:id", authenticateToken, (req, res) => {
    tags = tags.filter(t => t.id !== req.params.id);
    res.status(204).send();
});

app.get("/", (req, res) => res.send("<h1>Welcome to Google Keep API</h1><p>Go to <a href='/docs'>API Documentation</a></p>"));

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`API documentation available at http://localhost:${PORT}/docs`);
});
