package services.PlayerService.tables.Player
import cats.effect.IO
import java.sql.Connection
import io.circe.syntax.*
import io.circe.parser.decode
import services.system.database.Database
import services.PlayerService.objects.*
import services.PlayerService.objects.PlayerId
object PlayerTable:
  private val insertSql = "INSERT INTO players(id) VALUES (?)"
  def insert(c: Connection, id: PlayerId): IO[Unit] = Database.execute(c,insertSql,List(id.value)).void
  private val lockSql = "SELECT id,revision,continue_save FROM players WHERE id=? FOR UPDATE"
  def lock(c: Connection, id: PlayerId): IO[Option[PlayerRecord]] = Database.query(c,lockSql,List(id.value))(r => PlayerRecord(PlayerId(r.getString(1)),r.getLong(2),Option(r.getString(3)))).map(_.headOption)
  private val readSql = "SELECT id,revision,continue_save FROM players WHERE id=?"
  def find(c: Connection, id: PlayerId): IO[Option[PlayerRecord]] = Database.query(c,readSql,List(id.value))(r => PlayerRecord(PlayerId(r.getString(1)),r.getLong(2),Option(r.getString(3)))).map(_.headOption)
  private val advanceSql = "UPDATE players SET revision=revision+1,continue_save=? WHERE id=? RETURNING revision"
  def advance(c: Connection, id: PlayerId, save: String): IO[Long] = Database.query(c,advanceSql,List(save,id.value))(_.getLong(1)).map(_.head)
