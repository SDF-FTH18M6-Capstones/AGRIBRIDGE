
import { Link } from "react-router-dom";

const benefits = [
  {
    icon: "🌱",
    title: "For Farmers",
    description:
      "Showcase your produce and connect with buyers looking for fresh agricultural products.",
  },
  {
    icon: "🛒",
    title: "For Buyers",
    description:
      "Discover farm produce, compare available products, and connect with suppliers.",
  },
  {
    icon: "🤝",
    title: "Better Connections",
    description:
      "Bringing farmers and buyers together through one convenient marketplace.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-14 pb-12">
      {/* Hero section */}
      <section className="grid items-center gap-8 rounded-2xl bg-green-900 p-6 text-white md:grid-cols-2 md:p-10">
        <div>
          <span className="text-sm font-semibold uppercase tracking-widest text-green-200">
            Welcome to AgriBridge
          </span>

          <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
            Connecting Farmers to Better Markets
          </h1>

          <p className="mt-5 text-lg text-green-100">
            Discover fresh agricultural produce, connect with
            farmers, and create better trading opportunities
            through AgriBridge.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/marketplace"
              className="rounded-lg bg-yellow-400 px-5 py-3 font-semibold text-green-950 transition hover:bg-yellow-300"
            >
              Explore Marketplace
            </Link>

            <Link
              to="/register"
              className="rounded-lg border border-white px-5 py-3 font-semibold transition hover:bg-white hover:text-green-900"
            >
              Get Started
            </Link>
          </div>
        </div>

        <img
          src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=85"
          alt="Fresh vegetables displayed at a produce market"
          className="h-72 w-full rounded-xl object-cover shadow-lg md:h-96"
        />
      </section>

      {/* Benefits section */}
      <section>
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Why Choose AgriBridge?
          </h2>
          <p className="mt-2 text-gray-600">
            A simpler way to connect agriculture and opportunity.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {benefits.map((benefit) => (
            <article
              key={benefit.title}
              className="rounded-xl border border-gray-200 bg-white p-7 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-4 text-4xl">
                {benefit.icon}
              </div>

              <h3 className="mb-3 text-xl font-semibold text-green-800">
                {benefit.title}
              </h3>

              <p className="text-gray-600">
                {benefit.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Call to action */}
      <section className="rounded-2xl bg-green-50 px-6 py-12 text-center">
        <h2 className="text-3xl font-bold text-green-900">
          Ready to Grow With AgriBridge?
        </h2>

        <p className="mx-auto mt-4 max-w-xl text-gray-600">
          Whether you grow produce or source it for your
          business, AgriBridge helps you take the next step.
        </p>

        <Link
          to="/register"
          className="mt-6 inline-block rounded-lg bg-green-700 px-6 py-3 font-semibold text-white transition hover:bg-green-800"
        >
          Join AgriBridge
        </Link>
      </section>
    </div>
  );
}
