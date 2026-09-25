"""Initial migration - create all tables

Revision ID: 001_initial
Revises: 
Create Date: 2025-09-25 10:45:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=True)

    # Create products table
    op.create_table(
        'products',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('sku', sa.String(), nullable=False),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('unit_price', sa.Float(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('sku'),
    )
    op.create_index(op.f('ix_products_id'), 'products', ['id'], unique=True)
    op.create_index(op.f('ix_products_name'), 'products', ['name'])
    op.create_index(op.f('ix_products_sku'), 'products', ['sku'], unique=True)

    # Create batches table
    op.create_table(
        'batches',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('batch_number', sa.String(), nullable=False),
        sa.Column('quantity_received', sa.Float(), nullable=False),
        sa.Column('quantity_remaining', sa.Float(), nullable=False),
        sa.Column('expiry_date', sa.Date(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('days_remaining', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_batches_batch_number'), 'batches', ['batch_number'])
    op.create_index(op.f('ix_batches_expiry_date'), 'batches', ['expiry_date'])
    op.create_index(op.f('ix_batches_id'), 'batches', ['id'], unique=True)
    op.create_index(op.f('ix_batches_status'), 'batches', ['status'])

    # Create sales table
    op.create_table(
        'sales',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('quantity_sold', sa.Float(), nullable=False),
        sa.Column('sale_date', sa.Date(), nullable=False),
        sa.Column('revenue', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_sales_id'), 'sales', ['id'], unique=True)

    # Create alerts table
    op.create_table(
        'alerts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('batch_id', sa.Integer(), nullable=False),
        sa.Column('alert_type', sa.String(), nullable=False),
        sa.Column('message', sa.String(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['batch_id'], ['batches.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_alerts_alert_type'), 'alerts', ['alert_type'])
    op.create_index(op.f('ix_alerts_created_at'), 'alerts', ['created_at'])
    op.create_index(op.f('ix_alerts_id'), 'alerts', ['id'], unique=True)
    op.create_index(op.f('ix_alerts_is_read'), 'alerts', ['is_read'])

    # Create insights table
    op.create_table(
        'insights',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=True),
        sa.Column('insight_type', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('metric_value', sa.Float(), nullable=True),
        sa.Column('metric_unit', sa.String(), nullable=True),
        sa.Column('generated_at', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_insights_id'), 'insights', ['id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_insights_id'), table_name='insights')
    op.drop_table('insights')
    op.drop_index(op.f('ix_alerts_is_read'), table_name='alerts')
    op.drop_index(op.f('ix_alerts_id'), table_name='alerts')
    op.drop_index(op.f('ix_alerts_created_at'), table_name='alerts')
    op.drop_index(op.f('ix_alerts_alert_type'), table_name='alerts')
    op.drop_table('alerts')
    op.drop_index(op.f('ix_sales_id'), table_name='sales')
    op.drop_table('sales')
    op.drop_index(op.f('ix_batches_status'), table_name='batches')
    op.drop_index(op.f('ix_batches_id'), table_name='batches')
    op.drop_index(op.f('ix_batches_expiry_date'), table_name='batches')
    op.drop_index(op.f('ix_batches_batch_number'), table_name='batches')
    op.drop_table('batches')
    op.drop_index(op.f('ix_products_sku'), table_name='products')
    op.drop_index(op.f('ix_products_name'), table_name='products')
    op.drop_index(op.f('ix_products_id'), table_name='products')
    op.drop_table('products')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
