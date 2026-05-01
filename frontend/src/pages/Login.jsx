import React, { useState, useEffect } from 'react';
import { Orbit } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { login, reset } from '../features/auth/authSlice';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const Login = () => {
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

  return (
    <div className="flex justify-center items-center min-h-screen relative z-10 p-4">
      <div className="w-full max-w-[400px] p-8 rounded-2xl border border-blue-500/30 bg-card/30 backdrop-blur-md text-card-foreground shadow-[0_4px_20px_-5px_rgba(59,130,246,0.15)]">
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

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Log In'}
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
