import Fastify from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import jwt from "@fastify/jwt";
import websocket from "@fastify/websocket";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import argon2 from "argon2";
import Redis from "ioredis";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
    transport: process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty" }
      : undefined
  }
});

// Security middleware
await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
});

await app.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(",") || true,
  credentials: true
});

await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
  redis
});

await app.register(jwt, {
  secret: process.env.JWT_SECRET || (() => {
    throw new Error("JWT_SECRET required");
  })()
});

await app.register(websocket);

// Decorators
app.decorate("prisma", prisma);
app.decorate("redis", redis);

app.decorate("auth", async (request, reply) => {
  try {
    await request.jwtVerify();
    
    // Check if session is still valid
    const session = await prisma.session.findFirst({
      where: {
        userId: request.user.sub,
        token: request.headers.authorization?.replace("Bearer ", ""),
        expiresAt: { gt: new Date() }
      }
    });
    
    if (!session) {
      throw new Error("Session expired");
    }
    
    request.user.sessionId = session.id;
  } catch (error) {
    reply.code(401).send({ error: "UNAUTHORIZED", message: error.message });
  }
});

app.decorate("auditLog", async (userId, action, resource, resourceId, details, request) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        details,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"]
      }
    });
  } catch (error) {
    app.log.error({ error }, "Failed to create audit log");
  }
});

// Health check
app.get("/health", async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    return { 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      database: "connected",
      redis: "connected",
      agents: "available"
    };
  } catch (error) {
    throw app.httpErrors.serviceUnavailable("Health check failed");
  }
});

// Register agent routes
import { agentRoutes } from './routes/agents.js';
await app.register(agentRoutes, { prefix: '/api' });

// Authentication routes
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  name: z.string().min(1),
  orgName: z.string().optional()
});

app.post("/auth/register", async (request, reply) => {
  const body = RegisterSchema.parse(request.body);
  
  const existingUser = await prisma.user.findUnique({
    where: { email: body.email.toLowerCase() }
  });
  
  if (existingUser) {
    throw app.httpErrors.conflict("Email already registered");
  }
  
  const passwordHash = await argon2.hash(body.password);
  
  let org = null;
  if (body.orgName) {
    org = await prisma.organization.create({
      data: {
        name: body.orgName,
        type: "installer"
      }
    });
  }
  
  const user = await prisma.user.create({
    data: {
      email: body.email.toLowerCase(),
      name: body.name,
      passwordHash,
      role: org ? "admin" : "installer",
      orgId: org?.id
    }
  });
  
  await app.auditLog(user.id, "REGISTER", "users", user.id, {
    email: user.email,
    orgCreated: !!org
  }, request);
  
  const token = app.jwt.sign({ sub: user.id, role: user.role });
  
  // Create session
  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"]
    }
  });
  
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      orgId: user.orgId
    }
  };
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

app.post("/auth/login", async (request, reply) => {
  const body = LoginSchema.parse(request.body);
  
  const user = await prisma.user.findUnique({
    where: { email: body.email.toLowerCase() }
  });
  
  if (!user || !(await argon2.verify(user.passwordHash, body.password))) {
    await app.auditLog(null, "LOGIN_FAILED", "users", null, {
      email: body.email,
      reason: "invalid_credentials"
    }, request);
    throw app.httpErrors.unauthorized("Invalid credentials");
  }
  
  const token = app.jwt.sign({ sub: user.id, role: user.role });
  
  // Create session
  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"]
    }
  });
  
  await app.auditLog(user.id, "LOGIN", "users", user.id, {}, request);
  
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      orgId: user.orgId
    }
  };
});

app.post("/auth/logout", { preHandler: [app.auth] }, async (request) => {
  await prisma.session.delete({
    where: { id: request.user.sessionId }
  });
  
  await app.auditLog(request.user.sub, "LOGOUT", "users", request.user.sub, {}, request);
  
  return { success: true };
});

// Projects
const CreateProjectSchema = z.object({
  name: z.string().min(1),
  siteAddress: z.string().min(1),
  systemType: z.enum(["residential", "commercial", "industrial"]),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional()
});

app.post("/projects", { preHandler: [app.auth] }, async (request) => {
  const body = CreateProjectSchema.parse(request.body);
  
  const user = await prisma.user.findUnique({
    where: { id: request.user.sub }
  });
  
  const project = await prisma.project.create({
    data: {
      name: body.name,
      siteAddress: body.siteAddress,
      systemType: body.systemType,
      coordinates: body.coordinates,
      ownerId: user.id,
      orgId: user.orgId
    }
  });
  
  await app.auditLog(request.user.sub, "CREATE", "projects", project.id, body, request);
  
  return project;
});

app.get("/projects", { preHandler: [app.auth] }, async (request) => {
  const user = await prisma.user.findUnique({
    where: { id: request.user.sub }
  });
  
  const where = user.role === "admin" && user.orgId
    ? { orgId: user.orgId }
    : { ownerId: user.id };
  
  return prisma.project.findMany({
    where,
    include: {
      _count: {
        select: {
          assets: true,
          runs: true
        }
      }
    },
    orderBy: { updatedAt: "desc" }
  });
});

app.get("/projects/:id", { preHandler: [app.auth] }, async (request) => {
  const project = await prisma.project.findFirst({
    where: {
      id: request.params.id,
      OR: [
        { ownerId: request.user.sub },
        { org: { users: { some: { id: request.user.sub } } } }
      ]
    },
    include: {
      assets: {
        include: {
          _count: { select: { readings: true } }
        }
      },
      runs: {
        orderBy: { createdAt: "desc" },
        take: 5
      }
    }
  });
  
  if (!project) {
    throw app.httpErrors.notFound("Project not found");
  }
  
  return project;
});

// Assets
const CreateAssetSchema = z.object({
  type: z.enum(["inverter", "panel", "battery", "meter"]),
  manufacturer: z.string().min(1),
  model: z.string().min(1),
  serialNumber: z.string().optional(),
  cerListing: z.string().optional(),
  specs: z.record(z.any()),
  location: z.string().optional()
});

app.post("/projects/:projectId/assets", { preHandler: [app.auth] }, async (request) => {
  const body = CreateAssetSchema.parse(request.body);
  
  // Verify project access
  const project = await prisma.project.findFirst({
    where: {
      id: request.params.projectId,
      OR: [
        { ownerId: request.user.sub },
        { org: { users: { some: { id: request.user.sub } } } }
      ]
    }
  });
  
  if (!project) {
    throw app.httpErrors.notFound("Project not found");
  }
  
  const asset = await prisma.asset.create({
    data: {
      projectId: project.id,
      ...body
    }
  });
  
  await app.auditLog(request.user.sub, "CREATE", "assets", asset.id, body, request);
  
  return asset;
});

// Compliance runs
const ComplianceRunSchema = z.object({
  standard: z.string(),
  edition: z.string(),
  inputs: z.record(z.any())
});

app.post("/projects/:projectId/compliance", { preHandler: [app.auth] }, async (request) => {
  const body = ComplianceRunSchema.parse(request.body);
  
  // Verify project access
  const project = await prisma.project.findFirst({
    where: {
      id: request.params.projectId,
      OR: [
        { ownerId: request.user.sub },
        { org: { users: { some: { id: request.user.sub } } } }
      ]
    },
    include: { assets: true }
  });
  
  if (!project) {
    throw app.httpErrors.notFound("Project not found");
  }
  
  // Get next run number
  const lastRun = await prisma.complianceRun.findFirst({
    where: { projectId: project.id },
    orderBy: { runNumber: "desc" }
  });
  
  const runNumber = (lastRun?.runNumber || 0) + 1;
  
  // Run compliance engine (simplified example)
  const results = await runComplianceEngine(body.standard, body.edition, body.inputs, project);
  
  const run = await prisma.complianceRun.create({
    data: {
      projectId: project.id,
      runNumber,
      standard: body.standard,
      edition: body.edition,
      runBy: request.user.sub,
      inputs: body.inputs,
      results: results.checks,
      summary: results.summary,
      evidence: results.evidence
    }
  });
  
  await app.auditLog(request.user.sub, "COMPLIANCE_RUN", "compliance_runs", run.id, {
    standard: body.standard,
    edition: body.edition,
    status: results.summary.status
  }, request);
  
  // Broadcast to connected clients
  const message = JSON.stringify({
    type: "compliance_run_complete",
    projectId: project.id,
    runId: run.id,
    status: results.summary.status
  });
  
  redis.publish(`project:${project.id}`, message);
  
  return run;
});

// CER Products
app.get("/cer-products", async (request) => {
  const { manufacturer, model, type, limit = 50 } = request.query;
  
  const where = {};
  if (manufacturer) where.manufacturer = { contains: manufacturer, mode: "insensitive" };
  if (model) where.model = { contains: model, mode: "insensitive" };
  if (type) where.productType = type;
  
  return prisma.cERProduct.findMany({
    where,
    take: Math.min(parseInt(limit), 100),
    orderBy: { approvalDate: "desc" }
  });
});

// WebSocket for real-time updates
app.register(async (fastify) => {
  fastify.get("/ws", { websocket: true }, (connection, request) => {
    connection.socket.on("message", async (message) => {
      try {
        const data = JSON.parse(message);
        
        if (data.type === "subscribe_project" && data.projectId) {
          // Subscribe to project updates
          const subscriber = redis.duplicate();
          subscriber.subscribe(`project:${data.projectId}`);
          
          subscriber.on("message", (channel, message) => {
            connection.socket.send(message);
          });
          
          connection.socket.on("close", () => {
            subscriber.disconnect();
          });
        }
      } catch (error) {
        app.log.error({ error }, "WebSocket message error");
      }
    });
  });
});

// Compliance engine implementation
async function runComplianceEngine(standard, edition, inputs, project) {
  // This is where the actual compliance logic would go
  // For now, a simplified example
  
  const checks = [];
  const evidence = [];
  
  if (standard === "AS/NZS 5033" && edition === "2021") {
    // DC isolation check
    checks.push({
      clause: "6.4.3",
      title: "DC isolation switch",
      status: inputs.dcIsolatorDistance <= 3 ? "PASS" : "FAIL",
      reason: inputs.dcIsolatorDistance <= 3 
        ? "DC isolator within 3m of inverter" 
        : `DC isolator ${inputs.dcIsolatorDistance}m from inverter (max 3m)`,
      severity: "critical",
      evidence: evidence
    });
    
    // Earthing check
    checks.push({
      clause: "5.3",
      title: "Array frame earthing",
      status: inputs.frameEarthed ? "PASS" : "FAIL",
      reason: inputs.frameEarthed 
        ? "Frame earthing verified" 
        : "Frame earthing not confirmed",
      severity: "critical",
      evidence: evidence
    });
  }
  
  const passCount = checks.filter(c => c.status === "PASS").length;
  const failCount = checks.filter(c => c.status === "FAIL").length;
  const criticalFails = checks.filter(c => c.status === "FAIL" && c.severity === "critical").length;
  
  return {
    checks,
    summary: {
      status: criticalFails > 0 ? "FAIL" : passCount > failCount ? "PASS" : "WARNING",
      totalChecks: checks.length,
      passCount,
      failCount,
      criticalFails,
      score: checks.length > 0 ? Math.round((passCount / checks.length) * 100) : 0
    },
    evidence
  };
}

// Error handling
app.setErrorHandler((error, request, reply) => {
  if (error.validation) {
    reply.code(400).send({
      error: "VALIDATION_ERROR",
      message: error.message,
      details: error.validation
    });
  } else if (error.statusCode) {
    reply.code(error.statusCode).send({
      error: error.name || "HTTP_ERROR",
      message: error.message
    });
  } else {
    app.log.error({ error }, "Unhandled error");
    reply.code(500).send({
      error: "INTERNAL_ERROR",
      message: "An unexpected error occurred"
    });
  }
});

const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || "0.0.0.0";

await app.listen({ port, host });
app.log.info(`SolarFlow API running on ${host}:${port}`);