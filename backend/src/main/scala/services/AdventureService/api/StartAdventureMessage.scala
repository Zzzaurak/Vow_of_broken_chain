package services.AdventureService.api
import services.AdventureService.objects.apiTypes.ProgressResponse
import cats.effect.IO
import io.circe.{Encoder,Decoder}
import io.circe.generic.semiauto.*
import io.circe.syntax.*
import java.sql.Connection
import java.util.UUID
import services.system.api.APIMessage
import services.system.objects.ApiError
import services.PlayerService.objects.PlayerId
import services.PlayerService.tables.Player.PlayerTable
import services.AdventureService.objects.*
import services.AdventureService.tables.Adventure.AdventureTable
import services.AdventureService.tables.GameSave.GameSaveTable
import services.AdventureService.utils.{Operations,Content}
final case class StartAdventureMessage(playerId: PlayerId, difficulty: Difficulty, operationId: String, expectedRevision: Long) extends APIMessage[ProgressResponse]:
  def plan(c: Connection): IO[ProgressResponse] = Operations.once(c,playerId,operationId,expectedRevision,this.asJson.noSpaces) {
    for
      adventure <- IO.delay(AdventureId(UUID.randomUUID().toString))
      save <- IO.delay(SaveId(UUID.randomUUID().toString))
      snapshot <- Content.initial(difficulty)
      _ <- Content.validate(snapshot)
      _ <- AdventureTable.insert(c,adventure,playerId,difficulty)
      _ <- GameSaveTable.insert(c,save,adventure,SaveKind.auto,0,snapshot)
      revision <- PlayerTable.advance(c,playerId,save.value)
      record <- GameSaveTable.find(c,save,playerId).flatMap(IO.fromOption(_)(ApiError("missing_save","新记录不存在",500)))
    yield ProgressResponse(revision,record)
  }
object StartAdventureMessage:
  given Decoder[StartAdventureMessage] = deriveDecoder
  given Encoder[StartAdventureMessage] = deriveEncoder
