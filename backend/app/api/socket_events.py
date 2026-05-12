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
    """Authenticate socket connection and join appropriate room."""
    token = request.args.get('token')
    
    if not token:
        join_room('guest_room')
        return
    
    try:
        decoded = decode_token(token)
        
        # flask-jwt-extended stores additional claims in 'sub' and nested dict
        additional = decoded.get('additional_claims') or {}
        user_type = additional.get('type', '')
        user_sub = decoded.get('sub', '')
        
        if user_type == 'admin':
            join_room('admin_room')
            logger.debug("Admin joined admin_room (sub=%s)", user_sub)
        elif user_sub:
            join_room(f'user_{user_sub}')
            logger.debug("User joined user_%s", user_sub)
        else:
            join_room('guest_room')
            
    except Exception as e:
        logger.warning("Socket authentication failed: %s", e)
        join_room('guest_room')


def notify_admins_socket(data):
    """Send real-time notification to all connected admins."""
    socketio.emit('new_notification', data, room='admin_room')


def notify_user_socket(user_id, data):
    """Send real-time notification to a specific user."""
    socketio.emit('user_notification', data, room=f'user_{user_id}')