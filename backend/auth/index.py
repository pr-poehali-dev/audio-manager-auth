import json
import os
import psycopg2
from urllib.parse import urlencode, parse_qs
import urllib.request

def handler(event: dict, context) -> dict:
    '''API для авторизации через Яндекс OAuth и регистрации пользователей'''
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    path = event.get('queryStringParameters', {})
    body_str = event.get('body', '{}')
    
    try:
        body = json.loads(body_str) if body_str else {}
    except:
        body = {}
    
    if method == 'POST' and body.get('action') == 'register':
        return register_user(body)
    
    elif method == 'POST' and body.get('action') == 'yandex_callback':
        return yandex_callback(body.get('code'))
    
    elif method == 'POST' and body.get('action') == 'get_user':
        return get_user(body.get('user_id'))
    
    elif method == 'POST' and body.get('action') == 'update_user':
        return update_user(body)
    
    elif method == 'POST' and body.get('action') == 'delete_user':
        return delete_user_account(body.get('user_id'))
    
    return {
        'statusCode': 400,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Invalid action'}),
        'isBase64Encoded': False
    }

def get_db_connection():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def register_user(data: dict) -> dict:
    first_name = data.get('first_name', '').strip()
    last_name = data.get('last_name', '').strip()
    phone = data.get('phone', '').strip()
    email = data.get('email', '').strip()
    
    if not first_name or not phone:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Имя и телефон обязательны'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(
            "INSERT INTO users (first_name, last_name, phone, email) VALUES (%s, %s, %s, %s) RETURNING id",
            (first_name, last_name, phone, email)
        )
        user_id = cur.fetchone()[0]
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'user_id': user_id, 'message': 'Регистрация успешна'}),
            'isBase64Encoded': False
        }
    except Exception as e:
        conn.rollback()
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()

def yandex_callback(code: str) -> dict:
    if not code:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'No code provided'}),
            'isBase64Encoded': False
        }
    
    client_id = os.environ.get('YANDEX_CLIENT_ID')
    client_secret = os.environ.get('YANDEX_CLIENT_SECRET')
    
    token_url = 'https://oauth.yandex.ru/token'
    token_data = urlencode({
        'grant_type': 'authorization_code',
        'code': code,
        'client_id': client_id,
        'client_secret': client_secret
    }).encode()
    
    req = urllib.request.Request(token_url, data=token_data, method='POST')
    req.add_header('Content-Type', 'application/x-www-form-urlencoded')
    
    try:
        with urllib.request.urlopen(req) as response:
            token_response = json.loads(response.read().decode())
            access_token = token_response.get('access_token')
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Token exchange failed: {str(e)}'}),
            'isBase64Encoded': False
        }
    
    info_url = 'https://login.yandex.ru/info?format=json'
    info_req = urllib.request.Request(info_url)
    info_req.add_header('Authorization', f'OAuth {access_token}')
    
    try:
        with urllib.request.urlopen(info_req) as response:
            user_info = json.loads(response.read().decode())
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Failed to get user info: {str(e)}'}),
            'isBase64Encoded': False
        }
    
    yandex_id = user_info.get('id')
    first_name = user_info.get('first_name', '')
    last_name = user_info.get('last_name', '')
    email = user_info.get('default_email', '')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("SELECT id, first_name, last_name, email FROM users WHERE yandex_id = %s", (yandex_id,))
        user = cur.fetchone()
        
        if user:
            user_id = user[0]
        else:
            cur.execute(
                "INSERT INTO users (yandex_id, first_name, last_name, email) VALUES (%s, %s, %s, %s) RETURNING id",
                (yandex_id, first_name, last_name, email)
            )
            user_id = cur.fetchone()[0]
            conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'user_id': user_id,
                'first_name': first_name,
                'last_name': last_name,
                'email': email
            }),
            'isBase64Encoded': False
        }
    except Exception as e:
        conn.rollback()
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()

def get_user(user_id: int) -> dict:
    if not user_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'User ID required'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("SELECT id, first_name, last_name, phone, email FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()
        
        if not user:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'User not found'}),
                'isBase64Encoded': False
            }
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'id': user[0],
                'first_name': user[1],
                'last_name': user[2],
                'phone': user[3],
                'email': user[4]
            }),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()

def update_user(data: dict) -> dict:
    user_id = data.get('user_id')
    if not user_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'User ID required'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        updates = []
        values = []
        
        if 'first_name' in data:
            updates.append('first_name = %s')
            values.append(data['first_name'])
        if 'last_name' in data:
            updates.append('last_name = %s')
            values.append(data['last_name'])
        if 'phone' in data:
            updates.append('phone = %s')
            values.append(data['phone'])
        if 'email' in data:
            updates.append('email = %s')
            values.append(data['email'])
        
        if not updates:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'No fields to update'}),
                'isBase64Encoded': False
            }
        
        values.append(user_id)
        query = f"UPDATE users SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP WHERE id = %s"
        cur.execute(query, values)
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'message': 'User updated successfully'}),
            'isBase64Encoded': False
        }
    except Exception as e:
        conn.rollback()
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()

def delete_user_account(user_id: int) -> dict:
    if not user_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'User ID required'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("UPDATE users SET yandex_id = NULL, phone = NULL, email = NULL WHERE id = %s", (user_id,))
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'message': 'Account deleted successfully'}),
            'isBase64Encoded': False
        }
    except Exception as e:
        conn.rollback()
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()
