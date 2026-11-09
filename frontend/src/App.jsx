import { supabase } from './supabaseClient';
import { useEffect, useMemo, useRef, useState } from "react";
import Auth from './Auth';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Chat from "./Chat";
import Toast from "./Toast";
import { API_URL } from "./api";

const categories = [
  'All',
  'Books & Study Materials',
  'Stationery & Supplies',
  'Electronics & Gadgets',
  'Fashion & Clothing',
  'Shoes & Footwear',
  'Bags & Backpacks',
  'Hostel & Room Essentials',
  'Furniture',
  'Sports & Fitness',
  'Project & Creative Supplies',
  'Cycles & Mobility',
  'Placement & Professional Wear',
  'Gaming Accessories',
  'Musical Instruments',
  'Beauty & Personal Care',
  'Kitchen Essentials',
  'Art & Craft Supplies',
  'Calculators & Lab Equipment',
  'College Merchandise',
  'Tickets & Event Passes',
  'Free Stuff',
  'Miscellaneous',
];



function Navbar({
  onSellClick,
  onMyListingsClick,
  onMessagesClick,
  isAuthenticated,
  user,
  onLoginClick,
  onLogoutClick,
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);
  const mobileMenuButtonRef = useRef(null);
  const profileMenuRef = useRef(null);
  const profileButtonRef = useRef(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    function handleOutsideClick(event) {
      const clickedInsideMenu =
        mobileMenuRef.current?.contains(event.target);

      const clickedMenuButton =
        mobileMenuButtonRef.current?.contains(event.target);

      if (!clickedInsideMenu && !clickedMenuButton) {
        setMobileMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    function handleOutsideClick(event) {
      const clickedInsideMenu =
        mobileMenuRef.current?.contains(event.target);

      const clickedMenuButton =
        mobileMenuButtonRef.current?.contains(event.target);

      if (!clickedInsideMenu && !clickedMenuButton) {
        setMobileMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!profileOpen) return;

    function handleOutsideClick(event) {
      if (!profileMenuRef.current?.contains(event.target)) {
        setProfileOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [profileOpen]);

  const fullName =
    user?.user_metadata?.full_name || "My Account";

  const collegeName =
    user?.user_metadata?.college_name || "College not available";

  return (
    <nav className="navbar">
      <a className="logo" href="#top">
        Uni<span>Loop</span>
      </a>

      <button
        ref={mobileMenuButtonRef}
        className="mobile-menu-button"
        type="button"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        aria-expanded={mobileMenuOpen}
      >
        {mobileMenuOpen ? "✕" : "☰"}
      </button>

      <div
        ref={mobileMenuRef}
        className={`links ${mobileMenuOpen ? "mobile-links-open" : ""}`}
        onClick={() => setMobileMenuOpen(false)}
      >
        <a href="#browse">Browse</a>
        <a href="#sell"
          onClick={(event) => {
            event.preventDefault();
            onSellClick();
            setMobileMenuOpen(false);
          }}
        >
          Sell
        </a>

        {isAuthenticated && (
          <button
            type="button"
            onClick={onMyListingsClick}
          >
            My Listings
          </button>
        )}
      </div>

      <div className="nav-actions">
        {isAuthenticated && (
          <button
            className="icon-button"
            type="button"
            onClick={onMessagesClick}
            aria-label="Open messages"
            title="Messages"
          >
            <svg
              viewBox="0 0 24 24"
              width="23"
              height="23"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="16" rx="3" />
              <path d="m3 7 9 6 9-6" />
            </svg>
          </button>
        )}

        {!isAuthenticated ? (
          <button
            className="button primary login-button"
            onClick={onLoginClick}
          >
            Login
          </button>
        ) : (
          <div className="profile-wrapper"
            ref={profileMenuRef}
          >
            <button
              ref={profileButtonRef}
              className="profile-button"
              type="button"
              onClick={() => setProfileOpen(!profileOpen)}
              aria-label="Open profile menu"
              aria-expanded={profileOpen}
            >
              <svg
                viewBox="0 0 24 24"
                width="23"
                height="23"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0" />
              </svg>
            </button>

            {profileOpen && (
              <div className="profile-dropdown">
                <strong>{fullName}</strong>
                <span>{collegeName}</span>

                <div className="profile-divider" />

                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    onLogoutClick();
                  }}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav >
  );
}


function ProductCard({ product, onContactSeller, currentUserId }) {
  const isOwnListing =
    currentUserId &&
    product.seller_supabase_user_id === currentUserId;

  return (
    <article className="card item-card">

      <h3>{product.title}</h3>

      <div className="meta">
        {product.college} · {product.condition}
      </div>

      <div className="price">
        ₹{Number(product.price).toLocaleString('en-IN')}
      </div>

      <span className="tag">{product.category}</span>

      {onContactSeller && !isOwnListing && (
        <button
          className="button contact-seller-button"
          onClick={() => onContactSeller(product.id)}
        >
          Contact Seller
        </button>
      )}

    </article>
  );
}

function MyListingsSection({
  listings,
  loading,
  error,
  onConfirmSold,
  onMarkAsSold,
  listingToMarkSold,
  setListingToMarkSold,
  onConfirmDelete,
  onDeleteListing,
  listingToDelete,
  setListingToDelete,
}) {
  return (
    <section id="my-listings" className="container my-listings-section">

      <div className="section-title my-listings-heading">
        <div>
          <h2>My Listings</h2>
          <p>Manage the items you have listed on UniLoop.</p>
        </div>

        <span className="listing-count">
          {listings.length} {listings.length === 1 ? "item" : "items"}
        </span>
      </div>

      {loading && <p>Loading your listings...</p>}

      {error && <p>{error}</p>}

      {!loading && !error && listings.length === 0 && (
        <p className="my-listings-empty">
          You haven't listed any items yet.
        </p>
      )}

      {!loading && !error && listings.length > 0 && (
        <div className="my-listings-grid">

          {listings.map((product) => (
            <div
              key={product.id}
              className={`my-listing-card ${product.status === "sold" ? "is-sold" : ""
                }`}
            >
              <ProductCard product={product} />

              <div className="my-listing-footer">

                <span
                  className={`listing-status ${product.status === "sold"
                    ? "status-sold"
                    : "status-available"
                    }`}
                >
                  {product.status === "sold" ? "Sold" : "Available"}
                </span>

                {product.status === "available" && (
                  <button
                    className="button primary"
                    onClick={() => onConfirmSold(product)}
                  >
                    Mark as Sold
                  </button>
                )}

                <button
                  className="button delete-listing-button"
                  onClick={() => onConfirmDelete(product)}
                >
                  Delete
                </button>

              </div>
            </div>
          ))}

        </div>
      )}

      {listingToMarkSold && (
        <div className="confirmation-overlay">
          <div className="confirmation-modal">

            <h3>Mark as Sold?</h3>

            <p>
              Are you sure you want to mark
              <strong> {listingToMarkSold.title} </strong>
              as sold?
            </p>

            <div className="confirmation-actions">
              <button
                className="button secondary"
                onClick={() => setListingToMarkSold(null)}
              >
                Cancel
              </button>

              <button
                className="button primary"
                onClick={() => {
                  onMarkAsSold(listingToMarkSold.id);
                  setListingToMarkSold(null);
                }}
              >
                Mark as Sold
              </button>
            </div>

          </div>
        </div>
      )}

      {listingToDelete && (
        <div className="confirmation-overlay">
          <div className="confirmation-modal">

            <h3>Delete Listing?</h3>

            <p>
              Are you sure you want to permanently delete
              <strong> {listingToDelete.title} </strong>
              ?
            </p>

            <div className="delete-warning">
              This action cannot be undone. Your listing
              will be permanently removed from UniLoop.
            </div>

            <div className="confirmation-actions">

              <button
                className="button secondary"
                onClick={() => setListingToDelete(null)}
              >
                Cancel
              </button>

              <button
                className="button delete-confirm-button"
                onClick={() => {
                  onDeleteListing(listingToDelete.id);
                  setListingToDelete(null);
                }}
              >
                Delete Permanently
              </button>

            </div>

          </div>
        </div>
      )}

    </section>
  );
}


function SearchPanel({
  query,
  setQuery,
  activeCategory,
  setActiveCategory,
  selectedCollege,
  setSelectedCollege,
  collegeOptions,
  filteredProducts,
  loading,
  error,
}) {
  const featured = filteredProducts[0];

  return (
    <div className="hero-card">
      <form
        className="search"
        onSubmit={(event) => {
          event.preventDefault();
          document
            .getElementById('browse')
            ?.scrollIntoView({ behavior: 'smooth' });
        }}
        role="search"
      >
        <input
          aria-label="Search listings"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search textbooks, calculator, lab coat..."
        />

        <select
          aria-label="Filter by college"
          value={selectedCollege}
          onChange={(event) => setSelectedCollege(event.target.value)}
        >
          {collegeOptions.map((college) => (
            <option key={college} value={college}>
              {college}
            </option>
          ))}
        </select>

        <button className="button primary" type="submit">
          Search
        </button>
      </form>

      <div className="chips" aria-label="Filter by category">
        {categories.slice(1).map((category) => (
          <button
            className={`chip ${activeCategory === category ? 'chip-active' : ''
              }`}
            key={category}
            type="button"
            onClick={() =>
              setActiveCategory(
                activeCategory === category ? 'All' : category
              )
            }
            aria-pressed={activeCategory === category}
          >
            {category}
          </button>
        ))}
      </div>


      <div className="card mini-result" aria-live="polite">
        {loading ? (
          <div className="empty-state">Loading campus listings...</div>
        ) : error ? (
          <div className="empty-state">{error}</div>
        ) : featured ? (
          <>
            <div className="meta">
              {featured.college} · {featured.seller_name}
            </div>

            <h3>{featured.title}</h3>

            <div className="meta">
              {featured.condition} · {featured.category}
            </div>

            <div className="price">
              ₹{Number(featured.price).toLocaleString('en-IN')}
            </div>

            <span className="tag">Campus listing</span>
          </>
        ) : (
          <div className="empty-state">
            No matching items yet. Try another search or category.
          </div>
        )}
      </div>

    </div>
  );
}

function Hero(props) {
  return (
    <section className="container hero" id="top">
      <div className="hero-copy">
        <span className="badge">
          YOUR CAMPUS. YOUR MARKETPLACE.
        </span>

        <h1>Buy less. Sell smart. Stay in the loop.</h1>

        <p>
          Discover great deals, sell what you no longer need, and
          connect with students across colleges. Everything your
          campus community needs, all in one place.
        </p>

        <div className="hero-actions">
          <a className="button primary" href="#browse">
            Explore campus deals
          </a>

          <a className="button secondary" href="#about">
            How UniLoop works
          </a>
        </div>
      </div>

      <SearchPanel {...props} />
    </section>
  );
}

function BrowseSection({ products, query, activeCategory, selectedCollege,
  loading, error, onContactSeller, currentUserId,
}) {
  const hasFilters = query.trim() || activeCategory !== 'All' ||
    selectedCollege !== 'All Colleges';

  return (
    <section className="container" id="browse">
      <div className="section-title">
        <div>
          <h2>Explore the Marketplace</h2>
          <p>
            {hasFilters
              ? 'Listings matching your search and filters.'
              : 'Discover items listed by students across colleges.'}
          </p>
        </div>

        <span className="meta">Student Marketplace</span>
      </div>


      {loading ? (
        <div className="card empty-state">
          Loading campus listings...
        </div>
      ) : error ? (
        <div className="card empty-state">{error}</div>
      ) : products.length > 0 ? (
        <div className="grid">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onContactSeller={onContactSeller}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      ) : (
        <div className="card empty-state">
          No listings match your search. Try a different keyword
          or category.
        </div>
      )}

    </section>
  );
}

function FeaturesSection() {
  const features = [
    [
      '🎓 Across Colleges',
      'Discover listings from students across participating colleges, all in one marketplace.',
    ],
    [
      '💬 Direct Messaging',
      'Connect with sellers through UniLoop’s built-in chat before arranging a deal.',
    ],
    [
      '₹ Affordable Finds',
      'Discover pre-owned books, electronics and everyday essentials at student-friendly prices.',
    ],
    [
      '♻ Give Items a Second Life',
      'Sell items you no longer need and help other students get more value from them.',
    ],
  ];

  return (
    <section className="container" id="features">
      <div className="section-title">
        <div>
          <h2>Why students choose UniLoop</h2>
          <p>
            Discover useful deals, connect directly with students and make more of what you already have.          </p>
        </div>
      </div>

      <div className="features">
        {features.map(([title, description]) => (
          <div className="feature" key={title}>
            <b>{title}</b>
            <p>{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SellSection({
  onListingCreated,
  isAuthenticated,
  onRequireAuth,
  shouldOpenSellForm,
  onSellFormOpened, }) {
  const [showForm, setShowForm] = useState(false);
  useEffect(() => {
    if (shouldOpenSellForm) {
      setShowForm(true);
      onSellFormOpened();

      document.getElementById('sell')?.scrollIntoView({
        behavior: 'smooth',
      });
    }
  }, [shouldOpenSellForm, onSellFormOpened]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    condition: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState('');




  async function handleSubmit() {
    setFormMessage('');

    if (
      !formData.title.trim() ||
      !formData.description.trim() ||
      !formData.price.trim() ||
      !formData.category ||
      !formData.condition
    ) {
      setFormMessage('Please fill in all fields before submitting.');
      return;
    }

    const price = Number(formData.price);

    if (
      !Number.isFinite(price) ||
      price < 0 ||
      !/^\d+(\.\d{1,2})?$/.test(formData.price.trim())
    ) {
      setFormMessage(
        'Enter a valid, non-negative price with at most two decimal places.'
      );
      return;
    }

    setSubmitting(true);

    try {
      const { data: { session }, error } =
        await supabase.auth.getSession();

      if (error) throw error;

      if (!session) {
        throw new Error('Please log in to create a listing.');
      }

      const listingData = {
        title: formData.title,
        description: formData.description,
        price: formData.price,
        category: formData.category,
        condition: formData.condition,
      };

      const response = await fetch(`${API_URL}/listings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(listingData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create listing.');
      }

      onListingCreated(data);
      setFormMessage('Listing created successfully!');

      setFormData({
        title: '',
        description: '',
        price: '',
        category: '',
        condition: '',
      });

    } catch (error) {
      setFormMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }


  const steps = [
    [
      '1. List your item',
      'Add the item details, choose a category and set your asking price.'
    ],
    [
      '2. Get discovered',
      'Students across participating colleges can discover your listing.'
    ],
    [
      '3. Connect with buyers',
      'Chat directly with interested students through UniLoop.'
    ],
    [
      '4. Meet & complete the sale',
      'Arrange a convenient meetup and complete the payment directly with the buyer.'
    ],
  ];


  return (
    <section className="container" id="sell">
      <div className="sell-panel">
        <div className="section-title">
          <div>
            <h2>Start selling on UniLoop</h2>
            <p>List your item and connect with interested students.</p>
          </div>
        </div>

        <div className="features">
          {steps.map(([title, description]) => (
            <div className="feature" key={title}>
              <b>{title}</b>
              <p>{description}</p>
            </div>
          ))}
        </div>

        <button
          className="button primary"
          type="button"
          onClick={() => {
            if (!isAuthenticated) {
              onRequireAuth();
              return;
            }

            setShowForm(!showForm);
          }}
        >
          {showForm ? 'Cancel listing' : 'Create a listing'}
        </button>

        {showForm && (
          <div className="listing-form">
            <h3>Create your listing</h3>
            <p>Fill in the details of the item you want to sell.</p>

            {formMessage && (
              <p className="form-message" role="status">
                {formMessage}
              </p>
            )}

            <div className="form-group">
              <label htmlFor="listing-title">Item title</label>
              <input
                id="listing-title"
                type="text"
                placeholder="e.g. Engineering Mathematics Book"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label htmlFor="listing-description">Description</label>
              <textarea
                id="listing-description"
                placeholder="Describe the item's condition and details"
                rows="2"
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });

                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="listing-price">Price (₹)</label>
              <input
                id="listing-price"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 350"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label htmlFor="listing-category">Category</label>
              <select id="listing-category"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }>
                <option value="" disabled>
                  Select a category
                </option>
                <option>Books &amp; Study Materials</option>
                <option>Stationery &amp; Supplies</option>
                <option>Electronics &amp; Gadgets</option>
                <option>Fashion &amp; Clothing</option>
                <option>Shoes &amp; Footwear</option>
                <option>Bags &amp; Backpacks</option>
                <option>Hostel &amp; Room Essentials</option>
                <option>Furniture</option>
                <option>Sports &amp; Fitness</option>
                <option>Project &amp; Creative Supplies</option>
                <option>Cycles &amp; Mobility</option>
                <option>Placement &amp; Professional Wear</option>
                <option>Gaming Accessories</option>
                <option>Musical Instruments</option>
                <option>Beauty &amp; Personal Care</option>
                <option>Kitchen Essentials</option>
                <option>Art &amp; Craft Supplies</option>
                <option>Calculators &amp; Lab Equipment</option>
                <option>College Merchandise</option>
                <option>Tickets &amp; Event Passes</option>
                <option>Free Stuff</option>
                <option>Miscellaneous</option>
              </select>
            </div>


            <div className="form-group">
              <label htmlFor="listing-condition">Item condition</label>
              <select id="listing-condition"
                value={formData.condition}
                onChange={(e) =>
                  setFormData({ ...formData, condition: e.target.value })
                }
              >
                <option value="" disabled>
                  Select condition
                </option>
                <option value="Like New">Like New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
              </select>
            </div>

            <button
              className="button primary"
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Listing'}
            </button>

          </div>
        )}

      </div>
    </section>
  );
}

function EconomicsSection() {
  const metrics = [
    ['Seller commission', '8%'],
    ['Illustrative avg. order', '₹650'],
    ['Contribution / order', '₹40'],
    ['Break-even volume', '450/mo'],
  ];

  return (
    <section className="container" id="economics">
      <div className="econ">
        <div className="section-title">
          <div>
            <h2>Managerial economics snapshot</h2>
            <p className="note">
              Illustrative assumptions for the academic proposal —
              not audited forecasts.
            </p>
          </div>
        </div>

        <div className="econ-grid">
          {metrics.map(([label, value]) => (
            <div className="metric" key={label}>
              <small>{label}</small>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <p className="note model-note">
          Model logic: commission revenue ≈ 8% × transaction value.
          A conservative contribution estimate of ₹40/order is used
          after payment/support costs. With assumed fixed monthly
          operating cost of ₹18,000, break-even ≈ 18,000 ÷ 40 =
          450 transactions/month.
        </p>
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section className="container" id="about">
      <div className="section-title">
        <div>
          <h2>How UniLoop Works</h2>
          <p>A simple way to buy and sell within the student community.</p>
        </div>
      </div>

      <div className="features">
        <div className="feature">
          <b>Discover Listings</b>
          <p>Browse items listed by students across participating colleges.</p>
        </div>

        <div className="feature">
          <b>Connect Directly</b>
          <p>Use in-app messaging to communicate with sellers and buyers.</p>
        </div>

        <div className="feature">
          <b>Arrange a Meetup</b>
          <p>Discuss a convenient place and time to exchange the item.</p>
        </div>

        <div className="feature">
          <b>Complete Your Deal</b>
          <p>Buyers and sellers arrange payment directly between themselves.</p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-brand">
          <a className="footer-logo" href="#top">
            Uni<span>Loop</span>
          </a>
          <p>
            Your campus marketplace.
            Buy, sell and discover more within your college community.
          </p>
        </div>

        <div className="footer-links">
          <h4>Explore</h4>
          <a href="#browse">Browse Listings</a>
          <a href="#sell">Sell an Item</a>
          <a href="#features">Why UniLoop?</a>
        </div>

        <div className="footer-links">
          <h4>Account</h4>
          <a href="/login">Login / Sign Up</a>
          <a href="/chat">Messages</a>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} UniLoop. All rights reserved.</p>
        <p>Connecting campus communities.</p>
      </div>
    </footer>
  );
}

export default function App() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedCollege, setSelectedCollege] = useState('All Colleges');
  const [products, setProducts] = useState([]);

  const collegeOptions = useMemo(() => {
    return [
      'All Colleges',
      ...new Set(
        products
          .map((product) => product.college?.trim())
          .filter(Boolean)
      ),
    ].sort((a, b) => {
      if (a === 'All Colleges') return -1;
      if (b === 'All Colleges') return 1;
      return a.localeCompare(b);
    });
  }, [products]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [shouldOpenSellForm, setShouldOpenSellForm] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({
      id: Date.now(),
      message,
      type,
    });
  };

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast(null);
    }, 3500);

    return () => clearTimeout(timer);
  }, [toast]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const [myListings, setMyListings] = useState([]);
  const [myListingsLoading, setMyListingsLoading] = useState(false);
  const [myListingsError, setMyListingsError] = useState('');

  const [listingToMarkSold, setListingToMarkSold] = useState(null);
  const [listingToDelete, setListingToDelete] = useState(null);


  const handleDeleteListing = async (listingId) => {
    try {
      const { data: { session }, error } =
        await supabase.auth.getSession();

      if (error) throw error;

      if (!session) {
        throw new Error("Please log in again.");
      }

      const response = await fetch(
        `${API_URL}/my-listings/${listingId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete listing.");
      }

      setMyListings((prev) =>
        prev.filter((item) => item.id !== listingId)
      );

      setProducts((prev) =>
        prev.filter((item) => item.id !== listingId)
      );

      showToast("Listing deleted successfully!");

    } catch (error) {
      console.error("Error deleting listing:", error);
      showToast(error.message, "error");
    }
  };

  const handleContactSeller = async (listingId) => {
    try {
      const { data: { session }, error } =
        await supabase.auth.getSession();

      if (error) throw error;

      if (!session) {
        navigate('/login', {
          state: {
            action: 'contact',
            listingId,
          },
        });
        return;
      }

      const response = await fetch(
        `${API_URL}/conversations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            listing_id: listingId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to open conversation.");
      }

      navigate(`/chat?conversation=${data.conversation.id}`);

    } catch (error) {
      console.error("Error opening conversation:", error);
      showToast(error.message, "error");
    }
  };

  const handleMarkAsSold = async (listingId) => {
    try {
      const { data: { session }, error } =
        await supabase.auth.getSession();

      if (error) throw error;

      if (!session) {
        throw new Error("Please log in again.");
      }

      const response = await fetch(
        `${API_URL}/my-listings/${listingId}/sold`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to mark listing as sold.");
      }

      setMyListings((prev) =>
        prev.map((item) =>
          item.id === listingId
            ? { ...item, status: "sold" }
            : item
        )
      );

      setProducts((prev) =>
        prev.filter((item) => item.id !== listingId)
      );

      showToast("Listing marked as sold successfully");

    } catch (error) {
      console.error("Error marking listing as sold:", error);
      showToast(error.message, "error");
    }
  };

  useEffect(() => {
    // Get the currently logged-in user when the app loads
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for login, logout, and session changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !location.state?.action) return;

    const pendingAction = location.state;

    // Clear the saved action so it cannot execute twice.
    navigate('/', {
      replace: true,
      state: null,
    });

    if (
      pendingAction.action === 'contact' &&
      pendingAction.listingId
    ) {
      handleContactSeller(pendingAction.listingId);
    }

    if (pendingAction.action === 'sell') {
      setShouldOpenSellForm(true);
    }
  }, [user, location.state, navigate]);

  useEffect(() => {
    if (!user) {
      setMyListings([]);
      return;
    }

    async function fetchMyListings() {
      setMyListingsLoading(true);
      setMyListingsError('');

      try {
        const { data: { session }, error } =
          await supabase.auth.getSession();

        if (error) throw error;

        if (!session) {
          throw new Error('Please log in again.');
        }

        const response = await fetch(
          `${API_URL}/my-listings`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch your listings.');
        }

        setMyListings(data);

      } catch (error) {
        console.error('Error fetching my listings:', error);
        setMyListingsError(error.message);

      } finally {
        setMyListingsLoading(false);
      }
    }

    fetchMyListings();
  }, [user]);

  useEffect(() => {
    async function fetchListings() {
      try {
        const response = await fetch(
          `${API_URL}/listings`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch listings');
        }

        const data = await response.json();
        setProducts(data);
      } catch (err) {
        console.error('Error fetching listings:', err);
        setError('Could not load listings. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchListings();
  }, []);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      const searchableValues = [
        product.title,
        product.description,
        product.category,
        product.condition,
        product.seller_name,
        product.college,
      ];

      const matchesQuery =
        !normalizedQuery ||
        searchableValues.some((value) =>
          String(value ?? '').toLowerCase().includes(normalizedQuery)
        );

      const matchesCategory =
        activeCategory === 'All' ||
        product.category === activeCategory;

      const matchesCollege =
        selectedCollege === 'All Colleges' ||
        product.college === selectedCollege;

      return matchesQuery && matchesCategory && matchesCollege;
    });
  }, [products, query, activeCategory, selectedCollege]);

  return (
    <>
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )
      }
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Navbar
                onSellClick={() => {
                  document.getElementById('sell')?.scrollIntoView({
                    behavior: 'smooth',
                  });
                }}
                onMessagesClick={() => navigate('/chat')}
                user={user}
                onLoginClick={() => navigate('/login')}
                onLogoutClick={handleLogout}
                isAuthenticated={!!user}
                onMyListingsClick={() => {
                  document.getElementById('my-listings')?.scrollIntoView({
                    behavior: 'smooth',
                  });
                }}
              />

              <main>
                <Hero
                  query={query}
                  setQuery={setQuery}
                  activeCategory={activeCategory}
                  setActiveCategory={setActiveCategory}
                  selectedCollege={selectedCollege}
                  setSelectedCollege={setSelectedCollege}
                  collegeOptions={collegeOptions}
                  filteredProducts={filteredProducts}
                  loading={loading}
                  error={error}
                />

                <BrowseSection
                  products={filteredProducts}
                  query={query}
                  activeCategory={activeCategory}
                  selectedCollege={selectedCollege}
                  loading={loading}
                  error={error}
                  onContactSeller={handleContactSeller}
                  currentUserId={user?.id}
                />

                {user && (
                  <MyListingsSection
                    listings={myListings}
                    loading={myListingsLoading}
                    error={myListingsError}
                    onMarkAsSold={handleMarkAsSold}
                    onConfirmSold={setListingToMarkSold}
                    listingToMarkSold={listingToMarkSold}
                    setListingToMarkSold={setListingToMarkSold}
                    onConfirmDelete={setListingToDelete}
                    onDeleteListing={handleDeleteListing}
                    listingToDelete={listingToDelete}
                    setListingToDelete={setListingToDelete}
                  />
                )}

                <FeaturesSection />

                <SellSection
                  onListingCreated={(newListing) => {
                    setProducts((previousProducts) => [
                      newListing,
                      ...previousProducts,
                    ]);
                  }}
                  isAuthenticated={!!user}
                  onRequireAuth={() => navigate('/login', {
                    state: {
                      action: 'sell',
                    },
                  })}
                  shouldOpenSellForm={shouldOpenSellForm}
                  onSellFormOpened={() => setShouldOpenSellForm(false)}
                />
                <AboutSection />
              </main>

              <Footer />
            </>
          }
        />

        <Route path="/login"
          element={<Auth onShowToast={showToast} />}
        />

        <Route
          path="/chat"
          element={
            user ? <Chat /> : <Navigate to="/login" replace />
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}