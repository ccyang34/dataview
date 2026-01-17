
import os
import logging
from data_engine import DataEngine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("sync.log")
    ]
)
logger = logging.getLogger(__name__)

def main():
    logger.info("Starting scheduled data sync...")
    try:
        engine = DataEngine()
        result = engine.sync_data()
        logger.info(f"Sync result: {result}")
    except Exception as e:
        logger.error(f"Fatal error during sync: {e}")
        exit(1)

if __name__ == "__main__":
    from dotenv import load_dotenv
    # Load env from parent directory
    load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env.local'))
    main()
