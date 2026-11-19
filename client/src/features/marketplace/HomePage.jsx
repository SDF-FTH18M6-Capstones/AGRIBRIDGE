
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const featuredProducts = [
  {
    id: 1,
    name: "Fresh Tomatoes",
    price: 120,
    unit: "kg",
    quantity: 200,
    county: "Nakuru",
    harvested: "12 Nov 2026",
    image:
      "https://images.unsplash.com/photo-1741517287380-cf3a9ef75be1?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: 2,
    name: "Ripe Mangoes",
    price: 150,
    unit: "kg",
    quantity: 120,
    county: "Makueni",
    harvested: "10 Nov 2026",
    image:
      "https://images.unsplash.com/photo-1553279768-865429fa0078?w=700",
  },
  {
    id: 3,
    name: "Dry Maize",
    price: 65,
    unit: "kg",
    quantity: 500,
    county: "Uasin Gishu",
    harvested: "25 Oct 2026",
    image:
      "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: 4,
    name: "Irish Potatoes",
    price: 80,
    unit: "kg",
    quantity: 300,
    county: "Nyandarua",
    harvested: "Pending harvest",
    image:
      "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=700&q=80",
  },
];

const categories = [
  {
    name: "Vegetables",
    icon: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=500&q=80",
  },
  {
    name: "Fruits",
    icon: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=500&q=80",
  },
  {
    name: "Cereals and grains",
    icon: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=500&q=80",
  },
  {
    name: "Tubers",
    icon: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=500&q=80",
  },
];

const benefits = [
  {
    title: "Verified farmers",
    description: "Discover produce from farmers who have completed verification.",
    icon: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=300&q=80",
  },
  {
    title: "Transparent pricing",
    description: "View prices and available quantities before ordering.",
    icon: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80",
  },
  {
    title: "Direct connections",
    description: "Connect farmers and buyers through one marketplace.",
    icon: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=300&q=80",
  },
  {
    title: "M-Pesa payments",
    description: "A familiar payment option for agricultural transactions.",
    icon: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9?auto=format&fit=crop&w=300&q=80",
  },
];

const howItWorks = [
  {
    number: "01",
    title: "Sign up",
    description: "Create an account and choose to participate as a farmer or buyer.",
  },
  {
    number: "02",
    title: "List or order",
    description: "Farmers list produce. Buyers browse products or post buying requests.",
  },
  {
    number: "03",
    title: "Accept and pay",
    description: "Farmers accept orders, then buyers can pay through M-Pesa.",
  },
];

const farmerProfiles = [
  { name: "Farmer profile", location: "Verified farmer profiles coming soon" },
  { name: "Farmer profile", location: "Verified farmer profiles coming soon" },
  { name: "Farmer profile", location: "Verified farmer profiles coming soon" },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const handleSearch = (event) => {
    event.preventDefault();

    const query = search.trim();

    navigate(
      query
        ? `/marketplace?q=${encodeURIComponent(query)}`
        : "/marketplace"
    );
  };

  return (
    <main className="bg-[#f7faf6] text-gray-900">
      {/* Hero */}
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
        <div>
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-green-700">
            A better agricultural marketplace
          </p>

          <h1 className="max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-green-950 sm:text-5xl lg:text-6xl">
            From Farm to Market.
            <span className="block text-green-700">
              Without Unnecessary Middlemen.
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-8 text-gray-600">
            Connecting farmers directly with genuine buyers.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/register"
              className="rounded-lg bg-green-800 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-green-900"
            >
              Join as a Farmer
            </Link>

            <Link
              to="/marketplace"
              className="rounded-lg border border-green-800 bg-white px-6 py-3 font-semibold text-green-900 transition hover:bg-green-50"
            >
              Shop Produce
            </Link>
          </div>

          <form
            onSubmit={handleSearch}
            role="search"
            className="mt-8 flex max-w-xl flex-col gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm sm:flex-row"
          >
            <input
              type="search"
              aria-label="Search produce, county or price range"
              placeholder="Search produce, county or price range"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-w-0 flex-1 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-200"
            />
            <button
              type="submit"
              className="rounded-lg bg-green-800 px-6 py-3 font-semibold text-white hover:bg-green-900"
            >
              Search
            </button>
          </form>
        </div>

        <div className="relative overflow-hidden rounded-3xl bg-green-100 shadow-lg">
          <img
            src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1200"
            alt="Green agricultural fields"
            className="h-80 w-full object-cover sm:h-[480px]"
          />
          <div className="absolute inset-x-4 bottom-4 rounded-xl bg-white/95 p-4 shadow-lg backdrop-blur-sm sm:inset-x-6 sm:bottom-6">
            <p className="text-sm font-semibold text-green-800">
              Grow together with AgriBridge
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Bringing Kenyan farmers and buyers closer.
            </p>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-7 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-green-950 sm:text-3xl">
            Categories
          </h2>
          <Link
            to="/marketplace"
            className="text-sm font-semibold text-green-800 hover:underline"
          >
            View all produce →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.name}
              to={`/marketplace?category=${encodeURIComponent(category.name)}`}
              className="group rounded-2xl border border-green-100 bg-white p-6 text-center shadow-sm transition hover:-translate-y-1 hover:border-green-300 hover:shadow-md"
            >
              <img
                src={category.icon}
                alt={category.name}
                className="mx-auto h-20 w-full rounded-xl object-cover"
                loading="lazy"
              />
              <h3 className="mt-4 font-bold text-green-950 group-hover:text-green-700">
                {category.name}
              </h3>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured produce */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="mb-2 text-sm font-bold uppercase tracking-widest text-green-700">
                Fresh from the farm
              </p>
              <h2 className="text-2xl font-bold text-green-950 sm:text-3xl">
                Featured produce from verified farmers
              </h2>
            </div>
            <Link
              to="/marketplace"
              className="font-semibold text-green-800 hover:underline"
            >
              Explore marketplace →
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <article
                key={product.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="flex h-44 items-center justify-center bg-green-50">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm text-green-700">
                      Produce image
                    </span>
                  )}
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-900">
                    {product.name}
                  </h3>
                  <p className="mt-2 font-bold text-green-800">
                    KSh {product.price.toLocaleString("en-KE")} / {product.unit}
                  </p>
                  <p className="mt-3 text-sm text-gray-600">
                    {product.quantity} {product.unit} available · {product.county}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {product.harvested === "Pending harvest"
                      ? product.harvested
                      : `Harvested ${product.harvested}`}
                  </p>
                  <span className="mt-4 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                    ✓ Verified farmer
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mb-9">
          <h2 className="text-2xl font-bold text-green-950 sm:text-3xl">
            How it works
          </h2>
          <p className="mt-3 text-gray-600">
            Three simple steps to connect farmers and buyers.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {howItWorks.map((step) => (
            <div
              key={step.number}
              className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-green-800 text-lg font-bold text-white">
                {step.number}
              </div>
              <h3 className="text-xl font-bold text-green-950">
                {step.title}
              </h3>
              <p className="mt-3 leading-7 text-gray-600">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-[#eaf4e9] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-9 text-2xl font-bold text-green-950 sm:text-3xl">
            Why AgriBridge
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >
                <div className="h-16 w-16 overflow-hidden rounded-xl bg-green-100">
                  <img
                    src={benefit.icon}
                    alt={benefit.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <h3 className="mt-5 font-bold text-green-950">
                  {benefit.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bulk buying */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-green-200 bg-white p-7 shadow-sm md:flex-row md:items-center md:p-10">
          <div>
            <h2 className="text-2xl font-bold text-green-950">
              Need produce in bulk?
            </h2>
            <p className="mt-2 text-gray-600">
              Post a buying request and let verified farmers respond.
            </p>
          </div>
          <Link
            to="/login"
            className="shrink-0 rounded-lg bg-green-800 px-6 py-3 font-semibold text-white hover:bg-green-900"
          >
            Post a request →
          </Link>
        </div>
      </section>

      {/* Verified farmer profiles */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="mb-7 text-2xl font-bold text-green-950 sm:text-3xl">
          Verified farmers
        </h2>

        <div className="grid gap-5 md:grid-cols-3">
          {farmerProfiles.map((farmer, index) => (
            <div
              key={index}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex h-32 items-center justify-center rounded-xl bg-green-50 text-green-700">
                Farmer profile
              </div>
              <h3 className="mt-4 font-semibold text-green-950">
                {farmer.name}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {farmer.location}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="mb-7 text-2xl font-bold text-green-950 sm:text-3xl">
          Testimonials
        </h2>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-8">
            <p className="text-sm font-semibold text-green-800">
              Farmer testimonial
            </p>
            <p className="mt-3 text-gray-500">
              Farmer experiences and feedback will appear here
              once available.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-8">
            <p className="text-sm font-semibold text-green-800">
              Buyer testimonial
            </p>
            <p className="mt-3 text-gray-500">
              Buyer experiences and feedback will appear here
              once available.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-green-950 px-4 py-16 text-center text-white sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Join AgriBridge today
          </h2>
          <p className="mt-4 text-green-100">
            Whether you grow produce or buy it, AgriBridge
            brings agricultural opportunities closer.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/register"
              className="rounded-lg bg-white px-7 py-3 font-semibold text-green-950 hover:bg-green-50"
            >
              I am a farmer
            </Link>
            <Link
              to="/register"
              className="rounded-lg border border-white px-7 py-3 font-semibold text-white hover:bg-green-900"
            >
              I am a buyer
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}