import dotenv from "dotenv";
dotenv.config({ quiet: true, suppress: true });
export const config = {
    bsd: {
        apiKey: process.env.BSD_API_KEY,
        baseUrl: process.env.BSD_BASE_URL,

    }
}


