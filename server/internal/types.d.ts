declare global {
  namespace Express {
    interface Request {
      user?: {
        id?: string;
        user_id: string;
        userId?: string;
        email: string;
        first_name?: string;
        last_name?: string;
        role: string;
        is_active?: boolean;
        mfa_enabled?: boolean;
        sessionId: string;
      };
    }
  }
}

export {};
