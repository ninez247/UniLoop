
import { useEffect, useMemo, useState } from "react";

const categories = [
  'All',
  'Books',
  'Electronics',
  'Clothing',
];

function Navbar() {
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

      <a className="button primary nav-cta" href="#sell">
        Sell an item
      </a>
    </nav>
  );
}


function ProductCard({ product }) {
  return (
    <article className="card item-card">
      <div className="book" aria-hidden="true">
        {product.category === 'Books'
          ? '📘'
          : product.category === 'Electronics'
            ? '🧮'
            : product.category === 'Clothing'
              ? '🥼'
              : '📦'}
      </div>

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

function SellSection() {
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
          onClick={() =>
            window.alert(
              'Listing creation will be implemented in a later milestone.'
            )
          }
        >
          Create a listing
        </button>
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
      <Navbar />

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
        <SellSection />
        <EconomicsSection />
        <AboutSection />
      </main>

      <Footer />
    </>
  );
}
