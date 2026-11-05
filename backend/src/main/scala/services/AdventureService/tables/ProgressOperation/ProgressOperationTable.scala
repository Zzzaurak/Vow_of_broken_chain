package services.AdventureService.tables.ProgressOperation
import cats.effect.IO
import java.sql.Connection
import io.circe.syntax.*
import io.circe.parser.decode
import services.system.database.Database
import services.AdventureService.objects.*
import services.PlayerService.objects.PlayerId
object ProgressOperationTable:
  private val findSql = "SELECT request,response FROM progress_operations WHERE player_id=? AND operation_id=?"
  def find(c: Connection, owner: PlayerId, operation: String): IO[Option[(String,io.circe.Json)]] = Database.query(c,findSql,List(owner.value,operation))(r => (r.getString(1),io.circe.parser.parse(r.getString(2)).fold(throw _,identity))).map(_.headOption)
  private val insertSql = "INSERT INTO progress_operations(player_id,operation_id,request,response) VALUES (?,?,?,?::jsonb)"
  def insert(c: Connection, owner: PlayerId, operation: String, request: String, response: io.circe.Json): IO[Unit] = Database.execute(c,insertSql,List(owner.value,operation,request,response.noSpaces)).void
