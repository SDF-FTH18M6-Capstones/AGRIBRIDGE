
import { useState } from "react";
import { Link } from "react-router-dom";

const categories = [
  {
    name: "Vegetables",
    image:
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=500&q=80",
  },
  {
    name: "Fruits",
    image:
      "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=500&q=80",
  },
  {
    name: "Grains",
    image:
      "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=500&q=80",
  },
  {
    name: "Roots & Tubers",
    image:
      "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=500&q=80",
  },
];

const benefits = [
  {
    title: "Verified farmers",
    description:
      "Discover produce from farmers who have completed verification.",
    image:
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=300&q=80",
  },
  {
    title: "Transparent pricing",
    description: "View prices and available quantities before ordering.",
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80",
  },
  {
    title: "Direct connections",
    description: "Connect farmers and buyers through one marketplace.",
    image:
      "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=300&q=80",
  },
  {
    title: "Paystack payments",
    description: "Confirm first, then test payment through Paystack test mode.",
    image:
      "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9?auto=format&fit=crop&w=300&q=80",
  },
];

const howItWorks = [
  {
    number: "01",
    title: "Sign up",
    description:
      "Create one account and start browsing. Add buyer and farmer profiles from your account.",
  },
  {
    number: "02",
    title: "List or order",
    description:
      "Approved farmers list produce. Buyers complete their details and place orders.",
  },
  {
    number: "03",
    title: "Accept and pay",
    description:
      "Farmers confirm orders, buyers pay through Paystack test mode, then confirm receipt.",
  },
];

export default function HomePage() {
  const [search, setSearch] = useState("");

  const handleSearch = (event) => {
    event.preventDefault();

    const query = search.trim();

    window.location.assign(
      query
        ? `/marketplace?q=${encodeURIComponent(query)}`
        : "/marketplace"
    );
  };

  return (
    <main className="min-h-screen bg-[#f7faf6] text-gray-900">

      {/* NAVIGATION BAR */}
      <header className="w-full bg-green-800 shadow-md">
        <nav className="flex w-full flex-wrap items-center justify-between gap-5 px-6 py-5 lg:px-12">

          {/* AGRIBRIDGE - FAR LEFT */}
          <Link
            to="/"
            className="shrink-0 text-3xl font-extrabold tracking-tight text-white"
          >
            AgriBridge
          </Link>

          {/* NAVIGATION LINKS - FAR RIGHT */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-8">
            <Link
              to="/"
              className="whitespace-nowrap font-semibold text-white transition hover:text-green-200"
            >
              Home
            </Link>

            <Link
              to="/marketplace" reloadDocument
              className="whitespace-nowrap font-semibold text-white transition hover:text-green-200"
            >
              Marketplace
            </Link>

            <Link
              to="/about"
              className="whitespace-nowrap font-semibold text-white transition hover:text-green-200"
            >
              About Us
            </Link>

            <Link
              to="/my-products"
              className="whitespace-nowrap font-semibold text-white transition hover:text-green-200"
            >
              My Products
            </Link>

            <Link
              to="/login"
              className="whitespace-nowrap font-semibold text-white transition hover:text-green-200"
            >
              Login
            </Link>

            <Link
              to="/register"
              className="whitespace-nowrap rounded-xl bg-white px-7 py-3 font-bold text-green-800 transition hover:bg-green-100"
            >
              Register
            </Link>
          </div>
        </nav>
      </header>

      {/* HERO SECTION */}
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
            Connecting farmers directly with genuine buyers. Discover fresh
            produce, compare prices and grow your agricultural business
            through AgriBridge.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/register"
              className="rounded-lg bg-green-800 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-green-900"
            >
              Create your account
            </Link>

            <Link
              to="/marketplace" reloadDocument
              className="rounded-lg border border-green-800 bg-white px-6 py-3 font-semibold text-green-900 transition hover:bg-green-50"
            >
              Shop Produce
            </Link>
          </div>

          <form
            onSubmit={handleSearch}
            className="mt-8 flex max-w-xl flex-col gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm sm:flex-row"
          >
            <input
              type="search"
              placeholder="Search produce, county or price range"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-w-0 flex-1 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-green-200"
            />

            <button
              type="submit"
              className="rounded-lg bg-green-800 px-6 py-3 font-semibold text-white transition hover:bg-green-900"
            >
              Search
            </button>
          </form>
        </div>

        <div className="relative overflow-hidden rounded-3xl bg-green-100 shadow-lg">
          <img
            src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80"
            alt="Green agricultural fields"
            className="h-80 w-full object-cover sm:h-[480px]"
          />

          <div className="absolute inset-x-4 bottom-4 rounded-xl bg-white/95 p-4 shadow-lg sm:inset-x-6 sm:bottom-6">
            <p className="text-sm font-semibold text-green-800">
              Grow together with AgriBridge
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Bringing Kenyan farmers and buyers closer.
            </p>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-7 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-green-950 sm:text-3xl">
            Shop by Category
          </h2>

          <Link
            to="/marketplace" reloadDocument
            className="text-sm font-semibold text-green-800 hover:underline"
          >
            View all
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.name}
              to={`/marketplace?category=${encodeURIComponent(category.name)}`} reloadDocument
              className="group overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <img
                src={category.image}
                alt={category.name}
                className="h-36 w-full object-cover sm:h-48"
                loading="lazy"
              />

              <div className="p-4 text-center">
                <h3 className="font-bold text-green-950 group-hover:text-green-700">
                  {category.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-green-950 py-12 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <div><h2 className="text-2xl font-bold">See what’s available today.</h2><p className="mt-3 text-green-100">Explore current listings, prices and stock from approved farms.</p></div>
          <a href="/marketplace" className="rounded-xl bg-white px-6 py-3 font-bold text-green-950">Open marketplace</a>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mb-9">
          <h2 className="text-2xl font-bold text-green-950 sm:text-3xl">
            How AgriBridge Works
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

      {/* BENEFITS */}
      <section className="bg-[#eaf4e9] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-9">
            <h2 className="text-2xl font-bold text-green-950 sm:text-3xl">
              Why Choose AgriBridge?
            </h2>

            <p className="mt-3 text-gray-600">
              A marketplace designed to make agricultural trade easier.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >
                <img
                  src={benefit.image}
                  alt={benefit.title}
                  className="h-20 w-20 rounded-xl object-cover"
                  loading="lazy"
                />

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

      {/* BULK BUYING */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-green-200 bg-white p-7 shadow-sm md:flex-row md:items-center md:p-10">
          <div>
            <h2 className="text-2xl font-bold text-green-950">
              Ready to place your first order?
            </h2>

            <p className="mt-2 text-gray-600">
              Complete your buyer details in Profile to enable purchasing immediately.
            </p>
          </div>

          <Link
            to="/profile?setup=buyer"
            className="shrink-0 rounded-lg bg-green-800 px-6 py-3 font-semibold text-white hover:bg-green-900"
          >
            Complete buyer details
          </Link>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="mb-7 text-2xl font-bold text-green-950 sm:text-3xl">
          What Our Users Say
        </h2>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-8">
            <p className="font-semibold text-green-800">
              Farmer testimonial
            </p>

            <p className="mt-3 text-gray-500">
              Farmer experiences and feedback will appear here once available.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-8">
            <p className="font-semibold text-green-800">
              Buyer testimonial
            </p>

            <p className="mt-3 text-gray-500">
              Buyer experiences and feedback will appear here once available.
            </p>
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="bg-green-950 px-4 py-16 text-center text-white sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Join AgriBridge Today
          </h2>

          <p className="mt-4 text-green-100">
            Whether you grow produce or buy it, AgriBridge brings agricultural
            opportunities closer.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/register"
              className="rounded-lg bg-white px-7 py-3 font-semibold text-green-950 hover:bg-green-50"
            >
              Create your account
            </Link>

            <Link
              to="/register"
              className="rounded-lg border border-white px-7 py-3 font-semibold text-white hover:bg-green-900"
            >
              Explore AgriBridge
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-950 px-6 py-8 text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xl font-bold">AgriBridge</p>

          <p className="text-center text-sm text-gray-400">
            Connecting farmers and buyers across Kenya.
          </p>

          <p className="text-sm text-gray-400">
            © 2026 AgriBridge. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
