# WebPosto-SwS Integration Platform

## Overview

This is a middleware integration platform that connects WebPosto (a point-of-sale system) with the SwS payment API. The application serves as a bridge between these two systems, handling transaction validation, payment processing, and providing real-time monitoring capabilities through a web dashboard.

The platform is built as a full-stack TypeScript application with a React frontend and Express backend, using PostgreSQL for data persistence. It manages the complete transaction lifecycle from initial validation through payment processing, with comprehensive logging and retry mechanisms for failed operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Tooling:**
- React with TypeScript for type safety
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management

**UI Design System:**
- Carbon Design System principles (enterprise-focused, data-dense interface)
- Shadcn UI components built on Radix UI primitives
- Tailwind CSS for styling with IBM Plex Sans/Mono font stack
- Custom theme system supporting light/dark modes with design tokens

**State Management:**
- React Query for API data fetching and caching
- React Hook Form with Zod for form validation
- Local component state with React hooks

**Application Structure:**
- Page-based routing (Dashboard, Transactions, Reports, Logs, Notifications, PDV Simulator, Field Mappings, Settings)
- Reusable UI component library in `/client/src/components/ui`
- Centralized API client with request/response handling in `/client/src/lib/queryClient.ts`
- **PDV Simulator** page for testing WebPosto integrations with JSON payload submission
  - **Step 2 (Validate):** Visual flow diagram showing 4 JSONs in sequence:
    1. 📥 JSON from PDV → FlowBridge (blue) - Voucher validation request
    2. 📤 JSON from FlowBridge → SwS (purple) - Validation with actionType "3"
    3. 📥 Response from SwS → FlowBridge (green) - Balance response with additionalData
    4. 📤 JSON from FlowBridge → PDV (orange) - Filtered response (idTransacao, tipoCodigo, valorCashBack, produtos, tipoPagamento)
  - **Step 3 (Send Sale):** Visual flow diagram showing 4 JSONs in sequence:
    1. 📥 JSON from PDV → FlowBridge (blue) - Sale confirmation request
    2. 📤 JSON from FlowBridge → SwS (purple) - Sale with actionType "4" and De-Para transformation
    3. 📥 Response from SwS → FlowBridge (green) - Sale confirmation response
    4. 📤 JSON from FlowBridge → PDV (orange) - Filtered response (codigoEmpresa, codigoVenda, idTransacao)
  - Includes De-Para transformation preview for Step 3
- Field Mappings page (De-Para) for configuring dynamic transformation rules between WebPosto and SwS formats

### Backend Architecture

**Framework & Runtime:**
- Express.js server running on Node.js
- TypeScript throughout for type safety
- ESM modules configuration

**API Design:**
- RESTful endpoints under `/api` prefix
- Configuration management (`/api/configuration`)
- Transaction operations (`/api/transactions`)
- Integration logs (`/api/logs`)
- Notification settings (`/api/notifications/settings`, `/api/notifications/history`)
- Analytics endpoints (`/api/analytics/transactions-by-period`, `/api/analytics/top-products`, `/api/analytics/success-rate`, `/api/analytics/revenue-summary`)
- Dashboard statistics aggregation (`/api/dashboard/stats`)
- WebPosto webhook endpoints for transaction lifecycle events
- Field Mappings management (`/api/field-mappings` - CRUD operations for dynamic field transformations)
- **Security:** Debug mode (`?debug=true`) only exposes SwS internal data (swsRequest/swsResponse) in development environment (NODE_ENV=development), never in production

**Business Logic Layer:**
- `SwSClient` service for managing SwS API integration
  - Token-based authentication with caching
  - **Voucher validation** (actionType: "3") - validates customer voucher and retrieves balance
    - Uses `codigoVoucher` from WebPosto transaction as `clientID` in SwS request
  - **Sale transaction submission** (actionType: "4") - processes sale with dynamic field transformation
  - Applies configured field mappings to transform WebPosto format to SwS format
  - Fallback to default mapping when no field mappings are configured
  - Returns both request and response objects for debugging/visualization
  - Error handling and logging
- `RetryQueue` service for failed transaction recovery
  - Exponential backoff strategy (30s, 1min, 5min delays)
  - Maximum 3 retry attempts
  - Automatic processing loop
  - Integrated with notification service for critical failure alerts
- `NotificationService` for alerting on critical failures
  - Webhook notification support (HTTP POST with JSON payload)
  - Email notification support (logged for MVP, requires provider integration)
  - Configurable event types (retry_failed, sws_error, webposto_error)
  - History tracking of all sent notifications
- **Field Mapping System** (De-Para) - **IMPLEMENTADO E FUNCIONAL**
  - Dynamic transformation rules between WebPosto and SwS JSON formats
  - Supports four mapping types:
    - `direct`: 1:1 field copy (e.g., nomeProduto → name)
    - `fixed`: Constant value assignment (e.g., currency → "986")
    - `multiply_100`: Value multiplication by 100 (currency: R$99.50 → "9950")
    - `multiply_1000`: Value multiplication by 1000 (quantity: 1.5 → "1500")
  - Entity-specific mappings (product, transaction, payment)
  - Active/inactive flag for temporary disabling
  - Applied automatically during SwS API calls
  - Auto-generated mapping names for easy identification
  - **Resultado JSON**: Todos os valores transformados são convertidos para strings conforme especificação SwS

**Data Access Pattern:**
- Storage abstraction layer (`IStorage` interface in `/server/storage.ts`)
- Drizzle ORM for type-safe database queries
- Neon serverless PostgreSQL with WebSocket support

### Database Architecture

**ORM & Migration:**
- Drizzle ORM with Drizzle Kit for migrations
- Schema-first approach with TypeScript definitions
- Zod integration for runtime validation via `drizzle-zod`

**Schema Design:**

1. **configurations** table
   - Stores WebPosto credentials (usuario, senha, codigoEmpresa)
   - Stores SwS API credentials (host, terminalId, acquirerId, clientId, password)
   - Currency configuration (default: "643")
   - Active/inactive flag for configuration management

2. **transactions** table
   - WebPosto transaction data (codigoEmpresa, codigoVenda, codigoVoucher)
   - Integration fields (idTransacao, tipoCodigo, valorCashBack)
   - Status tracking (pending, validated, sent, cancelled, failed)
   - SwS response data (swsStatus, swsRrn, swsResponse)
   - Timestamp tracking (createdAt, updatedAt, sentAt)

3. **transaction_products** table
   - Line items for each transaction
   - Foreign key relationship to transactions
   - Product details (descricao, quantidade, valorUnitario, etc.)

4. **transaction_payments** table
   - Payment method records per transaction
   - Foreign key relationship to transactions
   - Payment details (formaPagamento, valor)

5. **integration_logs** table
   - Comprehensive audit trail
   - Log levels (info, warning, error, debug)
   - Source tracking (webposto, sws, system)
   - Action categorization
   - Optional transaction association

6. **notification_settings** table
   - Webhook configuration (URL, enabled status)
   - Email configuration (recipients, enabled status)
   - Event type preferences (retry_failed, sws_error, webposto_error)
   - Single record per system

7. **notification_history** table
   - Record of all notifications sent
   - Type tracking (webhook, email)
   - Status tracking (sent, failed)
   - Event and payload details
   - Optional transaction association

8. **field_mappings** table (De-Para System)
   - Configurable field transformation rules for dynamic JSON transformation
   - Entity type categorization (product, transaction, payment, validate) to organize mappings logically
   - Source field from WebPosto JSON (optional for "fixed" type mappings)
   - Target field for SwS JSON (required)
   - Mapping type with four strategies:
     - `direct`: Simple 1:1 field copy (e.g., nomeProduto → name)
     - `fixed`: Assigns a constant value regardless of source (e.g., currency → "BRL")
     - `multiply_100`: Multiplies source value by 100 (currency conversion, e.g., R$10.50 → 1050)
     - `multiply_1000`: Multiplies source value by 1000 (quantity conversion, e.g., 1.5kg → 1500g)
   - Fixed value for constant assignments (used only with "fixed" mapping type)
   - Default value for fallback when source field is missing
   - Active/inactive status for temporary enabling/disabling without deletion
   - Auto-generated name field for identification
   - Timestamp tracking (createdAt, updatedAt)
   - Applied in priority order: active mappings fetched and applied sequentially during transformation

**Database Provider:**
- Neon serverless PostgreSQL
- Connection pooling with `@neondatabase/serverless`
- WebSocket support for serverless environments

### Integration Flow

**WebPosto → Middleware:**
1. Authentication endpoint validates WebPosto credentials
2. Validation endpoint processes transaction and returns idTransacao
3. Send endpoint submits validated transaction to SwS
4. Cancel endpoint handles transaction cancellation

**Middleware → SwS:**
1. Token acquisition with credential validation
2. Sale transaction submission with product details
3. Response processing and status mapping
4. Error handling with retry queue enrollment

**Error Handling & Resilience:**
- Automatic retry queue for failed SwS submissions
- Comprehensive logging at each integration point
- Transaction state machine (pending → validated → sent/failed)
- Graceful degradation with error responses

## External Dependencies

**Database:**
- Neon serverless PostgreSQL (DATABASE_URL environment variable required)
- Drizzle ORM for query building and migrations

**UI Component Libraries:**
- Radix UI primitives (dialogs, dropdowns, tooltips, etc.)
- Shadcn UI component system
- Lucide React for icons

**Development Tools:**
- Replit-specific plugins (vite-plugin-runtime-error-modal, vite-plugin-cartographer, vite-plugin-dev-banner)
- ESBuild for production bundling

**Third-Party APIs:**
- SwS Payment API (configured via swsHost)
  - Token-based authentication
  - Sale transaction submission
  - JSON-based request/response format

**Session & Security:**
- connect-pg-simple for PostgreSQL session storage
- Express session middleware
- Environment variable-based configuration

**Utility Libraries:**
- date-fns for date manipulation
- class-variance-authority for component variants
- clsx and tailwind-merge for className management
- nanoid for unique ID generation