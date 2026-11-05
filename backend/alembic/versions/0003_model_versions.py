"""model versions and training runs

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-02 10:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'model_versions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('version', sa.String(length=64), nullable=False),
        sa.Column('state', sa.String(length=16), nullable=False),
        sa.Column('progress', sa.Float(), nullable=True),
        sa.Column('message', sa.String(length=300), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('is_builtin', sa.Boolean(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('base_version', sa.String(length=64), nullable=True),
        sa.Column('trigger', sa.String(length=16), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('dataset', sa.JSON(), nullable=True),
        sa.Column('model_metadata', sa.JSON(), nullable=True),
        sa.Column('log', sa.Text(), nullable=True),
        sa.Column('started_by_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('activated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('activated_by_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['activated_by_id'], ['users.id']),
        sa.ForeignKeyConstraint(['started_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('version'),
    )
    op.create_index(op.f('ix_model_versions_state'), 'model_versions', ['state'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_model_versions_state'), table_name='model_versions')
    op.drop_table('model_versions')
