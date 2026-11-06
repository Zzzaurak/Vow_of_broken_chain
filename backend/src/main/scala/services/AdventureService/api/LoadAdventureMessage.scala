package services.AdventureService.api
import services.AdventureService.objects.apiTypes.ProgressResponse
import cats.effect.IO
import io.circe.{Encoder,Decoder}
import io.circe.generic.semiauto.*
import io.circe.syntax.*
import java.sql.Connection
import services.system.api.APIMessage
import services.system.objects.ApiError
import services.PlayerService.objects.PlayerId
import services.PlayerService.tables.Player.PlayerTable
import services.AdventureService.objects.*
import services.AdventureService.tables.GameSave.GameSaveTable
import services.AdventureService.utils.{Operations,Content}
final case class LoadAdventureMessage(playerId: PlayerId, saveId: SaveId, operationId: String, expectedRevision: Long) extends APIMessage[ProgressResponse]:
  def plan(c: Connection): IO[ProgressResponse] = Operations.once(c,playerId,operationId,expectedRevision,this.asJson.noSpaces) {
    for
      record <- GameSaveTable.find(c,saveId,playerId).flatMap(IO.fromOption(_)(ApiError("save_not_found","记录不存在、已轮换或不属于当前玩家。",404)))
      upgraded <- Content.upgrade(record.snapshot)
      _ <- Content.validate(upgraded)
      revision <- PlayerTable.advance(c,playerId,saveId.value)
    yield ProgressResponse(revision,record.copy(snapshot = upgraded))
  }
object LoadAdventureMessage:
  given Decoder[LoadAdventureMessage] = deriveDecoder
  given Encoder[LoadAdventureMessage] = deriveEncoder
