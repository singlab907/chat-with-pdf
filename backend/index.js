const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

dotenv.config();

// Load routes after environment variables are available
const apiRoutes = require('./routes/api');

const app = express();

const allowedOrigins = new Set([
  'https://chat-with-pdf-eight-peach.vercel.app',
  'https://chat-with-402maf18j-bhawna-singlas-projects.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5001',
]);

// Global middleware configuration
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      if (origin.endsWith('.vercel.app')) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.options('*', cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Attach API routes to the application
app.use('/api', apiRoutes);

// Root informational endpoint
app.get('/', (req, res) => {
  res.json({ status: 'API is running. Use /api endpoints.' });
});

// Health check endpoint for monitoring
app.get('/healthz', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5001;

// Start the Express server
app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});
