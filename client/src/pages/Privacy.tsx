import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export default function Privacy() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="page-header">
          <div className="page-header-inner">
            <div className="badge">Grace &amp; Grind</div>
            <h1>Privacy Policy</h1>
            <p>Last updated May 30, 2026</p>
          </div>
        </section>

        <section className="privacy-content">
          <p>
            Grace &amp; Grind only asks for the information needed to understand and
            respond to service requests, such as your name, contact details,
            service area, scheduling preference, and task details.
          </p>

          <h2>Information You Share</h2>
          <p>
            When you create a profile, book a service, send a message, upload a
            file, sign a document, or request a subscription, the website stores
            the details needed to manage that client relationship. This can
            include service history, payment status, uploaded file records,
            signed document records, and messages.
          </p>

          <h2>Payments</h2>
          <p>
            Payment pages are provided by Stripe. Grace &amp; Grind does not ask
            for or store full card numbers, bank account numbers, Apple Pay, or
            Google Pay details on this website.
          </p>

          <h2>How Information Is Used</h2>
          <p>
            Details are used to estimate the work, confirm scheduling, provide
            service, process payments or subscriptions, review uploaded photos
            or documents, send updates, prepare documents, and follow up about
            the job. Information is not sold or rented.
          </p>

          <h2>Local Records</h2>
          <p>
            Booking, portal, and uploaded file records are saved for business
            operations. If the site is running locally, those records are stored
            on the Grace &amp; Grind computer. When hosted publicly, records should
            be protected by the hosting account and admin access code.
          </p>

          <h2>Service Safety</h2>
          <p>
            Please do not submit sensitive details such as door codes, medical
            information, or private family information through the website form.
            Share sensitive access details only through a trusted direct
            conversation.
          </p>

          <h2>Contact</h2>
          <p>
            For privacy questions or to update information related to a service
            request, use the booking page to start a direct message.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
