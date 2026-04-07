# Rootkit Identity Series — Video Summaries

---

## Video 1: Project Setup

Sets up the initial project structure by creating the solution, wiring the API and frontend, and preparing the environment for authentication features in later videos.

- Creates a new solution hosting an ASP.NET Core backend API and a separate frontend project
- Introduces folder structure and naming conventions for identity, security, and UI pieces
- Configures the backend API to later host ASP.NET Core Identity and authorization endpoints
- Connects a frontend SPA (likely React) to the backend, setting up communication patterns and auth routes
- Verifies the base app runs end-to-end before adding more complex identity logic

---

## Video 2: Adding ASP.NET Core Identity

Adds ASP.NET Core Identity to the app, sets up a separate identity database context, configures services, runs migrations, and explores the generated identity tables.

- Adds an `ApplicationUser` class inheriting from `IdentityUser` in the Data folder
- Creates `AuthIdentityDbContext` deriving from `IdentityDbContext<ApplicationUser>`, separating auth data from app data
- Adds a new connection string (e.g., `RootkitIdentityConnection`) to `appsettings.json`
- Registers the identity DB context and identity API endpoints in `Program.cs`
- Stresses that `UseAuthentication()` must be called before `UseAuthorization()` in middleware
- Maps identity API endpoints for login, logout, and registration via `app.MapIdentityApi<ApplicationUser>()`
- Runs migrations with `dotnet ef migrations add` and `dotnet ef database update`
- Inspects generated tables: users, roles, user-roles join table, login, and claims tables

---

## Video 3: Auth Session Endpoint

Adds a "current session" endpoint on the backend and wires up a matching auth session type and API helper on the React frontend, then tests via Swagger and SQLite.

- Confirms Identity endpoints are visible in Swagger (register, login, refresh, 2FA, etc.)
- Creates `AuthController` with a `GET /api/auth/me` endpoint returning authentication status, username, email, and roles
- Returns `isAuthenticated: false` with null fields when unauthenticated
- Returns `isAuthenticated: true` with username, email, and sorted distinct roles when authenticated
- Adds a frontend `AuthSession` interface mirroring the backend response shape
- Adds a `getAuthSession` function fetching `/api/auth/me` with `credentials: "include"` for cookie auth
- Tests via Swagger: registers a user, logs in, confirms `/auth/me` returns authenticated state
- Opens SQLite to verify the user record exists; notes no roles are assigned yet

---

## Video 4: Login, Register, and Logout

Wires up login, register, and logout for the ASP.NET Core Identity backend with a React/TypeScript frontend, including API endpoints, frontend helpers, routes, and basic pages.

- Adds a logout endpoint to the auth controller using `SignInManager.SignOutAsync`
- Injects `SignInManager` alongside `UserManager` in the controller constructor
- Adds error-handling helpers in the TypeScript auth API module
- Implements `registerUser`, `loginUser`, and `logoutUser` async functions using `credentials: 'include'`
- Updates `App.tsx` to register routes for `/login`, `/register`, and `/logout`
- Enhances the header with `NavLinks` for catalog, cart, login, and register
- Creates `LoginPage` with email, password, rememberMe state, and navigation to catalog on success
- Creates `RegisterPage` with client-side password match check before calling the API
- Creates a simple `LogoutPage` that invalidates the auth cookie
- Confirms the full register/login/logout flow works end-to-end

---

## Video 5: Frontend Auth Context

Adds a frontend authentication context in React to track auth state globally, show login status in the header, and refresh state after login/logout.

- Creates an auth context using `createContext`, `useState`, `useCallback`, and `useEffect`
- Defines an anonymous session object for unauthenticated users
- Implements `AuthProvider` that calls `getAuthSession` on mount and falls back to anonymous session on error
- Implements a `useAuth` hook that throws a helpful error if used outside `AuthProvider`
- Wraps the app tree in `AuthProvider` alongside the existing cart provider
- Updates the header to conditionally show "signed in as username" or "signed out" badge
- Updates login and logout pages to call `refreshAuthSession` after success
- Debugs a bug where the login cookie was not being set due to a missing `usingCookies` flag

---

## Video 6: Role-Based Authorization

Configures role-based authorization by defining roles and policies, seeding an admin user, protecting backend endpoints, and wiring up admin APIs and pages.

- Defines `customer` and `admin` roles in a central shared data file
- Adds a `ManageCatalog` authorization policy requiring the admin role
- Creates a generator class that seeds roles and a default admin user from `appsettings.json` on startup
- Updates `Program.cs` to include Identity roles and register the `ManageCatalog` policy
- Invokes the generator inside a scoped block after app build, guarded against duplicate assignments
- Adds admin-only endpoints to `RootBeersController` decorated with `[Authorize(Policy = AuthPolicies.ManageCatalog)]`
- Extends the root beer API client with functions for the admin endpoint and root beer creation
- Adds an `AdminRootBeerPage` React component with a creation form and managed item table
- Updates the header to compute an `isAdmin` flag and conditionally show an "Admin" nav link
- Confirms authorization and UI behavior work correctly after fixing seeding and role-assignment bugs

---

## Video 7: Security Hardening

Hardens the app by strengthening password policies, securing authentication cookies, and adding security headers including CSP and HSTS.

- Argues default Identity password settings are weak; reconfigures to require only minimum length (14+ characters), dropping digit/uppercase/symbol requirements in favor of passphrases
- Explains auth cookies must not be accessible from JavaScript
- Hardens cookie options: `HttpOnly: true`, `SecurePolicy` always HTTPS, `SameSite: Lax`, configures expiration and sliding expiration
- Creates `SecurityHeaders.cs` in a new `Infrastructure` folder to centralize security header logic
- Defines a restrictive CSP allowing only same-origin resources by default
- Wires security headers into `Program.cs`, skipping CSP in development and for Swagger
- Enables HSTS for non-development environments
- Verifies via browser dev tools that CSP header is present and the Identity cookie is `HttpOnly`, `Secure`, and `SameSite=Lax`

---

## Video 8: Registration and Password Policy Check

Short clarification video confirming the registration page is already implemented and working.

- Registration page is only visible when logged out
- Demonstrates failing registration with a short password, then succeeding with a longer one
- Confirms the current password policy enforces minimum length only, with no special character requirement
- Notes the UI could be improved

---

## Video 9: TOTP Multi-Factor Authentication

Integrates TOTP multi-factor authentication into the app using ASP.NET Core Identity's built-in two-factor endpoints and a React frontend.

- Chooses TOTP (no SMS, push, or hardware keys required); notes Identity two-factor endpoints already exist
- Adds a `TwoFactorStatus` TypeScript type: `sharedKey`, `recoveryCodesLeft`, `recoveryCodes`, `isTwoFactorEnabled`, `isMachineRemembered`
- Adds auth API helpers: fetch status, enable/disable two-factor, reset recovery codes
- Extends `loginUser` to accept optional `twoFactorCode` and `twoFactorRecoveryCode` parameters
- Registers a new "Manage MFA" route and adds an "MFA" header link for authenticated users
- Adds TOTP code and recovery code inputs to the login page
- Creates `ManageMFAPage` that fetches two-factor status, renders a QR code via `otpauth://` URI, and handles enable/disable/reset flows
- Demonstrates QR code scanning with an authenticator app; confirms TOTP login and recovery code fallback work
- Notes the login UX is "kludgy" with always-visible MFA fields; recommends a two-step flow in production

---

## Video 10: Google OAuth (Third-Party Authentication)

Adds Google-based third-party authentication including secure secret storage, backend wiring, frontend changes, and a live demo.

- Reviews ASP.NET Core external auth provider documentation; selects Google as the easiest option
- Creates a Google OAuth client in Google Cloud with an authorized redirect URI pointing to the backend
- Stores `ClientId` and `ClientSecret` securely using `dotnet user-secrets`
- Adds the `Microsoft.AspNetCore.Authentication.Google` NuGet package
- Configures Google auth in `Program.cs` using secrets from `builder.Configuration`
- Adds endpoints to the auth controller: list external providers, start login challenge, handle callback
- Callback handler processes the Google result, creates or signs in a user by email
- Adds `ExternalOAuthProvider` TypeScript interface and helper functions on the frontend
- Updates the login page to fetch available providers and render a "Continue with Google" button
- Debugs a redirect URI mismatch by updating the Google console to point to the backend port
- Confirms Google sign-in works end-to-end; summarizes the app now supports password auth, TOTP MFA, and Google OAuth

---

## Video 11: Cookie Consent

Adds a GDPR-style cookie consent feature including context, banner, policy page, and basic compliance behavior.

- Explains why a custom solution is needed instead of the built-in ASP.NET cookie consent (Razor/Blazor only)
- Creates a `CookieConsentContext` exposing a consent boolean and setter
- Adds a `CookieConsentBanner` component that shows a message about auth cookies and an acknowledgement action
- Creates a basic cookie policy page describing cookie usage and what is not done (e.g., no analytics)
- Wraps relevant components in `CookieConsentProvider` in the main app file
- Adds a route and navigation link for the cookie policy page
- Adds minimal CSS for the banner
- Demonstrates banner persisting across pages until acknowledged, disappearing on acknowledgement, and reappearing after clearing cookies
- Notes full GDPR compliance requires a real privacy policy and more robust handling
