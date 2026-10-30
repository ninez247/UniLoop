import { supabase } from './supabaseClient';
import { useEffect, useMemo, useState } from "react";
import Auth from './Auth';


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

function Navbar({ onSellClick }) {
  return (
    <nav className="navbar">
      <a className="logo" href="#top">
        Uni<span>Loop</span>
      </a>

      <div className="links">
        <a href="#browse">Browse</a>
        <a href="#sell">Sell</a>
        <a href="#economics">Economics</a>
        <a href="#about">About</a>
      </div>

      <button
        className="button primary nav-cta"
        onClick={onSellClick}
      >
        Sell an item
      </button>

    </nav>
  );
}


function ProductCard({ product }) {
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
    </article>
  );
}


function SearchPanel({
  query,
  setQuery,
  activeCategory,
  setActiveCategory,
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
          WEBSITE PROTOTYPE · MANAGERIAL ECONOMICS
        </span>

        <h1>Buy less. Sell smart. Stay in the loop.</h1>

        <p>
          UniLoop is a campus-first marketplace for students to buy
          and resell textbooks, calculators, lab coats, notes and
          other academic essentials within a trusted college community.
        </p>

        <div className="hero-actions">
          <a className="button primary" href="#browse">
            Explore campus deals
          </a>

          <a className="button secondary" href="#about">
            How verification works
          </a>
        </div>
      </div>

      <SearchPanel {...props} />
    </section>
  );
}

function BrowseSection({ products, query, activeCategory,
  loading, error,
}) {
  const hasFilters = query.trim() || activeCategory !== 'All';

  return (
    <section className="container" id="browse">
      <div className="section-title">
        <div>
          <h2>Popular on your campus</h2>
          <p>
            {hasFilters
              ? 'Results matching your search and filters.'
              : 'Example inventory for the prototype.'}
          </p>
        </div>

        <span className="meta">Campus radius: 5 km</span>
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
            <ProductCard key={product.id} product={product} />
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
      '🎓 Campus-only',
      'Listings are organized around participating colleges, reducing irrelevant results.',
    ],
    [
      '✓ Verified students',
      'The planned verification flow uses college email or student ID checks.',
    ],
    [
      '₹ Lower total cost',
      'Local pickup avoids shipping and makes second-hand academic essentials affordable.',
    ],
    [
      '♻ Circular value',
      'Items get a second use instead of becoming idle after a semester.',
    ],
  ];

  return (
    <section className="container" id="features">
      <div className="section-title">
        <div>
          <h2>Why students choose UniLoop</h2>
          <p>
            Utility comes from lower search cost, trust and convenience.
          </p>
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

function SellSection({ onListingCreated, isAuthenticated, onRequireAuth }) {
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    condition: '',
    seller_name: '',
    college: '',
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
      !formData.condition ||
      !formData.seller_name.trim() ||
      !formData.college.trim()
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
      const response = await fetch('http://localhost:3000/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to create listing.'
        );
      }

      onListingCreated(data);
      setFormMessage('Listing created successfully!');
      setFormData({
        title: '',
        description: '',
        price: '',
        category: '',
        condition: '',
        seller_name: '',
        college: '',
      });
    } catch (error) {
      setFormMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }


  const steps = [
    [
      '1. Add item',
      'Upload a photo, select category, condition and asking price.',
    ],
    [
      '2. Get matched',
      'Nearby students discover the listing through course and category filters.',
    ],
    [
      '3. Meet & close',
      'Choose campus pickup. UniLoop records the transaction for trust.',
    ],
    [
      '4. Pay 8%',
      'Illustrative seller commission; no upfront listing fee in the launch model.',
    ],
  ];

  return (
    <section className="container" id="sell">
      <div className="sell-panel">
        <div className="section-title">
          <div>
            <h2>Sell in three steps</h2>
            <p>Prototype seller flow.</p>
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


            <div className="form-group">
              <label htmlFor="listing-seller">Seller name</label>
              <input
                id="listing-seller"
                type="text"
                placeholder="Enter your name"
                value={formData.seller_name}
                onChange={(e) =>
                  setFormData({ ...formData, seller_name: e.target.value })
                }
              />
            </div>


            <div className="form-group">
              <label htmlFor="listing-college">College</label>
              <input
                id="listing-college"
                type="text"
                placeholder="e.g. NIT Silchar"
                value={formData.college}
                onChange={(e) =>
                  setFormData({ ...formData, college: e.target.value })
                }
              />
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
          <h2>Prototype notes</h2>
          <p>
            Designed to demonstrate the product, customer journey
            and economic logic.
          </p>
        </div>
      </div>

      <div className="card about-card">
        <p>
          <b>Important:</b> This is a clickable academic prototype.
          Inventory, verification, payments and delivery are
          illustrative. No real transaction is processed yet.
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer>
      UniLoop — Managerial Economics Experiential Learning Prototype
      · Prepared as an academic concept.
    </footer>
  );
}


export default function App() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
    async function fetchListings() {
      try {
        const response = await fetch(
          'http://localhost:3000/api/listings'
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

      return matchesQuery && matchesCategory;
    });
  }, [products, query, activeCategory]);

  return (
    <>
      {showAuth && (
        <Auth onClose={() => setShowAuth(false)} />
      )}

      <Navbar
        onSellClick={() => {
          if (user) {
            document.getElementById('sell')?.scrollIntoView({
              behavior: 'smooth',
            });
          } else {
            setShowAuth(true);
          }
        }}
      />

      {user && (
        <button onClick={async () => {
          await supabase.auth.signOut();
        }}>
          Logout
        </button>
      )}

      <main>
        <Hero
          query={query}
          setQuery={setQuery}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          filteredProducts={filteredProducts}
          loading={loading}
          error={error}
        />

        <BrowseSection
          products={filteredProducts}
          query={query}
          activeCategory={activeCategory}
          loading={loading}
          error={error}
        />

        <FeaturesSection />

        <SellSection
          onListingCreated={(newListing) => {
            setProducts((previousProducts) => [
              newListing,
              ...previousProducts,
            ]);
          }}
          isAuthenticated={!!user}
          onRequireAuth={() => setShowAuth(true)}
        />

        <EconomicsSection />
        <AboutSection />
      </main>

      <Footer />
    </>
  );
}
