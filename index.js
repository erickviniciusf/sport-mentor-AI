import { startDashboard } from "./src/ui/dashboard.js";
import { startMonitor } from "./src/services/monitorService.js";
import { setupGlobalErrorHandlers } from "./src/core/index.js";
import { logger } from "./src/utils/logger.js";

// Inicializar handlers de erro globais
setupGlobalErrorHandlers();

logger.info("Sport Mentor v1.0.1 starting...");

startMonitor();
startDashboard(); 
