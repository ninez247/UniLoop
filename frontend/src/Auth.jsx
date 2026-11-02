
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';
import { supabase } from './supabaseClient';

function Auth() {
    const navigate = useNavigate();

    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleAuth(event) {
        event.preventDefault();
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
                });

                if (error) throw error;

                navigate('/');
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

                setMessage(
                    'Registration successful! Please check your email for confirmation.'
                );
            }
        } catch (error) {
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-wrapper">

                <Link to="/" className="auth-logo">
                    Uni<span>Loop</span>
                </Link>

                <div className="auth-card">

                    <div className="auth-heading">
                        <h2>
                            {isLogin ? 'Welcome back!' : 'Create your account'}
                        </h2>

                        <p>
                            {isLogin
                                ? 'Sign in to continue to your campus marketplace.'
                                : 'Join your campus community on UniLoop.'}
                        </p>
                    </div>

                    <form onSubmit={handleAuth}>

                        {!isLogin && (
                            <div className="auth-field">
                                <label htmlFor="fullName">Full name</label>

                                <input
                                    id="fullName"
                                    type="text"
                                    placeholder="Enter your full name"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    autoComplete="name"
                                />
                            </div>
                        )}

                        <div className="auth-field">
                            <label htmlFor="email">Email address</label>

                            <input
                                id="email"
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                            />
                        </div>

                        <div className="auth-field">
                            <label htmlFor="password">Password</label>

                            <input
                                id="password"
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete={isLogin ? "current-password" : "new-password"}
                            />
                        </div>

                        <button
                            type="submit"
                            className="button primary auth-submit"
                            disabled={loading}
                        >
                            {loading
                                ? 'Please wait...'
                                : isLogin
                                    ? 'Login'
                                    : 'Create Account'}
                        </button>

                    </form>

                    {message && (
                        <p className="auth-message" role="status">
                            {message}
                        </p>
                    )}

                    <div className="auth-toggle">
                        {isLogin
                            ? "Don't have an account?"
                            : 'Already have an account?'}

                        <button
                            type="button"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setMessage('');
                            }}
                        >
                            {isLogin ? 'Sign Up' : 'Login'}
                        </button>
                    </div>

                </div>

                <Link to="/" className="back-home">
                    ← Back to Marketplace
                </Link>

                <p className="auth-footer">
                    Buy · Sell · Connect on campus
                </p>

            </div>
        </div>
    );
}

export default Auth;
