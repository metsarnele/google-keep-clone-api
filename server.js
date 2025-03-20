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

// English documentation route
app.get(['/en', '/en/'], cacheControl, (req, res, next) => {
    try {
        const swaggerDocumentEn = JSON.parse(fs.readFileSync(openApiPath, "utf8"));
        swaggerDocumentEn.servers = [{ url: 'https://docs.example.com/' }];
        
        const enOptions = {
            ...swaggerUiOptions,
            customSiteTitle: "Google Keep API Documentation (English)",
            swaggerDoc: swaggerDocumentEn
        };
        
        swaggerUi.setup(swaggerDocumentEn, enOptions)(req, res, next);
    } catch (error) {
        console.error('Error serving English documentation:', error);
        res.status(500).send('Error loading documentation');
    }
});

// Estonian documentation route
app.get(['/et', '/et/'], cacheControl, (req, res, next) => {
    try {
        const swaggerDocumentEt = JSON.parse(fs.readFileSync(openApiEtPath, "utf8"));
        swaggerDocumentEt.servers = [{ url: 'https://docs.example.com/' }];
        
        const etOptions = {
            ...swaggerUiOptions,
            customSiteTitle: "Google Keep API Dokumentatsioon (Eesti)",
            swaggerDoc: swaggerDocumentEt
        };
        
        swaggerUi.setup(swaggerDocumentEt, etOptions)(req, res, next);
    } catch (error) {
        console.error('Error serving Estonian documentation:', error);
        res.status(500).send('Error loading documentation');
    }
});

// Serve Swagger UI assets
app.use(['/en', '/en/', '/et', '/et/'], swaggerUi.serve);

// Default route - redirect to English
app.get(['/', '/docs', '/docs/'], cacheControl, (req, res) => {
    res.redirect(302, '/en/');
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
app.post("/users", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Username and password are required" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { id: uuidv4(), username, password: hashedPassword };
    users.push(newUser);
    res.status(201).location(`/users/${newUser.id}`).json({ message: "User registered successfully", user: newUser });
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
    res.status(201).location(`/notes/${newNote.id}`).json({ message: "Note created successfully", note: newNote });
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
    res.status(201).location(`/tags/${newTag.id}`).json({ message: "Tag created successfully", tag: newTag });
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

app.get("/", (req, res) => res.send(`
    <h1>Welcome to Google Keep API</h1>
    <h2>Documentation / Dokumentatsioon:</h2>
    <ul>

      <li><a href='/docs/en/'>API Documentation (English)</a></li>
      <li><a href='/docs/et/'>API Dokumentatsioon (Eesti)</a></li>

    </ul>
  `));

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`API documentation available at http://localhost:${PORT}/docs/`);
});
