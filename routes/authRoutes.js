const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');

/*
 * =========================
 * REJESTRACJA
 * =========================
 */

router.post('/register', async (req, res) => {
  try {
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase();

    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email i hasło są wymagane.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Hasło musi mieć co najmniej 8 znaków.',
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        error: 'Użytkownik o tym adresie email już istnieje.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = new User({
      email,
      password: hashedPassword,
    });

    await newUser.save();

    return res.status(201).json({
      message: 'Użytkownik został utworzony.',
    });
  } catch (error) {
    console.error('Register error:', error);

    return res.status(500).json({
      error: 'Nie udało się utworzyć użytkownika.',
    });
  }
});

/*
 * =========================
 * LOGOWANIE
 * =========================
 */

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase();

    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email i hasło są wymagane.',
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        error: 'Nieprawidłowy email lub hasło.',
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!validPassword) {
      return res.status(401).json({
        error: 'Nieprawidłowy email lub hasło.',
      });
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '7d',
      }
    );

    return res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);

    return res.status(500).json({
      error: 'Nie udało się zalogować.',
    });
  }
});

module.exports = router;