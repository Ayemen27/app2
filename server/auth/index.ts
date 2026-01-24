import { Express } from "express";
import { storage } from "../storage";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access_secret_key_123";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh_secret_key_456";

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      const user = await storage.getUserByEmail(email);
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return done(null, false, { message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "فشل تسجيل الدخول" });

      req.logIn(user, (err) => {
        if (err) return next(err);

        const accessToken = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          JWT_ACCESS_SECRET,
          { expiresIn: "1h" }
        );

        const refreshToken = jwt.sign(
          { id: user.id },
          JWT_REFRESH_SECRET,
          { expiresIn: "7d" }
        );

        res.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            role: user.role
          },
          tokens: {
            accessToken,
            refreshToken
          }
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/refresh", async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: "Refresh token مطلوب" });

    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { id: string };
      const user = await storage.getUser(decoded.id);
      if (!user) return res.status(401).json({ message: "مستخدم غير موجود" });

      const newAccessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_ACCESS_SECRET,
        { expiresIn: "1h" }
      );

      res.json({
        success: true,
        tokens: {
          accessToken: newAccessToken,
          refreshToken // Re-use old or generate new one
        }
      });
    } catch (err) {
      res.status(401).json({ message: "Refresh token غير صالح" });
    }
  });

  app.get("/api/auth/me", (req, res) => {
    // التحقق من الجلسة أو التوكن
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as any;
        return res.json({ user: decoded });
      } catch (err) {
        // Fallback to session
      }
    }

    if (!req.isAuthenticated()) return res.status(401).json({ message: "غير مصرح" });
    res.json({ user: req.user });
  });

  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ success: true, message: "تم تسجيل الخروج بنجاح" });
    });
  });
}
