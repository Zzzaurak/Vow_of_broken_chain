package services.AdventureService.tables.ProgressOperation
import cats.effect.IO
import java.sql.Connection
import services.system.database.Database
object ProgressOperationTableInitializer:
  private val createSql = """CREATE TABLE IF NOT EXISTS progress_operations(player_id TEXT NOT NULL REFERENCES players(id), operation_id TEXT NOT NULL, request TEXT NOT NULL, response JSONB NOT NULL, PRIMARY KEY(player_id,operation_id))"""
  def initialize(connection: Connection): IO[Unit] = Database.execute(connection, createSql).void
