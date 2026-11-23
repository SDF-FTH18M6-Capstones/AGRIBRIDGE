const steps = [
  {
    title: "1. Farmers list produce",
    text: "Add products, price and stock.",
  },
  {
    title: "2. Buyers shop",
    text: "Search, compare and add to cart.",
  },
  {
    title: "3. Order & pay",
    text: "Place order → farmer confirms → Paystack test payment → confirm receipt.",
  },
];

function AboutPage() {
  return (
    <section>
      <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">
        About AgriBridge
      </h1>
      <p className="mt-3 max-w-2xl text-gray-600">
        Buy fresh produce directly from local farmers. Discover products, place
        an order after completing buyer details, and pay after farmer confirmation.
      </p>

      <hr className="my-8 border-gray-200" />

      <h2 className="text-2xl font-semibold text-gray-900">
        How AgriBridge Works
      </h2>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.title}
            className="rounded-lg border border-gray-200 bg-white p-5"
          >
            <h3 className="text-lg font-semibold text-gray-900">
              {step.title}
            </h3>
            <p className="mt-2 text-gray-600">{step.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default AboutPage;