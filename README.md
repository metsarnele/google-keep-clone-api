# Google Keep API Clone

This project is an OpenAPI specification for a Google Keep-like note-taking application. It defines the API endpoints, request/response structures, and supports Swagger UI for easy testing.

## Features
- 📌 **Create, read, update, and delete notes**
- 🏷️ **Tag notes with custom labels**
- ⏰ **Set reminders on notes**
- 📄 **RESTful API following OpenAPI 3.0 standard**
- 🎨 **Swagger UI for interactive API documentation**

## Getting Started

### 1️⃣ Clone the Repository
```sh
git clone https://github.com/YOUR_GITHUB_USERNAME/GoogleKeepAPI.git
cd GoogleKeepAPI
```

### 2️⃣ Install Dependencies
```sh
npm install
```

### 3️⃣ Run Local Server
```sh
npm start
```

### 4️⃣ Open Swagger UI
Once the server is running, open the following URL in your browser:
```
http://localhost:3000/api-docs
```

## API Endpoints

### 📌 Notes
| Method | Endpoint        | Description          |
|--------|----------------|----------------------|
| GET    | `/notes`       | Get all notes       |
| POST   | `/notes`       | Create a new note   |
| GET    | `/notes/{id}`  | Get a specific note |
| PUT    | `/notes/{id}`  | Update a note       |
| DELETE | `/notes/{id}`  | Delete a note       |

### 🏷️ Tags
| Method | Endpoint  | Description        |
|--------|----------|--------------------|
| GET    | `/tags`  | Get all tags       |

## Technologies Used
- **Node.js** - Server runtime
- **Express.js** - Backend framework
- **Swagger UI** - API documentation
- **OpenAPI 3.0** - API specification

## Contributing
Pull requests are welcome! Feel free to submit issues or feature requests.

