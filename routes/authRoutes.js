const router = require('express').Router();

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const User = require('../models/User');
const {
  sendVerificationEmail,
} = require('../services/emailService');

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

    const password = String(
      req.body.password || ''
    );

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email i hasło są wymagane.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error:
          'Hasło musi mieć co najmniej 8 znaków.',
      });
    }

    const existingUser = await User.findOne({
      email,
    });

    if (existingUser) {
      return res.status(409).json({
        error:
          'Użytkownik o tym adresie email już istnieje.',
      });
    }

    const hashedPassword =
      await bcrypt.hash(password, 12);

    const verificationToken =
      crypto.randomBytes(32).toString('hex');

    const verificationExpires =
      new Date(
        Date.now() + 24 * 60 * 60 * 1000
      );

    const newUser = new User({
      email,
      password: hashedPassword,

      role: 'user',

      emailVerified: false,

      emailVerificationToken:
        verificationToken,

      emailVerificationExpires:
        verificationExpires,
    });

    await newUser.save();

    try {
      await sendVerificationEmail(
        email,
        verificationToken
      );
    } catch (emailError) {
      console.error(
        'Verification email error:',
        emailError
      );

      await User.deleteOne({
        _id: newUser._id,
      });

      return res.status(500).json({
        error:
          'Nie udało się wysłać wiadomości weryfikacyjnej. Spróbuj ponownie później.',
      });
    }

    return res.status(201).json({
      message:
        'Konto zostało utworzone. Sprawdź swoją skrzynkę e-mail i potwierdź adres.',
    });
  } catch (error) {
    console.error(
      'Register error:',
      error
    );

    return res.status(500).json({
      error:
        'Nie udało się utworzyć użytkownika.',
    });
  }
});

/*
 * =========================
 * POTWIERDZENIE E-MAILA
 * =========================
 *
 * GET /api/auth/verify-email?token=...
 */

router.get(
  '/verify-email',
  async (req, res) => {
    try {
      const token = String(
        req.query.token || ''
      ).trim();

      if (!token) {
        return res.status(400).json({
          error:
            'Brakuje tokenu weryfikacyjnego.',
        });
      }

      const user =
        await User.findOne({
          emailVerificationToken:
            token,
          emailVerificationExpires: {
            $gt: new Date(),
          },
        });

      if (!user) {
        return res.status(400).json({
          error:
            'Link weryfikacyjny jest nieprawidłowy lub wygasł.',
        });
      }

      user.emailVerified = true;

      user.emailVerificationToken = null;

      user.emailVerificationExpires = null;

      await user.save();

      return res.json({
        message:
          'Adres e-mail został potwierdzony. Możesz się teraz zalogować.',
      });
    } catch (error) {
      console.error(
        'Verify email error:',
        error
      );

      return res.status(500).json({
        error:
          'Nie udało się potwierdzić adresu e-mail.',
      });
    }
  }
);

/*
 * =========================
 * PONOWNE WYSŁANIE
 * =========================
 *
 * POST /api/auth/resend-verification
 */

router.post(
  '/resend-verification',
  async (req, res) => {
    try {
      const email = String(
        req.body.email || ''
      )
        .trim()
        .toLowerCase();

      if (!email) {
        return res.status(400).json({
          error:
            'Adres email jest wymagany.',
        });
      }

      const user =
        await User.findOne({
          email,
        });

      /*
       * Nie ujawniamy, czy konto istnieje.
       */
      if (!user) {
        return res.json({
          message:
            'Jeżeli konto istnieje i wymaga weryfikacji, wiadomość została wysłana.',
        });
      }

      if (user.emailVerified) {
        return res.json({
          message:
            'Ten adres e-mail jest już potwierdzony.',
        });
      }

      const verificationToken =
        crypto.randomBytes(32)
          .toString('hex');

      user.emailVerificationToken =
        verificationToken;

      user.emailVerificationExpires =
        new Date(
          Date.now() +
            24 * 60 * 60 * 1000
        );

      await user.save();

      await sendVerificationEmail(
        email,
        verificationToken
      );

      return res.json({
        message:
          'Nowy link weryfikacyjny został wysłany.',
      });
    } catch (error) {
      console.error(
        'Resend verification error:',
        error
      );

      return res.status(500).json({
        error:
          'Nie udało się wysłać wiadomości weryfikacyjnej.',
      });
    }
  }
);

/*
 * =========================
 * LOGOWANIE
 * =========================
 */

router.post('/login', async (req, res) => {
  try {
    const email = String(
      req.body.email || ''
    )
      .trim()
      .toLowerCase();

    const password = String(
      req.body.password || ''
    );

    if (!email || !password) {
      return res.status(400).json({
        error:
          'Email i hasło są wymagane.',
      });
    }

    const user =
      await User.findOne({
        email,
      });

    if (!user) {
      return res.status(401).json({
        error:
          'Nieprawidłowy email lub hasło.',
      });
    }

    const validPassword =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!validPassword) {
      return res.status(401).json({
        error:
          'Nieprawidłowy email lub hasło.',
      });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        error:
          'Najpierw potwierdź swój adres e-mail.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    if (
      user.bannedUntil &&
      user.bannedUntil > new Date()
    ) {
      return res.status(403).json({
        error:
          'Twoje konto jest czasowo zablokowane.',
        code: 'ACCOUNT_BANNED',
        bannedUntil:
          user.bannedUntil,
      });
    }

    /*
     * Jeżeli ban już wygasł,
     * czyścimy go.
     */

    if (
      user.bannedUntil &&
      user.bannedUntil <= new Date()
    ) {
      user.bannedUntil = null;
      await user.save();
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
        role: user.role,
        bannedUntil:
          user.bannedUntil,
        emailVerified:
          user.emailVerified,
      },
    });
  } catch (error) {
    console.error(
      'Login error:',
      error
    );

    return res.status(500).json({
      error:
        'Nie udało się zalogować.',
    });
  }
});

module.exports = router;