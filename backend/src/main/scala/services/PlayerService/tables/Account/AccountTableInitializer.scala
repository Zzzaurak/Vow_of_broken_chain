package services.PlayerService.tables.Account
import cats.effect.IO
import java.sql.Connection
import services.system.database.Database

object AccountTableInitializer:
  private val createSql = """CREATE TABLE IF NOT EXISTS player_accounts(
    player_id TEXT PRIMARY KEY REFERENCES players(id),
    username TEXT NOT NULL UNIQUE, salt TEXT NOT NULL, verifier TEXT NOT NULL)"""
  private val adminSql = "ALTER TABLE player_accounts ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE"
  def initialize(c: Connection): IO[Unit] = Database.execute(c, createSql).flatMap(_ => Database.execute(c, adminSql)).void
