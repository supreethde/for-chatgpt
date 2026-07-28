import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db/index";
import { users, inquiries } from "./src/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "./src/middleware/auth";
import adminUploadRouter from "./src/routes/adminUpload";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(
    cors({
      origin: [
        "https://thesoiltheory.in",
        "https://www.thesoiltheory.in",
        "http://localhost:3000",
        "http://localhost:5173",
      ],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  app.use(express.json());
  app.use(adminUploadRouter);

  // API Route: Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Route: Products Catalog
  app.get("/api/products", (req, res) => {
    // Farm-traceable organic products
    const products = [
      {
        id: "p1",
        name: "Bangalore Blue Grapes (Chemical-Free)",
        category: "Fruits",
        priceRange: "₹90 - ₹110 / kg",
        farmSource: "Channapatna Organic Orchards, Ramanagara",
        weeklyTestStatus: "Passed - Nil Pesticides detected",
        image: "grapes",
        description: "Juicy, naturally sweet, with geographical indication (GI) status. Lab-tested for 120+ pesticides.",
      },
      {
        id: "p2",
        name: "Heirloom Vine Tomatoes",
        category: "Vegetables",
        priceRange: "₹40 - ₹52 / kg",
        farmSource: "Gundlupet Regenerative Farm, Chamarajanagar",
        weeklyTestStatus: "Passed - Nil Pesticides detected",
        image: "tomatoes",
        description: "Sun-ripened on the vine. Superior umami profile preferred by fine-dining chefs in Bengaluru.",
      },
      {
        id: "p3",
        name: "Ooty Special Carrots",
        category: "Vegetables",
        priceRange: "₹65 - ₹78 / kg",
        farmSource: "Nilgiris Biosphere Organic Belt",
        weeklyTestStatus: "Passed - Nil Pesticides detected",
        image: "carrots",
        description: "Extremely crisp and sweet. Earthy and fresh, delivered with intact top greens to preserve humidity.",
      },
      {
        id: "p4",
        name: "Hydroponic Butterhead Lettuce",
        category: "Leafy Greens",
        priceRange: "₹180 - ₹210 / kg",
        farmSource: "Devalapura Hydro-Farms, Doddaballapura",
        weeklyTestStatus: "Passed - Zero synthetic chemicals",
        image: "lettuce",
        description: "Pristine, crispy, and dirt-free leaves, harvested at 4 AM and delivered chilled before 6 AM.",
      },
      {
        id: "p5",
        name: "Fresh Thai Sweet Basil",
        category: "Herbs & Exotics",
        priceRange: "₹120 - ₹140 / kg",
        farmSource: "Hosur Border Sustainable Herbs",
        weeklyTestStatus: "Passed - Clean organic harvest",
        image: "basil",
        description: "Highly aromatic anise-scented leaves. Sourced fresh daily for top culinary use.",
      },
      {
        id: "p6",
        name: "English Seedless Cucumbers",
        category: "Vegetables",
        priceRange: "₹45 - ₹58 / kg",
        farmSource: "Devalapura Hydro-Farms, Doddaballapura",
        weeklyTestStatus: "Passed - Nil Pesticides detected",
        image: "cucumber",
        description: "Firm, crisp, and high moisture retention. Perfect for fresh cold salads.",
      }
    ];
    res.json(products);
  });

  // API Route: Lab Reports List
  app.get("/api/reports", (req, res) => {
    const reports = [
      {
        id: "rep-2026-29",
        testDate: "July 18, 2026",
        batchId: "BATCH-BLR-0718",
        labName: "Karnataka Agri-Food Safety Laboratory, Bengaluru",
        pesticideScanCount: 148,
        result: "100% Chemical-Free / No Pesticide Residues Found",
        status: "Certified Safe",
        downloadUrl: "#",
      },
      {
        id: "rep-2026-28",
        testDate: "July 11, 2026",
        batchId: "BATCH-BLR-0711",
        labName: "Karnataka Agri-Food Safety Laboratory, Bengaluru",
        pesticideScanCount: 148,
        result: "100% Chemical-Free / No Pesticide Residues Found",
        status: "Certified Safe",
        downloadUrl: "#",
      },
      {
        id: "rep-2026-27",
        testDate: "July 04, 2026",
        batchId: "BATCH-BLR-0704",
        labName: "Karnataka Agri-Food Safety Laboratory, Bengaluru",
        pesticideScanCount: 148,
        result: "100% Chemical-Free / No Pesticide Residues Found",
        status: "Certified Safe",
        downloadUrl: "#",
      }
    ];
    res.json(reports);
  });

  // API Route: Sync/Register User from authenticated Firebase client
  app.post("/api/users/sync", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid, email, name } = req.user;
      const displayName = name || req.body.name || "Restaurant Owner";

      // Upsert user securely in Cloud SQL database
      const result = await db.insert(users)
        .values({
          uid,
          email,
          name: displayName,
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: {
            email,
            name: displayName,
          },
        })
        .returning();

      res.json({ success: true, user: result[0] });
    } catch (error) {
      console.error("Database synchronization failed:", error);
      res.status(500).json({ error: "Failed to synchronize user session" });
    }
  });

  // API Route: Submit new restaurant inquiry
  app.post("/api/inquiries", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { restaurantName, contactNumber, items, estimatedCost } = req.body;
      const { uid } = req.user;

      if (!restaurantName || !contactNumber || !items) {
        return res.status(400).json({ error: "Missing required inquiry fields" });
      }

      // 1. Fetch internal user.id based on Firebase uid
      const userList = await db.select().from(users).where(eq(users.uid, uid));
      if (userList.length === 0) {
        return res.status(404).json({ error: "User session not synchronized" });
      }
      const userId = userList[0].id;

      // 2. Insert inquiry into Cloud SQL database
      const result = await db.insert(inquiries)
        .values({
          userId,
          restaurantName,
          contactNumber,
          items: typeof items === "string" ? items : JSON.stringify(items),
          estimatedCost: String(estimatedCost || "0"),
          status: "pending",
        })
        .returning();

      res.json({ success: true, inquiry: result[0] });
    } catch (error) {
      console.error("Failed to create inquiry:", error);
      res.status(500).json({ error: "Failed to submit restaurant supply inquiry" });
    }
  });

  // API Route: Fetch logged-in user's inquiries
  app.get("/api/inquiries/my", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user;

      // Join to safely fetch inquiries matching the user's string UID
      const result = await db
        .select({
          id: inquiries.id,
          restaurantName: inquiries.restaurantName,
          contactNumber: inquiries.contactNumber,
          items: inquiries.items,
          estimatedCost: inquiries.estimatedCost,
          status: inquiries.status,
          createdAt: inquiries.createdAt,
        })
        .from(inquiries)
        .innerJoin(users, eq(inquiries.userId, users.id))
        .where(eq(users.uid, uid))
        .orderBy(desc(inquiries.createdAt));

      res.json(result);
    } catch (error) {
      console.error("Failed to fetch user inquiries:", error);
      res.status(500).json({ error: "Failed to retrieve your inquiries" });
    }
  });

  // Vite development / production serving handler
  const distPath = path.join(process.cwd(), "dist");
  const isProduction = process.env.NODE_ENV === "production" || fs.existsSync(path.join(distPath, "index.html"));

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

startServer();
