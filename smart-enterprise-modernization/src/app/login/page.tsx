'use client';

import { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '../../lib/firebaseClient';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onSubmit = async (e: any) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      // Try signing in the user
      await signInWithEmailAndPassword(auth, email, pw);
      router.push('/dashboard');
    } catch (error: any) {
      // If user not found → auto register
      if (error.code === 'auth/user-not-found') {
        try {
          await createUserWithEmailAndPassword(auth, email, pw);
          router.push('/dashboard');
        } catch (registerErr: any) {
          setErr(registerErr.message);
        }
      } else if (error.code === 'auth/wrong-password') {
        setErr('Incorrect password. Please try again.');
      } else if (error.code === 'auth/invalid-email') {
        setErr('Invalid email format.');
      } else {
        setErr('Sign in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErr('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push('/dashboard');
    } catch (e: any) {
      setErr('Google sign-in failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="card-glass">
        <h2 className="text-xl font-semibold mb-4">Sign in</h2>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full p-3 border rounded"
            type="email"
            required
          />
          <input
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Password"
            type="password"
            className="w-full p-3 border rounded"
            required
          />
          {err && <div className="text-red-500 text-sm">{err}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-brand-500 to-purple-600 text-white rounded disabled:opacity-60"
          >
            {loading ? 'Processing...' : 'Sign in / Register'}
          </button>
        </form>

        {/* Google Sign-In Button */}
        <div className="text-center mt-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 transition text-gray-800 rounded"
          >
            {loading ? 'Please wait...' : 'Continue with Google'}
          </button>
        </div>
      </div>
    </div>
  );
}
