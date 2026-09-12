from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import psycopg2


app = FastAPI(
    title="IT Helpdesk Notification Service",
    version="1.0.0"
)


# ---------------------------------------------------------
# PostgreSQL configuration
# ---------------------------------------------------------

DB_CONFIG = {
    "host": "it-helpdesk-postgres",
    "database": "helpdesk_db",
    "user": "helpdesk_app",
    "password": "helpdesk123",
    "port": 5432
}


def get_connection():
    return psycopg2.connect(**DB_CONFIG)


# ---------------------------------------------------------
# Notification model
# ---------------------------------------------------------

class Notification(BaseModel):
    user_id: int
    message: str
    ticket_id: int
    read: bool = False


# ---------------------------------------------------------
# Health
# ---------------------------------------------------------

@app.get("/health")
def health():

    try:

        connection = get_connection()
        connection.close()

        return {
            "status": "healthy",
            "service": "notification-service"
        }

    except Exception:

        return {
            "status": "unhealthy",
            "service": "notification-service"
        }


# ---------------------------------------------------------
# Create Notification
# ---------------------------------------------------------

@app.post("/api/notifications")
def create_notification(notification: Notification):

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO notifications
            (user_id, message, ticket_id, read)
            VALUES (%s, %s, %s, %s)
            RETURNING id, user_id, message, ticket_id, read
            """,
            (
                notification.user_id,
                notification.message,
                notification.ticket_id,
                notification.read
            )
        )

        row = cursor.fetchone()

        connection.commit()

        return {
            "id": row[0],
            "user_id": row[1],
            "message": row[2],
            "ticket_id": row[3],
            "read": row[4]
        }

    finally:

        cursor.close()
        connection.close()


# ---------------------------------------------------------
# Get All Notifications
# ---------------------------------------------------------

@app.get("/api/notifications")
def get_notifications():

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT id, user_id, message, ticket_id, read
            FROM notifications
            ORDER BY id
            """
        )

        rows = cursor.fetchall()

        notifications = []

        for row in rows:

            notifications.append({
                "id": row[0],
                "user_id": row[1],
                "message": row[2],
                "ticket_id": row[3],
                "read": row[4]
            })

        return notifications

    finally:

        cursor.close()
        connection.close()


# ---------------------------------------------------------
# Get Notification
# ---------------------------------------------------------

@app.get("/api/notifications/{notification_id}")
def get_notification(notification_id: int):

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT id, user_id, message, ticket_id, read
            FROM notifications
            WHERE id = %s
            """,
            (notification_id,)
        )

        row = cursor.fetchone()

        if row is None:

            raise HTTPException(
                status_code=404,
                detail="Notification not found"
            )

        return {
            "id": row[0],
            "user_id": row[1],
            "message": row[2],
            "ticket_id": row[3],
            "read": row[4]
        }

    finally:

        cursor.close()
        connection.close()


# ---------------------------------------------------------
# Update Notification
# ---------------------------------------------------------

@app.put("/api/notifications/{notification_id}")
def update_notification(
    notification_id: int,
    notification: Notification
):

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            UPDATE notifications
            SET user_id = %s,
                message = %s,
                ticket_id = %s,
                read = %s
            WHERE id = %s
            RETURNING id, user_id, message, ticket_id, read
            """,
            (
                notification.user_id,
                notification.message,
                notification.ticket_id,
                notification.read,
                notification_id
            )
        )

        row = cursor.fetchone()

        if row is None:

            raise HTTPException(
                status_code=404,
                detail="Notification not found"
            )

        connection.commit()

        return {
            "id": row[0],
            "user_id": row[1],
            "message": row[2],
            "ticket_id": row[3],
            "read": row[4]
        }

    finally:

        cursor.close()
        connection.close()


# ---------------------------------------------------------
# Delete Notification
# ---------------------------------------------------------

@app.delete("/api/notifications/{notification_id}")
def delete_notification(notification_id: int):

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            DELETE FROM notifications
            WHERE id = %s
            RETURNING id
            """,
            (notification_id,)
        )

        row = cursor.fetchone()

        if row is None:

            raise HTTPException(
                status_code=404,
                detail="Notification not found"
            )

        connection.commit()

        return {
            "message": "Notification deleted"
        }

    finally:

        cursor.close()
        connection.close()


# ---------------------------------------------------------
# Delete Notifications For Ticket
# ---------------------------------------------------------

@app.delete("/api/notifications/ticket/{ticket_id}")
def delete_ticket_notifications(ticket_id: int):

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            DELETE FROM notifications
            WHERE ticket_id = %s
            RETURNING id
            """,
            (ticket_id,)
        )

        deleted_rows = cursor.fetchall()

        connection.commit()

        return {
            "message": "Ticket notifications deleted",
            "ticket_id": ticket_id,
            "deleted_count": len(deleted_rows)
        }

    finally:

        cursor.close()
        connection.close()