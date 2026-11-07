package services.PlayerService.tables.Account
import cats.effect.IO
import java.sql.Connection
import services.PlayerService.objects.PlayerId
import services.system.database.Database

object AccountTable:
  private val insertSql = "INSERT INTO player_accounts(player_id,username,salt,verifier) VALUES (?,?,?,?) ON CONFLICT DO NOTHING"
  private val findSql = "SELECT player_id,salt,verifier FROM player_accounts WHERE username=?"
  private val nameSql = "SELECT username FROM player_accounts WHERE player_id=?"

  def insert(c: Connection, id: PlayerId, name: String, salt: String, verifier: String): IO[Boolean] =
    Database.execute(c, insertSql, List(id.value, name, salt, verifier)).map(_ == 1)

  def credentials(c: Connection, name: String): IO[Option[(PlayerId,String,String)]] =
    Database.query(c, findSql, List(name))(r => (PlayerId(r.getString(1)), r.getString(2), r.getString(3))).map(_.headOption)

  def username(c: Connection, id: PlayerId): IO[Option[String]] =
    Database.query(c, nameSql, List(id.value))(_.getString(1)).map(_.headOption)

  private val adminSql = "SELECT is_admin FROM player_accounts WHERE player_id=?"
  def isAdministrator(c: Connection, id: PlayerId): IO[Boolean] =
    Database.query(c, adminSql, List(id.value))(_.getBoolean(1)).map(_.headOption.getOrElse(false))
