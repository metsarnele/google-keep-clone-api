const express = require('express');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');

const app = express();
const port = 3000;

// Laeb OpenAPI spetsifikatsiooni
const openapiDocument = JSON.parse(fs.readFileSync('./openapi.json', 'utf8'));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));

app.listen(port, () => {
    console.log(`Swagger UI available at http://localhost:${port}/api-docs`);
});
