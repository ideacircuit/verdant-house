import React, { useState } from 'react';
import { Link, usePageMeta, useRouter } from '../lib/router.tsx';
import { useStore } from '../context/StoreContext.tsx';

export function LoginPage() {
  usePageMeta('Sign In — Verdant Living', 'Sign in to your Verdant Living customer account.');
  const { navigate } = useRouter();
  const { setCustomerAuth, showToast } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid credentials.');
        return;
      }
      setCustomerAuth(data.token, data.user);
      showToast(`Welcome back, ${data.user.name}.`, 'success');
      navigate('/account');
    } catch {
      setError('Network error while signing in.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white rounded-2xl border border-[#292D29]/10 p-8 space-y-6">
        <div>
          <p className="text-xs font-medium tracking-[0.14em] uppercase text-[#B18A52] mb-1">
            Customer Account
          </p>
          <h1 className="font-serif text-3xl font-semibold text-[#292D29]">Sign In</h1>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#292D29]/75 mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-[#292D29]/20 text-sm focus:outline-none focus:border-[#34483B]"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-[#292D29]/75">Password</label>
              <Link to="/forgot-password" className="text-xs text-[#34483B] hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-[#292D29]/20 text-sm focus:outline-none focus:border-[#34483B]"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full h-11 rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium hover:bg-[#29392F] transition-colors disabled:opacity-60"
          >
            {busy ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <p className="text-sm text-[#292D29]/70 text-center">
          New to Verdant Living?{' '}
          <Link to="/register" className="font-medium text-[#34483B] hover:underline">
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
}

export function RegisterPage() {
  usePageMeta('Create Account — Verdant Living', 'Register for a Verdant Living customer account.');
  const { navigate } = useRouter();
  const { setCustomerAuth, showToast } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed.');
        return;
      }
      setCustomerAuth(data.token, data.user);
      showToast('Account created successfully.', 'success');
      navigate('/account');
    } catch {
      setError('Network error while creating account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white rounded-2xl border border-[#292D29]/10 p-8 space-y-6">
        <div>
          <p className="text-xs font-medium tracking-[0.14em] uppercase text-[#B18A52] mb-1">
            Verdant Living
          </p>
          <h1 className="font-serif text-3xl font-semibold text-[#292D29]">Create Account</h1>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#292D29]/75 mb-1.5">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-[#292D29]/20 text-sm focus:outline-none focus:border-[#34483B]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#292D29]/75 mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-[#292D29]/20 text-sm focus:outline-none focus:border-[#34483B]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#292D29]/75 mb-1.5">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+234..."
              className="w-full h-11 px-3.5 rounded-lg border border-[#292D29]/20 text-sm focus:outline-none focus:border-[#34483B]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#292D29]/75 mb-1.5">
              Password (minimum 8 characters)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-[#292D29]/20 text-sm focus:outline-none focus:border-[#34483B]"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full h-11 rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium hover:bg-[#29392F] transition-colors disabled:opacity-60"
          >
            {busy ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-sm text-[#292D29]/70 text-center">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-[#34483B] hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export function ForgotPasswordPage() {
  usePageMeta('Reset Password — Verdant Living');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const res = await fetch('/api/auth/password-reset/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    else setMessage(data.message);
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const res = await fetch('/api/auth/password-reset/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.trim(), newPassword }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    else setMessage(data.message);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white rounded-2xl border border-[#292D29]/10 p-8 space-y-5">
        <h1 className="font-serif text-3xl font-semibold text-[#292D29]">Reset Password</h1>

        <div className="flex gap-2 p-1 bg-[#E8EDE5] rounded-lg text-xs font-medium">
          <button
            type="button"
            onClick={() => setStep('request')}
            className={`flex-1 py-2 rounded-md ${step === 'request' ? 'bg-white text-[#292D29] shadow-xs' : 'text-[#292D29]/70'}`}
          >
            Request Reset
          </button>
          <button
            type="button"
            onClick={() => setStep('confirm')}
            className={`flex-1 py-2 rounded-md ${step === 'confirm' ? 'bg-white text-[#292D29] shadow-xs' : 'text-[#292D29]/70'}`}
          >
            Enter Reset Code
          </button>
        </div>

        {error && <div className="p-3 rounded-lg bg-red-50 text-sm text-red-800">{error}</div>}
        {message && <div className="p-3 rounded-lg bg-[#E8EDE5] text-sm text-[#34483B]">{message}</div>}

        {step === 'request' ? (
          <form onSubmit={handleRequest} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#292D29]/75 mb-1.5">Account Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-[#292D29]/20 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full h-11 rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium"
            >
              Send Reset Instructions
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirm} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#292D29]/75 mb-1.5">Reset Token</label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-[#292D29]/20 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#292D29]/75 mb-1.5">New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-[#292D29]/20 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full h-11 rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium"
            >
              Update Password
            </button>
          </form>
        )}

        <Link to="/login" className="block text-center text-sm text-[#34483B] hover:underline">
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
