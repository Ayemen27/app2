import { Express } from "express";
import { storage } from "../storage";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JWT_SHARED_SECRET } from "./jwt-utils";

const JWT_ACCESS_SECRET = JWT_SHARED_SECRET;
const JWT_REFRESH_SECRET = JWT_SHARED_SECRET;
const JWT_ISSUER = 'construction-management-app-v2';

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
    passport.authenticate("local", async (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "فشل تسجيل الدخول" });

      req.logIn(user, async (err) => {
        if (err) return next(err);

        // Generate a session ID (mimicking the expectations of the middleware)
        const sessionId = Math.random().toString(36).substring(2);

        const accessToken = jwt.sign(
          { userId: user.id, email: user.email, role: user.role, sessionId },
          JWT_ACCESS_SECRET,
          { expiresIn: "1h", issuer: JWT_ISSUER }
        );

        const refreshToken = jwt.sign(
          { userId: user.id, sessionId },
          JWT_REFRESH_SECRET,
          { expiresIn: "7d", issuer: JWT_ISSUER }
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
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET, { issuer: JWT_ISSUER }) as { userId: string, sessionId: string };
      const user = await storage.getUser(decoded.userId);
      if (!user) return res.status(401).json({ message: "مستخدم غير موجود" });

      const newAccessToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role, sessionId: decoded.sessionId },
        JWT_ACCESS_SECRET,
        { expiresIn: "1h", issuer: JWT_ISSUER }
      );

      res.json({
        success: true,
        tokens: {
          accessToken: newAccessToken,
          refreshToken
        }
      });
    } catch (err) {
      res.status(401).json({ message: "Refresh token غير صالح" });
    }
  });

  app.get("/api/auth/me", (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_ACCESS_SECRET, { issuer: JWT_ISSUER }) as any;
        return res.json({
          success: true,
          user: {
            id: decoded.userId,
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            sessionId: decoded.sessionId
          }
        });
      } catch (err) {
        // Fallback
      }
    }

    if (req.isAuthenticated()) {
      return res.json({ success: true, user: req.user });
    }

    res.status(401).json({ success: false, message: "غير مصرح" });
  });

  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ success: true, message: "تم تسجيل الخروج بنجاح" });
    });
  });
}
