import logging
import os
from logging.handlers import RotatingFileHandler

# Ensure the logs directory exists
LOGS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
os.makedirs(LOGS_DIR, exist_ok=True)

# Main log file path
LOG_FILE = os.path.join(LOGS_DIR, "app.log")

def setup_logger(name: str) -> logging.Logger:
    """Configures and returns a logger with the given name."""
    logger = logging.getLogger(name)
    
    # Only configure if it hasn't been configured yet
    if not logger.handlers:
        logger.setLevel(logging.DEBUG)
        
        # Formatter: Timestamp - LoggerName - Level - Message
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        # Rotating File Handler (max 5MB per file, keep 3 backups)
        file_handler = RotatingFileHandler(
            LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=3
        )
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(formatter)
        
        # Console Handler for terminal output
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO) # Keep terminal less noisy (INFO/ERROR)
        console_handler.setFormatter(formatter)
        
        logger.addHandler(file_handler)
        logger.addHandler(console_handler)
        
    return logger
