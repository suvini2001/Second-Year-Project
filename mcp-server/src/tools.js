import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { docop } from "./docop.js";

// 1. Validate tool inputs
const isoDate = z
    .string()
    .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "Use YYYY-MM-DD, for example 2026-10-09"
    );

const doctorId = z
    .string()
    .regex(
        /^[a-f0-9]{24}$/i,
        "Use a doctorId returned by list_doctors"
    );

// 2. Declare that tools are read-only
const READ_ONLY = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
};

// 3. Reusable tool execution and error-handling wrapper
const run = (fn) => async (args) => {
    try {
        const data = await fn(args);

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(data),
                },
            ],
        };
    } catch (err) {
        return {
            isError: true,
            content: [
                {
                    type: "text",
                    text: err.message || "An unexpected error occurred.",
                },
            ],
        };
    }
};

// 4. Build the MCP server according to the authenticated scope
export function buildServer(scope) {
    const server = new McpServer({
        name: "docop",
        version: "1.0.0",
    });

    // Tool 1: List doctors
    server.registerTool(
        "list_doctors",
        {
            title: "List doctors",
            description:
                "List DocOp doctors with their doctorId, specialty, years of experience, fee (LKR), and booking availability. " +
                "Optionally filter by specialty, e.g. 'cardio' or 'Dermatologist'. " +
                "Use the doctorId with the other tools.",
            inputSchema: {
                specialty: z
                    .string()
                    .max(50)
                    .optional()
                    .describe(
                        "Part of a specialty name. Leave empty for all doctors."
                    ),
            },
            annotations: READ_ONLY,
        },
        run(({ specialty }) =>
            docop("/doctors", {
                specialty,
                onlyAvailable:
                    scope === "assistant" ? "true" : undefined,
            })
        )
    );

    // Tool 2: Get appointment availability
    server.registerTool(
        "get_availability",
        {
            title: "Get free appointment times",
            description:
                "Get free 30-minute appointment times in Sri Lanka time for one doctor on a future date.",
            inputSchema: {
                doctorId: doctorId.describe(
                    "doctorId returned by list_doctors"
                ),
                date: isoDate.describe(
                    "Date in YYYY-MM-DD format. Must be today or later."
                ),
            },
            annotations: READ_ONLY,
        },
        run(({ doctorId, date }) =>
            docop("/availability", { doctorId, date })
        )
    );

    // Patient-facing scope receives only the first two tools
    if (scope !== "admin") {
        return server;
    }

    // Tool 3: Get appointment statistics (admin only)
    server.registerTool(
        "get_appointment_stats",
        {
            title: "Appointment statistics",
            description:
                "Get appointment counts, including total, active, cancelled, completed, and paid appointments. " +
                "Optionally filter by date, booking period, or doctor.",
            inputSchema: {
                date: isoDate
                    .optional()
                    .describe("Appointments on this day, YYYY-MM-DD."),
                days: z
                    .number()
                    .int()
                    .min(1)
                    .max(90)
                    .optional()
                    .describe(
                        "Number of days for the booking-period query, from 1 to 90."
                    ),
                doctorId: doctorId
                    .optional()
                    .describe(
                        "Filter by a doctorId returned by list_doctors."
                    ),
            },
            annotations: READ_ONLY,
        },
        run(({ date, days, doctorId }) =>
            docop("/stats", { date, days, doctorId })
        )
    );

    // Tool 4: Get a daily appointment schedule (admin only)
    server.registerTool(
        "get_todays_schedule",
        {
            title: "Day schedule",
            description:
                "Get appointments for a day, sorted by time, including doctor, patient first name, status, and payment information. " +
                "Defaults to today in Sri Lanka time. Optionally filter by doctor.",
            inputSchema: {
                date: isoDate
                    .optional()
                    .describe(
                        "Date in YYYY-MM-DD format. Leave empty for today."
                    ),
                doctorId: doctorId
                    .optional()
                    .describe(
                        "Filter by a doctorId returned by list_doctors."
                    ),
            },
            annotations: READ_ONLY,
        },
        run(({ date, doctorId }) =>
            docop("/schedule", { date, doctorId })
        )
    );

    return server;
}
