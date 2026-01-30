import json
import os
import psycopg2
from datetime import datetime, timedelta

def handler(event: dict, context) -> dict:
    '''API для управления наушниками, эквалайзером и историей использования'''
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    body_str = event.get('body', '{}')
    
    try:
        body = json.loads(body_str) if body_str else {}
    except:
        body = {}
    
    action = body.get('action')
    
    if action == 'add_headphone':
        return add_headphone(body)
    elif action == 'get_user_headphones':
        return get_user_headphones(body.get('user_id'))
    elif action == 'update_eq_settings':
        return update_eq_settings(body)
    elif action == 'delete_headphone':
        return delete_headphone(body.get('headphone_id'))
    elif action == 'set_active_headphone':
        return set_active_headphone(body)
    elif action == 'add_battery_log':
        return add_battery_log(body)
    elif action == 'get_battery_history':
        return get_battery_history(body.get('headphone_id'))
    elif action == 'add_usage_log':
        return add_usage_log(body)
    elif action == 'get_usage_history':
        return get_usage_history(body.get('headphone_id'))
    
    return {
        'statusCode': 400,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Invalid action'}),
        'isBase64Encoded': False
    }

def get_db_connection():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def add_headphone(data: dict) -> dict:
    user_id = data.get('user_id')
    device_name = data.get('device_name', '').strip()
    device_id = data.get('device_id', '').strip()
    
    if not user_id or not device_name or not device_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'user_id, device_name and device_id are required'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(
            "SELECT id FROM headphones WHERE user_id = %s AND device_id = %s",
            (user_id, device_id)
        )
        existing = cur.fetchone()
        
        if existing:
            cur.execute(
                "UPDATE headphones SET last_connected = CURRENT_TIMESTAMP, is_active = true WHERE id = %s RETURNING id",
                (existing[0],)
            )
            headphone_id = existing[0]
        else:
            cur.execute(
                "UPDATE headphones SET is_active = false WHERE user_id = %s",
                (user_id,)
            )
            cur.execute(
                "INSERT INTO headphones (user_id, device_name, device_id, is_active) VALUES (%s, %s, %s, true) RETURNING id",
                (user_id, device_name, device_id)
            )
            headphone_id = cur.fetchone()[0]
        
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'headphone_id': headphone_id, 'message': 'Headphone added successfully'}),
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

def get_user_headphones(user_id: int) -> dict:
    if not user_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'user_id required'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(
            """SELECT id, device_name, device_id, last_connected, is_active, 
                      eq_bass, eq_mid, eq_treble, sound_mode 
               FROM headphones WHERE user_id = %s ORDER BY last_connected DESC""",
            (user_id,)
        )
        headphones = cur.fetchall()
        
        result = []
        for h in headphones:
            result.append({
                'id': h[0],
                'device_name': h[1],
                'device_id': h[2],
                'last_connected': h[3].isoformat() if h[3] else None,
                'is_active': h[4],
                'eq_bass': h[5],
                'eq_mid': h[6],
                'eq_treble': h[7],
                'sound_mode': h[8]
            })
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'headphones': result}),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()

def update_eq_settings(data: dict) -> dict:
    headphone_id = data.get('headphone_id')
    
    if not headphone_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'headphone_id required'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        updates = []
        values = []
        
        if 'eq_bass' in data:
            updates.append('eq_bass = %s')
            values.append(data['eq_bass'])
        if 'eq_mid' in data:
            updates.append('eq_mid = %s')
            values.append(data['eq_mid'])
        if 'eq_treble' in data:
            updates.append('eq_treble = %s')
            values.append(data['eq_treble'])
        if 'sound_mode' in data:
            updates.append('sound_mode = %s')
            values.append(data['sound_mode'])
        
        if not updates:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'No settings to update'}),
                'isBase64Encoded': False
            }
        
        values.append(headphone_id)
        query = f"UPDATE headphones SET {', '.join(updates)} WHERE id = %s"
        cur.execute(query, values)
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'message': 'Settings updated successfully'}),
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

def delete_headphone(headphone_id: int) -> dict:
    if not headphone_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'headphone_id required'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("UPDATE headphones SET is_active = false WHERE id = %s", (headphone_id,))
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'message': 'Headphone removed successfully'}),
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

def set_active_headphone(data: dict) -> dict:
    user_id = data.get('user_id')
    headphone_id = data.get('headphone_id')
    
    if not user_id or not headphone_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'user_id and headphone_id required'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("UPDATE headphones SET is_active = false WHERE user_id = %s", (user_id,))
        cur.execute("UPDATE headphones SET is_active = true, last_connected = CURRENT_TIMESTAMP WHERE id = %s", (headphone_id,))
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'message': 'Active headphone set successfully'}),
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

def add_battery_log(data: dict) -> dict:
    headphone_id = data.get('headphone_id')
    battery_level = data.get('battery_level')
    
    if not headphone_id or battery_level is None:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'headphone_id and battery_level required'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(
            "INSERT INTO battery_history (headphone_id, battery_level) VALUES (%s, %s)",
            (headphone_id, battery_level)
        )
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'message': 'Battery log added'}),
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

def get_battery_history(headphone_id: int) -> dict:
    if not headphone_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'headphone_id required'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(
            "SELECT battery_level, recorded_at FROM battery_history WHERE headphone_id = %s ORDER BY recorded_at DESC LIMIT 100",
            (headphone_id,)
        )
        history = cur.fetchall()
        
        result = [{'battery_level': h[0], 'recorded_at': h[1].isoformat()} for h in history]
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'history': result}),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()

def add_usage_log(data: dict) -> dict:
    headphone_id = data.get('headphone_id')
    duration_minutes = data.get('duration_minutes')
    date_str = data.get('date')
    
    if not headphone_id or duration_minutes is None:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'headphone_id and duration_minutes required'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        if date_str:
            date_val = datetime.fromisoformat(date_str.replace('Z', '+00:00')).date()
        else:
            date_val = datetime.now().date()
        
        cur.execute(
            "INSERT INTO usage_history (headphone_id, duration_minutes, date) VALUES (%s, %s, %s)",
            (headphone_id, duration_minutes, date_val)
        )
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'message': 'Usage log added'}),
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

def get_usage_history(headphone_id: int) -> dict:
    if not headphone_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'headphone_id required'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(
            "SELECT duration_minutes, date FROM usage_history WHERE headphone_id = %s ORDER BY date DESC LIMIT 30",
            (headphone_id,)
        )
        history = cur.fetchall()
        
        result = [{'duration_minutes': h[0], 'date': h[1].isoformat()} for h in history]
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'history': result}),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()
