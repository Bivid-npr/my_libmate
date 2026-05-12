# app/api/socket_events.py
"""Socket event handlers for real-time notifications."""
from flask import request
from flask_socketio import join_room
from flask_jwt_extended import decode_token
from .. import socketio
import logging

logger = logging.getLogger(__name__)


@socketio.on('connect')
def handle_connect():
    token = request.args.get('token')
    
    if not token:
        join_room('guest_room')
        return
    
    try:
        # Use jwt directly to decode the raw claims
        import jwt
        decoded = jwt.decode(token, options={"verify_signature": False})
        
        user_type = decoded.get('type', '')
        user_sub = decoded.get('sub', '')
        
        print(f"[SOCKET] DECODED - type='{user_type}', sub='{user_sub}'")
        
        if user_type == 'admin':
            join_room('admin_room')
            print(f"[SOCKET] ✅ Admin joined admin_room")
        elif user_sub:
            join_room(f'user_{user_sub}')
            print(f"[SOCKET] User joined user_{user_sub}")
        else:
            join_room('guest_room')
            
    except Exception as e:
        print(f"[SOCKET] Error: {e}")
        join_room('guest_room')

def notify_admins_socket(data):
    """Send real-time notification to all connected admins."""
    socketio.emit('new_notification', data, room='admin_room')
    print(f"[SOCKET] Emitted to admin_room: {data.get('title')}")


def notify_user_socket(user_id, data):
    """Send real-time notification to a specific user."""
    socketio.emit('user_notification', data, room=f'user_{user_id}')
    print(f"[SOCKET] Emitted to user_{user_id}: {data.get('title')}")