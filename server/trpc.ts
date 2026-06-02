/**
 * Grace & Grind — tRPC router
 *
 * Provides type-safe API procedures that mirror the existing REST endpoints.
 * The router is mounted at /trpc in server/index.ts via the Express adapter.
 *
 * All procedures that touch the database receive a Prisma client instance
 * through tRPC context so they can be tested in isolation.
 */

import { PrismaClient } from "@prisma/client";
import { initTRPC, TRPCError } from "@trpc/server";
import * as trpcExpress from "@trpc/server/adapters/express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  getServiceByName,
  getSubscriberPlanByName,
  serviceCategories,
  subscriberPlans,
} from "../shared/business";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export type TrpcContext = {
  prisma: PrismaClient;
  adminCode: string;
  /** Raw Express request — used for base-URL detection and admin header checks */
  req: trpcExpress.CreateExpressContextOptions["req"];
};

export function createTrpcContext(
  prisma: PrismaClient,
  adminCode: string,
): trpcExpress.CreateExpressContextFn<typeof router> {
  return ({ req }) => ({ prisma, adminCode, req });
}

// ---------------------------------------------------------------------------
// tRPC initialisation
// ---------------------------------------------------------------------------

const t = initTRPC.context<TrpcContext>().create();

const publicProcedure = t.procedure;

/** Middleware that validates the x-admin-code header or query param */
const adminMiddleware = t.middleware(({ ctx, next }) => {
  const provided =
    ctx.req.headers["x-admin-code"] ||
    (ctx.req.query as Record<string, string>)["code"];

  if (provided !== ctx.adminCode) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Admin access code is required.",
    });
  }

  return next({ ctx });
});

const adminProcedure = t.procedure.use(adminMiddleware);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cleanText(value: unknown, maxLength = 2000): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanEmail(value: unknown): string {
  return cleanText(value, 320).toLowerCase();
}

function cleanHours(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.min(24, Math.round(parsed * 4) / 4));
}

function calculateBookingAmount(input: {
  service_type?: string;
  subscriber_plan?: string;
  hours?: number | string;
}) {
  const service = getServiceByName(cleanText(input.service_type));
  const plan = getSubscriberPlanByName(cleanText(input.subscriber_plan));
  const hours = cleanHours(input.hours);

  if (plan) {
    return { rate_label: plan.priceLabel, amount_cents: plan.amountCents, hours };
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

function getBaseUrl(req: TrpcContext["req"]): string {
  const configured = process.env.PUBLIC_BASE_URL || process.env.BASE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const protocol =
    (req.headers["x-forwarded-proto"] as string) || req.protocol || "http";
  return `${protocol}://${req.get("host")}`;
}

// ---------------------------------------------------------------------------
// Zod schemas (reused across procedures)
// ---------------------------------------------------------------------------

const clientEmailSchema = z.string().email("A valid email is required.");

const clientInputSchema = z.object({
  name: z.string().min(1, "Name is required.").max(160),
  email: clientEmailSchema,
  phone: z.string().max(80).optional().default(""),
  address: z.string().max(500).optional().default(""),
  preferred_contact: z.string().max(80).optional().default("Email"),
  notes: z.string().max(2000).optional().default(""),
});

const bookingInputSchema = z.object({
  name: z.string().min(1, "Name is required.").max(160),
  email: z.string().max(320).optional().default(""),
  phone: z.string().max(80).optional().default(""),
  service_type: z.string().min(1, "Service type is required.").max(200),
  subscriber_plan: z.string().max(200).optional().default(""),
  preferred_date: z.string().max(80).optional().default(""),
  preferred_time: z.string().max(80).optional().default(""),
  hours: z.union([z.number(), z.string()]).optional().default(1),
  notes: z.string().max(2000).optional().default(""),
  payment_preference: z.string().max(80).optional().default("Discuss first"),
});

// ---------------------------------------------------------------------------
// Routers
// ---------------------------------------------------------------------------

// ── Clients ─────────────────────────────────────────────────────────────────

const clientsRouter = t.router({
  /** Create or update a client profile and seed a welcome notification. */
  signup: publicProcedure
    .input(clientInputSchema)
    .mutation(async ({ ctx, input }) => {
      const email = cleanEmail(input.email);

      const client = await ctx.prisma.client.upsert({
        where: { email },
        update: {
          name: input.name.trim().slice(0, 160),
          phone: input.phone.slice(0, 80),
          address: input.address.slice(0, 500),
          preferred_contact: input.preferred_contact.slice(0, 80),
          notes: input.notes.slice(0, 2000),
        },
        create: {
          id: randomUUID(),
          name: input.name.trim().slice(0, 160),
          email,
          phone: input.phone.slice(0, 80),
          address: input.address.slice(0, 500),
          preferred_contact: input.preferred_contact.slice(0, 80),
          notes: input.notes.slice(0, 2000),
          notifications: {
            create: {
              id: randomUUID(),
              title: "Welcome to Grace & Grind",
              body: "Your client portal is ready. You can request services, sign documents, and message Grace & Grind from here.",
              type: "welcome",
            },
          },
        },
      });

      return { success: true, client };
    }),

  /** Fetch all portal data for a given client email. */
  getPortal: publicProcedure
    .input(z.object({ email: clientEmailSchema }))
    .query(async ({ ctx, input }) => {
      const email = cleanEmail(input.email);

      const [client, bookings, messages, notifications, documents, payments, files] =
        await Promise.all([
          ctx.prisma.client.findUnique({ where: { email } }),
          ctx.prisma.booking.findMany({
            where: { email },
            orderBy: { created_at: "desc" },
          }),
          ctx.prisma.message.findMany({
            where: { client_email: email },
            orderBy: { created_at: "desc" },
          }),
          ctx.prisma.notification.findMany({
            where: { client_email: email },
            orderBy: { created_at: "desc" },
          }),
          ctx.prisma.document.findMany({
            where: { client_email: email },
            orderBy: { created_at: "desc" },
          }),
          ctx.prisma.payment.findMany({
            where: { client_email: email },
            orderBy: { created_at: "desc" },
          }),
          ctx.prisma.file.findMany({
            where: { client_email: email },
            orderBy: { created_at: "desc" },
          }),
        ]);

      return { client, bookings, messages, notifications, documents, payments, files };
    }),
});

// ── Bookings ─────────────────────────────────────────────────────────────────

const bookingsRouter = t.router({
  /** Submit a new booking request. */
  create: publicProcedure
    .input(bookingInputSchema)
    .mutation(async ({ ctx, input }) => {
      const email = cleanEmail(input.email);
      const amount = calculateBookingAmount(input);

      if (!email && !input.phone) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please include an email or phone number.",
        });
      }

      // Ensure a client record exists when an email is provided
      if (email) {
        await ctx.prisma.client.upsert({
          where: { email },
          update: { name: input.name.trim().slice(0, 160), phone: input.phone.slice(0, 80) },
          create: {
            id: randomUUID(),
            name: input.name.trim().slice(0, 160),
            email,
            phone: input.phone.slice(0, 80),
          },
        });
      }

      const booking = await ctx.prisma.booking.create({
        data: {
          id: randomUUID(),
          client_email: email,
          name: input.name.trim().slice(0, 160),
          email,
          phone: input.phone.slice(0, 80),
          service_type: input.service_type.trim().slice(0, 200),
          subscriber_plan: input.subscriber_plan.slice(0, 200),
          preferred_date: input.preferred_date.slice(0, 80),
          preferred_time: input.preferred_time.slice(0, 80),
          hours: amount.hours,
          notes: input.notes.slice(0, 2000),
          payment_preference: input.payment_preference.slice(0, 80),
          rate_label: amount.rate_label,
          amount_cents: amount.amount_cents,
          status: "requested",
          payment_status: amount.amount_cents ? "unpaid" : "quote_needed",
        },
      });

      if (email) {
        await ctx.prisma.notification.create({
          data: {
            id: randomUUID(),
            client_email: email,
            title: "Booking request received",
            body: `${booking.service_type} is saved at ${booking.rate_label}. Grace & Grind will confirm details before service.`,
            type: "booking",
          },
        });
      }

      return { success: true, booking };
    }),

  /** List bookings for a client email. */
  list: publicProcedure
    .input(z.object({ email: clientEmailSchema }))
    .query(async ({ ctx, input }) => {
      const bookings = await ctx.prisma.booking.findMany({
        where: { email: cleanEmail(input.email) },
        orderBy: { created_at: "desc" },
      });
      return { bookings };
    }),

  /** Update booking status (admin only). */
  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.string().max(80).optional(),
        payment_status: z.string().max(80).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.prisma.booking.findUnique({
        where: { id: input.id },
      });

      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking was not found." });
      }

      const updated = await ctx.prisma.booking.update({
        where: { id: input.id },
        data: {
          status: input.status || booking.status,
          payment_status: input.payment_status || booking.payment_status,
        },
      });

      if (booking.email) {
        await ctx.prisma.notification.create({
          data: {
            id: randomUUID(),
            client_email: booking.email,
            title: "Booking updated",
            body: `${booking.service_type} is now marked ${updated.status}.`,
            type: "booking",
          },
        });
      }

      return { success: true, booking: updated };
    }),
});

// ── Messages ─────────────────────────────────────────────────────────────────

const messagesRouter = t.router({
  /** Send a message from a client. */
  send: publicProcedure
    .input(
      z.object({
        email: clientEmailSchema,
        subject: z.string().max(180).optional().default("Client message"),
        body: z.string().min(1, "Message body is required.").max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const email = cleanEmail(input.email);

      const message = await ctx.prisma.message.create({
        data: {
          id: randomUUID(),
          client_email: email,
          from: "client",
          subject: input.subject.slice(0, 180),
          body: input.body.slice(0, 2000),
          read_by_admin: false,
          read_by_client: true,
        },
      });

      return { success: true, message };
    }),

  /** List messages for a client email. */
  list: publicProcedure
    .input(z.object({ email: clientEmailSchema }))
    .query(async ({ ctx, input }) => {
      const messages = await ctx.prisma.message.findMany({
        where: { client_email: cleanEmail(input.email) },
        orderBy: { created_at: "desc" },
      });
      return { messages };
    }),
});

// ── Notifications ─────────────────────────────────────────────────────────────

const notificationsRouter = t.router({
  /** List notifications for a client email. */
  list: publicProcedure
    .input(z.object({ email: clientEmailSchema }))
    .query(async ({ ctx, input }) => {
      const notifications = await ctx.prisma.notification.findMany({
        where: { client_email: cleanEmail(input.email) },
        orderBy: { created_at: "desc" },
      });
      return { notifications };
    }),

  /** Mark a notification as read. */
  markAsRead: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const notification = await ctx.prisma.notification.update({
        where: { id: input.id },
        data: { read: true },
      });
      return { success: true, notification };
    }),
});

// ── Documents ─────────────────────────────────────────────────────────────────

const documentsRouter = t.router({
  /** Sign a document. */
  sign: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        signer_name: z.string().min(1, "Signer name is required.").max(160),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.document.findUnique({
        where: { id: input.id },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document was not found." });
      }

      const document = await ctx.prisma.document.update({
        where: { id: input.id },
        data: {
          status: "signed",
          signer_name: input.signer_name.trim().slice(0, 160),
          signed_at: new Date(),
        },
      });

      await ctx.prisma.notification.create({
        data: {
          id: randomUUID(),
          client_email: document.client_email,
          title: "Document signed",
          body: `${document.title} was signed by ${document.signer_name}.`,
          type: "document",
        },
      });

      return { success: true, document };
    }),
});

// ── Payments ─────────────────────────────────────────────────────────────────

const paymentsRouter = t.router({
  /** Create a Stripe Checkout session for a booking. */
  createCheckout: publicProcedure
    .input(z.object({ booking_id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.prisma.booking.findUnique({
        where: { id: input.booking_id },
      });

      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking was not found." });
      }

      const apiKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY;
      if (!apiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Stripe is not configured yet. Add STRIPE_SECRET_KEY to your environment.",
        });
      }

      const { default: Stripe } = await import("stripe");
      const stripe = new Stripe(apiKey);

      const plan = getSubscriberPlanByName(booking.subscriber_plan);
      const mode: "payment" | "subscription" = plan ? "subscription" : "payment";
      const amount = plan?.amountCents || booking.amount_cents;

      if (!amount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This custom booking needs a manual quote before payment.",
        });
      }

      const baseUrl = getBaseUrl(ctx.req);
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
              ...(plan ? { recurring: { interval: plan.interval } } : {}),
            },
            quantity: 1,
          },
        ],
        success_url: `${baseUrl}/portal?email=${encodeURIComponent(booking.email)}&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/book.html?checkout=cancelled`,
        metadata: {
          booking_id: booking.id,
          client_email: booking.email,
          service_type: booking.service_type,
          subscriber_plan: booking.subscriber_plan,
        },
      });

      const payment = await ctx.prisma.payment.create({
        data: {
          id: randomUUID(),
          client_email: booking.email,
          booking_id: booking.id,
          stripe_session_id: session.id,
          checkout_url: session.url ?? undefined,
          amount_cents: amount,
          mode,
          status: "created",
        },
      });

      await ctx.prisma.booking.update({
        where: { id: booking.id },
        data: { payment_status: "checkout_created" },
      });

      return { success: true, url: session.url, payment };
    }),
});

// ── Files ─────────────────────────────────────────────────────────────────────

const filesRouter = t.router({
  /** Upload a file (base64-encoded). */
  upload: publicProcedure
    .input(
      z.object({
        email: clientEmailSchema,
        filename: z.string().max(255),
        mime_type: z.string().max(120).optional().default("application/octet-stream"),
        category: z.string().max(80).optional().default("General"),
        note: z.string().max(1000).optional().default(""),
        uploaded_by: z.enum(["client", "admin"]).optional().default("client"),
        /** Base64-encoded file content */
        content_base64: z.string().optional().default(""),
        /** data: URL (alternative to content_base64) */
        data_url: z.string().optional().default(""),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Admin uploads require the admin middleware — enforce here via header check
      if (input.uploaded_by === "admin") {
        const provided =
          ctx.req.headers["x-admin-code"] ||
          (ctx.req.query as Record<string, string>)["code"];
        if (provided !== ctx.adminCode) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Admin access code is required for admin uploads.",
          });
        }
      }

      const email = cleanEmail(input.email);
      const maxBytes = 8 * 1024 * 1024;

      let base64 = input.content_base64;
      let mimeType = input.mime_type;

      if (input.data_url) {
        const match = input.data_url.match(/^data:([^;]+);base64,([\s\S]+)$/);
        if (!match) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Upload data was not a valid file." });
        }
        mimeType = match[1] || mimeType;
        base64 = match[2] || "";
      }

      if (!base64) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a file to upload." });
      }

      const buffer = Buffer.from(base64, "base64");
      if (!buffer.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "The uploaded file was empty." });
      }
      if (buffer.length > maxBytes) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Files must be 8 MB or smaller." });
      }

      const { default: path } = await import("node:path");
      const { default: fs } = await import("node:fs/promises");
      const { fileURLToPath } = await import("node:url");

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const uploadsDir =
        process.env.UPLOADS_DIR || path.resolve(__dirname, "..", "data", "uploads");

      const fallback = "upload";
      const rawName = input.filename.trim().slice(0, 180) || fallback;
      const safeName = path.basename(rawName).replace(/[^a-z0-9._ -]/gi, "_").trim() || fallback;

      const ext = (() => {
        const e = path.extname(safeName).toLowerCase().replace(/[^.a-z0-9]/g, "");
        if (e) return e.slice(0, 12);
        const byMime: Record<string, string> = {
          "application/pdf": ".pdf",
          "image/jpeg": ".jpg",
          "image/png": ".png",
          "image/webp": ".webp",
          "text/plain": ".txt",
          "application/msword": ".doc",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
        };
        return byMime[mimeType] || ".bin";
      })();

      const id = randomUUID();
      const storedName = `${id}${ext}`;
      const diskPath = path.resolve(uploadsDir, storedName);

      await fs.mkdir(uploadsDir, { recursive: true });
      await fs.writeFile(diskPath, buffer);

      const record = await ctx.prisma.file.create({
        data: {
          id,
          client_email: email,
          uploaded_by: input.uploaded_by,
          filename: safeName,
          stored_name: storedName,
          mime_type: mimeType,
          size: buffer.length,
          category: input.category.slice(0, 80),
          note: input.note.slice(0, 1000),
        },
      });

      await ctx.prisma.notification.create({
        data: {
          id: randomUUID(),
          client_email: email,
          title: input.uploaded_by === "admin" ? "New file added" : "File received",
          body:
            input.uploaded_by === "admin"
              ? `${safeName} was added to your portal.`
              : `${safeName} was uploaded to your Grace & Grind portal.`,
          type: "file",
        },
      });

      return { success: true, file: record };
    }),

  /** List files for a client email. */
  list: publicProcedure
    .input(z.object({ email: clientEmailSchema }))
    .query(async ({ ctx, input }) => {
      const files = await ctx.prisma.file.findMany({
        where: { client_email: cleanEmail(input.email) },
        orderBy: { created_at: "desc" },
      });
      return { files };
    }),

  /** Download a file — returns the stored_name so the caller can stream it. */
  download: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        email: z.string().max(320).optional().default(""),
      }),
    )
    .query(async ({ ctx, input }) => {
      const file = await ctx.prisma.file.findUnique({ where: { id: input.id } });

      if (!file) {
        throw new TRPCError({ code: "NOT_FOUND", message: "File was not found." });
      }

      const requesterEmail = cleanEmail(input.email);
      const adminAllowed =
        ctx.req.headers["x-admin-code"] === ctx.adminCode ||
        (ctx.req.query as Record<string, string>)["code"] === ctx.adminCode;

      if (!adminAllowed && requesterEmail !== file.client_email) {
        throw new TRPCError({ code: "FORBIDDEN", message: "File access denied." });
      }

      return { file };
    }),
});

// ── Admin ─────────────────────────────────────────────────────────────────────

const adminRouter = t.router({
  /** Full overview of all data — admin only. */
  getOverview: adminProcedure.query(async ({ ctx }) => {
    const [clients, bookings, messages, notifications, documents, payments, files] =
      await Promise.all([
        ctx.prisma.client.findMany({ orderBy: { created_at: "desc" } }),
        ctx.prisma.booking.findMany({ orderBy: { created_at: "desc" } }),
        ctx.prisma.message.findMany({ orderBy: { created_at: "desc" } }),
        ctx.prisma.notification.findMany({ orderBy: { created_at: "desc" } }),
        ctx.prisma.document.findMany({ orderBy: { created_at: "desc" } }),
        ctx.prisma.payment.findMany({ orderBy: { created_at: "desc" } }),
        ctx.prisma.file.findMany({ orderBy: { created_at: "desc" } }),
      ]);

    return {
      clients,
      bookings,
      messages,
      notifications,
      documents,
      payments,
      files,
      catalog: { serviceCategories, subscriberPlans },
      stripe_configured: Boolean(
        process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY,
      ),
    };
  }),

  /** Update a booking's status fields — admin only. */
  updateBooking: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.string().max(80).optional(),
        payment_status: z.string().max(80).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.prisma.booking.findUnique({ where: { id: input.id } });

      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking was not found." });
      }

      const updated = await ctx.prisma.booking.update({
        where: { id: input.id },
        data: {
          status: input.status || booking.status,
          payment_status: input.payment_status || booking.payment_status,
        },
      });

      if (booking.email) {
        await ctx.prisma.notification.create({
          data: {
            id: randomUUID(),
            client_email: booking.email,
            title: "Booking updated",
            body: `${booking.service_type} is now marked ${updated.status}.`,
            type: "booking",
          },
        });
      }

      return { success: true, booking: updated };
    }),

  /** Send an admin reply to a client — admin only. */
  replyToMessage: adminProcedure
    .input(
      z.object({
        email: clientEmailSchema,
        subject: z.string().max(180).optional().default("Grace & Grind reply"),
        body: z.string().min(1, "Reply body is required.").max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const email = cleanEmail(input.email);

      const message = await ctx.prisma.message.create({
        data: {
          id: randomUUID(),
          client_email: email,
          from: "admin",
          subject: input.subject.slice(0, 180),
          body: input.body.slice(0, 2000),
          read_by_admin: true,
          read_by_client: false,
        },
      });

      await ctx.prisma.notification.create({
        data: {
          id: randomUUID(),
          client_email: email,
          title: "New message",
          body: message.subject,
          type: "message",
        },
      });

      return { success: true, message };
    }),
});

// ---------------------------------------------------------------------------
// Root router — exported for use in server/index.ts and for type inference
// ---------------------------------------------------------------------------

export const router = t.router({
  clients: clientsRouter,
  bookings: bookingsRouter,
  messages: messagesRouter,
  notifications: notificationsRouter,
  documents: documentsRouter,
  payments: paymentsRouter,
  files: filesRouter,
  admin: adminRouter,
});

export type AppRouter = typeof router;

export { trpcExpress };
