package services.PlayerService.tables.Player
import cats.effect.IO
import java.sql.Connection
import services.system.database.Database
object PlayerTableInitializer:
  private val createSql = """CREATE TABLE IF NOT EXISTS players(id TEXT PRIMARY KEY, revision BIGINT NOT NULL DEFAULT 0, continue_save TEXT)"""
  def initialize(connection: Connection): IO[Unit] = Database.execute(connection, createSql).void
