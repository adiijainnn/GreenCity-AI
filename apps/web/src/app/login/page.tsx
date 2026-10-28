'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { Role } from '@/lib/types';
import { 
  TreePine, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

type AuthMode = 'login' | 'signup' | 'forgot_password';

export default function LoginPage() {
  const router = useRouter();
  const { setCurrentUser, setActiveRole } = useAppStore();

  const [mode, setMode] = useState<AuthMode>('login');
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Sign up fields
  const [fullName, setFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Forgot password fields
  const [resetInput, setResetInput] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // Feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.login({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('greencity_token', res.access_token);
      }

      setCurrentUser(res.user);
      setActiveRole(res.user.role as Role);

      // Backend identifies if user is Admin or Citizen
      if (res.user.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/map');
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Sign Up (New User)
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (signupPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    if (signupPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.register({
        full_name: fullName.trim(),
        email: signupEmail.trim(),
        phone: mobileNumber.trim(),
        password: signupPassword,
        role: 'CITIZEN',
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('greencity_token', res.access_token);
      }

      setCurrentUser(res.user);
      setActiveRole(res.user.role as Role);

      router.push('/map');
    } catch (err: any) {
      setError(err?.message || 'Registration failed. This email may already be registered.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password
  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetInput.trim()) {
      setError('Please enter your registered email or mobile number.');
      return;
    }
    setError(null);
    setResetSent(true);
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="w-full max-w-md space-y-6">
        
        {/* Logo & Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-600 text-white shadow-sm mb-1">
            <TreePine className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {mode === 'login' && 'Sign In to GreenCity'}
            {mode === 'signup' && 'Create Your Account'}
            {mode === 'forgot_password' && 'Reset Password'}
          </h1>
          <p className="text-xs text-slate-500">
            {mode === 'login' && 'Enter your credentials to access the Solapur Green portal.'}
            {mode === 'signup' && 'Join as a resident citizen to track parks and report issues.'}
            {mode === 'forgot_password' && 'Enter your email or phone to receive reset instructions.'}
          </p>
        </div>

        {/* Auth Box */}
        <div className="bg-white p-7 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          
          {/* Tabs: Existing vs New User */}
          {mode !== 'forgot_password' && (
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className={`w-1/2 py-2 rounded-lg text-xs font-bold transition-all ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(null); }}
                className={`w-1/2 py-2 rounded-lg text-xs font-bold transition-all ${
                  mode === 'signup'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Error Message Alert */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message Alert */}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. SIGN IN (EXISTING USER) FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-xs text-slate-900 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Password</label>
                  <button
                    type="button"
                    onClick={() => { setMode('forgot_password'); setError(null); setResetSent(false); }}
                    className="text-[11px] font-semibold text-emerald-700 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-xs text-slate-900 rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Remember me</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Verifying...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* 2. SIGN UP (NEW USER) FORM */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kulkarni"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-xs text-slate-900 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-xs text-slate-900 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">Mobile Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-xs text-slate-900 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="w-full bg-white border border-slate-300 text-xs text-slate-900 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Confirm Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-white border border-slate-300 text-xs text-slate-900 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 mt-2"
              >
                {loading ? 'Creating Account...' : 'Create Account & Sign In'}
              </button>
            </form>
          )}

          {/* 3. FORGOT PASSWORD FORM */}
          {mode === 'forgot_password' && (
            <div className="space-y-4">
              {resetSent ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h3 className="font-bold text-sm text-slate-900">Reset Instructions Sent</h3>
                  <p className="text-xs text-slate-600">
                    If an account exists with <strong className="text-slate-800">{resetInput}</strong>, a password reset link has been dispatched.
                  </p>
                  <button
                    onClick={() => { setMode('login'); setResetSent(false); }}
                    className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
                  >
                    Return to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase">Registered Email or Mobile</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        placeholder="Enter email or mobile number"
                        value={resetInput}
                        onChange={(e) => setResetInput(e.target.value)}
                        className="w-full bg-white border border-slate-300 text-xs text-slate-900 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                  >
                    Send Password Reset Link
                  </button>

                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(null); }}
                    className="w-full py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Sign In</span>
                  </button>
                </form>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
