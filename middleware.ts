
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "SUPPORT",
  "BILLING",
];

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // ADMIN PORTAL
    if (pathname.startsWith("/admin")) {
      if (!token) {
        return NextResponse.redirect(
          new URL("/admin/login", req.url)
        );
      }

      if (ADMIN_ROLES.includes(token.role as string)) {
        return NextResponse.next();
      }

      if (token.role === "CUSTOMER") {
        return NextResponse.redirect(
          new URL("/dashboard", req.url)
        );
      }

      return NextResponse.redirect(
        new URL("/admin/login", req.url)
      );
    }

    // CUSTOMER PORTAL
    if (pathname.startsWith("/dashboard")) {
      if (!token) {
        return NextResponse.redirect(
          new URL("/login", req.url)
        );
      }

      if (ADMIN_ROLES.includes(token.role as string)) {
        return NextResponse.redirect(
          new URL("/admin", req.url)
        );
      }

      if (token.role !== "CUSTOMER") {
        return NextResponse.redirect(
          new URL("/login", req.url)
        );
      }

      // Force customers to change temporary passwords
      if (
        token.mustChangePassword === true &&
        pathname !== "/dashboard/change-password"
      ) {
        return NextResponse.redirect(
          new URL("/dashboard/change-password", req.url)
        );
      }

      // Don't allow customers who already changed their
      // password to revisit the password-change page.
      if (
        token.mustChangePassword !== true &&
        pathname === "/dashboard/change-password"
      ) {
        return NextResponse.redirect(
          new URL("/dashboard", req.url)
        );
      }

      return NextResponse.next();
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true,
    },
  }
);

export const config = {
  matcher: [
    "/admin",
    "/admin/((?!login).*)",
    "/dashboard",
    "/dashboard/:path*",
  ],
};
