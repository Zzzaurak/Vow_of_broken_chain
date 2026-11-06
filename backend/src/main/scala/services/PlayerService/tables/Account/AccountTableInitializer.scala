package services.PlayerService.tables.Account
import cats.effect.IO
import java.sql.Connection
import services.system.database.Database

object AccountTableInitializer:
  private val createSql = """CREATE TABLE IF NOT EXISTS player_accounts(
    player_id TEXT PRIMARY KEY REFERENCES players(id),
    username TEXT NOT NULL UNIQUE, salt TEXT NOT NULL, verifier TEXT NOT NULL)"""
  def initialize(c: Connection): IO[Unit] = Database.execute(c, createSql).void
