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
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const SECRET_KEY = process.env.SECRET_KEY;

// Check if SECRET_KEY is set
if (!SECRET_KEY) {
  throw new Error('SECRET_KEY is not set. Please set it in your .env file.');
}

// Determine base URL based on environment
const isProd = NODE_ENV === 'production';

// Documentation URLs
const DOCS_BASE_URL = isProd ? 'https://docs.nele.my' : `http://localhost:${PORT}`;
const DOCS_EN_URL = `${DOCS_BASE_URL}/en`;
const DOCS_ET_URL = `${DOCS_BASE_URL}/et`;

// API URLs
const API_URL = isProd ? 'https://keep-api.nele.my' : `http://localhost:${PORT}`;

app.use(cors());
app.use(bodyParser.json());

// Load OpenAPI documentation in both languages

const openApiPath = path.join(__dirname, "openapi.json");
const openApiEtPath = path.join(__dirname, "openapi.et.json");

// Add cache control middleware
const cacheControl = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
};

// Configure base Swagger UI options
const swaggerUiOptions = {
    explorer: true,
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    swaggerOptions: {
        docExpansion: 'list',
        defaultModelsExpandDepth: 3,
        defaultModelExpandDepth: 3,
        defaultModelRendering: 'model',
        displayOperationId: false,
        showCommonExtensions: true,
        showExtensions: true,
        deepLinking: true,
        tryItOutEnabled: true
    }
};

// Create separate instances of swagger-ui-express for each language
const swaggerUiEn = swaggerUi;
// Use the same instance for both languages
const swaggerUiEt = swaggerUi;

// Parse OpenAPI specs
const swaggerDocEn = JSON.parse(fs.readFileSync(openApiPath, "utf8"));
const swaggerDocEt = JSON.parse(fs.readFileSync(openApiEtPath, "utf8"));

// Set server URLs to ensure they point to the correct endpoints
swaggerDocEn.servers = [{ 
    url: isProd ? 'https://keep-api.nele.my' : '/', 
    description: isProd ? 'Production API (English)' : 'Local Development API (English)' 
}];

swaggerDocEt.servers = [{ 
    url: isProd ? 'https://keep-api.nele.my' : '/', 
    description: isProd ? 'Production API (Estonian)' : 'Local Development API (Estonian)' 
}];

// Set Swagger UI URLs based on environment and language
swaggerDocEn.externalDocs = { url: DOCS_EN_URL, description: 'English Documentation' };
swaggerDocEt.externalDocs = { url: DOCS_ET_URL, description: 'Eesti Dokumentatsioon' };

// Serve English Swagger UI at `/en`
app.use('/en', swaggerUiEn.serve);
app.get('/en', (req, res) => {
    let html = swaggerUiEn.generateHTML(swaggerDocEn, {
        ...swaggerUiOptions,
        customSiteTitle: "Google Keep API Documentation (English)"
    });
    res.send(html);
});

// Serve Estonian Swagger UI at `/et`
app.use('/et', swaggerUiEt.serve);
app.get('/et', (req, res) => {
    let html = swaggerUiEt.generateHTML(swaggerDocEt, {
        ...swaggerUiOptions,
        customSiteTitle: "Google Keep API Dokumentatsioon (Eesti)"
    });
    res.send(html);
});





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
app.post("/api/users", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Username and password are required" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { id: uuidv4(), username, password: hashedPassword };
    users.push(newUser);
    res.status(201).location(`/api/users/${newUser.id}`).json({ message: "User registered successfully", user: newUser });
});

app.patch("/api/users/:id", authenticateToken, async (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (req.body.password) user.password = await bcrypt.hash(req.body.password, 10);
    if (req.body.username) user.username = req.body.username;

    res.status(200).json({ message: "User updated successfully" });
});

app.delete("/api/users/:id", authenticateToken, (req, res) => {
    users = users.filter(u => u.id !== req.params.id);
    res.status(204).send();
});

// Session routes
app.post("/api/sessions", async (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: "1h" });
    res.status(200).json({ token });
});

app.delete("/api/sessions", authenticateToken, (req, res) => {
    res.status(204).send();
});

// Notes routes
app.get("/api/notes", authenticateToken, (req, res) => res.status(200).json(notes));

app.post("/api/notes", authenticateToken, (req, res) => {
    const { title, content, tags: noteTags, reminder } = req.body;
    if (!title || !content) return res.status(400).json({ message: "Title and content are required" });

    const newNote = { id: uuidv4(), title, content, tags: noteTags || [], reminder };
    notes.push(newNote);
    res.status(201).location(`/api/notes/${newNote.id}`).json({ message: "Note created successfully", note: newNote });
});

app.patch("/api/notes/:id", authenticateToken, (req, res) => {
    const note = notes.find(n => n.id === req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found" });

    Object.assign(note, req.body);
    res.status(200).json({ message: "Note updated successfully" });
});

app.delete("/api/notes/:id", authenticateToken, (req, res) => {
    notes = notes.filter(n => n.id !== req.params.id);
    res.status(204).send();
});

// Tags routes
app.get("/api/tags", authenticateToken, (req, res) => res.status(200).json(tags));

app.post("/api/tags", authenticateToken, (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Tag name is required" });

    const newTag = { id: uuidv4(), name };
    tags.push(newTag);
    res.status(201).location(`/api/tags/${newTag.id}`).json({ message: "Tag created successfully", tag: newTag });
});

app.patch("/api/tags/:id", authenticateToken, (req, res) => {
    const tag = tags.find(t => t.id === req.params.id);
    if (!tag) return res.status(404).json({ message: "Tag not found" });

    tag.name = req.body.name || tag.name;
    res.status(200).json({ message: "Tag updated successfully" });
});

app.delete("/api/tags/:id", authenticateToken, (req, res) => {
    tags = tags.filter(t => t.id !== req.params.id);
    res.status(204).send();
});

app.get("/", (req, res) => res.send(`
    <h1>Welcome to Google Keep API</h1>
    <h2>Documentation / Dokumentatsioon:</h2>
    <ul>

      <li><a href='${DOCS_EN_URL}/'>API Documentation (English)</a></li>
      <li><a href='${DOCS_ET_URL}/'>API Dokumentatsioon (Eesti)</a></li>

    </ul>
  `));

app.listen(PORT, () => {
    console.log(`Server is running in ${NODE_ENV} mode on port ${PORT}`);
    console.log(`API documentation available at:`);
    console.log(`- English: ${DOCS_EN_URL}/`);
    console.log(`- Estonian: ${DOCS_ET_URL}/`);
});
