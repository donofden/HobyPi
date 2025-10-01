"""add_default_viewer_user

Revision ID: 1b7ccaa30592
Revises: 0001_init
Create Date: 2025-10-01 16:42:58.455710

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = '1b7ccaa30592'
down_revision = '0001_init'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create connection
    conn = op.get_bind()
    
    # Insert default roles if they don't exist
    conn.execute(text("""
        INSERT INTO roles (name, scopes, created_at, updated_at) 
        VALUES 
            ('viewer', 'users:read system:read', NOW(), NOW()),
            ('editor', 'users:read users:write system:read', NOW(), NOW()),
            ('admin', 'users:read users:write admin system:read', NOW(), NOW())
        ON CONFLICT (name) DO NOTHING;
    """))
    
    # Insert default admin user if it doesn't exist (using PBKDF2 hash)
    # Password: letmein
    conn.execute(text("""
        INSERT INTO users (username, email, full_name, password_hash, is_active, created_at, updated_at)
        VALUES ('admin', 'admin@local', 'Administrator', 
                '$pbkdf2-sha256$29000$G6P03ptTSgkBYOwdQ.j9Pw$y8jdYQQKKaZGWdqp8v8AevBpNE3WYs.L9mOTmm.SWS4', 
                true, NOW(), NOW())
        ON CONFLICT (username) DO NOTHING;
    """))
    
    # Insert default viewer user
    # Password: viewpass  
    conn.execute(text("""
        INSERT INTO users (username, email, full_name, password_hash, is_active, created_at, updated_at)
        VALUES ('viewer', 'viewer@local', 'System Viewer', 
                '$pbkdf2-sha256$29000$bU3pPSeE8D4nRMgZAyAkpA$A8oJdOTnQQcE7KQXj2mLxl6DjZvR5KyOjEpFhUrJfDE', 
                true, NOW(), NOW())
        ON CONFLICT (username) DO NOTHING;
    """))
    
    # Assign admin role to admin user
    conn.execute(text("""
        INSERT INTO user_roles (user_id, role_id)
        SELECT u.id, r.id 
        FROM users u, roles r 
        WHERE u.username = 'admin' AND r.name = 'admin'
        ON CONFLICT DO NOTHING;
    """))
    
    # Assign viewer role to viewer user  
    conn.execute(text("""
        INSERT INTO user_roles (user_id, role_id)
        SELECT u.id, r.id 
        FROM users u, roles r 
        WHERE u.username = 'viewer' AND r.name = 'viewer'
        ON CONFLICT DO NOTHING;
    """))


def downgrade() -> None:
    # Remove default users and their role assignments
    conn = op.get_bind()
    
    # Remove role assignments for default users
    conn.execute(text("""
        DELETE FROM user_roles 
        WHERE user_id IN (
            SELECT id FROM users WHERE username IN ('admin', 'viewer')
        );
    """))
    
    # Remove default users
    conn.execute(text("""
        DELETE FROM users WHERE username IN ('admin', 'viewer');
    """))
    
    # Remove default roles (optional - only if they have no other users)
    conn.execute(text("""
        DELETE FROM roles 
        WHERE name IN ('viewer', 'editor', 'admin') 
        AND id NOT IN (SELECT DISTINCT role_id FROM user_roles);
    """))