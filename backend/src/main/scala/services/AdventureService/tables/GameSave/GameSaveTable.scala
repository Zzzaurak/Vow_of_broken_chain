package services.AdventureService.tables.GameSave
import cats.effect.IO
import java.sql.Connection
import io.circe.syntax.*
import io.circe.parser.decode
import services.system.database.Database
import services.AdventureService.objects.*
import services.PlayerService.objects.PlayerId
object GameSaveTable:
  private def read(r: java.sql.ResultSet): SaveRecord = SaveRecord(SaveId(r.getString(1)),AdventureId(r.getString(2)),SaveKind.fromString(r.getString(3)).fold(e => throw new IllegalStateException(e),identity),r.getInt(4),r.getTimestamp(5).toInstant.toString,decode[GameSnapshot](r.getString(6)).fold(throw _,identity))
  private val insertSql = "INSERT INTO game_saves(id,adventure_id,kind,slot,snapshot) VALUES (?,?,?,?,?::jsonb)"
  def insert(c: Connection, id: SaveId, adventure: AdventureId, kind: SaveKind, slot: Int, snapshot: GameSnapshot): IO[Unit] = Database.execute(c,insertSql,List(id.value,adventure.value,kind.toString,slot,snapshot.asJson.noSpaces)).void
  private val findSql = "SELECT s.id,s.adventure_id,s.kind,s.slot,s.saved_at,s.snapshot FROM game_saves s JOIN adventures a ON a.id=s.adventure_id WHERE s.id=? AND a.player_id=?"
  def find(c: Connection, id: SaveId, owner: PlayerId): IO[Option[SaveRecord]] = Database.query(c,findSql,List(id.value,owner.value))(read).map(_.headOption)
  private val listSql = "SELECT s.id,s.adventure_id,s.kind,s.slot,s.saved_at,s.snapshot FROM game_saves s JOIN adventures a ON a.id=s.adventure_id WHERE a.player_id=? ORDER BY s.saved_at DESC,s.id"
  def list(c: Connection, owner: PlayerId): IO[List[SaveRecord]] = Database.query(c,listSql,List(owner.value))(read)
  private val clearSlotSql = "DELETE FROM game_saves WHERE adventure_id=? AND kind='manual' AND slot=?"
  def clearSlot(c: Connection, id: AdventureId, slot: Int): IO[Unit] = Database.execute(c,clearSlotSql,List(id.value,slot)).void
  private val trimSql = "DELETE FROM game_saves WHERE id IN (SELECT id FROM game_saves WHERE adventure_id=? AND kind='auto' ORDER BY saved_at DESC,id DESC OFFSET 3)"
  def trimAuto(c: Connection, id: AdventureId): IO[Unit] = Database.execute(c,trimSql,List(id.value)).void
