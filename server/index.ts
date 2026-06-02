import express from "express";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Stripe from "stripe";
import {
  formatDollars,
  getServiceByName,
  getSubscriberPlanByName,
  serviceCategories,
  subscriberPlans,
} from "../shared/business";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "..", "data");
const storeFile =
  process.env.PORTAL_STORE_FILE || path.resolve(dataDir, "portal-store.json");
const legacyBookingFile =
  process.env.BOOKINGS_FILE || path.resolve(dataDir, "bookings.jsonl");
const uploadsDir = process.env.UPLOADS_DIR || path.resolve(dataDir, "uploads");
const maxUploadBytes = 8 * 1024 * 1024;

type ClientRecord = {
  id: string;
  created_at: string;
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
  client_email: string;
  name: string;
  email: string;
  phone: string;
  service_type: string;
  subscriber_plan: string;
  preferred_date: string;
  preferred_time: string;
  hours: number;
  notes: string;
  payment_preference: string;
  rate_label: string;
  amount_cents: number | null;
  status: string;
  payment_status: string;
};

type MessageRecord = {
  id: string;
  created_at: string;
  client_email: string;
  from: "client" | "admin";
  subject: string;
  body: string;
  read_by_admin?: boolean;
  read_by_client?: boolean;
};

type NotificationRecord = {
  id: string;
  created_at: string;
  client_email: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
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
  booking_id?: string;
  stripe_session_id?: string;
  checkout_url?: string;
  amount_cents: number;
  mode: "payment" | "subscription";
  status: string;
};

type FileRecord = {
  id: string;
  created_at: string;
  client_email: string;
  uploaded_by: "client" | "admin";
  filename: string;
  stored_name: string;
  mime_type: string;
  size: number;
  category: string;
  note: string;
};

type Store = {
  clients: ClientRecord[];
  bookings: BookingRecord[];
  messages: MessageRecord[];
  notifications: NotificationRecord[];
  documents: DocumentRecord[];
  payments: PaymentRecord[];
  files: FileRecord[];
};

type BookingRequest = {
  name?: string;
  email?: string;
  phone?: string;
  service_type?: string;
  subscriber_plan?: string;
  preferred_date?: string;
  preferred_time?: string;
  hours?: number | string;
  notes?: string;
  payment_preference?: string;
};

type ClientRequest = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  preferred_contact?: string;
  notes?: string;
};

const emptyStore: Store = {
  clients: [],
  bookings: [],
  messages: [],
  notifications: [],
  documents: [],
  payments: [],
  files: [],
};

async function loadLocalEnv() {
  const envPath = path.resolve(__dirname, "..", ".env.local");

  try {
    const contents = await fs.readFile(envPath, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (!key || process.env[key]) continue;
      process.env[key] = rawValue.replace(/^["']|["']$/g, "");
    }
  } catch {
    // Local env file is optional; production hosts normally set env vars.
  }
}

function cleanText(value: unknown, maxLength = 2000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanEmail(value: unknown) {
  return cleanText(value, 320).toLowerCase();
}

function cleanHours(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.min(24, Math.round(parsed * 4) / 4));
}

function sanitizeFileName(value: unknown) {
  const fallback = "upload";
  const raw = cleanText(value, 180) || fallback;
  const base = path.basename(raw).replace(/[^a-z0-9._ -]/gi, "_").trim();
  return base || fallback;
}

function extensionForFile(filename: string, mimeType: string) {
  const ext = path.extname(filename).toLowerCase().replace(/[^.a-z0-9]/g, "");
  if (ext) return ext.slice(0, 12);

  const byMime: Record<string, string> = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "text/plain": ".txt",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      ".docx",
  };

  return byMime[mimeType] || ".bin";
}

function decodeUpload(body: Record<string, unknown>) {
  const dataUrl = cleanText(body.data_url, maxUploadBytes * 2);
  const contentBase64 = cleanText(body.content_base64, maxUploadBytes * 2);
  let mimeType = cleanText(body.mime_type, 120) || "application/octet-stream";
  let base64 = contentBase64;

  if (dataUrl) {
    const match = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
    if (!match) return { error: "Upload data was not a valid file." };
    mimeType = match[1] || mimeType;
    base64 = match[2] || "";
  }

  if (!base64) return { error: "Choose a file to upload." };

  const buffer = Buffer.from(base64, "base64");
  if (!buffer.length) return { error: "The uploaded file was empty." };
  if (buffer.length > maxUploadBytes) {
    return { error: "Files must be 8 MB or smaller." };
  }

  return { buffer, mimeType };
}

async function readStore(): Promise<Store> {
  try {
    const contents = await fs.readFile(storeFile, "utf8");
    return { ...emptyStore, ...JSON.parse(contents) } as Store;
  } catch {
    return structuredClone(emptyStore);
  }
}

async function writeStore(store: Store) {
  await fs.mkdir(path.dirname(storeFile), { recursive: true });
  await fs.writeFile(storeFile, JSON.stringify(store, null, 2), "utf8");
}

function getBaseUrl(req: express.Request) {
  const configured = process.env.PUBLIC_BASE_URL || process.env.BASE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  return `${protocol}://${req.get("host")}`;
}

function getStripeClient() {
  const apiKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY;
  if (!apiKey) return null;
  return new Stripe(apiKey);
}

function getAdminCode() {
  return process.env.ADMIN_ACCESS_CODE || "grace-admin";
}

function requireAdmin(req: express.Request, res: express.Response) {
  const provided =
    req.headers["x-admin-code"] ||
    req.query.code ||
    (req.body && (req.body.admin_code as string));

  if (provided !== getAdminCode()) {
    res.status(401).json({ error: "Admin access code is required." });
    return false;
  }

  return true;
}

function upsertClient(store: Store, input: ClientRequest) {
  const email = cleanEmail(input.email);
  const existing = store.clients.find((client) => client.email === email);
  const record: ClientRecord = {
    id: existing?.id || randomUUID(),
    created_at: existing?.created_at || new Date().toISOString(),
    name: cleanText(input.name, 160),
    email,
    phone: cleanText(input.phone, 80),
    address: cleanText(input.address, 500),
    preferred_contact: cleanText(input.preferred_contact, 80) || "Email",
    notes: cleanText(input.notes),
  };

  if (existing) {
    Object.assign(existing, record);
    return existing;
  }

  store.clients.push(record);
  return record;
}

function addNotification(
  store: Store,
  client_email: string,
  title: string,
  body: string,
  type = "update",
) {
  const notification: NotificationRecord = {
    id: randomUUID(),
    created_at: new Date().toISOString(),
    client_email,
    title,
    body,
    type,
    read: false,
  };
  store.notifications.unshift(notification);
  return notification;
}

function calculateBookingAmount(booking: BookingRequest) {
  const service = getServiceByName(cleanText(booking.service_type));
  const plan = getSubscriberPlanByName(cleanText(booking.subscriber_plan));
  const hours = cleanHours(booking.hours);

  if (plan) {
    return {
      rate_label: plan.priceLabel,
      amount_cents: plan.amountCents,
      hours,
    };
  }

  if (!service || service.amountCents === null) {
    return {
      rate_label: service?.rateLabel || "Custom",
      amount_cents: null,
      hours,
    };
  }

  return {
    rate_label: service.rateLabel,
    amount_cents: Math.round(service.amountCents * hours),
    hours,
  };
}

async function createCheckoutForBooking(
  req: express.Request,
  booking: BookingRecord,
) {
  const stripe = getStripeClient();
  if (!stripe) {
    return {
      error:
        "Stripe is not configured yet. Add STRIPE_SECRET_KEY to .env.local or your hosting environment.",
    };
  }

  const plan = getSubscriberPlanByName(booking.subscriber_plan);
  const mode: "payment" | "subscription" = plan ? "subscription" : "payment";
  const amount = plan?.amountCents || booking.amount_cents;

  if (!amount) {
    return { error: "This custom booking needs a manual quote before payment." };
  }

  const baseUrl = getBaseUrl(req);
  const productName = plan
    ? `Grace & Grind ${plan.name}`
    : `Grace & Grind ${booking.service_type}`;

  const session = await stripe.checkout.sessions.create({
    mode,
    payment_method_types: ["card", "us_bank_account"],
    customer_email: booking.email,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: productName,
            description: booking.preferred_date
              ? `${booking.preferred_date} ${booking.preferred_time}`.trim()
              : "Grace & Grind service",
          },
          unit_amount: amount,
          ...(plan
            ? {
                recurring: {
                  interval: plan.interval,
                },
              }
            : {}),
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/portal?email=${encodeURIComponent(
      booking.email,
    )}&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/book.html?checkout=cancelled`,
    metadata: {
      booking_id: booking.id,
      client_email: booking.email,
      service_type: booking.service_type,
      subscriber_plan: booking.subscriber_plan,
    },
  });

  return {
    session,
    mode,
    amount,
  };
}

async function startServer() {
  await loadLocalEnv();

  const app = express();
  const server = createServer(app);
  const staticPath = path.resolve(__dirname, "public");

  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const stripe = getStripeClient();
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!stripe || !endpointSecret) {
        return res.status(200).json({ received: true, configured: false });
      }

      const signature = req.headers["stripe-signature"];
      if (!signature) {
        return res.status(400).send("Missing Stripe signature.");
      }

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          endpointSecret,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Webhook verification failed.";
        return res.status(400).send(message);
      }

      const store = await readStore();
      if (
        event.type === "checkout.session.completed" ||
        event.type === "checkout.session.async_payment_succeeded" ||
        event.type === "checkout.session.async_payment_failed"
      ) {
        const session = event.data.object as Stripe.Checkout.Session;
        const payment = store.payments.find(
          (item) => item.stripe_session_id === session.id,
        );
        const booking = store.bookings.find(
          (item) => item.id === session.metadata?.booking_id,
        );
        const status =
          event.type === "checkout.session.async_payment_failed"
            ? "failed"
            : event.type === "checkout.session.async_payment_succeeded"
              ? "paid"
              : "completed";

        if (payment) payment.status = status;
        if (booking) {
          booking.payment_status = status;
          addNotification(
            store,
            booking.email,
            "Payment update",
            `Stripe marked ${booking.service_type} as ${status}.`,
            "payment",
          );
        }
        await writeStore(store);
      }

      res.json({ received: true });
    },
  );

  app.use(express.json({ limit: "128kb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "healthy" });
  });

  app.get("/api/catalog", (_req, res) => {
    res.json({ serviceCategories, subscriberPlans });
  });

  app.post(
    "/api/files/upload",
    express.json({ limit: "12mb" }),
    async (req, res) => {
      const body = req.body as Record<string, unknown>;
      const uploadedBy = body.uploaded_by === "admin" ? "admin" : "client";

      if (uploadedBy === "admin" && !requireAdmin(req, res)) return;

      const email = cleanEmail(body.email);
      if (!email) {
        return res.status(400).json({ error: "Client email is required." });
      }

      const decoded = decodeUpload(body);
      if ("error" in decoded) {
        return res.status(400).json(decoded);
      }

      const filename = sanitizeFileName(body.filename);
      const id = randomUUID();
      const storedName = `${id}${extensionForFile(filename, decoded.mimeType)}`;
      const diskPath = path.resolve(uploadsDir, storedName);

      await fs.mkdir(uploadsDir, { recursive: true });
      await fs.writeFile(diskPath, decoded.buffer);

      const store = await readStore();
      const record: FileRecord = {
        id,
        created_at: new Date().toISOString(),
        client_email: email,
        uploaded_by: uploadedBy,
        filename,
        stored_name: storedName,
        mime_type: decoded.mimeType,
        size: decoded.buffer.length,
        category: cleanText(body.category, 80) || "General",
        note: cleanText(body.note, 1000),
      };

      store.files.unshift(record);
      addNotification(
        store,
        email,
        uploadedBy === "admin" ? "New file added" : "File received",
        uploadedBy === "admin"
          ? `${filename} was added to your portal.`
          : `${filename} was uploaded to your Grace & Grind portal.`,
        "file",
      );
      await writeStore(store);

      res.status(201).json({ success: true, file: record });
    },
  );

  app.get("/api/files/:id/download", async (req, res) => {
    const store = await readStore();
    const file = store.files.find((item) => item.id === req.params.id);

    if (!file) {
      return res.status(404).json({ error: "File was not found." });
    }

    const requesterEmail = cleanEmail(req.query.email);
    const adminAllowed =
      req.headers["x-admin-code"] === getAdminCode() ||
      req.query.code === getAdminCode();

    if (!adminAllowed && requesterEmail !== file.client_email) {
      return res.status(403).json({ error: "File access denied." });
    }

    const diskPath = path.resolve(uploadsDir, file.stored_name);
    if (!diskPath.startsWith(path.resolve(uploadsDir))) {
      return res.status(400).json({ error: "Invalid file path." });
    }

    res.download(diskPath, file.filename);
  });

  app.post("/api/clients/signup", async (req, res) => {
    const store = await readStore();
    const client = upsertClient(store, req.body as ClientRequest);

    if (!client.name) {
      return res.status(400).json({ error: "Please enter your name." });
    }

    if (!client.email) {
      return res.status(400).json({ error: "Please enter your email." });
    }

    addNotification(
      store,
      client.email,
      "Welcome to Grace & Grind",
      "Your client portal is ready. You can request services, sign documents, and message Grace & Grind from here.",
      "welcome",
    );
    await writeStore(store);
    res.status(201).json({ success: true, client });
  });

  app.get("/api/portal", async (req, res) => {
    const email = cleanEmail(req.query.email);
    const store = await readStore();

    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const client = store.clients.find((item) => item.email === email) || null;
    res.json({
      client,
      bookings: store.bookings.filter((item) => item.email === email),
      messages: store.messages.filter((item) => item.client_email === email),
      notifications: store.notifications.filter(
        (item) => item.client_email === email,
      ),
      documents: store.documents.filter((item) => item.client_email === email),
      payments: store.payments.filter((item) => item.client_email === email),
      files: store.files.filter((item) => item.client_email === email),
    });
  });

  app.post("/api/bookings", async (req, res) => {
    const body = req.body as BookingRequest;
    const email = cleanEmail(body.email);
    const amount = calculateBookingAmount(body);
    const booking: BookingRecord = {
      id: randomUUID(),
      created_at: new Date().toISOString(),
      client_email: email,
      name: cleanText(body.name, 160),
      email,
      phone: cleanText(body.phone, 80),
      service_type: cleanText(body.service_type),
      subscriber_plan: cleanText(body.subscriber_plan),
      preferred_date: cleanText(body.preferred_date, 80),
      preferred_time: cleanText(body.preferred_time, 80),
      hours: amount.hours,
      notes: cleanText(body.notes),
      payment_preference: cleanText(body.payment_preference, 80) || "Discuss first",
      rate_label: amount.rate_label,
      amount_cents: amount.amount_cents,
      status: "requested",
      payment_status: amount.amount_cents ? "unpaid" : "quote_needed",
    };

    if (!booking.name) {
      return res.status(400).json({ error: "Please enter your name." });
    }

    if (!booking.service_type) {
      return res.status(400).json({ error: "Please select a service." });
    }

    if (!booking.email && !booking.phone) {
      return res
        .status(400)
        .json({ error: "Please include an email or phone number." });
    }

    const store = await readStore();
    if (booking.email) {
      upsertClient(store, {
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
      });
      addNotification(
        store,
        booking.email,
        "Booking request received",
        `${booking.service_type} is saved at ${booking.rate_label}. Grace & Grind will confirm details before service.`,
        "booking",
      );
    }
    store.bookings.unshift(booking);

    await fs.mkdir(path.dirname(legacyBookingFile), { recursive: true });
    await fs.appendFile(
      legacyBookingFile,
      `${JSON.stringify(booking)}\n`,
      "utf8",
    );
    await writeStore(store);

    res.status(201).json({ success: true, booking });
  });

  app.post("/api/payments/checkout", async (req, res) => {
    const bookingId = cleanText(req.body?.booking_id, 160);
    const store = await readStore();
    const booking = store.bookings.find((item) => item.id === bookingId);

    if (!booking) {
      return res.status(404).json({ error: "Booking was not found." });
    }

    try {
      const checkout = await createCheckoutForBooking(req, booking);

      if ("error" in checkout) {
        return res.status(503).json(checkout);
      }

      const payment: PaymentRecord = {
        id: randomUUID(),
        created_at: new Date().toISOString(),
        client_email: booking.email,
        booking_id: booking.id,
        stripe_session_id: checkout.session.id,
        checkout_url: checkout.session.url || undefined,
        amount_cents: checkout.amount,
        mode: checkout.mode,
        status: "created",
      };

      booking.payment_status = "checkout_created";
      store.payments.unshift(payment);
      await writeStore(store);
      res.json({ success: true, url: checkout.session.url, payment });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create checkout.";
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/messages", async (req, res) => {
    const email = cleanEmail(req.body?.email);
    const message: MessageRecord = {
      id: randomUUID(),
      created_at: new Date().toISOString(),
      client_email: email,
      from: "client",
      subject: cleanText(req.body?.subject, 180) || "Client message",
      body: cleanText(req.body?.body),
      read_by_admin: false,
      read_by_client: true,
    };

    if (!email || !message.body) {
      return res.status(400).json({ error: "Email and message are required." });
    }

    const store = await readStore();
    store.messages.unshift(message);
    await writeStore(store);
    res.status(201).json({ success: true, message });
  });

  app.post("/api/documents/:id/sign", async (req, res) => {
    const signerName = cleanText(req.body?.signer_name, 160);
    const store = await readStore();
    const document = store.documents.find((item) => item.id === req.params.id);

    if (!document) {
      return res.status(404).json({ error: "Document was not found." });
    }

    if (!signerName) {
      return res.status(400).json({ error: "Signer name is required." });
    }

    document.status = "signed";
    document.signer_name = signerName;
    document.signed_at = new Date().toISOString();
    addNotification(
      store,
      document.client_email,
      "Document signed",
      `${document.title} was signed by ${signerName}.`,
      "document",
    );
    await writeStore(store);
    res.json({ success: true, document });
  });

  app.get("/api/admin/overview", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const store = await readStore();
    res.json({
      ...store,
      catalog: { serviceCategories, subscriberPlans },
      stripe_configured: Boolean(getStripeClient()),
    });
  });

  app.patch("/api/admin/bookings/:id", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const store = await readStore();
    const booking = store.bookings.find((item) => item.id === req.params.id);

    if (!booking) {
      return res.status(404).json({ error: "Booking was not found." });
    }

    booking.status = cleanText(req.body?.status, 80) || booking.status;
    booking.payment_status =
      cleanText(req.body?.payment_status, 80) || booking.payment_status;

    if (booking.email) {
      addNotification(
        store,
        booking.email,
        "Booking updated",
        `${booking.service_type} is now marked ${booking.status}.`,
        "booking",
      );
    }

    await writeStore(store);
    res.json({ success: true, booking });
  });

  app.post("/api/admin/messages/reply", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const email = cleanEmail(req.body?.email);
    const message: MessageRecord = {
      id: randomUUID(),
      created_at: new Date().toISOString(),
      client_email: email,
      from: "admin",
      subject: cleanText(req.body?.subject, 180) || "Grace & Grind reply",
      body: cleanText(req.body?.body),
      read_by_admin: true,
      read_by_client: false,
    };

    if (!email || !message.body) {
      return res.status(400).json({ error: "Email and reply are required." });
    }

    const store = await readStore();
    store.messages.unshift(message);
    addNotification(store, email, "New message", message.subject, "message");
    await writeStore(store);
    res.status(201).json({ success: true, message });
  });

  app.post("/api/admin/documents", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const email = cleanEmail(req.body?.email);
    const document: DocumentRecord = {
      id: randomUUID(),
      created_at: new Date().toISOString(),
      client_email: email,
      title: cleanText(req.body?.title, 180),
      body: cleanText(req.body?.body, 10000),
      status: "needs_signature",
    };

    if (!email || !document.title || !document.body) {
      return res
        .status(400)
        .json({ error: "Client email, title, and document body are required." });
    }

    const store = await readStore();
    store.documents.unshift(document);
    addNotification(
      store,
      email,
      "Document ready to sign",
      `${document.title} is ready in your client portal.`,
      "document",
    );
    await writeStore(store);
    res.status(201).json({ success: true, document });
  });

  app.post("/api/admin/notifications", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const email = cleanEmail(req.body?.email);
    const title = cleanText(req.body?.title, 180);
    const body = cleanText(req.body?.body);

    if (!email || !title || !body) {
      return res
        .status(400)
        .json({ error: "Client email, title, and body are required." });
    }

    const store = await readStore();
    const notification = addNotification(store, email, title, body, "admin");
    await writeStore(store);
    res.status(201).json({ success: true, notification });
  });

  app.use(express.static(staticPath));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`Grace & Grind website running on http://localhost:${port}/`);
  });
}

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
