package services.AdventureService.tables.Adventure
import cats.effect.IO
import java.sql.Connection
import services.system.database.Database
object AdventureTableInitializer:
  private val createSql = """CREATE TABLE IF NOT EXISTS adventures(id TEXT PRIMARY KEY, player_id TEXT NOT NULL REFERENCES players(id), difficulty TEXT NOT NULL CHECK(difficulty IN ('easy','hard')), created_at TIMESTAMPTZ NOT NULL DEFAULT now())"""
  def initialize(connection: Connection): IO[Unit] = Database.execute(connection, createSql).void
