declare global {
  namespace Express {
    interface Request {
      user?: {
        user_id: string;
        email: string;
        role: string;
        sessionId: string;
        id?: string;
        first_name?: string;
        last_name?: string;
        is_active?: boolean;
        mfa_enabled?: boolean;
      };
    }
  }
}

export {};
