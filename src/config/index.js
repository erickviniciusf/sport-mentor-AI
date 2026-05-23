import dotenv from "dotenv"; 
dotenv.config(); 

export const config = {
    bsd: {
        apiKey: process.env.BSD_API_KEY,
        baseUrl: process.env.BSD_BASE_URL,

    }
}