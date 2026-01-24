import { Express } from "express";
import { storage } from "../storage";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import bcrypt from "bcryptjs";

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
        return done(null, false, { message: "Invalid email or password" });
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
    console.log(`📡 [Auth] محاولة تسجيل دخول: ${req.body.email}`);
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("❌ [Auth] خطأ أثناء المصادقة:", err);
        return next(err);
      }
      if (!user) {
        console.warn("⚠️ [Auth] فشل المصادقة:", info?.message);
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.logIn(user, (err) => {
        if (err) {
          console.error("❌ [Auth] خطأ أثناء إنشاء الجلسة:", err);
          return next(err);
        }
        console.log(`✅ [Auth] نجح تسجيل الدخول: ${user.email}`);
        // إرسال كائن يحتوي على التوكن (حتى لو كان وهمياً للجلسة) لإرضاء الفروينت آند
        res.json({
          user,
          accessToken: "session-active", // الفروينت آند يتوقع وجود توكن
          message: "Login successful"
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
