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
const DOCS_BASE_URL = isProd ? 'https://keep-docs.nele.my' : `http://localhost:${PORT}`;
const DOCS_EN_URL = `${DOCS_BASE_URL}/en`;
const DOCS_ET_URL = `${DOCS_BASE_URL}/et`;

// API URLs
const API_URL = isProd ? 'https://keep-api.nele.my' : `http://localhost:${PORT}`;

// Configure CORS to allow requests from any origin
app.use(cors({
  origin: '*',  // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['WWW-Authenticate']  // Expose WWW-Authenticate header to clients
}));
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

// Function to load OpenAPI specs
const loadSwaggerDocs = () => {
    console.log('Loading OpenAPI documentation files...');
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

    return { swaggerDocEn, swaggerDocEt };
};

// Initial load of OpenAPI docs
let { swaggerDocEn, swaggerDocEt } = loadSwaggerDocs();

// Serve English Swagger UI at `/en`
app.use('/en', swaggerUiEn.serve);
app.get('/en', (req, res) => {
    // Reload documentation to get the latest changes
    const { swaggerDocEn } = loadSwaggerDocs();
    let html = swaggerUiEn.generateHTML(swaggerDocEn, {
        ...swaggerUiOptions,
        customSiteTitle: "Google Keep API Documentation (English)"
    });
    res.send(html);
});

// Serve Estonian Swagger UI at `/et`
app.use('/et', swaggerUiEt.serve);
app.get('/et', (req, res) => {
    // Reload documentation to get the latest changes
    const { swaggerDocEt } = loadSwaggerDocs();
    let html = swaggerUiEt.generateHTML(swaggerDocEt, {
        ...swaggerUiOptions,
        customSiteTitle: "Google Keep API Dokumentatsioon (Eesti)"
    });
    res.send(html);
});





// Initialize data storage with persistence
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');
const TAGS_FILE = path.join(DATA_DIR, 'tags.json');
const BLACKLIST_FILE = path.join(DATA_DIR, 'blacklist.json');

// Create data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load data from files or initialize empty arrays
let users = [];
let notes = [];
let tags = [];
let tokenBlacklist = []; // Store for revoked tokens

// Function to migrate existing data to include user IDs
const migrateData = (loadedUsers, loadedNotes, loadedTags) => {
    // Check if any notes or tags are missing userId
    const notesNeedMigration = loadedNotes.some(note => !note.userId);
    const tagsNeedMigration = loadedTags.some(tag => !tag.userId);
    
    if (!notesNeedMigration && !tagsNeedMigration) {
        return { users: loadedUsers, notes: loadedNotes, tags: loadedTags };
    }
    
    console.log('Migrating data to include user IDs...');
    
    // If we need to migrate but have no users, create a default user
    if (loadedUsers.length === 0) {
        const defaultUserId = uuidv4();
        const defaultUser = {
            id: defaultUserId,
            username: 'admin',
            password: '$2b$10$eCc/b4iFV0cXmtbjvxKjXOBMKP.Ib7CYzD/Qg4yeA9EGrSWRhvwVi' // hashed 'admin'
        };
        loadedUsers.push(defaultUser);
        console.log('Created default user with username: admin and password: admin');
    }
    
    // Use the first user as the owner for all existing notes and tags
    const defaultUserId = loadedUsers[0].id;
    
    // Migrate notes
    const migratedNotes = loadedNotes.map(note => {
        if (!note.userId) {
            return { ...note, userId: defaultUserId, createdAt: note.createdAt || new Date().toISOString() };
        }
        return note;
    });
    
    // Migrate tags
    const migratedTags = loadedTags.map(tag => {
        if (!tag.userId) {
            return { ...tag, userId: defaultUserId, createdAt: tag.createdAt || new Date().toISOString() };
        }
        return tag;
    });
    
    console.log(`Migration complete. Associated ${migratedNotes.length} notes and ${migratedTags.length} tags with user ID: ${defaultUserId}`);
    
    return { users: loadedUsers, notes: migratedNotes, tags: migratedTags };
};

try {
    if (fs.existsSync(USERS_FILE)) {
        users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    }
    if (fs.existsSync(NOTES_FILE)) {
        notes = JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8'));
    }
    if (fs.existsSync(TAGS_FILE)) {
        tags = JSON.parse(fs.readFileSync(TAGS_FILE, 'utf8'));
    }
    if (fs.existsSync(BLACKLIST_FILE)) {
        tokenBlacklist = JSON.parse(fs.readFileSync(BLACKLIST_FILE, 'utf8'));
    }
    
    // Migrate data if needed
    const migratedData = migrateData(users, notes, tags);
    users = migratedData.users;
    notes = migratedData.notes;
    tags = migratedData.tags;
    
    // Save migrated data
    saveData();
    
} catch (error) {
    console.error('Error loading data files:', error);
}

// Function to save data to files
const saveData = () => {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2));
        fs.writeFileSync(TAGS_FILE, JSON.stringify(tags, null, 2));
        fs.writeFileSync(BLACKLIST_FILE, JSON.stringify(tokenBlacklist, null, 2));
    } catch (error) {
        console.error('Error saving data files:', error);
    }
};

// Function to clean expired tokens from blacklist
const cleanBlacklist = () => {
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    const validTokens = tokenBlacklist.filter(item => item.exp > now);

    if (validTokens.length !== tokenBlacklist.length) {
        tokenBlacklist = validTokens;
        saveData();
        console.log(`Cleaned ${tokenBlacklist.length - validTokens.length} expired tokens from blacklist`);
    }
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
        // Set WWW-Authenticate header as required by RFC 6750
        res.setHeader('WWW-Authenticate', 'Bearer realm="api"');
        return res.status(401).json({ message: "Access denied" });
    }

    const token = authHeader.replace("Bearer ", "");

    // Check if token is in blacklist
    if (tokenBlacklist.some(item => item.token === token)) {
        // Set WWW-Authenticate header as required by RFC 6750
        res.setHeader('WWW-Authenticate', 'Bearer error="invalid_token", error_description="The token has been revoked"');
        return res.status(401).json({ message: "Token has been revoked" });
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            // Set WWW-Authenticate header as required by RFC 6750
            res.setHeader('WWW-Authenticate', 'Bearer error="invalid_token", error_description="The access token is invalid"');
            return res.status(401).json({ message: "Invalid token" });
        }
        req.user = user;
        req.token = token; // Store token for potential revocation
        next();
    });
};

// Run blacklist cleanup periodically (every hour)
setInterval(cleanBlacklist, 60 * 60 * 1000);

// User routes
app.post("/users", async (req, res) => {
    try {
        let { username, password } = req.body;
        
        // Trim whitespace from input fields
        username = username ? username.trim() : '';
        password = password ? password.trim() : '';

        // Always ensure we have the latest users data
        if (fs.existsSync(USERS_FILE)) {
            try {
                const fileData = fs.readFileSync(USERS_FILE, 'utf8');
                if (fileData.trim()) { // Check if file is not empty
                    users = JSON.parse(fileData);
                    console.log(`Loaded ${users.length} users from file`);
                } else {
                    console.log('Users file exists but is empty, using empty array');
                    users = [];
                }
            } catch (error) {
                console.error('Error loading users file:', error);
                // Initialize with empty array if there's an error
                users = [];
            }
        } else {
            console.log('Users file does not exist, using empty array');
            users = [];
        }

        console.log(`Attempting to register user: ${username}`);
        console.log(`Current users in system: ${JSON.stringify(users.map(u => u.username))}`);

        if (!username || !password) {
            return res.status(400).json({ message: "Username and password are required" });
        }
        
        // Check if username or password are just whitespace (which would be empty strings after trimming)
        if (username === '' || password === '') {
            return res.status(400).json({ message: "Username and password cannot be empty or just whitespace" });
        }

        // Check if user already exists - use case-insensitive comparison
        const existingUser = users.find(u => u.username && u.username.toLowerCase() === username.toLowerCase());
        console.log(`Existing user check result: ${existingUser ? 'User exists' : 'User does not exist'}`);

        if (existingUser) {
            console.log(`Rejecting registration for existing username: ${username}`);
            return res.status(409).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { id: uuidv4(), username, password: hashedPassword };
        users.push(newUser);

        // Ensure data directory exists before saving
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        // Save users to file
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        console.log(`New user registered: ${username}, Total users: ${users.length}`);
        console.log(`Users saved to ${USERS_FILE}`);

        // Create a sanitized user object without the password hash
        const userResponse = {
            id: newUser.id,
            username: newUser.username
            // password hash is intentionally omitted
        };
        return res.status(201).location(`/api/users/${newUser.id}`).json({ message: "User registered successfully", user: userResponse });
    } catch (error) {
        console.error('Error in user registration:', error);
        return res.status(500).json({ message: "Internal server error during registration" });
    }
});



app.patch("/users/:id", authenticateToken, async (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Trim whitespace from input fields
    if (req.body.password) {
        const trimmedPassword = req.body.password.trim();
        if (trimmedPassword === '') {
            return res.status(400).json({ message: "Password cannot be empty or just whitespace" });
        }
        user.password = await bcrypt.hash(trimmedPassword, 10);
    }
    
    if (req.body.username) {
        const trimmedUsername = req.body.username.trim();
        if (trimmedUsername === '') {
            return res.status(400).json({ message: "Username cannot be empty or just whitespace" });
        }
        // Check if the new username already exists
        const existingUser = users.find(u => u.username === trimmedUsername && u.id !== req.params.id);
        if (existingUser) return res.status(409).json({ message: "Username already exists" });
        user.username = trimmedUsername;
    }

    // Save users to file
    saveData();

    res.status(200).json({ message: "User updated successfully" });
});

app.delete("/users/:id", authenticateToken, (req, res) => {
    // Check if user exists before attempting to delete
    const userExists = users.some(u => u.id === req.params.id);

    if (!userExists) {
        return res.status(404).json({ message: "User not found" });
    }

    users = users.filter(u => u.id !== req.params.id);

    // Save users to file
    saveData();

    res.status(204).send();
});

// Session routes
app.post("/sessions", async (req, res) => {
    let { username, password } = req.body;
    
    // Trim whitespace from input fields
    username = username ? username.trim() : '';
    password = password ? password.trim() : '';
    
    // Check if username or password are empty after trimming
    if (!username || !password) {
        // Set WWW-Authenticate header as required by RFC 7235
        res.setHeader('WWW-Authenticate', 'Basic realm="api"');
        return res.status(400).json({ message: "Username and password are required" });
    }
    
    const user = users.find(u => u.username === username);
    if (!user || !(await bcrypt.compare(password, user.password))) {
        // Set WWW-Authenticate header as required by RFC 7235
        res.setHeader('WWW-Authenticate', 'Basic realm="api"');
        return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: "1h" });
    res.status(200).json({ token });
});

app.delete("/sessions", authenticateToken, (req, res) => {
    try {
        // Get token from request
        const token = req.token;

        // Decode token to get expiration time
        const decoded = jwt.decode(token);

        if (decoded && decoded.exp) {
            // Add token to blacklist
            tokenBlacklist.push({
                token: token,
                exp: decoded.exp,
                revokedAt: Math.floor(Date.now() / 1000)
            });

            // Save blacklist to file
            saveData();

            console.log(`Token for user ${decoded.username || decoded.id} has been revoked`);
        }

        res.status(204).send();
    } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({ message: "Internal server error during logout" });
    }
});

// Notes routes
app.get("/notes", authenticateToken, (req, res) => {
    // Filter notes by user ID
    const userNotes = notes.filter(note => note.userId === req.user.id);
    res.status(200).json(userNotes);
});

app.post("/notes", authenticateToken, (req, res) => {
    let { title, content, tags: noteTags, reminder } = req.body;
    
    // Validate data types
    if (title === undefined || content === undefined) {
        return res.status(400).json({ message: "Title and content are required" });
    }
    
    if (typeof title !== 'string' || typeof content !== 'string') {
        return res.status(400).json({
            message: "Title and content must be strings"
        });
    }
    
    // Trim whitespace from input fields
    title = title.trim();
    content = content.trim();
    
    if (!title || !content) return res.status(400).json({ message: "Title and content cannot be empty" });

    // Process tags if they exist
    if (noteTags && Array.isArray(noteTags)) {
        noteTags = noteTags.map(tag => typeof tag === 'string' ? tag.trim() : tag)
            .filter(tag => tag && tag !== '');
    }

    // Associate note with the authenticated user
    const newNote = { 
        id: uuidv4(), 
        userId: req.user.id, 
        title, 
        content, 
        tags: noteTags || [], 
        reminder,
        createdAt: new Date().toISOString()
    };
    notes.push(newNote);

    // Save notes to file
    saveData();

    res.status(201).location(`/notes/${newNote.id}`).json({ message: "Note created successfully", note: newNote });
});

app.patch("/notes/:id", authenticateToken, (req, res) => {
    const note = notes.find(n => n.id === req.params.id && n.userId === req.user.id);
    if (!note) return res.status(404).json({ message: "Note not found" });

    // Trim whitespace from input fields
    const updatedData = { ...req.body };
    
    if (updatedData.title !== undefined && updatedData.title !== null) {
        const trimmed = updatedData.title.toString().trim();
        if (trimmed) note.title = trimmed;
    }
    
    if (updatedData.content !== undefined && updatedData.content !== null) {
        const trimmed = updatedData.content.toString().trim();
        if (trimmed) note.content = trimmed;
    }
    
    // Process tags if they exist
    if (updatedData.tags && Array.isArray(updatedData.tags)) {
        updatedData.tags = updatedData.tags.map(tag => typeof tag === 'string' ? tag.trim() : tag)
            .filter(tag => tag && tag !== '');
    }

    // Process tags if they exist (already handled above)
    if (updatedData.tags && Array.isArray(updatedData.tags)) {
        note.tags = updatedData.tags;
    }

    // Save notes to file
    saveData();

    res.status(200).json({ message: "Note updated successfully" });
});

app.delete("/notes/:id", authenticateToken, (req, res) => {
    // Check if note exists and belongs to the authenticated user
    const noteExists = notes.some(n => n.id === req.params.id && n.userId === req.user.id);

    if (!noteExists) {
        return res.status(404).json({ message: "Note not found" });
    }

    notes = notes.filter(n => n.id !== req.params.id || n.userId !== req.user.id);

    // Save notes to file
    saveData();

    res.status(204).send();
});

// Tags routes
app.get("/tags", authenticateToken, (req, res) => {
    // Filter tags by user ID
    const userTags = tags.filter(tag => tag.userId === req.user.id);
    res.status(200).json(userTags);
});

app.post("/tags", authenticateToken, (req, res) => {
    let { name } = req.body;
    
    // Validate data types
    if (name === undefined) {
        return res.status(400).json({ message: "Tag name is required" });
    }
    
    if (typeof name !== 'string') {
        return res.status(400).json({
            message: "Tag name must be a string"
        });
    }
    
    // Trim whitespace from input fields
    name = name.trim();
    
    // Check if tag name is empty after trimming
    if (name === '') {
        return res.status(400).json({ message: "Tag name cannot be empty or just whitespace" });
    }

    // Check if tag already exists for this user
    const existingTag = tags.find(t => t.name === name && t.userId === req.user.id);
    if (existingTag) return res.status(409).json({ message: "Tag already exists" });

    // Associate tag with the authenticated user
    const newTag = { 
        id: uuidv4(), 
        userId: req.user.id, 
        name,
        createdAt: new Date().toISOString()
    };
    tags.push(newTag);

    // Save tags to file
    saveData();

    res.status(201).location(`/tags/${newTag.id}`).json({ message: "Tag created successfully", tag: newTag });
});

app.patch("/tags/:id", authenticateToken, (req, res) => {
    const tag = tags.find(t => t.id === req.params.id && t.userId === req.user.id);
    if (!tag) return res.status(404).json({ message: "Tag not found" });

    if (req.body.name !== undefined && req.body.name !== null) {
        const trimmed = req.body.name.toString().trim();
        if (trimmed) {
            // Check if the new tag name already exists
            const existingTag = tags.find(t => t.name === trimmed && t.id !== req.params.id);
            if (existingTag) return res.status(409).json({ message: "Tag name already exists" });
            tag.name = trimmed;
        }
    }

    // Save tags to file
    saveData();

    res.status(200).json({ message: "Tag updated successfully" });
});

app.delete("/tags/:id", authenticateToken, (req, res) => {
    // Check if tag exists and belongs to the authenticated user
    const tagExists = tags.some(t => t.id === req.params.id && t.userId === req.user.id);

    if (!tagExists) {
        return res.status(404).json({ message: "Tag not found" });
    }

    tags = tags.filter(t => t.id !== req.params.id || t.userId !== req.user.id);

    // Save tags to file
    saveData();

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
