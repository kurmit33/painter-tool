require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const coloringSetsRoutes = require('./routes/coloringSetsRoutes');
const coloringPagesRoutes = require('./routes/coloringPagesRoutes');
const artworkRoutes = require('./routes/artworkRoutes');
const artworkInteractionRoutes = require(
  './routes/artworkInteractionRoutes'
);

const app = express();

const PORT = Number(process.env.PORT) || 3000;

/*
 * =========================
 * KONFIGURACJA
 * =========================
 */

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
  throw new Error('Brakuje zmiennej środowiskowej JWT_SECRET.');
}

function getMongoUri() {
  if (process.env.MONGO_URI && process.env.MONGO_URI.trim() !== '') {
    return process.env.MONGO_URI.trim();
  }

  const requiredMongoVars = [
    'MONGO_HOST',
    'MONGO_DB',
    'MONGO_USER',
    'MONGO_PASSWORD',
  ];

  const missingMongoVars = requiredMongoVars.filter((key) => {
    return !process.env[key] || process.env[key].trim() === '';
  });

  if (missingMongoVars.length > 0) {
    throw new Error(
      `Brakuje konfiguracji MongoDB. Ustaw MONGO_URI albo komplet zmiennych: ${requiredMongoVars.join(
        ', '
      )}. Brakujące: ${missingMongoVars.join(', ')}`
    );
  }

  const host = process.env.MONGO_HOST.trim();
  const db = process.env.MONGO_DB.trim();
  const user = encodeURIComponent(process.env.MONGO_USER.trim());
  const password = encodeURIComponent(
    process.env.MONGO_PASSWORD.trim()
  );

  return `mongodb://${user}:${password}@${host}:27017/${db}?authSource=${db}`;
}

/*
 * =========================
 * MIDDLEWARE
 * =========================
 */

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

/*
 * =========================
 * HEALTH CHECK
 * =========================
 */

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'kolorowanka-backend',
  });
});

/*
 * =========================
 * ROUTES
 * =========================
 */


app.use('/api/auth', authRoutes);
app.use('/api/coloring-sets', coloringSetsRoutes);
app.use('/api/coloring-pages', coloringPagesRoutes);
app.use('/api/artworks', artworkRoutes);
app.use('/api/artwork-interactions', artworkInteractionRoutes);


/*
 * =========================
 * 404
 * =========================
 */

app.use((req, res) => {
  res.status(404).json({
    error: 'API route not found',
  });
});

/*
 * =========================
 * OBSŁUGA BŁĘDÓW
 * =========================
 */

app.use((err, req, res, next) => {
  console.error('Server error:', err);

  res.status(500).json({
    error: 'Wewnętrzny błąd serwera.',
  });
});

/*
 * =========================
 * START
 * =========================
 */

async function startServer() {
  const mongoUri = getMongoUri();

  try {
    await mongoose.connect(mongoUri);

    console.log('Połączono z bazą MongoDB');

    app.listen(PORT, () => {
      console.log(`Kolorowanka backend działa na porcie ${PORT}`);
    });
  } catch (error) {
    console.error('Błąd uruchamiania aplikacji:', error);
    process.exit(1);
  }
}

module.exports = {
  app,
  startServer,
  getMongoUri,
};

if (require.main === module) {
  startServer();
}