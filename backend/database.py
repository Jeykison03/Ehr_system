import os
import re
import logging
from contextlib import contextmanager
from pathlib import Path
import psycopg2
from psycopg2.pool import ThreadedConnectionPool
from psycopg2.extras import RealDictCursor
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

# Load environment variables relative to this script's directory
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

logger = logging.getLogger("MiniEHR-Database")

# Determine Database connection URL
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    supabase_url = os.environ.get("SUPABASE_URL", "")
    db_password = os.environ.get("DB_PASSWORD") or os.environ.get("POSTGRES_PASSWORD", "")
    if supabase_url and db_password and db_password != "your_supabase_db_password":
        match = re.search(r"https://(.*?)\.supabase\.co", supabase_url)
        if match:
            ref = match.group(1)
            # Use SSL Mode required for Supabase cloud (connecting over the IPv4 pooler at eu-west-1 on port 6543)
            DATABASE_URL = f"postgresql://postgres.{ref}:{db_password}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require"

db_pool = None

def init_db_pool():
    global db_pool
    if not DATABASE_URL or "your_supabase_db_password" in DATABASE_URL:
        logger.warning(
            "DATABASE_URL or DB_PASSWORD is not set or still contains the placeholder! "
            "Please configure database credentials in your backend/.env file."
        )
        return False
    try:
        # Use ThreadedConnectionPool for concurrent FastAPI uvicorn calls
        db_pool = ThreadedConnectionPool(1, 20, dsn=DATABASE_URL)
        logger.info("Database connection pool initialized successfully.")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize database connection pool: {e}")
        return False

# Initialize on module load
init_db_pool()

@contextmanager
def get_db_connection():
    global db_pool
    # Try initializing if it wasn't initialized
    if not db_pool:
        initialized = init_db_pool()
        if not initialized:
            raise Exception("Database is not connected. Make sure you set your DB_PASSWORD in backend/.env.")
    
    conn = db_pool.getconn()
    try:
        yield conn
    finally:
        db_pool.putconn(conn)

def execute_query(query: str, params: tuple = None, fetch: str = "all"):
    """
    Executes a raw SQL query.
    fetch can be: 
      - "all": fetch all rows (returns list of dicts)
      - "one": fetch a single row (returns a single dict or None)
      - "none": do not fetch (returns None)
    """
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params or ())
            conn.commit()
            
            # Check if query returned rows (e.g. SELECT or INSERT/DELETE with RETURNING)
            if cur.description is not None:
                if fetch == "all":
                    return cur.fetchall()
                elif fetch == "one":
                    return cur.fetchone()
            return None
