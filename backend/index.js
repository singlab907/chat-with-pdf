const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

dotenv.config();

// Load routes after environment variables are available
const apiRoutes = require('./routes/api');

const app = express();

// Global middleware configuration
app.use(cors());
app.use(bodyParser.json({ limit: '25mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '25mb' }));

// Attach API routes to the application
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 5001;

// Start the Express server
app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});
