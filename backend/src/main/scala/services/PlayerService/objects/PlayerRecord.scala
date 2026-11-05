package services.PlayerService.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.*
final case class PlayerRecord(id: PlayerId, revision: Long, continueSave: Option[String])
object PlayerRecord:
  given Encoder[PlayerRecord] = deriveEncoder
  given Decoder[PlayerRecord] = deriveDecoder
