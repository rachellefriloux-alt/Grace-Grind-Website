import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { FormEvent, useMemo, useState } from "react";
import { ExternalLink, MapPin, Send, ShieldCheck } from "lucide-react";

const facebookHref = "https://www.facebook.com/GracenGrind/";

const serviceCategories = [
  {
    label: "Home & Property",
    services: [
      ["Home Cleaning", "🧹", "Deep clean, regular maintenance, or move-in/move-out", "$45/hr"],
      ["Home Organization", "📦", "Declutter, organize rooms, closets, garage, or pantry", "$45/hr"],
      ["Yard Work", "🌿", "Mowing, trimming, leaf removal, seasonal cleanup", "$45/hr"],
      ["Handyman Repairs", "🔧", "Minor repairs, furniture assembly, fixtures, home upkeep", "$50/hr"],
      ["Decorating & Staging", "🪴", "Holiday decorating, room refresh, home staging", "$55/hr"],
    ],
  },
  {
    label: "Family & Kids",
    services: [
      ["Childcare", "👧", "Watching kids, school pickups, after-school activities", "$45/hr"],
      ["Meal Prep", "🍽️", "Weekly meal prep, cooking, or grocery-to-table service", "$45/hr"],
      ["Pet Care", "🐾", "Dog walking, pet sitting, vet runs, feeding", "$45/hr"],
      ["Errands", "🛒", "Grocery runs, pickups, drop-offs, returns, pharmacy", "$45/hr"],
    ],
  },
  {
    label: "Life & Growth",
    services: [
      ["Personal Assistant", "📋", "Scheduling, research, calls, paperwork, coordination", "$50/hr"],
      ["Life Coaching", "🧠", "Goal setting, accountability, systems, personal growth", "$55/hr"],
      ["Other", "💬", "Describe what you need in the notes -- I'll figure it out", "Custom"],
    ],
  },
] as const;

type BookingPayload = {
  name: string;
  email: string;
  phone: string;
  service_type: string;
  subscriber_plan: string;
  preferred_date: string;
  preferred_time: string;
  hours: string;
  payment_preference: string;
  notes: string;
};

const emptyPayload: BookingPayload = {
  name: "",
  email: "",
  phone: "",
  service_type: "",
  subscriber_plan: "",
  preferred_date: "",
  preferred_time: "",
  hours: "1",
  payment_preference: "ACH / bank account",
  notes: "",
};

type CreatedBooking = {
  id: string;
  service_type: string;
  subscriber_plan: string;
  rate_label: string;
  amount_cents: number | null;
  payment_status: string;
};

export default function Book() {
  const [form, setForm] = useState<BookingPayload>(emptyPayload);
  const [error, setError] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<CreatedBooking | null>(null);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const selectedRate = useMemo(() => {
    for (const category of serviceCategories) {
      const selectedService = category.services.find(([name]) => name === form.service_type);

      if (selectedService) {
        return selectedService[3];
      }
    }

    return "";
  }, [form.service_type]);

  const update = (field: keyof BookingPayload, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
    setCheckoutError("");
  };

  const resetForm = () => {
    setForm(emptyPayload);
    setError("");
    setCheckoutError("");
    setSubmitting(false);
    setPaying(false);
    setSuccess(false);
    setCreatedBooking(null);
  };

  const submitBooking = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!form.service_type) {
      setError("Please select a service.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as {
        booking?: CreatedBooking;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      setCreatedBooking(data.booking || null);
      setSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      setSubmitting(false);
    }
  };

  const startCheckout = async () => {
    if (!createdBooking) return;

    setPaying(true);
    setCheckoutError("");

    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: createdBooking.id }),
      });
      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error || "Unable to create Stripe checkout.");
      }

      window.location.href = data.url;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to create Stripe checkout.";
      setCheckoutError(message);
      setPaying(false);
    }
  };

  const portalUrl = form.email
    ? `/portal?email=${encodeURIComponent(form.email)}`
    : "/portal";

  return (
    <>
      <SiteHeader active="book" />
      <main>
        <section className="page-header">
          <div className="page-header-inner">
            <div className="badge">Grace&amp;Grind | Albany LA</div>
            <h1>Request a service</h1>
            <p>
              Pick what you need, fill in your details, and I'll reach out to
              confirm. No platforms, no strangers -- just one person who shows up.
            </p>
            <div className="booking-trust" aria-label="Grace and Grind trust details">
              <span>
                <ShieldCheck size={16} />
                No app middleman
              </span>
              <span>
                <MapPin size={16} />
                Albany LA
              </span>
              <a href={facebookHref} target="_blank" rel="noreferrer">
                Facebook page
                <ExternalLink size={15} />
              </a>
            </div>
          </div>
        </section>

        <div className="main-content">
          <div className="services-section">
            <h2>What do you need help with?</h2>
            <p>Select a service below, then fill out the form on the right.</p>

            {serviceCategories.map((category) => (
              <div className="service-category" key={category.label}>
                <div className="category-label">{category.label}</div>
                <div className="service-items">
                  {category.services.map(([name, icon, description, rate]) => (
                    <button
                      className={`service-item ${form.service_type === name ? "selected" : ""}`}
                      type="button"
                      key={name}
                      onClick={() => update("service_type", name)}
                    >
                      <span className="service-check" />
                      <span className="service-icon">{icon}</span>
                      <span className="service-info">
                        <span className="service-name">
                          {name === "Other" ? "Something else" : name}
                        </span>
                        <span className="service-desc">{description}</span>
                      </span>
                      <span className="service-rate">{rate}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="form-section">
            <div className="form-card">
              <h2>Request a booking</h2>
              <p>
                Book the work, choose how you want to pay, and use Stripe for
                ACH, card, Apple Pay, or Google Pay when you are ready.
              </p>

              {form.service_type && !success ? (
                <div className="selected-service-badge show">
                  <span>{form.service_type}</span>
                  {selectedRate ? <span>{selectedRate}</span> : null}
                  <button
                    className="clear-btn"
                    type="button"
                    onClick={() => update("service_type", "")}
                  >
                    Change
                  </button>
                </div>
              ) : null}

              <div className={`error-msg ${error ? "show" : ""}`}>{error}</div>

              <form className={`form-fields ${success ? "hidden" : ""}`} onSubmit={submitBooking}>
                <div className="form-row">
                  <label htmlFor="name">
                    Your name <span className="req">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    placeholder="First and last name"
                    value={form.name}
                    onChange={(event) => update("name", event.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <label htmlFor="email">Email address</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                  />
                </div>

                <div className="form-row">
                  <label htmlFor="phone">Phone number</label>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="(985) 555-0100"
                    value={form.phone}
                    onChange={(event) => update("phone", event.target.value)}
                  />
                </div>

                <div className="form-row">
                  <label htmlFor="service_type">
                    Service needed <span className="req">*</span>
                  </label>
                  <select
                    id="service_type"
                    value={form.service_type}
                    onChange={(event) => update("service_type", event.target.value)}
                  >
                    <option value="">-- select a service --</option>
                    {serviceCategories.flatMap((category) =>
                      category.services.map(([name]) => (
                        <option value={name} key={name}>
                          {name === "Other" ? "Something else" : name}
                        </option>
                      )),
                    )}
                  </select>
                </div>

                <div className="form-row">
                  <label htmlFor="subscriber_plan">Subscriber plan</label>
                  <select
                    id="subscriber_plan"
                    value={form.subscriber_plan}
                    onChange={(event) => update("subscriber_plan", event.target.value)}
                  >
                    <option value="">Not a subscriber yet</option>
                    <option value="Weekly Care">Weekly Care - $180/wk</option>
                    <option value="Full Life Package">Full Life Package - $750/mo</option>
                  </select>
                  <p className="subscriber-note">
                    Already on Weekly Care or Full Life? Mention your plan when
                    booking so Grace &amp; Grind can schedule you at your
                    subscriber rate.
                  </p>
                </div>

                <div className="form-row-two">
                  <div>
                    <label htmlFor="hours">Estimated hours</label>
                    <input
                      id="hours"
                      type="number"
                      min="1"
                      max="24"
                      step="0.25"
                      value={form.hours}
                      onChange={(event) => update("hours", event.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="payment_preference">Payment preference</label>
                    <select
                      id="payment_preference"
                      value={form.payment_preference}
                      onChange={(event) =>
                        update("payment_preference", event.target.value)
                      }
                    >
                      <option value="ACH / bank account">ACH / bank account</option>
                      <option value="Card or wallet">Card or wallet</option>
                      <option value="Paper check">Paper check</option>
                      <option value="Discuss first">Discuss first</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-two">
                  <div>
                    <label htmlFor="preferred_date">Preferred date</label>
                    <input
                      id="preferred_date"
                      type="date"
                      min={today}
                      value={form.preferred_date}
                      onChange={(event) => update("preferred_date", event.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="preferred_time">Preferred time</label>
                    <select
                      id="preferred_time"
                      value={form.preferred_time}
                      onChange={(event) => update("preferred_time", event.target.value)}
                    >
                      <option value="">Any time</option>
                      <option value="Morning (8am-12pm)">Morning (8am-12pm)</option>
                      <option value="Afternoon (12pm-5pm)">Afternoon (12pm-5pm)</option>
                      <option value="Evening (5pm-8pm)">Evening (5pm-8pm)</option>
                      <option value="Flexible">Flexible</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <label htmlFor="notes">Additional notes</label>
                  <textarea
                    id="notes"
                    placeholder="Any details I should know -- number of kids, pets, property size, specific tasks, subscriber plan, ACH preference, etc."
                    value={form.notes}
                    onChange={(event) => update("notes", event.target.value)}
                  />
                </div>

                <button className="submit-btn" type="submit" disabled={submitting}>
                  {submitting ? (
                    "Sending..."
                  ) : (
                    <>
                      Request this service
                      <Send size={16} />
                    </>
                  )}
                </button>
                <p className="form-note">
                  No payment needed now. I'll confirm the correct rate or
                  subscriber plan directly.
                </p>
              </form>

              <div className={`success-state ${success ? "show" : ""}`}>
                <div className="success-icon">✓</div>
                <h3>Request received!</h3>
                <p>
                  Thanks -- I'll reach out within 24 hours to confirm your
                  booking and go over the details.
                </p>
                {createdBooking ? (
                  <div className="booking-summary">
                    <strong>{createdBooking.service_type}</strong>
                    <span>
                      {createdBooking.subscriber_plan || createdBooking.rate_label}
                    </span>
                    <span>
                      {createdBooking.amount_cents
                        ? `$${(createdBooking.amount_cents / 100).toFixed(2)}`
                        : "Manual quote needed"}
                    </span>
                  </div>
                ) : null}
                <div className={`error-msg ${checkoutError ? "show" : ""}`}>
                  {checkoutError}
                </div>
                {createdBooking?.amount_cents ? (
                  <button
                    className="submit-btn"
                    type="button"
                    onClick={startCheckout}
                    disabled={paying}
                  >
                    {paying ? "Opening Stripe..." : "Pay with Stripe"}
                  </button>
                ) : null}
                <a className="another-btn portal-link" href={portalUrl}>
                  Open client portal
                </a>
                <button className="another-btn" type="button" onClick={resetForm}>
                  Request another service
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter locationLine />
    </>
  );
}
