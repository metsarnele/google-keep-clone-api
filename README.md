# Google Keep Clone API

## Overview

This project is a Google Keep Clone API that provides a note-taking application with tags and reminders. The API follows OpenAPI 3.0 specification, and the documentation is accessible via Swagger UI.

## API Documentation

The API documentation is available at:

```
http://localhost:3000/docs
```

Opening this URL in a browser will display a **Swagger UI** interface where all available endpoints, request formats, and example responses can be explored.

## Features

- **Full CRUD operations** for notes and tags.
- **RESTful design** with complete documentation.
- **No undocumented responses** in Swagger UI.
- **Example response bodies** for all documented responses.
- **Swagger UI Integration** for easy API exploration.

## API Endpoints

The API exposes the following endpoints:

### Authentication

POST /register - Register a new user.

POST /login - Login and receive a JWT token.

### Notes

GET /notes - Retrieve all notes (requires authentication).

POST /notes - Create a new note (requires authentication).

PATCH /notes/{id} - Partially update a note (requires authentication).

DELETE /notes/{id} - Delete a specific note (requires authentication).

### Tags

POST /tags - Create a new tag (requires authentication).

PATCH /tags/{id} - Update a tag (requires authentication).

DELETE /tags/{id} - Delete a specific tag (requires authentication).

### Security

All endpoints except /register and /login require authentication via a Bearer token.

Add Authorization: Bearer {token} header to requests requiring authentication.

## OpenAPI Specification

The API follows OpenAPI 3.0 standards. The specification is defined in `openapi.json`, ensuring:

- **All CRUD functionalities** are fully implemented.
- **All Swagger UI-documented endpoints** exist in the codebase and function correctly.
- **No undocumented responses** appear in Swagger UI.
- **All documented responses include example response bodies**.

## Running the Server

To start the API server, run the following command:

```bash
node server.js
```

Once started, the API documentation will be accessible at `http://localhost:3000/docs`.

## Requirements

- **Node.js** (Ensure Node.js is installed)
- **Express.js** (For serving the API)
- **Swagger-UI-Express** (For API documentation visualization)

## Installation

To install and run the API, follow these steps:

```bash
# Clone the repository
git clone https://github.com/your-repo/google-keep-clone-api.git
cd google-keep-clone-api

# Install dependencies
npm install

# Run the server
node server.js
```

## Notes

- The API serves as a Google Keep clone with CRUD functionalities for notes and tags.
- OpenAPI JSON file (`openapi.json`) should **fully describe all CRUD functionalities**.
- No undocumented responses should exist in Swagger UI.
- All responses should contain **example response bodies**.
- The API should handle errors gracefully and provide meaningful responses.
- Root route (`/`) provides a welcome message and a link to the API documentation.

## Notes Usage

### Creating a Note
To create a new note, send a `POST` request to `/notes/{id}` with a JSON body containing:

```json
{
  "title": "Sample Note",
  "content": "This is a sample note.",
  "tags": ["work", "personal"],
  "reminder": "2024-06-01T10:00:00Z"
}
```

### Updating a Note
To update a note, send a `PATCH` request to `/notes/{id}` with only the fields you wish to update:

```json
{
  "title": "Updated Note Title"
}
```

### Deleting a Note
To delete a note, send a `DELETE` request to `/notes/{id}`.

