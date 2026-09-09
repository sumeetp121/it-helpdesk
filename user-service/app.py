from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import psycopg2


app = FastAPI(
    title="IT Helpdesk User Service",
    version="1.0.0"
)


# ---------------------------------------------------------
# PostgreSQL connection
# ---------------------------------------------------------

DB_CONFIG = {
    "host": "localhost",
    "database": "helpdesk_db",
    "user": "helpdesk_app",
    "password": "helpdesk123",
    "port": 5432
}


def get_connection():
    return psycopg2.connect(**DB_CONFIG)


# ---------------------------------------------------------
# User model
# ---------------------------------------------------------

class User(BaseModel):

    name: str

    email: str

    department: str = "IT"


# ---------------------------------------------------------
# Health
# ---------------------------------------------------------

@app.get("/health")
def health():

    return {
        "status": "healthy",
        "service": "user-service"
    }


# ---------------------------------------------------------
# Create User
# ---------------------------------------------------------

@app.post("/api/users")
def create_user(user: User):

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO users (name, email, department)
            VALUES (%s, %s, %s)
            RETURNING id, name, email, department
            """,
            (
                user.name,
                user.email,
                user.department
            )
        )

        new_user = cursor.fetchone()

        connection.commit()

        return {
            "id": new_user[0],
            "name": new_user[1],
            "email": new_user[2],
            "department": new_user[3]
        }

    except psycopg2.errors.UniqueViolation:

        connection.rollback()

        raise HTTPException(
            status_code=409,
            detail="Email already exists"
        )

    finally:

        cursor.close()
        connection.close()


# ---------------------------------------------------------
# Get All Users
# ---------------------------------------------------------

@app.get("/api/users")
def get_users():

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT id, name, email, department
            FROM users
            ORDER BY id
            """
        )

        rows = cursor.fetchall()

        users = []

        for row in rows:

            users.append({
                "id": row[0],
                "name": row[1],
                "email": row[2],
                "department": row[3]
            })

        return users

    finally:

        cursor.close()
        connection.close()


# ---------------------------------------------------------
# Get User
# ---------------------------------------------------------

@app.get("/api/users/{user_id}")
def get_user(user_id: int):

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT id, name, email, department
            FROM users
            WHERE id = %s
            """,
            (user_id,)
        )

        user = cursor.fetchone()

        if user is None:

            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        return {
            "id": user[0],
            "name": user[1],
            "email": user[2],
            "department": user[3]
        }

    finally:

        cursor.close()
        connection.close()


# ---------------------------------------------------------
# Update User
# ---------------------------------------------------------

@app.put("/api/users/{user_id}")
def update_user(
    user_id: int,
    user: User
):

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            UPDATE users
            SET name = %s,
                email = %s,
                department = %s
            WHERE id = %s
            RETURNING id, name, email, department
            """,
            (
                user.name,
                user.email,
                user.department,
                user_id
            )
        )

        updated_user = cursor.fetchone()

        if updated_user is None:

            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        connection.commit()

        return {
            "id": updated_user[0],
            "name": updated_user[1],
            "email": updated_user[2],
            "department": updated_user[3]
        }

    except psycopg2.errors.UniqueViolation:

        connection.rollback()

        raise HTTPException(
            status_code=409,
            detail="Email already exists"
        )

    finally:

        cursor.close()
        connection.close()


# ---------------------------------------------------------
# Delete User
# ---------------------------------------------------------

@app.delete("/api/users/{user_id}")
def delete_user(user_id: int):

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            DELETE FROM users
            WHERE id = %s
            RETURNING id
            """,
            (user_id,)
        )

        deleted_user = cursor.fetchone()

        if deleted_user is None:

            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        connection.commit()

        return {
            "message": "User deleted"
        }

    finally:

        cursor.close()
        connection.close()