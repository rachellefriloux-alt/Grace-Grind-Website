import facebookPhoto from "@/assets/grace-grind-facebook.jpg";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  CreditCard,
  Download,
  FileSignature,
  MessageSquareText,
  Paperclip,
  Send,
  UploadCloud,
  UserRoundPlus,
} from "lucide-react";

type ClientRecord = {
  name: string;
  email: string;
  phone: string;
  address: string;
  preferred_contact: string;
  notes: string;
};

type BookingRecord = {
  id: string;
  created_at: string;
  service_type: string;
  subscriber_plan: string;
  preferred_date: string;
  preferred_time: string;
  rate_label: string;
  amount_cents: number | null;
  status: string;
  payment_status: string;
};

type MessageRecord = {
  id: string;
  created_at: string;
  from: "client" | "admin";
  subject: string;
  body: string;
};

type NotificationRecord = {
  id: string;
  created_at: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
};

type DocumentRecord = {
  id: string;
  created_at: string;
  title: string;
  body: string;
  status: "needs_signature" | "signed";
  signed_at?: string;
  signer_name?: string;
};

type PaymentRecord = {
  id: string;
  created_at: string;
  checkout_url?: string;
  amount_cents: number;
  mode: "payment" | "subscription";
  status: string;
};

type FileRecord = {
  id: string;
  created_at: string;
  filename: string;
  mime_type: string;
  size: number;
  category: string;
  note: string;
  uploaded_by: "client" | "admin";
};

type PortalData = {
  client: ClientRecord | null;
  bookings: BookingRecord[];
  messages: MessageRecord[];
  notifications: NotificationRecord[];
  documents: DocumentRecord[];
  payments: PaymentRecord[];
  files: FileRecord[];
};

const emptyClient: ClientRecord = {
  name: "",
  email: "",
  phone: "",
  address: "",
  preferred_contact: "Email",
  notes: "",
};

function money(cents: number | null) {
  if (!cents) return "Manual quote";
  return `$${(cents / 100).toFixed(2)}`;
}

function bytesLabel(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}

export default function Portal() {
  const initialEmail = useMemo(() => {
    return new URLSearchParams(window.location.search).get("email") || "";
  }, []);
  const checkoutStatus = useMemo(() => {
    return new URLSearchParams(window.location.search).get("checkout") || "";
  }, []);

  const [clientForm, setClientForm] = useState<ClientRecord>({
    ...emptyClient,
    email: initialEmail,
  });
  const [portalEmail, setPortalEmail] = useState(initialEmail);
  const [portal, setPortal] = useState<PortalData | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [messageSubject, setMessageSubject] = useState("Service question");
  const [signatures, setSignatures] = useState<Record<string, string>>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileCategory, setFileCategory] = useState("Service photos");
  const [fileNote, setFileNote] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const updateClient = (field: keyof ClientRecord, value: string) => {
    setClientForm((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const loadPortal = async (email = portalEmail) => {
    if (!email.trim()) {
      setError("Enter your email to open the portal.");
      return;
    }

    setError("");
    setStatus("Loading portal...");
    const response = await fetch(`/api/portal?email=${encodeURIComponent(email)}`);
    const data = (await response.json()) as PortalData & { error?: string };

    if (!response.ok) {
      setStatus("");
      setError(data.error || "Unable to load portal.");
      return;
    }

    setPortal(data);
    setPortalEmail(email);
    setClientForm(data.client || { ...emptyClient, email });
    setStatus("");
  };

  useEffect(() => {
    if (initialEmail) {
      void loadPortal(initialEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEmail]);

  const submitSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setStatus("Saving client profile...");

    const response = await fetch("/api/clients/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clientForm),
    });
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setStatus("");
      setError(data.error || "Unable to create profile.");
      return;
    }

    setPortalEmail(clientForm.email);
    setStatus("Client profile saved.");
    await loadPortal(clientForm.email);
  };

  const sendMessage = async () => {
    if (!portalEmail || !messageBody.trim()) {
      setError("Write a message first.");
      return;
    }

    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: portalEmail,
        subject: messageSubject,
        body: messageBody,
      }),
    });
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(data.error || "Unable to send message.");
      return;
    }

    setMessageBody("");
    await loadPortal(portalEmail);
  };

  const uploadFiles = async () => {
    if (!portalEmail) {
      setError("Enter your email before uploading files.");
      return;
    }

    if (!selectedFiles.length) {
      setError("Choose at least one file to upload.");
      return;
    }

    setError("");
    setStatus("Uploading files...");
    setUploadingFiles(true);

    try {
      for (const file of selectedFiles) {
        const dataUrl = await readFileAsDataUrl(file);
        const response = await fetch("/api/files/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: portalEmail,
            filename: file.name,
            mime_type: file.type || "application/octet-stream",
            category: fileCategory,
            note: fileNote,
            data_url: dataUrl,
          }),
        });
        const result = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(result.error || "Unable to upload file.");
        }
      }

      setSelectedFiles([]);
      setFileNote("");
      await loadPortal(portalEmail);
      setStatus("Files uploaded.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload files.",
      );
      setStatus("");
    } finally {
      setUploadingFiles(false);
    }
  };

  const signDocument = async (documentId: string) => {
    const signerName = signatures[documentId] || "";
    const response = await fetch(`/api/documents/${documentId}/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signer_name: signerName }),
    });
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(data.error || "Unable to sign document.");
      return;
    }

    await loadPortal(portalEmail);
  };

  return (
    <>
      <SiteHeader active="portal" />
      <main className="portal-page">
        <section className="page-header portal-hero">
          <div className="portal-hero-inner">
            <div>
              <div className="badge">Grace&amp;Grind Client Portal</div>
              <h1>Book, pay, message, and sign in one place.</h1>
              <p>
                Your portal keeps service requests, Stripe payments, recurring
                care, notifications, messages, and documents together.
              </p>
            </div>
            <img
              src={facebookPhoto}
              alt="Grace and Grind Facebook profile"
              className="portal-hero-media"
            />
          </div>
        </section>

        <section className="portal-shell">
          <form className="portal-card" onSubmit={submitSignup}>
            <div className="portal-card-title">
              <UserRoundPlus size={20} />
              <h2>Sign up or update profile</h2>
            </div>
            <div className="form-row">
              <label htmlFor="client-name">Name</label>
              <input
                id="client-name"
                value={clientForm.name}
                onChange={(event) => updateClient("name", event.target.value)}
                placeholder="First and last name"
                required
              />
            </div>
            <div className="form-row-two">
              <div>
                <label htmlFor="client-email">Email</label>
                <input
                  id="client-email"
                  type="email"
                  value={clientForm.email}
                  onChange={(event) => updateClient("email", event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="client-phone">Phone</label>
                <input
                  id="client-phone"
                  value={clientForm.phone}
                  onChange={(event) => updateClient("phone", event.target.value)}
                  placeholder="(985) 555-0100"
                />
              </div>
            </div>
            <div className="form-row">
              <label htmlFor="client-address">Service address</label>
              <input
                id="client-address"
                value={clientForm.address}
                onChange={(event) => updateClient("address", event.target.value)}
                placeholder="Street, city, ZIP"
              />
            </div>
            <div className="form-row-two">
              <div>
                <label htmlFor="preferred-contact">Preferred contact</label>
                <select
                  id="preferred-contact"
                  value={clientForm.preferred_contact}
                  onChange={(event) =>
                    updateClient("preferred_contact", event.target.value)
                  }
                >
                  <option>Email</option>
                  <option>Text</option>
                  <option>Phone call</option>
                </select>
              </div>
              <div>
                <label htmlFor="portal-email">Open existing portal</label>
                <input
                  id="portal-email"
                  type="email"
                  value={portalEmail}
                  onChange={(event) => setPortalEmail(event.target.value)}
                  placeholder="client email"
                />
              </div>
            </div>
            <div className="form-row">
              <label htmlFor="client-notes">Home notes</label>
              <textarea
                id="client-notes"
                value={clientForm.notes}
                onChange={(event) => updateClient("notes", event.target.value)}
                placeholder="Pets, parking, allergies, gate instructions, family routines, or service preferences."
              />
            </div>
            <div className={`error-msg ${error ? "show" : ""}`}>{error}</div>
            {status ? <p className="form-note">{status}</p> : null}
            <button className="submit-btn" type="submit">
              Save profile
            </button>
            <button
              className="another-btn"
              type="button"
              onClick={() => void loadPortal()}
            >
              Open portal
            </button>
          </form>

          <div className="portal-dashboard">
            {checkoutStatus === "success" ? (
              <div className="portal-alert positive">
                Stripe checkout completed. ACH payments can still take several
                business days to fully settle.
              </div>
            ) : null}

            <div className="portal-grid">
              <DashboardCard
                icon={<CalendarDays size={20} />}
                label="Bookings"
                value={portal?.bookings.length || 0}
              />
              <DashboardCard
                icon={<CreditCard size={20} />}
                label="Payments"
                value={portal?.payments.length || 0}
              />
              <DashboardCard
                icon={<Bell size={20} />}
                label="Notifications"
                value={portal?.notifications.length || 0}
              />
              <DashboardCard
                icon={<FileSignature size={20} />}
                label="Documents"
                value={portal?.documents.length || 0}
              />
              <DashboardCard
                icon={<Paperclip size={20} />}
                label="Files"
                value={portal?.files.length || 0}
              />
            </div>

            <section className="portal-panel">
              <div className="portal-panel-head">
                <h2>Bookings & payments</h2>
                <a href="/book.html" className="mini-action">
                  New booking
                </a>
              </div>
              {portal?.bookings.length ? (
                portal.bookings.map((booking) => (
                  <div className="portal-list-row" key={booking.id}>
                    <div>
                      <strong>{booking.service_type}</strong>
                      <span>
                        {booking.subscriber_plan || booking.rate_label} ·{" "}
                        {booking.preferred_date || "Date pending"}
                      </span>
                    </div>
                    <div>
                      <strong>{money(booking.amount_cents)}</strong>
                      <span>{booking.status} · {booking.payment_status}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty-copy">No bookings yet.</p>
              )}
            </section>

            <section className="portal-panel">
              <div className="portal-panel-head">
                <h2>Messages</h2>
                <MessageSquareText size={20} />
              </div>
              <div className="message-composer">
                <input
                  value={messageSubject}
                  onChange={(event) => setMessageSubject(event.target.value)}
                  placeholder="Subject"
                />
                <textarea
                  value={messageBody}
                  onChange={(event) => setMessageBody(event.target.value)}
                  placeholder="Ask a question, share a change, or send a note."
                />
                <button className="submit-btn" type="button" onClick={sendMessage}>
                  Send message
                  <Send size={16} />
                </button>
              </div>
              {portal?.messages.map((message) => (
                <div className="portal-list-row message-row" key={message.id}>
                  <div>
                    <strong>
                      {message.from === "admin" ? "Grace & Grind" : "You"} ·{" "}
                      {message.subject}
                    </strong>
                    <span>{message.body}</span>
                  </div>
                </div>
              ))}
            </section>

            <section className="portal-panel">
              <h2>Notifications</h2>
              {portal?.notifications.length ? (
                portal.notifications.map((notification) => (
                  <div className="portal-list-row" key={notification.id}>
                    <div>
                      <strong>{notification.title}</strong>
                      <span>{notification.body}</span>
                    </div>
                    <span className="pill">{notification.type}</span>
                  </div>
                ))
              ) : (
                <p className="empty-copy">No notifications yet.</p>
              )}
            </section>

            <section className="portal-panel">
              <div className="portal-panel-head">
                <h2>Files & photos</h2>
                <Paperclip size={20} />
              </div>
              <div className="message-composer">
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={(event) =>
                    setSelectedFiles(Array.from(event.target.files || []))
                  }
                />
                <div className="form-row-two compact-fields">
                  <select
                    value={fileCategory}
                    onChange={(event) => setFileCategory(event.target.value)}
                  >
                    <option>Service photos</option>
                    <option>Signed paperwork</option>
                    <option>Access instructions</option>
                    <option>Receipts</option>
                    <option>Other</option>
                  </select>
                  <input
                    value={fileNote}
                    onChange={(event) => setFileNote(event.target.value)}
                    placeholder="Optional note"
                  />
                </div>
                <button
                  className="submit-btn"
                  type="button"
                  disabled={uploadingFiles}
                  onClick={() => void uploadFiles()}
                >
                  {uploadingFiles ? "Uploading..." : "Upload selected files"}
                  <UploadCloud size={16} />
                </button>
              </div>
              {portal?.files.length ? (
                portal.files.map((file) => (
                  <div className="portal-list-row" key={file.id}>
                    <div>
                      <strong>{file.filename}</strong>
                      <span>
                        {file.category} · {bytesLabel(file.size)} ·{" "}
                        {file.uploaded_by === "admin" ? "Grace & Grind" : "You"}
                        {file.note ? ` · ${file.note}` : ""}
                      </span>
                    </div>
                    <a
                      className="mini-action"
                      href={`/api/files/${file.id}/download?email=${encodeURIComponent(
                        portalEmail,
                      )}`}
                    >
                      Download
                      <Download size={14} />
                    </a>
                  </div>
                ))
              ) : (
                <p className="empty-copy">No files uploaded yet.</p>
              )}
            </section>

            <section className="portal-panel">
              <h2>Documents to sign</h2>
              {portal?.documents.length ? (
                portal.documents.map((document) => (
                  <div className="document-box" key={document.id}>
                    <div className="portal-panel-head">
                      <h3>{document.title}</h3>
                      <span className="pill">{document.status}</span>
                    </div>
                    <p>{document.body}</p>
                    {document.status === "signed" ? (
                      <p className="form-note">
                        Signed by {document.signer_name} on{" "}
                        {document.signed_at
                          ? new Date(document.signed_at).toLocaleString()
                          : "file"}
                      </p>
                    ) : (
                      <div className="signature-row">
                        <input
                          value={signatures[document.id] || ""}
                          onChange={(event) =>
                            setSignatures((current) => ({
                              ...current,
                              [document.id]: event.target.value,
                            }))
                          }
                          placeholder="Type your legal name"
                        />
                        <button
                          className="submit-btn"
                          type="button"
                          onClick={() => void signDocument(document.id)}
                        >
                          Sign document
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="empty-copy">No documents waiting.</p>
              )}
            </section>
          </div>
        </section>
      </main>
      <SiteFooter locationLine />
    </>
  );
}

function DashboardCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="dashboard-card">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
