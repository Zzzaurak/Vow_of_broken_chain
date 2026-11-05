package services.PlayerService.tables.PlayerSession
import cats.effect.IO
import java.sql.Connection
import services.system.database.Database
object PlayerSessionTableInitializer:
  private val createSql = """CREATE TABLE IF NOT EXISTS player_sessions(token_hash TEXT PRIMARY KEY, player_id TEXT NOT NULL REFERENCES players(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now())"""
  def initialize(connection: Connection): IO[Unit] = Database.execute(connection, createSql).void
