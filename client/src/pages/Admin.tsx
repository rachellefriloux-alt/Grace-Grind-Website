import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  BellRing,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Download,
  FilePlus2,
  Inbox,
  MessageSquareReply,
  Paperclip,
  UploadCloud,
  UsersRound,
} from "lucide-react";

type ClientRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  preferred_contact: string;
};

type BookingRecord = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  service_type: string;
  subscriber_plan: string;
  preferred_date: string;
  preferred_time: string;
  hours: number;
  rate_label: string;
  amount_cents: number | null;
  status: string;
  payment_status: string;
  notes: string;
};

type MessageRecord = {
  id: string;
  created_at: string;
  client_email: string;
  from: "client" | "admin";
  subject: string;
  body: string;
};

type NotificationRecord = {
  id: string;
  created_at: string;
  client_email: string;
  title: string;
  body: string;
  type: string;
};

type DocumentRecord = {
  id: string;
  created_at: string;
  client_email: string;
  title: string;
  body: string;
  status: "needs_signature" | "signed";
  signed_at?: string;
  signer_name?: string;
};

type PaymentRecord = {
  id: string;
  created_at: string;
  client_email: string;
  amount_cents: number;
  mode: "payment" | "subscription";
  status: string;
  checkout_url?: string;
};

type FileRecord = {
  id: string;
  created_at: string;
  client_email: string;
  filename: string;
  mime_type: string;
  size: number;
  category: string;
  note: string;
  uploaded_by: "client" | "admin";
};

type AdminData = {
  clients: ClientRecord[];
  bookings: BookingRecord[];
  messages: MessageRecord[];
  notifications: NotificationRecord[];
  documents: DocumentRecord[];
  payments: PaymentRecord[];
  files: FileRecord[];
  stripe_configured: boolean;
};

function money(cents: number | null) {
  if (!cents) return "Manual quote";
  return `$${(cents / 100).toFixed(2)}`;
}

function todayKey() {
  return new Date().toISOString().split("T")[0];
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

export default function Admin() {
  const [adminCode, setAdminCode] = useState(
    sessionStorage.getItem("grace_admin_code") || "",
  );
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [reply, setReply] = useState({
    email: "",
    subject: "Grace & Grind update",
    body: "",
  });
  const [doc, setDoc] = useState({
    email: "",
    title: "Grace & Grind Service Agreement",
    body:
      "I understand Grace & Grind will confirm scope, timing, access instructions, and payment before service begins.",
  });
  const [notice, setNotice] = useState({
    email: "",
    title: "Schedule update",
    body: "",
  });
  const [fileUpload, setFileUpload] = useState({
    email: "",
    category: "Client file",
    note: "",
  });
  const [adminFiles, setAdminFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const calendarGroups = useMemo(() => {
    const groups = new Map<string, BookingRecord[]>();
    for (const booking of data?.bookings || []) {
      const key = booking.preferred_date || "Unscheduled";
      groups.set(key, [...(groups.get(key) || []), booking]);
    }

    return Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === "Unscheduled") return 1;
      if (b === "Unscheduled") return -1;
      return a.localeCompare(b);
    });
  }, [data?.bookings]);

  const loadAdmin = async (code = adminCode) => {
    setError("");
    setStatus("Loading admin desk...");
    const response = await fetch("/api/admin/overview", {
      headers: { "x-admin-code": code },
    });
    const nextData = (await response.json()) as AdminData & { error?: string };

    if (!response.ok) {
      setData(null);
      setStatus("");
      setError(nextData.error || "Unable to open admin.");
      return;
    }

    sessionStorage.setItem("grace_admin_code", code);
    setData(nextData);
    setStatus("");
  };

  useEffect(() => {
    if (adminCode) {
      void loadAdmin(adminCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void loadAdmin(adminCode);
  };

  const updateBooking = async (
    booking: BookingRecord,
    statusValue: string,
    paymentStatus = booking.payment_status,
  ) => {
    const response = await fetch(`/api/admin/bookings/${booking.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-code": adminCode,
      },
      body: JSON.stringify({
        status: statusValue,
        payment_status: paymentStatus,
      }),
    });
    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(result.error || "Unable to update booking.");
      return;
    }

    await loadAdmin(adminCode);
  };

  const postAdminAction = async (
    endpoint: string,
    payload: Record<string, string>,
    successMessage: string,
  ) => {
    setError("");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-code": adminCode,
      },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(result.error || "Action failed.");
      return;
    }

    setStatus(successMessage);
    await loadAdmin(adminCode);
  };

  const uploadAdminFiles = async () => {
    if (!fileUpload.email.trim()) {
      setError("Enter a client email before uploading files.");
      return;
    }

    if (!adminFiles.length) {
      setError("Choose at least one file to upload.");
      return;
    }

    setError("");
    setStatus("Uploading files...");
    setUploadingFiles(true);

    try {
      for (const file of adminFiles) {
        const dataUrl = await readFileAsDataUrl(file);
        const response = await fetch("/api/files/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-code": adminCode,
          },
          body: JSON.stringify({
            uploaded_by: "admin",
            email: fileUpload.email,
            category: fileUpload.category,
            note: fileUpload.note,
            filename: file.name,
            mime_type: file.type || "application/octet-stream",
            data_url: dataUrl,
          }),
        });
        const result = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(result.error || "Unable to upload file.");
        }
      }

      setAdminFiles([]);
      setFileUpload((current) => ({ ...current, note: "" }));
      await loadAdmin(adminCode);
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

  const downloadAdminFile = async (file: FileRecord) => {
    const response = await fetch(`/api/files/${file.id}/download`, {
      headers: { "x-admin-code": adminCode },
    });

    if (!response.ok) {
      setError("Unable to download file.");
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <SiteHeader active="admin" />
      <main className="admin-page">
        <section className="page-header">
          <div className="page-header-inner">
            <div className="badge">Grace&amp;Grind Admin</div>
            <h1>Business command center</h1>
            <p>
              Manage bookings, clients, Stripe payment status, subscriptions,
              messages, notifications, documents, and the service calendar.
            </p>
          </div>
        </section>

        <section className="admin-shell">
          <form className="admin-login" onSubmit={submitLogin}>
            <label htmlFor="admin-code">Admin access code</label>
            <div className="admin-login-row">
              <input
                id="admin-code"
                type="password"
                value={adminCode}
                onChange={(event) => setAdminCode(event.target.value)}
                placeholder="Enter admin code"
              />
              <button className="submit-btn" type="submit">
                Open admin
              </button>
            </div>
            <p className="form-note">
              Default local code is grace-admin. Set ADMIN_ACCESS_CODE before
              public hosting.
            </p>
          </form>

          <div className={`error-msg ${error ? "show" : ""}`}>{error}</div>
          {status ? <p className="portal-alert positive">{status}</p> : null}

          {data ? (
            <>
              <div className="portal-grid">
                <AdminMetric icon={<UsersRound size={20} />} label="Clients" value={data.clients.length} />
                <AdminMetric icon={<CalendarDays size={20} />} label="Bookings" value={data.bookings.length} />
                <AdminMetric icon={<CreditCard size={20} />} label="Payments" value={data.payments.length} />
                <AdminMetric icon={<FilePlus2 size={20} />} label="Documents" value={data.documents.length} />
                <AdminMetric icon={<Paperclip size={20} />} label="Files" value={data.files.length} />
              </div>

              <div className="portal-alert">
                Stripe Checkout is{" "}
                <strong>{data.stripe_configured ? "configured" : "not configured"}</strong>.
                ACH, cards, Apple Pay, and Google Pay are handled on Stripe-hosted
                payment pages after STRIPE_SECRET_KEY is set.
              </div>

              <section className="admin-panel">
                <div className="portal-panel-head">
                  <h2>Booking calendar</h2>
                  <span className="pill">{todayKey()}</span>
                </div>
                <div className="calendar-grid">
                  {calendarGroups.length ? (
                    calendarGroups.map(([date, bookings]) => (
                      <div className="calendar-day" key={date}>
                        <h3>{date}</h3>
                        {bookings.map((booking) => (
                          <div className="calendar-item" key={booking.id}>
                            <strong>{booking.preferred_time || "Any time"}</strong>
                            <span>{booking.service_type}</span>
                            <span>{booking.name}</span>
                          </div>
                        ))}
                      </div>
                    ))
                  ) : (
                    <p className="empty-copy">No bookings on calendar yet.</p>
                  )}
                </div>
              </section>

              <section className="admin-panel">
                <h2>Bookings</h2>
                <div className="admin-table">
                  {data.bookings.map((booking) => (
                    <div className="admin-row" key={booking.id}>
                      <div>
                        <strong>{booking.name}</strong>
                        <span>{booking.email || booking.phone}</span>
                      </div>
                      <div>
                        <strong>{booking.service_type}</strong>
                        <span>
                          {booking.subscriber_plan || booking.rate_label} ·{" "}
                          {money(booking.amount_cents)}
                        </span>
                      </div>
                      <div>
                        <strong>{booking.preferred_date || "Date pending"}</strong>
                        <span>{booking.preferred_time || "Any time"}</span>
                      </div>
                      <div>
                        <strong>{booking.status}</strong>
                        <span>{booking.payment_status}</span>
                      </div>
                      <div className="row-actions">
                        <button onClick={() => void updateBooking(booking, "confirmed")}>
                          Confirm
                        </button>
                        <button onClick={() => void updateBooking(booking, "completed", "paid")}>
                          Paid
                        </button>
                        <button onClick={() => void updateBooking(booking, "cancelled")}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="admin-columns">
                <div className="admin-panel">
                  <div className="portal-panel-head">
                    <h2>Messages</h2>
                    <Inbox size={20} />
                  </div>
                  {data.messages.slice(0, 8).map((message) => (
                    <div className="portal-list-row message-row" key={message.id}>
                      <div>
                        <strong>
                          {message.client_email} · {message.subject}
                        </strong>
                        <span>{message.body}</span>
                      </div>
                    </div>
                  ))}
                  <div className="message-composer">
                    <input
                      value={reply.email}
                      onChange={(event) =>
                        setReply((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      placeholder="client@email.com"
                    />
                    <input
                      value={reply.subject}
                      onChange={(event) =>
                        setReply((current) => ({
                          ...current,
                          subject: event.target.value,
                        }))
                      }
                      placeholder="Subject"
                    />
                    <textarea
                      value={reply.body}
                      onChange={(event) =>
                        setReply((current) => ({
                          ...current,
                          body: event.target.value,
                        }))
                      }
                      placeholder="Reply to client"
                    />
                    <button
                      className="submit-btn"
                      type="button"
                      onClick={() =>
                        void postAdminAction(
                          "/api/admin/messages/reply",
                          reply,
                          "Reply sent.",
                        )
                      }
                    >
                      Reply
                      <MessageSquareReply size={16} />
                    </button>
                  </div>
                </div>

                <div className="admin-panel">
                  <div className="portal-panel-head">
                    <h2>Documents</h2>
                    <FilePlus2 size={20} />
                  </div>
                  {data.documents.slice(0, 8).map((document) => (
                    <div className="portal-list-row" key={document.id}>
                      <div>
                        <strong>{document.title}</strong>
                        <span>
                          {document.client_email} · {document.status}
                        </span>
                      </div>
                      {document.status === "signed" ? (
                        <CheckCircle2 size={18} />
                      ) : null}
                    </div>
                  ))}
                  <div className="message-composer">
                    <input
                      value={doc.email}
                      onChange={(event) =>
                        setDoc((current) => ({ ...current, email: event.target.value }))
                      }
                      placeholder="client@email.com"
                    />
                    <input
                      value={doc.title}
                      onChange={(event) =>
                        setDoc((current) => ({ ...current, title: event.target.value }))
                      }
                      placeholder="Document title"
                    />
                    <textarea
                      value={doc.body}
                      onChange={(event) =>
                        setDoc((current) => ({ ...current, body: event.target.value }))
                      }
                      placeholder="Document terms"
                    />
                    <button
                      className="submit-btn"
                      type="button"
                      onClick={() =>
                        void postAdminAction(
                          "/api/admin/documents",
                          doc,
                          "Document sent for signature.",
                        )
                      }
                    >
                      Send document
                    </button>
                  </div>
                </div>

                <div className="admin-panel">
                  <div className="portal-panel-head">
                    <h2>Files</h2>
                    <Paperclip size={20} />
                  </div>
                  {data.files.slice(0, 8).map((file) => (
                    <div className="portal-list-row" key={file.id}>
                      <div>
                        <strong>{file.filename}</strong>
                        <span>
                          {file.client_email} · {file.category} ·{" "}
                          {bytesLabel(file.size)} · {file.uploaded_by}
                          {file.note ? ` · ${file.note}` : ""}
                        </span>
                      </div>
                      <button
                        className="mini-action"
                        type="button"
                        onClick={() => void downloadAdminFile(file)}
                      >
                        Download
                        <Download size={14} />
                      </button>
                    </div>
                  ))}
                  <div className="message-composer">
                    <input
                      value={fileUpload.email}
                      onChange={(event) =>
                        setFileUpload((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      placeholder="client@email.com"
                    />
                    <input
                      value={fileUpload.category}
                      onChange={(event) =>
                        setFileUpload((current) => ({
                          ...current,
                          category: event.target.value,
                        }))
                      }
                      placeholder="File category"
                    />
                    <input
                      value={fileUpload.note}
                      onChange={(event) =>
                        setFileUpload((current) => ({
                          ...current,
                          note: event.target.value,
                        }))
                      }
                      placeholder="Optional note"
                    />
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.txt"
                      onChange={(event) =>
                        setAdminFiles(Array.from(event.target.files || []))
                      }
                    />
                    <button
                      className="submit-btn"
                      type="button"
                      disabled={uploadingFiles}
                      onClick={() => void uploadAdminFiles()}
                    >
                      {uploadingFiles ? "Uploading..." : "Upload files"}
                      <UploadCloud size={16} />
                    </button>
                  </div>
                </div>
              </section>

              <section className="admin-columns">
                <div className="admin-panel">
                  <div className="portal-panel-head">
                    <h2>Notifications</h2>
                    <BellRing size={20} />
                  </div>
                  {data.notifications.slice(0, 8).map((notification) => (
                    <div className="portal-list-row" key={notification.id}>
                      <div>
                        <strong>{notification.title}</strong>
                        <span>
                          {notification.client_email} · {notification.body}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="message-composer">
                    <input
                      value={notice.email}
                      onChange={(event) =>
                        setNotice((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      placeholder="client@email.com"
                    />
                    <input
                      value={notice.title}
                      onChange={(event) =>
                        setNotice((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      placeholder="Notification title"
                    />
                    <textarea
                      value={notice.body}
                      onChange={(event) =>
                        setNotice((current) => ({
                          ...current,
                          body: event.target.value,
                        }))
                      }
                      placeholder="Notification body"
                    />
                    <button
                      className="submit-btn"
                      type="button"
                      onClick={() =>
                        void postAdminAction(
                          "/api/admin/notifications",
                          notice,
                          "Notification sent.",
                        )
                      }
                    >
                      Send notification
                    </button>
                  </div>
                </div>

                <div className="admin-panel">
                  <h2>Clients</h2>
                  {data.clients.map((client) => (
                    <div className="portal-list-row" key={client.id}>
                      <div>
                        <strong>{client.name}</strong>
                        <span>
                          {client.email} · {client.phone || "No phone"} ·{" "}
                          {client.preferred_contact}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : null}
        </section>
      </main>
      <SiteFooter locationLine />
    </>
  );
}

function AdminMetric({
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
