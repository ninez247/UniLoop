import { useState, useEffect } from 'react';
import './Auth.css';
import { supabase } from './supabaseClient';

function Auth({ onClose }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth event:', event);
            console.log('Current session:', session);
        });

        return () => subscription.unsubscribe();
    }, []);

    async function handleAuth() {
        setMessage('');

        if (!email.trim() || !password.trim()) {
            setMessage('Please enter your email and password.');
            return;
        }

        if (!isLogin && !fullName.trim()) {
            setMessage('Please enter your full name.');
            return;
        }

        setLoading(true);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password,
                    options: {
                        data: {
                            full_name: fullName.trim(),
                        },
                        emailRedirectTo: window.location.origin,
                    },
                });

                if (error) throw error;

                setMessage('Login successful!');
                if (onClose) onClose();
            } else {
                const { error } = await supabase.auth.signUp({
                    email: email.trim(),
                    password,
                    options: {
                        data: {
                            full_name: fullName.trim(),
                        },
                    },
                });

                if (error) throw error;

                setMessage('Registration successful! Please check your email for confirmation.');
            }
        } catch (error) {
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>{isLogin ? 'Welcome Back!' : 'Create Your Account'}</h2>

                <p>
                    {isLogin
                        ? 'Login to continue to UniLoop.'
                        : 'Join your campus marketplace.'}
                </p>

                {!isLogin && (
                    <input
                        type="text"
                        placeholder="Full Name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                    />
                )}

                <input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button
                    className="button primary"
                    onClick={handleAuth}
                    disabled={loading}
                >
                    {loading
                        ? 'Please wait...'
                        : isLogin
                            ? 'Login'
                            : 'Sign Up'}
                </button>

                {message && (
                    <p className="auth-message" role="status">
                        {message}
                    </p>
                )}

                <p className="auth-toggle">
                    {isLogin
                        ? "Don't have an account?"
                        : 'Already have an account?'}
                    {' '}
                    <span onClick={() => setIsLogin(!isLogin)}>
                        {isLogin ? 'Sign Up' : 'Login'}
                    </span>
                </p>
            </div>
        </div>
    );
}

export default Auth;