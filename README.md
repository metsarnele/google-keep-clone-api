# Google Keep Clone API

## Overview
Google Keep Clone API is a RESTful API designed for a note-taking application that supports user authentication, note creation, tagging, and reminders.

## Features
- User authentication (registration, login, logout)
- CRUD operations for notes
- Tag management
- Reminder support

## API Base URL
```
http://localhost:3000
```

## API Documentation
For detailed API documentation, visit:
```
http://localhost:3000/docs
```

## Endpoints

### User Management
#### Register a new user
**POST** `/users`
- Request Body:
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- Responses:
    - `201 Created` - User registered successfully
    - `400 Bad Request` - Invalid request data

#### Update user details
**PATCH** `/users/{id}` (Requires Authentication)
- Request Body:
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- Responses:
    - `200 OK` - User updated successfully
    - `404 Not Found` - User not found

#### Delete a user
**DELETE** `/users/{id}` (Requires Authentication)
- Responses:
    - `204 No Content` - User deleted successfully
    - `404 Not Found` - User not found

### Authentication
#### User login
**POST** `/sessions`
- Request Body:
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- Responses:
    - `200 OK` - JWT token returned
    - `401 Unauthorized` - Invalid credentials

#### User logout
**POST** `/sessions/logout` (Requires Authentication)
- Responses:
    - `200 OK` - User logged out successfully

### Notes Management
#### Retrieve all notes
**GET** `/notes` (Requires Authentication)
- Responses:
    - `200 OK` - A list of notes

#### Create a new note
**POST** `/notes` (Requires Authentication)
- Request Body:
  ```json
  {
    "title": "string",
    "content": "string",
    "tags": ["string"],
    "reminder": "YYYY-MM-DDTHH:MM:SSZ"
  }
  ```
- Responses:
    - `201 Created` - Note created successfully

#### Update a note
**PATCH** `/notes/{id}` (Requires Authentication)
- Responses:
    - `200 OK` - Note updated successfully
    - `404 Not Found` - Note not found

#### Delete a note
**DELETE** `/notes/{id}` (Requires Authentication)
- Responses:
    - `204 No Content` - Note deleted successfully
    - `404 Not Found` - Note not found

### Tags Management
#### Create a new tag
**POST** `/tags` (Requires Authentication)
- Request Body:
  ```json
  {
    "name": "string"
  }
  ```
- Responses:
    - `201 Created` - Tag created successfully

#### Update a tag
**PATCH** `/tags/{id}` (Requires Authentication)
- Responses:
    - `200 OK` - Tag updated successfully
    - `404 Not Found` - Tag not found

#### Delete a tag
**DELETE** `/tags/{id}` (Requires Authentication)
- Responses:
    - `204 No Content` - Tag deleted successfully
    - `404 Not Found` - Tag not found

## Authentication
This API uses **JWT Bearer Authentication**. Include the token in the `Authorization` header as follows:
```
Authorization: Bearer <token>
```

## Data Models
### Note
```json
{
  "title": "string",
  "content": "string",
  "tags": ["string"],
  "reminder": "YYYY-MM-DDTHH:MM:SSZ"
}
```

### Tag
```json
{
  "name": "string"
}
```

## Running the Server
To start the API server, use the following command:
```bash
node server.js
```

### Dependencies
The project uses the following dependencies:
- Express
- CORS
- Body-parser
- UUID
- Swagger UI Express
- JSON Web Token (JWT)
- Bcrypt


## License
This project is open-source and available for modification and distribution.

---
**Happy Coding!** 🚀

