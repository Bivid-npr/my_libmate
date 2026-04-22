# test_db_direct.py - Standalone database connection test
import os
from dotenv import load_dotenv
import pymysql

# Load .env
load_dotenv()

print("=" * 50)
print("Database Connection Test")
print("=" * 50)

# Get credentials
db_host = os.getenv('DB_HOST', '127.0.0.1')
db_port = int(os.getenv('DB_PORT', '3306'))
db_user = os.getenv('DB_USER', 'root')
db_password = os.getenv('DB_PASSWORD', '')
db_name = 'libmate_test'  # Force test database

print(f"Host: {db_host}")
print(f"Port: {db_port}")
print(f"User: {db_user}")
print(f"Password: {'*' * len(db_password) if db_password else 'EMPTY'}")
print(f"Database: {db_name}")

# Try direct connection
try:
    connection = pymysql.connect(
        host=db_host,
        port=db_port,
        user=db_user,
        password=db_password,
        database=db_name,
        charset='utf8mb4'
    )
    print("\n✓ Successfully connected to MySQL!")
    
    # Test query
    with connection.cursor() as cursor:
        cursor.execute("SELECT DATABASE()")
        result = cursor.fetchone()
        print(f"✓ Current database: {result[0]}")
        
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        print(f"✓ Users in database: {user_count}")
    
    connection.close()
    print("\n✓ All tests passed!")
    
except Exception as e:
    print(f"\n✗ Connection failed: {e}")