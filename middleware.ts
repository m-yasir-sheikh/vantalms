import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { db } from "@/utils/db";
import { UserSubscription } from "@/utils/schema";
import { eq } from "drizzle-orm";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/dashboard/settings(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // First handle protected routes
  if (isProtectedRoute(req)) {
    auth().protect();

    // After protecting the route, check and create subscription if needed
    const userId = auth().userId;

    if (userId) {
      try {
        // Check if user already has a subscription
        const existingSubscription = await db
          .select()
          .from(UserSubscription)
          .where(eq(UserSubscription.userId, userId))
          .limit(1);

        // If no subscription exists, create one
        if (!existingSubscription || existingSubscription.length === 0) {
          await db
            .insert(UserSubscription)
            .values({
              userId: userId,
              stripeCustomerId: "not_set",
              stripeSubscriptionId: "not_set",
              stripePriceId: "not_set",
              stripeStatus: "inactive",
              plan: "free",
              credits: 10000,
              stripeCurrentPeriodEnd: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000
              ),
            })
            .execute();

          console.log("Created subscription for user:", userId);
        }
      } catch (error) {
        console.error("Error managing user subscription:", error);
        // Continue the request even if subscription creation fails
        // You might want to add some monitoring here for production
      }
    }
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
