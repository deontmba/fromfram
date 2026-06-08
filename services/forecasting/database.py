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
for key in ['schema', 'pgbouncer', 'workaround']:
    if key in query_dict:
        del query_dict[key]
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
