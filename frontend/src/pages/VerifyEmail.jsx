import React, { useState, useEffect, useRef } from 'react';
import { Orbit, ShieldCheck, RefreshCw, Sun, Moon } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyEmail, resendCode, reset } from '../features/auth/authSlice';
import { useTheme } from '../components/ThemeProvider';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/button';

const COOLDOWN_SECONDS = 60;
const CODE_LENGTH = 6;

const VerifyEmail = () => {
  const { theme, setTheme } = useTheme();
  const [searchParams] = useSearchParams();
  const emailFromParams = searchParams.get('email') || '';

  const [code, setCode] = useState(Array(CODE_LENGTH).fill(''));
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef([]);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user, isLoading, isError, isSuccess, message } = useSelector(
    (state) => state.auth
  );

  // If user is already logged in, redirect
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Handle errors
  useEffect(() => {
    if (isError) {
      toast.error(message);
      dispatch(reset());
    }
  }, [isError, message, dispatch]);

  // If no email provided, redirect back to register
  useEffect(() => {
    if (!emailFromParams) {
      navigate('/register');
    }
  }, [emailFromParams, navigate]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-advance to next input
    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().slice(0, CODE_LENGTH);
    if (!/^\d+$/.test(pasted)) return;

    const newCode = Array(CODE_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) {
      newCode[i] = pasted[i];
    }
    setCode(newCode);

    // Focus last filled input or the next empty one
    const focusIndex = Math.min(pasted.length, CODE_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const fullCode = code.join('');

    if (fullCode.length !== CODE_LENGTH) {
      return toast.error('Please enter the full 6-digit verification code');
    }

    dispatch(verifyEmail({ email: emailFromParams, code: fullCode }));
  };

  const handleResend = () => {
    if (cooldown > 0) return;
    dispatch(resendCode(emailFromParams));
    setCooldown(COOLDOWN_SECONDS);
    toast.success('New verification code sent!');
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : prev === 'dark' ? 'orbit' : 'light'));
  };

  const getThemeIcon = () => {
    if (theme === 'light') return <Sun size={18} />;
    if (theme === 'dark') return <Moon size={18} />;
    return <Orbit size={18} className="text-violet-400" />;
  };

  return (
    <div className="flex justify-center items-center min-h-screen relative z-10 p-4">
      {/* Floating Theme Switcher */}
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2.5 rounded-full border border-border bg-card/60 backdrop-blur-md text-foreground active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5"
        title={`Current Theme: ${theme}. Click to switch.`}
      >
        {getThemeIcon()}
        <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">{theme}</span>
      </button>

      <div className="w-full max-w-[420px] p-6 sm:p-8 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-md text-card-foreground shadow-lg">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-primary/20 backdrop-blur-sm text-primary p-3 rounded-2xl mb-4 border border-primary/30">
            <ShieldCheck size={28} />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold">Verify Your Email</h2>
          <p className="text-xs sm:text-sm text-muted-foreground text-center mt-1 leading-relaxed">
            We've sent a 6-digit code to
          </p>
          <p className="text-xs sm:text-sm font-semibold text-primary mt-0.5 break-all text-center">
            {emailFromParams}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* OTP Input Grid */}
          <div className="flex justify-center gap-2 sm:gap-3">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold rounded-xl
                  border border-border/60 bg-background/40 backdrop-blur-sm
                  text-foreground
                  focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/60
                  transition-all duration-200"
                autoComplete="one-time-code"
              />
            ))}
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <RefreshCw size={16} className="animate-spin" />
                Verifying...
              </span>
            ) : (
              'Verify & Continue'
            )}
          </Button>
        </form>

        {/* Resend Code */}
        <div className="text-center mt-5">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Didn't receive the code?
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || isLoading}
            className={`mt-1.5 text-sm font-semibold transition-colors ${
              cooldown > 0
                ? 'text-muted-foreground cursor-not-allowed'
                : 'text-primary active:opacity-70'
            }`}
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
          </button>
        </div>

        {/* Expiry notice */}
        <p className="text-[11px] text-muted-foreground/70 text-center mt-4">
          Code expires in 15 minutes
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;
