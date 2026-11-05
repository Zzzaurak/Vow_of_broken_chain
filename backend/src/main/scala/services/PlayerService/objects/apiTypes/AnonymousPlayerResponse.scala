package services.PlayerService.objects.apiTypes
import io.circe.{Encoder,Decoder}
import io.circe.generic.semiauto.*

final case class AnonymousPlayerResponse(token: String, revision: Long)
object AnonymousPlayerResponse:
  given Encoder[AnonymousPlayerResponse] = deriveEncoder
  given Decoder[AnonymousPlayerResponse] = deriveDecoder
