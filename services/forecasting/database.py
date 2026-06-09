import os
import urllib.parse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Remove parameters which are not supported by psycopg2.
# Split at the last '@' to isolate credentials from host/query params,
# protecting password special characters (e.g. '?', '@') from urlparse.
if "@" in DATABASE_URL:
    credentials, host_part = DATABASE_URL.rsplit("@", 1)
else:
    credentials = ""
    host_part = DATABASE_URL

if "?" in host_part:
    base_host, query_str = host_part.split("?", 1)
    query_dict = urllib.parse.parse_qs(query_str)
    keys_to_remove = ['schema', 'pgbouncer', 'workaround']
    for actual_key in list(query_dict.keys()):
        if actual_key.lower() in keys_to_remove:
            del query_dict[actual_key]
    new_query = urllib.parse.urlencode(query_dict, doseq=True)
    if new_query:
        host_part = f"{base_host}?{new_query}"
    else:
        host_part = base_host

if credentials:
    DATABASE_URL = f"{credentials}@{host_part}"
else:
    DATABASE_URL = host_part

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
