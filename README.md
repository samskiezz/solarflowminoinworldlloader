# SolarFlow - Production Solar Energy Management Platform

A professional solar installation and compliance management system with real database persistence, authentication, and AS/NZS standards compliance checking.

## Architecture

- **API**: Fastify + Prisma + PostgreSQL + Redis
- **Web**: Next.js + React Query + Tailwind CSS  
- **Database**: PostgreSQL with full audit trails
- **Cache/Sessions**: Redis
- **Real-time**: WebSocket + Redis pub/sub
- **Deployment**: Docker + Docker Compose

## Features

### Authentication & Authorization
- JWT-based authentication with session management
- Role-based access control (admin, installer, auditor, viewer)
- Organization/tenant support
- Complete audit logging

### Project Management
- Solar installation projects with site details
- Asset management (inverters, panels, batteries, meters)
- Real-time sensor data collection
- Document storage and management

### Standards Compliance
- AS/NZS 5033:2021 (PV installations)
- AS/NZS 4777:2016 (Grid connection)  
- AS/NZS 5139:2019 (Battery safety)
- Automated compliance checking with evidence trails
- Immutable compliance run records

### CER Product Registry
- Verified CER-approved products database
- Technical specifications and test reports
- Product search and filtering
- Integration with compliance checking

### Real-time Collaboration
- WebSocket connections for live updates
- Project-based rooms and notifications
- Multi-user compliance checking
- Live status updates

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 20+ (for development)
- PostgreSQL 16+ (if running locally)
- Redis 7+ (if running locally)

### Development Setup

1. Clone and setup:
```bash
git clone <repository>
cd solarflow
cp .env.example .env
# Edit .env with your configuration
```

2. Start services:
```bash
docker-compose up -d postgres redis
```

3. Setup database:
```bash
cd apps/api
npm install
npx prisma migrate dev
npx prisma generate
npm run seed
```

4. Start API:
```bash
npm run dev
```

5. Start web interface:
```bash
cd ../web
npm install
npm run dev
```

6. Visit http://localhost:3000

### Production Deployment

1. Build and deploy:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

2. Run migrations:
```bash
docker-compose exec api npx prisma migrate deploy
```

3. Seed initial data:
```bash
docker-compose exec api npm run seed
```

## API Documentation

### Authentication
- `POST /auth/register` - Create new user account
- `POST /auth/login` - Authenticate user
- `POST /auth/logout` - Invalidate session

### Projects
- `GET /projects` - List user's projects
- `POST /projects` - Create new project
- `GET /projects/:id` - Get project details
- `POST /projects/:id/assets` - Add equipment to project

### Compliance
- `POST /projects/:id/compliance` - Run compliance check
- `GET /standards` - List available standards
- `GET /cer-products` - Search CER products

### Real-time
- `WebSocket /ws` - Real-time project updates

## Database Schema

### Core Entities
- **Users** - Authentication and authorization
- **Organizations** - Multi-tenant support
- **Projects** - Solar installations
- **Assets** - Equipment (inverters, panels, batteries)
- **ComplianceRuns** - Immutable compliance records

### Standards & Compliance
- **StandardsReference** - AS/NZS standards metadata
- **CERProduct** - Approved equipment registry

### Audit & Security
- **AuditLog** - Complete activity tracking
- **Session** - Secure session management

## Standards Compliance

### Legal Framework
This system provides compliance *checking* against AS/NZS standards but does not include copyrighted standards text. Users must:

1. Have valid licenses for AS/NZS standards
2. Upload their purchased standards documents to their tenant storage
3. Understand that compliance checking is advisory only

### Compliance Engine
The system checks installations against:
- **AS/NZS 5033:2021** - PV installation requirements
- **AS/NZS 4777:2016** - Grid connection standards  
- **AS/NZS 5139:2019** - Battery safety requirements

Each compliance run generates an immutable record with:
- Input parameters and evidence
- Pass/fail status for each requirement
- Severity levels and recommendations
- Full audit trail for legal defensibility

## Security Features

- Password hashing with Argon2
- JWT tokens with secure expiration
- Rate limiting and DDoS protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection via CSP headers
- Complete audit logging
- Session timeout and revocation

## Monitoring & Observability

- Structured logging with Pino
- Health check endpoints
- Database connection monitoring
- Redis connectivity checks
- Request tracing and correlation IDs

## Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality  
4. Ensure all tests pass
5. Submit pull request

## License

MIT License - see LICENSE file for details

## Support

For technical support:
- Review API documentation at `/health`
- Check application logs
- Verify database connectivity
- Confirm environment configuration

---

**Important**: This is a compliance checking tool, not a substitute for professional electrical work or official standards compliance certification. Always consult qualified professionals for solar installations.