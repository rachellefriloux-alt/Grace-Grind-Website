import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import facebookPhoto from "@/assets/grace-grind-facebook.jpg";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ExternalLink,
  HeartHandshake,
  HomeIcon,
  MapPin,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

const bookHref = "/book.html";
const facebookHref = "https://www.facebook.com/GracenGrind/";

const services = [
  {
    icon: HomeIcon,
    title: "Your Home Works",
    body: "Cleaning, home organization, yard work, handyman repairs, decorating, and staging. Standard care starts at $45/hr, with skilled and premium work priced clearly.",
  },
  {
    icon: UsersRound,
    title: "Family & Kids Covered",
    body: "Childcare, school pickups, meal prep, pet care, grocery runs, and errands. The daily load gets handled by the same trusted person.",
  },
  {
    icon: HeartHandshake,
    title: "You Move Forward",
    body: "Personal assistant support, life coaching, scheduling, accountability, and systems. Higher-touch work is priced in the skilled or premium tier.",
  },
];

const packages = [
  {
    eyebrow: "One-time hourly",
    name: "Standard",
    tagline: "Core home and family support",
    price: "$45",
    period: "Cleaning, yard work, childcare, pet care, errands, meal prep, organization",
    suffix: "/hr",
    features: [
      "Best fit for routine help",
      "Simple hourly pricing",
      "Book when you need, skip when you don't",
    ],
  },
  {
    eyebrow: "One-time hourly",
    name: "Skilled",
    tagline: "Hands-on help with more complexity",
    price: "$50",
    period: "Handyman repairs and personal assistant work",
    suffix: "/hr",
    features: [
      "Minor repairs and assembly",
      "Scheduling, research, calls, and coordination",
      "Priced for skilled judgment",
    ],
  },
  {
    eyebrow: "One-time hourly",
    name: "Premium",
    tagline: "Expertise, taste, and coaching",
    price: "$55",
    period: "Life coaching, decorating, and staging",
    suffix: "/hr",
    features: [
      "Goal setting and accountability",
      "Room refreshes, staging, and seasonal decorating",
      "Best for high-touch projects",
    ],
  },
  {
    eyebrow: "Subscriber plan",
    name: "Weekly Care",
    tagline: "Your life handled every week",
    price: "$180",
    period: "Recurring weekly support",
    suffix: "/wk",
    featured: true,
    badge: "10% off",
    features: [
      "10% savings vs. single visits",
      "Same familiar person, every time",
      "Built for repeat home, family, and errand care",
    ],
  },
  {
    eyebrow: "Subscriber plan",
    name: "Full Life Package",
    tagline: "Everything handled, one flat rate",
    price: "$750",
    period: "Full-life support relationship",
    suffix: "/mo",
    badge: "15% off",
    features: [
      "Everything in Weekly Care",
      "Cleaning, handyman, errands, pickups, and home support",
      "Best for customers who want the whole load handled",
    ],
  },
];

const steps = [
  {
    title: "Book your first visit",
    body: "Pick a date and time that works. Tell me what you need -- I'll confirm within the hour.",
  },
  {
    title: "Tell me what you need",
    body: "First visit is all about learning your home, your standards, your life. I listen, I pay attention.",
  },
  {
    title: "You relax -- I handle it",
    body: "From then on, one person you trust handles everything. You get your time back, permanently.",
  },
];

const reviews = [
  {
    text: "Maria handled everything -- cleaning, meal prep, pickup. I finally have my weeknights back. I used to spend Sunday dreading the week. Now I actually enjoy it.",
    initials: "SM",
    name: "Sarah M.",
    meta: "Hammond · Full Life Package",
  },
  {
    text: "I was skeptical at first -- someone in my home every week? But she just gets it. She knows my house, knows my kids, knows what matters to me. That's worth every penny.",
    initials: "TJ",
    name: "Tom J.",
    meta: "Albany · Weekly Care",
  },
  {
    text: "Between work and two kids under five, I was drowning. Now I'm the parent I actually want to be. She took the logistics off my plate. My marriage is better for it too.",
    initials: "KP",
    name: "Kristen P.",
    meta: "Hammond · Full Life Package",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero">
          <div className="hero-shell">
            <div className="hero-content">
              <div className="badge">Grace&amp;Grind | Albany LA</div>
              <h1>
                Stop juggling.
                <br />
                Start living.
                <br />
                <span>I've got this.</span>
              </h1>
              <p className="hero-sub">
                No apps, no strangers, no explaining yourself. One person you
                trust handles your entire life--cleaning, yard work, childcare,
                errands, handyman, decorating, pet care, meal prep, whatever you
                need. You focus on what matters. I handle the rest.
              </p>
              <div
                className="hero-proof"
                aria-label="Grace and Grind trust points"
              >
                <span>
                  <ShieldCheck size={16} />
                  No apps
                </span>
                <span>
                  <UsersRound size={16} />
                  No strangers
                </span>
                <span>
                  <Sparkles size={16} />
                  One trusted person
                </span>
              </div>
              <div className="book-cta">
                <a href={bookHref} className="btn-primary">
                  <CalendarCheck size={18} />
                  Request Service
                  <ArrowRight size={18} />
                </a>
                <a href="#services" className="btn-secondary">
                  See what I handle
                </a>
              </div>
            </div>

            <aside
              className="profile-card"
              aria-label="Grace and Grind local profile"
            >
              <img
                src={facebookPhoto}
                alt="Grace and Grind Facebook page"
                className="profile-media"
              />
              <div className="profile-top">
                <div className="profile-mark">G&amp;G</div>
                <div>
                  <p className="profile-kicker">Local Facebook page</p>
                  <h2>Grace&amp;Grind</h2>
                  <p className="profile-location">
                    <MapPin size={15} />
                    Albany LA
                  </p>
                </div>
              </div>
              <p className="profile-quote">
                "No apps, no strangers. Just one person you trust."
              </p>
              <div className="profile-list">
                <span>
                  <CheckCircle2 size={16} />
                  Home care
                </span>
                <span>
                  <CheckCircle2 size={16} />
                  Family help
                </span>
                <span>
                  <CheckCircle2 size={16} />
                  Errands and organizing
                </span>
              </div>
              <a
                href={facebookHref}
                className="profile-link"
                target="_blank"
                rel="noreferrer"
              >
                View the Facebook page
                <ExternalLink size={16} />
              </a>
            </aside>
          </div>
        </section>

        <section className="media-band" aria-label="Grace and Grind Facebook media">
          <div className="media-band-inner">
            <div>
              <p className="profile-kicker">From the Facebook page</p>
              <h2>Real local help, not a faceless app.</h2>
              <p>
                Grace &amp; Grind keeps the same face and same promise across
                Facebook, booking, payment, and client portal tools.
              </p>
            </div>
            <img
              src={facebookPhoto}
              alt="Grace and Grind Facebook page media"
              className="media-band-photo"
            />
          </div>
        </section>

        <section className="services" id="services">
          <div className="services-inner">
            <div className="services-header">
              <h2>If it needs doing, I do it</h2>
              <p>
                Your home, your family, your life--all from one person you can
                trust.
              </p>
            </div>
            <div className="grid">
              {services.map(service => (
                <div className="card" key={service.title}>
                  <div className="card-icon">
                    <service.icon size={24} strokeWidth={1.8} />
                  </div>
                  <h3>{service.title}</h3>
                  <p>{service.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="packages" id="packages">
          <div className="packages-inner">
            <div className="packages-header">
              <h2>Pricing that makes sense</h2>
              <p>
                Clear one-time hourly rates, plus subscriber plans that reward
                recurring relationships.
              </p>
            </div>
            <div className="pkg-grid">
              {packages.map(pkg => (
                <div
                  className={`pkg-card ${pkg.featured ? "featured" : ""}`}
                  key={pkg.name}
                >
                  {pkg.badge ? (
                    <div className="pkg-badge">{pkg.badge}</div>
                  ) : null}
                  <div className="pkg-eyebrow">{pkg.eyebrow}</div>
                  <div className="pkg-name">{pkg.name}</div>
                  <div className="pkg-tagline">{pkg.tagline}</div>
                  <div className="pkg-price">
                    {pkg.price}
                    <span>{pkg.suffix}</span>
                  </div>
                  <div className="pkg-period">{pkg.period}</div>
                  <ul className="pkg-features">
                    {pkg.features.map(feature => (
                      <li key={feature}>
                        <CheckCircle2 size={15} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <a href={bookHref} className="pkg-btn">
                    Request Service
                    <ArrowRight size={16} />
                  </a>
                </div>
              ))}
            </div>
            <p className="pricing-note">
              Already on Weekly Care or Full Life? Mention your plan when
              booking so Grace &amp; Grind can schedule you at your subscriber
              rate.
            </p>
          </div>
        </section>

        <section className="how">
          <div className="how-inner">
            <div className="how-header">
              <h2>Getting started takes 60 seconds</h2>
              <p>
                No complicated forms. No back-and-forth. Just book and done.
              </p>
            </div>
            <div className="steps">
              {steps.map((step, index) => (
                <div className="step" key={step.title}>
                  <div className="step-num">{index + 1}</div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="philosophy">
          <div className="philosophy-inner">
            <h2>Apps send strangers. You need someone real.</h2>
            <p>
              TaskRabbit sends a different person every visit. Thumbtack makes
              you bid-shop for someone you've never met. You end up managing the
              help instead of being helped. You need one person who knows your
              house, your kids' names, your standards, your life--and shows up
              without you explaining everything from scratch every single time.
            </p>
          </div>
        </section>

        <section className="difference">
          <div className="difference-inner">
            <h2>A different model entirely</h2>
            <div className="compare">
              <div className="compare-col them">
                <h3>Platforms</h3>
                <ul>
                  <li>New stranger every visit</li>
                  <li>Explain everything each time</li>
                  <li>One narrow service per booking</li>
                  <li>Corporate, impersonal</li>
                  <li>You manage the logistics</li>
                </ul>
              </div>
              <div className="compare-col us">
                <h3>Grace &amp; Grind</h3>
                <ul>
                  <li>Same person, every time</li>
                  <li>Already knows your life</li>
                  <li>Everything handled in one relationship</li>
                  <li>Personal, compassionate, real</li>
                  <li>I manage the logistics for you</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="testimonials">
          <div className="testimonials-inner">
            <div className="testimonials-header">
              <h2>People who got their life back</h2>
              <p>Real stories from real people in Hammond and Albany.</p>
            </div>
            <div className="review-grid">
              {reviews.map(review => (
                <div className="review-card" key={review.name}>
                  <div className="review-quote">"</div>
                  <p className="review-text">{review.text}</p>
                  <div className="review-attr">
                    <div className="review-avatar">{review.initials}</div>
                    <div>
                      <div className="review-name">{review.name}</div>
                      <div className="review-meta">{review.meta}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="closing">
          <div className="closing-inner">
            <h2>You're only here once. Stop spending it on the small stuff.</h2>
            <p>
              Grace & Grind exists because you deserve a life where someone has
              your back--someone you trust, someone who shows up, someone who
              makes the daily weight disappear. More time with what matters.
              Less time managing logistics.
            </p>
            <span className="location">
              Serving Albany, Hammond &amp; Tangipahoa Parish
            </span>
            <br />
            <a href={bookHref} className="cta-btn">
              Let's get started →
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
