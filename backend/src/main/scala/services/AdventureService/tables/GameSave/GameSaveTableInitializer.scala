package services.AdventureService.tables.GameSave
import cats.effect.IO
import java.sql.Connection
import services.system.database.Database
object GameSaveTableInitializer:
  private val createSql = """CREATE TABLE IF NOT EXISTS game_saves(id TEXT PRIMARY KEY, adventure_id TEXT NOT NULL REFERENCES adventures(id), kind TEXT NOT NULL CHECK(kind IN ('auto','manual')), slot INT NOT NULL, saved_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(), snapshot JSONB NOT NULL, CHECK((kind='manual' AND slot BETWEEN 1 AND 5) OR (kind='auto' AND slot=0))); CREATE UNIQUE INDEX IF NOT EXISTS manual_slots ON game_saves(adventure_id,slot) WHERE kind='manual'"""
  def initialize(connection: Connection): IO[Unit] = Database.execute(connection, createSql).void
