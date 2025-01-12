import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { validateUsername } from '../lib/validation';
import type { SignUpFormData, AuthError } from '../types/auth';
import { Phone } from 'lucide-react';

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [errors, setErrors] = useState<AuthError[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [phone, setPhone] = useState('');

  const handleSignUp = async (data: SignUpFormData) => {
    setErrors([]);
    
    if (!isLogin) {
      const usernameError = validateUsername(data.username);
      if (usernameError) {
        setErrors(prev => [...prev, { field: 'username', message: usernameError }]);
        return;
      }
    }

    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(data.phone)) {
      setErrors(prev => [...prev, { 
        field: 'phone', 
        message: 'Please enter a valid phone number in international format (e.g., +1234567890)' 
      }]);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: data.phone,
        options: isLogin ? undefined : {
          data: {
            username: data.username,
          }
        }
      });

      if (error) {
        setErrors(prev => [...prev, { field: 'general', message: error.message }]);
        return;
      }

      setPhone(data.phone);
      setIsVerifying(true);
    } catch (error) {
      setErrors(prev => [...prev, { field: 'general', message: 'An unexpected error occurred' }]);
    }
  };

  const handleVerification = async (data: { code: string }) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: data.code,
        type: 'sms'
      });

      if (error) {
        setErrors(prev => [...prev, { field: 'verification', message: error.message }]);
        return;
      }

      window.location.href = '/';
    } catch (error) {
      setErrors(prev => [...prev, { field: 'general', message: 'An unexpected error occurred' }]);
    }
  };

  const formContent = isVerifying ? (
    <div className="w-full max-w-md space-y-8">
      <div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Enter Verification Code
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          We've sent a verification code to {phone}
        </p>
      </div>
      <form className="mt-8 space-y-6" onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        handleVerification({ code: formData.get('code') as string });
      }}>
        <div>
          <label htmlFor="code" className="sr-only">
            Verification Code
          </label>
          <input
            id="code"
            name="code"
            type="text"
            required
            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
            placeholder="Enter verification code"
          />
        </div>
        <div>
          <button
            type="submit"
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Verify Code
          </button>
        </div>
        <div className="text-center">
          <button
            type="button"
            onClick={async () => {
              const { error } = await supabase.auth.signInWithOtp({
                phone,
              });
              if (error) {
                setErrors(prev => [...prev, { field: 'general', message: error.message }]);
              } else {
                alert('A new verification code has been sent to your phone');
              }
            }}
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            Resend verification code
          </button>
        </div>
      </form>
    </div>
  ) : (
    <div className="w-full max-w-md space-y-8">
      <div>
        <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-indigo-100">
          <Phone className="h-6 w-6 text-indigo-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {isLogin ? 'Sign in to your account' : 'Create your account'}
        </h2>
      </div>
      <form className="mt-8 space-y-6" onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        handleSignUp({
          username: formData.get('username') as string,
          phone: formData.get('phone') as string,
        });
      }}>
        {!isLogin && (
          <div>
            <label htmlFor="username" className="sr-only">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Username"
            />
          </div>
        )}
        <div>
          <label htmlFor="phone" className="sr-only">
            Phone Number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
            placeholder="Phone number (e.g., +1234567890)"
          />
        </div>

        {errors.length > 0 && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  There were errors with your submission
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <ul className="list-disc pl-5 space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>{error.message}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <div>
          <button
            type="submit"
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {isLogin ? 'Sign in' : 'Sign up'}
          </button>
        </div>

        <div className="text-sm text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setErrors([]);
            }}
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {formContent}
    </div>
  );
}