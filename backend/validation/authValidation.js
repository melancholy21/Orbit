import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    username: z.string().min(3, 'must be at least 3 characters long').trim(),
    email: z.string().email('must be a valid email address').trim().toLowerCase(),
    password: z.string().min(6, 'must be at least 6 characters long'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('must be a valid email address').trim().toLowerCase(),
    password: z.string().min(1, 'is required'),
  }),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    email: z.string().email('must be a valid email address').trim().toLowerCase(),
    code: z.string().length(6, 'must be exactly 6 digits'),
  }),
});
