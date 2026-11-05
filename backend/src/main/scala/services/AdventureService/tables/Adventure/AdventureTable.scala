package services.AdventureService.tables.Adventure
import cats.effect.IO
import java.sql.Connection
import services.system.database.Database
import services.AdventureService.objects.*
import services.PlayerService.objects.PlayerId
object AdventureTable:
  private val insertSql = "INSERT INTO adventures(id,player_id,difficulty) VALUES (?,?,?)"
  def insert(c: Connection, id: AdventureId, owner: PlayerId, difficulty: Difficulty): IO[Unit] = Database.execute(c,insertSql,List(id.value,owner.value,difficulty.toString)).void
  private val findSql = "SELECT id,difficulty,created_at FROM adventures WHERE id=? AND player_id=?"
  def find(c: Connection, id: AdventureId, owner: PlayerId): IO[Option[AdventureRecord]] = Database.query(c,findSql,List(id.value,owner.value))(r => AdventureRecord(AdventureId(r.getString(1)),Difficulty.fromString(r.getString(2)).fold(e => throw new IllegalStateException(e),identity),r.getTimestamp(3).toInstant.toString)).map(_.headOption)
  private val listSql = "SELECT id,difficulty,created_at FROM adventures WHERE player_id=? ORDER BY created_at DESC"
  def list(c: Connection, owner: PlayerId): IO[List[AdventureRecord]] = Database.query(c,listSql,List(owner.value))(r => AdventureRecord(AdventureId(r.getString(1)),Difficulty.fromString(r.getString(2)).fold(e => throw new IllegalStateException(e),identity),r.getTimestamp(3).toInstant.toString))
