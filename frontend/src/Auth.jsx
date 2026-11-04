
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';
import { supabase } from './supabaseClient';

const API_URL = 'http://localhost:3000/api';

function Auth() {
    const navigate = useNavigate();

    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const [colleges, setColleges] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [collegeSearch, setCollegeSearch] = useState('');
    const [selectedCollege, setSelectedCollege] = useState(null);
    const [collegeLoading, setCollegeLoading] = useState(false);

    useEffect(() => {
        async function fetchColleges() {
            setCollegeLoading(true);

            try {
                const response = await fetch(`${API_URL}/colleges`);

                if (!response.ok) {
                    throw new Error('Failed to load colleges.');
                }

                const data = await response.json();

                setColleges(data);

                // Randomly select three different colleges
                const shuffled = [...data].sort(
                    () => Math.random() - 0.5
                );

                setSuggestions(shuffled.slice(0, 3));

            } catch (error) {
                console.error(error);
                setMessage('Unable to load colleges. Please try again.');
            } finally {
                setCollegeLoading(false);
            }
        }

        fetchColleges();
    }, []);

    const matchingColleges = collegeSearch.trim()
        ? colleges.filter((college) =>
            `${college.name} ${college.city} ${college.state}`
                .toLowerCase()
                .includes(collegeSearch.trim().toLowerCase())
        ).slice(0, 10)
        : [];

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

        if (!isLogin && !selectedCollege) {
            setMessage('Please select your college.');
            return;
        }

        setLoading(true);

        try {
            if (isLogin) {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password,
                });

                if (error) throw error;

                const accessToken = data.session.access_token;

                const profileResponse = await fetch(`${API_URL}/profiles`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                        full_name: data.user.user_metadata.full_name,
                        college_id: data.user.user_metadata.college_id,
                    }),
                });

                const profileData = await profileResponse.json();

                if (!profileResponse.ok) {
                    throw new Error(profileData.error || 'Failed to save profile.');
                }

                navigate('/');
            } else {
                const { error } = await supabase.auth.signUp({
                    email: email.trim(),
                    password,
                    options: {
                        data: {
                            full_name: fullName.trim(),
                            college_id: selectedCollege.id,
                            college_name: selectedCollege.name,
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
                            <>
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

                                <div className="auth-field">
                                    <label>College name</label>

                                    <input
                                        type="text"
                                        placeholder="Search your college or city..."
                                        value={collegeSearch}
                                        onChange={(e) => {
                                            setCollegeSearch(e.target.value);
                                            setSelectedCollege(null);
                                        }}
                                    />

                                    {collegeLoading && (
                                        <p>Loading colleges...</p>
                                    )}

                                    {!collegeSearch.trim() && (
                                        <div className="college-suggestions">
                                            <p>Try one of these colleges</p>

                                            {suggestions.map((college) => (

                                                <button
                                                    type="button"
                                                    className={`college-option ${selectedCollege?.id === college.id ? 'selected' : ''
                                                        }`}
                                                    key={college.id}
                                                    onClick={() => {
                                                        setSelectedCollege(college);
                                                        setCollegeSearch(`${college.name} - ${college.city}`);
                                                    }}
                                                >
                                                    <div className="college-option-info">
                                                        <strong>{college.name}</strong>
                                                        <small>{college.city}, {college.state}</small>
                                                    </div>

                                                    <span className="college-option-icon">
                                                        <span>+</span>
                                                    </span>
                                                </button>

                                            ))}
                                        </div>
                                    )}

                                    {collegeSearch.trim() &&
                                        !selectedCollege &&
                                        matchingColleges.length > 0 && (
                                            <div className="college-suggestions">
                                                {matchingColleges.map((college) => (
                                                    <button
                                                        type="button"
                                                        className={`college-option ${selectedCollege?.id === college.id ? 'selected' : ''
                                                            }`}
                                                        key={college.id}
                                                        onClick={() => {
                                                            setSelectedCollege(college);
                                                            setCollegeSearch(`${college.name} - ${college.city}`);
                                                        }}
                                                    >
                                                        <div className="college-option-info">
                                                            <strong>{college.name}</strong>
                                                            <small>{college.city}, {college.state}</small>
                                                        </div>

                                                        <span className="college-option-icon">
                                                            <span>+</span>
                                                        </span>
                                                    </button>

                                                ))}
                                            </div>
                                        )}

                                    {collegeSearch.trim() &&
                                        !selectedCollege &&
                                        !collegeLoading &&
                                        colleges.length > 0 &&
                                        matchingColleges.length === 0 && (
                                            <p>No matching colleges found.</p>
                                        )}

                                    {selectedCollege && (
                                        <div className="college-selected">
                                            <span>✓</span>
                                            <p>
                                                Selected: <strong>{selectedCollege.name}</strong>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </>
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
                                autoComplete={isLogin ? 'current-password' : 'new-password'}
                            />
                        </div>

                        <button
                            type="submit"
                            className="button primary auth-submit"
                            disabled={loading || (!isLogin && collegeLoading)}
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
                                setCollegeSearch('');
                                setSelectedCollege(null);
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
