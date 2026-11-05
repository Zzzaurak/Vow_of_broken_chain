package services.PlayerService.tables.PlayerSession
import cats.effect.IO
import java.sql.Connection
import services.system.database.Database
import services.PlayerService.objects.PlayerId
object PlayerSessionTable:
  private val insertSql = "INSERT INTO player_sessions(token_hash,player_id) VALUES (?,?)"
  def insert(c: Connection, hash: String, id: PlayerId): IO[Unit] = Database.execute(c,insertSql,List(hash,id.value)).void
  private val resolveSql = "SELECT player_id FROM player_sessions WHERE token_hash=?"
  def resolve(c: Connection, hash: String): IO[Option[PlayerId]] = Database.query(c,resolveSql,List(hash))(r => PlayerId(r.getString(1))).map(_.headOption)
