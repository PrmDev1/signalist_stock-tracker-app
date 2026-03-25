import {serve} from "inngest/next";
import {inngest} from "@/lib/inngest/client";
import {monitorPriceAlerts, sendDailyNewsSummary, sendSignUpEmail} from "@/lib/inngest/functions";

export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [sendSignUpEmail, sendDailyNewsSummary, monitorPriceAlerts],
})
