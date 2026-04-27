# app/api/socket_events.py
"""Socket event handlers for real-time notifications"""
from .. import socketio
from flask_socketio import join_room, leave_room

def notify_admins_socket(data):
    """Send real-time notification to all connected admins"""
    socketio.emit('new_notification', data, room='admin_room')

def notify_user_socket(user_id, data):
    """Send real-time notification to a specific user"""
    socketio.emit('user_notification', data, room=f'user_{user_id}')

@socketio.on('connect')
def handle_connect():
    """Join rooms based on user type"""
    from flask import request
    # This is handled in __init__.py already
    pass