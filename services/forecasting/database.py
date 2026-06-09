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

# Remove parameters which are not supported by psycopg2
parsed = urllib.parse.urlparse(DATABASE_URL)
query_dict = urllib.parse.parse_qs(parsed.query)
keys_to_remove = ['schema', 'pgbouncer', 'workaround']
for actual_key in list(query_dict.keys()):
    if actual_key.lower() in keys_to_remove:
        del query_dict[actual_key]
new_query = urllib.parse.urlencode(query_dict, doseq=True)
DATABASE_URL = urllib.parse.urlunparse(parsed._replace(query=new_query))

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
