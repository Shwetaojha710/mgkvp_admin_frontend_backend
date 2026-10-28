import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/errors';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { username: '', password: '' },
  });

  async function onSubmit(values) {
    setSubmitting(true);
    try {
      await login(values.username.trim(), values.password);
      toast.success('Login successful');
      navigate('/admin', { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Invalid credentials'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-card">
      <h1>MGKVP Admin</h1>
      <p className="subtitle">Mahatma Gandhi Kashi Vidyapith — Admin Login</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form-group">
          <label htmlFor="username">
            Login Id <span className="required">*</span>
          </label>
          <input
            id="username"
            className="form-control"
            placeholder="Login Id"
            autoComplete="username"
            {...register('username', { required: 'Login Id is required' })}
          />
          {errors.username && <div className="form-error">{errors.username.message}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="password">
            Password <span className="required">*</span>
          </label>
          <div className="password-field">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="form-control"
              placeholder="Password"
              autoComplete="current-password"
              {...register('password', { required: 'Password is required' })}
            />
            <button
              type="button"
              className="toggle"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
            </button>
          </div>
          {errors.password && <div className="form-error">{errors.password.message}</div>}
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log In'}
        </button>
      </form>

      <div className="auth-help">
        <div>Helpdesk | 18005320157 / 8429195682</div>
        <div>Whatsapp 8931821873</div>
        <div style={{ marginTop: 10, lineHeight: 1.5 }}>
          <div>
            <strong>Admin:</strong> admin / Admin@12345
          </div>
          <div>
            <strong>Webmaster:</strong> webmaster / Webmaster@12345
          </div>
          <div>
            <strong>Faculty:</strong> faculty / Faculty@12345
          </div>
          <div>
            <strong>Head:</strong> head / Head@12345
          </div>
        </div>
      </div>
    </div>
  );
}
