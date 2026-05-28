import React, { useState, useEffect } from 'react';
import { Orbit, Sun, Moon } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { login, reset } from '../features/auth/authSlice';
import { useTheme } from '../components/ThemeProvider';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const Login = () => {
  const { theme, setTheme } = useTheme();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const { email, password } = formData;
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user, isLoading, isError, isSuccess, message } = useSelector(
    (state) => state.auth
  );

  useEffect(() => {
    if (isError) {
      toast.error(message);
    }

    if (isSuccess || user) {
      navigate('/');
    }

    dispatch(reset());
  }, [user, isError, isSuccess, message, navigate, dispatch]);

  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  const onSubmit = (e) => {
    e.preventDefault();

    // Form Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return toast.error('Please enter a valid email address');
    }

    if (!password) {
      return toast.error('Please enter your password');
    }

    const userData = { email, password };
    dispatch(login(userData));
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
        className="absolute top-4 right-4 p-2.5 rounded-full border border-border bg-card/60 backdrop-blur-md text-foreground hover:bg-white/10 hover:scale-105 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5"
        title={`Current Theme: ${theme}. Click to switch.`}
      >
        {getThemeIcon()}
        <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">{theme}</span>
      </button>

      <div className="w-full max-w-[400px] p-8 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-md text-card-foreground shadow-lg">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-primary text-primary-foreground p-2 rounded-xl mb-4">
            <Orbit size={24} />
          </div>
          <h2 className="text-2xl font-bold">Welcome back</h2>
          <p className="text-sm text-muted-foreground">Log in to your Orbit account</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              name="email"
              placeholder="Email"
              value={email}
              onChange={onChange}
              className="bg-background/40 backdrop-blur-sm border-blue-500/20 focus:border-blue-500/50"
              required
            />
          </div>
          <div className="space-y-2">
            <Input
              type="password"
              name="password"
              placeholder="Password"
              value={password}
              onChange={onChange}
              className="bg-background/40 backdrop-blur-sm border-blue-500/20 focus:border-blue-500/50"
              required
            />
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Log In
          </Button>

          <div className="text-center mt-4">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <RouterLink to="/register" className="text-primary font-bold hover:underline">
                Sign up
              </RouterLink>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
