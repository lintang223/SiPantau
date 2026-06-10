import psycopg2
import datetime
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

try:
    conn=psycopg2.connect(host='localhost',port=5050,dbname='sipantau',user='postgres',password='bola')
    cur=conn.cursor()
    cur.execute("INSERT INTO users (username,password,nama,divisi,level,can_export,can_manage_users,created_at) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)", ('testuser123', pwd_context.hash('123456'), 'Test User', 'balai_gakkum', 3, True, False, datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
    conn.rollback()
    print("SUCCESS")
except Exception as e:
    print("ERROR:", str(e))
