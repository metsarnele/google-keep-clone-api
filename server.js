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
let sessions = [];

const authenticateToken = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(401).json({ message: "Access denied" });

    jwt.verify(token.replace("Bearer ", ""), SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ message: "Invalid token" });
        req.user = user;
        next();
    });
};

app.post("/users", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Username and password are required" });

    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ id: uuidv4(), username, password: hashedPassword });
    res.status(201).json({ message: "User registered successfully" });
});

app.patch("/users/:id", authenticateToken, (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    Object.assign(user, req.body);
    res.json(user);
});

app.delete("/users/:id", authenticateToken, (req, res) => {
    users = users.filter(u => u.id !== req.params.id);
    res.status(204).send();
});

app.post("/sessions", async (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: "1h" });
    sessions.push({ id: uuidv4(), userId: user.id, token, createdAt: new Date().toISOString() });
    res.json({ token });
});

app.post("/sessions/logout", authenticateToken, (req, res) => {
    sessions = sessions.filter(s => s.token !== req.header("Authorization").replace("Bearer ", ""));
    res.status(200).json({ message: "User logged out successfully" });
});

app.get("/notes", authenticateToken, (req, res) => res.json(notes));
app.post("/notes", authenticateToken, (req, res) => {
    const { title, content, tags, reminder } = req.body;
    if (!title || !content) return res.status(400).json({ message: "Title and content are required" });
    const newNote = { id: uuidv4(), title, content, tags: tags || [], reminder: reminder || null };
    notes.push(newNote);
    res.status(201).json(newNote);
});

app.patch("/notes/:id", authenticateToken, (req, res) => {
    const note = notes.find(n => n.id === req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found" });
    Object.assign(note, req.body);
    res.json(note);
});

app.delete("/notes/:id", authenticateToken, (req, res) => {
    notes = notes.filter(n => n.id !== req.params.id);
    res.status(204).send();
});

app.get("/tags", authenticateToken, (req, res) => res.json(tags));
app.post("/tags", authenticateToken, (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Tag name is required" });
    const newTag = { id: uuidv4(), name };
    tags.push(newTag);
    res.status(201).json(newTag);
});

app.patch("/tags/:id", authenticateToken, (req, res) => {
    const tag = tags.find(t => t.id === req.params.id);
    if (!tag) return res.status(404).json({ message: "Tag not found" });
    Object.assign(tag, req.body);
    res.json(tag);
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
