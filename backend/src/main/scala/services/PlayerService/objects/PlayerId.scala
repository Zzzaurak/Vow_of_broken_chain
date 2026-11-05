package services.PlayerService.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.*
final case class PlayerId(value: String)
object PlayerId:
  given Encoder[PlayerId] = deriveEncoder
  given Decoder[PlayerId] = deriveDecoder
